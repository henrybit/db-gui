use super::dump::{build_dump_script, rewrite_dump_schema_name, DumpDialect, DumpScript};
use super::engine::{DatabaseEngine, LiveEngine};
use super::ident::{quote_ident, quote_ident_pg, validate_ident};
use crate::error::{AppError, AppResult};
use crate::models::{EngineKind, MigrateProgressEvent, MigrateResult};
use tauri::{AppHandle, Emitter};

const PROGRESS_EVENT: &str = "db-migrate-progress";

#[derive(Clone)]
struct ProgressEmitter {
    app: AppHandle,
}

impl ProgressEmitter {
    fn emit(
        &self,
        phase: &str,
        level: &str,
        object_kind: Option<&str>,
        object_name: Option<&str>,
        current: u32,
        total: u32,
        message: impl Into<String>,
    ) {
        let event = MigrateProgressEvent {
            phase: phase.to_string(),
            level: level.to_string(),
            object_kind: object_kind.map(str::to_string),
            object_name: object_name.map(str::to_string),
            current,
            total,
            message: message.into(),
        };
        let _ = self.app.emit(PROGRESS_EVENT, &event);
    }
}

pub async fn migrate_database(
    app: AppHandle,
    source: LiveEngine,
    target: LiveEngine,
    source_name: &str,
    target_name: &str,
    include_data: bool,
    same_connection: bool,
) -> AppResult<MigrateResult> {
    let source_name = source_name.trim();
    let target_name = target_name.trim();
    validate_ident(source_name)?;
    validate_ident(target_name)?;

    let progress = ProgressEmitter { app };
    let source_kind = source.kind();
    let target_kind = target.kind();

    progress.emit(
        "validate",
        "info",
        None,
        None,
        0,
        0,
        format!(
            "Validating migration {source_name} → {target_name} ({} → {})",
            source_kind.as_str(),
            target_kind.as_str()
        ),
    );

    if source_kind != target_kind {
        return Err(AppError::msg(format!(
            "same-engine migration only: source is {}, target is {}",
            source_kind.as_str(),
            target_kind.as_str()
        )));
    }

    ensure_target_clean(&target, target_name, &progress).await?;

    let names_differ = source_name != target_name;
    // Cross-server restores keep the source name in SQL, then rename.
    // Same-server copies rewrite SQL up front so we never recreate the live source.
    let restore_then_rename = names_differ && !same_connection;
    let rewrite_before_execute = names_differ && same_connection;

    if restore_then_rename {
        ensure_name_absent_or_empty(&target, source_name, "intermediate restore name", &progress)
            .await?;
    }

    let dialect = match source_kind {
        EngineKind::MySql => DumpDialect::Mysql,
        EngineKind::Postgres => DumpDialect::Postgres,
    };

    let mut script = {
        let progress_ref = progress.clone();
        build_dump_script(
            &source,
            source_name,
            true,
            include_data,
            dialect,
            Some(
                move |phase: &str,
                      object_kind: Option<&str>,
                      object_name: Option<&str>,
                      current: u32,
                      total: u32,
                      message: &str| {
                    progress_ref.emit(
                        phase,
                        "info",
                        object_kind,
                        object_name,
                        current,
                        total,
                        message.to_string(),
                    );
                },
            ),
        )
        .await?
    };

    let mut renamed = false;
    if rewrite_before_execute {
        progress.emit(
            "rename",
            "info",
            None,
            None,
            0,
            0,
            format!(
                "Same connection: rewriting dump SQL names {source_name} → {target_name} before execute"
            ),
        );
        rewrite_dump_schema_name(&mut script, dialect, source_name, target_name)?;
        renamed = true;
    } else if names_differ {
        progress.emit(
            "rename",
            "info",
            None,
            None,
            0,
            0,
            format!(
                "Source and target names differ ({source_name} → {target_name}); will rename after restore"
            ),
        );
    } else {
        progress.emit(
            "rename",
            "info",
            None,
            None,
            0,
            0,
            "Source and target names match; no rename needed",
        );
    }

    execute_script(&target, &script, &progress).await?;

    if restore_then_rename {
        progress.emit(
            "rename",
            "info",
            None,
            None,
            0,
            0,
            format!("Renaming restored {source_name} to {target_name}"),
        );
        rename_schema(&target, source_kind, source_name, target_name, &progress).await?;
        progress.emit(
            "rename",
            "success",
            None,
            None,
            1,
            1,
            format!("Renamed {source_name} → {target_name}"),
        );
        renamed = true;
    }

    progress.emit(
        "done",
        "success",
        None,
        None,
        1,
        1,
        format!(
            "Migration completed: {} statement(s) applied to {target_name}",
            script.statements.len()
        ),
    );

    Ok(MigrateResult {
        source_name: source_name.to_string(),
        target_name: target_name.to_string(),
        statement_count: script.statements.len() as u32,
        renamed,
    })
}

async fn ensure_target_clean(
    target: &LiveEngine,
    name: &str,
    progress: &ProgressEmitter,
) -> AppResult<()> {
    ensure_name_absent_or_empty(target, name, "target", progress).await
}

async fn ensure_name_absent_or_empty(
    target: &LiveEngine,
    name: &str,
    label: &str,
    progress: &ProgressEmitter,
) -> AppResult<()> {
    let databases = target.list_databases().await?;
    let exists = databases.iter().any(|item| item.name == name);
    if !exists {
        progress.emit(
            "validate",
            "info",
            None,
            None,
            0,
            0,
            format!("{label} “{name}” does not exist yet (ok)"),
        );
        return Ok(());
    }

    let tables = target.list_tables(name).await?;
    let views = target.list_views(name).await?;
    let routines = target.list_routines(name).await?;
    let triggers = target.list_triggers(name).await?;
    let total = tables.len() + views.len() + routines.len() + triggers.len();
    if total > 0 {
        return Err(AppError::msg(format!(
            "{label} “{name}” is not empty ({total} object(s)). Use a clean/empty database."
        )));
    }

    progress.emit(
        "validate",
        "warning",
        None,
        None,
        0,
        0,
        format!("{label} “{name}” exists but is empty (ok)"),
    );
    Ok(())
}

async fn execute_script(
    target: &LiveEngine,
    script: &DumpScript,
    progress: &ProgressEmitter,
) -> AppResult<()> {
    let total = script.statements.len() as u32;
    progress.emit(
        "execute",
        "info",
        None,
        None,
        0,
        total,
        format!("Executing {total} statement(s) on target"),
    );

    for (index, statement) in script.statements.iter().enumerate() {
        let current = (index + 1) as u32;
        progress.emit(
            "execute",
            "info",
            statement.object_kind,
            statement.object_name.as_deref(),
            current,
            total,
            format!("[{current}/{total}] {}", statement.label),
        );

        let sql = statement.sql.trim();
        if sql.is_empty() {
            continue;
        }

        // Schema context is already embedded (USE / qualified names / CREATE SCHEMA).
        match target.execute_sql(None, sql).await {
            Ok(_) => {
                progress.emit(
                    "execute",
                    "success",
                    statement.object_kind,
                    statement.object_name.as_deref(),
                    current,
                    total,
                    format!("OK: {}", statement.label),
                );
            }
            Err(error) => {
                let message = format!("Failed at {}: {}", statement.label, error.user_message());
                progress.emit(
                    "execute",
                    "error",
                    statement.object_kind,
                    statement.object_name.as_deref(),
                    current,
                    total,
                    message.clone(),
                );
                return Err(AppError::msg(message));
            }
        }
    }

    progress.emit(
        "execute",
        "success",
        None,
        None,
        total,
        total,
        "All dump statements executed",
    );
    Ok(())
}

async fn rename_schema(
    target: &LiveEngine,
    kind: EngineKind,
    from: &str,
    to: &str,
    progress: &ProgressEmitter,
) -> AppResult<()> {
    match kind {
        EngineKind::Postgres => {
            let sql = format!(
                "ALTER SCHEMA {} RENAME TO {}",
                quote_ident_pg(from),
                quote_ident_pg(to)
            );
            progress.emit(
                "rename",
                "info",
                Some("schema"),
                Some(from),
                0,
                1,
                format!("Running {sql}"),
            );
            target.execute_sql(None, &sql).await?;
            Ok(())
        }
        EngineKind::MySql => rename_mysql_database(target, from, to, progress).await,
    }
}

async fn rename_mysql_database(
    target: &LiveEngine,
    from: &str,
    to: &str,
    progress: &ProgressEmitter,
) -> AppResult<()> {
    // MySQL has no reliable RENAME DATABASE; move objects into a new database.
    let databases = target.list_databases().await?;
    if !databases.iter().any(|item| item.name == to) {
        progress.emit(
            "rename",
            "info",
            Some("database"),
            Some(to),
            0,
            0,
            format!("Creating target database {to}"),
        );
        target.create_database(to, None, None).await?;
    }

    let tables = target.list_tables(from).await?;
    let views = target.list_views(from).await?;
    let routines = target.list_routines(from).await?;
    let triggers = target.list_triggers(from).await?;
    let total =
        (tables.len() + views.len() + routines.len() + triggers.len()).max(1) as u32;
    let mut current = 0_u32;

    for table in &tables {
        current += 1;
        let sql = format!(
            "RENAME TABLE {}.{} TO {}.{}",
            quote_ident(from),
            quote_ident(&table.name),
            quote_ident(to),
            quote_ident(&table.name)
        );
        progress.emit(
            "rename",
            "info",
            Some("table"),
            Some(&table.name),
            current,
            total,
            format!("Moving table {}", table.name),
        );
        target.execute_sql(None, &sql).await?;
    }

    for view in &views {
        current += 1;
        progress.emit(
            "rename",
            "info",
            Some("view"),
            Some(&view.name),
            current,
            total,
            format!("Moving view {}", view.name),
        );
        let ddl = target
            .get_ddl(from, crate::models::ObjectKind::View, &view.name)
            .await?;
        let create_sql = strip_mysql_definer(&ddl);
        target.execute_sql(Some(to), &create_sql).await?;
        target
            .execute_sql(
                Some(from),
                &format!("DROP VIEW {}", quote_ident(&view.name)),
            )
            .await?;
    }

    for routine in &routines {
        current += 1;
        let object_kind = if routine.routine_type.eq_ignore_ascii_case("PROCEDURE") {
            crate::models::ObjectKind::Procedure
        } else {
            crate::models::ObjectKind::Function
        };
        let kind_label = if matches!(object_kind, crate::models::ObjectKind::Procedure) {
            "procedure"
        } else {
            "function"
        };
        progress.emit(
            "rename",
            "info",
            Some(kind_label),
            Some(&routine.name),
            current,
            total,
            format!("Moving {kind_label} {}", routine.name),
        );
        let ddl = target.get_ddl(from, object_kind, &routine.name).await?;
        let create_sql = strip_mysql_definer(&ddl);
        target.execute_sql(Some(to), &create_sql).await?;
        let drop = if matches!(object_kind, crate::models::ObjectKind::Procedure) {
            format!("DROP PROCEDURE {}", quote_ident(&routine.name))
        } else {
            format!("DROP FUNCTION {}", quote_ident(&routine.name))
        };
        target.execute_sql(Some(from), &drop).await?;
    }

    for trigger in &triggers {
        current += 1;
        progress.emit(
            "rename",
            "info",
            Some("trigger"),
            Some(&trigger.name),
            current,
            total,
            format!("Moving trigger {}", trigger.name),
        );
        let ddl = target
            .get_ddl(from, crate::models::ObjectKind::Trigger, &trigger.name)
            .await?;
        let create_sql = strip_mysql_definer(&ddl);
        target.execute_sql(Some(to), &create_sql).await?;
        target
            .execute_sql(
                Some(from),
                &format!("DROP TRIGGER {}", quote_ident(&trigger.name)),
            )
            .await?;
    }

    progress.emit(
        "rename",
        "info",
        Some("database"),
        Some(from),
        total,
        total,
        format!("Dropping intermediate database {from}"),
    );
    target.drop_database(from).await?;
    Ok(())
}

fn strip_mysql_definer(ddl: &str) -> String {
    // DEFINER=`user`@`host` can block recreate under another account.
    let mut out = ddl.to_string();
    if let Some(start) = find_ci(&out, " DEFINER=") {
        if let Some(rel_end) = out[start..].find(" SQL") {
            out.replace_range(start..start + rel_end, "");
        } else if let Some(rel_end) = out[start..].find(" VIEW") {
            out.replace_range(start..start + rel_end, "");
        } else if let Some(rel_end) = out[start..].find(" PROCEDURE") {
            out.replace_range(start..start + rel_end, "");
        } else if let Some(rel_end) = out[start..].find(" FUNCTION") {
            out.replace_range(start..start + rel_end, "");
        } else if let Some(rel_end) = out[start..].find(" TRIGGER") {
            out.replace_range(start..start + rel_end, "");
        }
    }
    out.trim_end().trim_end_matches(';').to_string()
}

fn find_ci(haystack: &str, needle: &str) -> Option<usize> {
    haystack
        .to_ascii_lowercase()
        .find(&needle.to_ascii_lowercase())
}
