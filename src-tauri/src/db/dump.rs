use super::engine::DatabaseEngine;
use super::ident::{quote_ident, quote_ident_pg, validate_ident};
use crate::error::{AppError, AppResult};
use crate::models::ObjectKind;

#[derive(Clone, Copy)]
pub enum DumpDialect {
    Mysql,
    Postgres,
}

pub async fn build_dump(
    engine: &impl DatabaseEngine,
    schema: &str,
    include_data: bool,
    dialect: DumpDialect,
) -> AppResult<String> {
    validate_ident(schema)?;

    let mut out = String::new();
    out.push_str(&format!("-- DB GUI dump\n-- Target: {schema}\n"));
    out.push_str(&format!(
        "-- Mode: {}\n\n",
        if include_data {
            "schema + data"
        } else {
            "schema only"
        }
    ));

    match dialect {
        DumpDialect::Mysql => {
            out.push_str(&format!("CREATE DATABASE IF NOT EXISTS {};\n", quote_ident(schema)));
            out.push_str(&format!("USE {};\n\n", quote_ident(schema)));
        }
        DumpDialect::Postgres => {
            out.push_str(&format!(
                "CREATE SCHEMA IF NOT EXISTS {};\n\n",
                quote_ident_pg(schema)
            ));
        }
    }

    let tables = engine.list_tables(schema).await?;
    for table in &tables {
        out.push_str(&format!("-- Table: {}\n", table.name));
        match engine
            .get_ddl(schema, ObjectKind::Table, &table.name)
            .await
        {
            Ok(ddl) => {
                out.push_str(ddl.trim_end());
                out.push_str(";\n\n");
            }
            Err(error) => {
                out.push_str(&format!("-- skipped table DDL: {error}\n\n"));
            }
        }

        if include_data {
            append_table_data(&mut out, engine, schema, &table.name, dialect).await?;
        }
    }

    let views = engine.list_views(schema).await?;
    for view in &views {
        out.push_str(&format!("-- View: {}\n", view.name));
        match engine.get_ddl(schema, ObjectKind::View, &view.name).await {
            Ok(ddl) => {
                out.push_str(ddl.trim_end());
                out.push_str(";\n\n");
            }
            Err(error) => out.push_str(&format!("-- skipped view DDL: {error}\n\n")),
        }
    }

    let routines = engine.list_routines(schema).await?;
    for routine in &routines {
        let kind = if routine.routine_type.eq_ignore_ascii_case("PROCEDURE") {
            ObjectKind::Procedure
        } else {
            ObjectKind::Function
        };
        out.push_str(&format!("-- {}: {}\n", routine.routine_type, routine.name));
        match engine.get_ddl(schema, kind, &routine.name).await {
            Ok(ddl) => {
                out.push_str(ddl.trim_end());
                out.push_str(";\n\n");
            }
            Err(error) => out.push_str(&format!("-- skipped routine DDL: {error}\n\n")),
        }
    }

    let triggers = engine.list_triggers(schema).await?;
    for trigger in &triggers {
        out.push_str(&format!("-- Trigger: {}\n", trigger.name));
        match engine
            .get_ddl(schema, ObjectKind::Trigger, &trigger.name)
            .await
        {
            Ok(ddl) => {
                out.push_str(ddl.trim_end());
                out.push_str(";\n\n");
            }
            Err(error) => out.push_str(&format!("-- skipped trigger DDL: {error}\n\n")),
        }
    }

    out.push_str("-- Dump completed\n");
    Ok(out)
}

async fn append_table_data(
    out: &mut String,
    engine: &impl DatabaseEngine,
    schema: &str,
    table: &str,
    dialect: DumpDialect,
) -> AppResult<()> {
    const BATCH: u32 = 200;
    const MAX_ROWS: u64 = 50_000;

    let target = match dialect {
        DumpDialect::Mysql => format!("{}.{}", quote_ident(schema), quote_ident(table)),
        DumpDialect::Postgres => format!("{}.{}", quote_ident_pg(schema), quote_ident_pg(table)),
    };

    let mut offset = 0_u64;
    let mut total = 0_u64;
    loop {
        if total >= MAX_ROWS {
            out.push_str(&format!(
                "-- data truncated at {MAX_ROWS} rows for table {table}\n\n"
            ));
            break;
        }
        let limit = BATCH.min((MAX_ROWS - total) as u32);
        let result = engine.preview_table(schema, table, limit, offset).await?;
        if result.rows.is_empty() {
            break;
        }
        if result.columns.is_empty() {
            return Err(AppError::msg(format!(
                "table {table} returned no columns while dumping data"
            )));
        }

        let columns = result
            .columns
            .iter()
            .map(|column| match dialect {
                DumpDialect::Mysql => quote_ident(&column.name),
                DumpDialect::Postgres => quote_ident_pg(&column.name),
            })
            .collect::<Vec<_>>()
            .join(", ");

        out.push_str(&format!("INSERT INTO {target} ({columns}) VALUES\n"));
        for (row_index, row) in result.rows.iter().enumerate() {
            let values = row
                .iter()
                .map(|value| sql_literal(value.as_deref()))
                .collect::<Vec<_>>()
                .join(", ");
            out.push_str("  (");
            out.push_str(&values);
            out.push(')');
            if row_index + 1 == result.rows.len() {
                out.push_str(";\n");
            } else {
                out.push_str(",\n");
            }
        }
        out.push('\n');

        let fetched = result.rows.len() as u64;
        total += fetched;
        offset += fetched;
        if fetched < u64::from(limit) || result.truncated {
            if result.truncated {
                out.push_str(&format!(
                    "-- data truncated by preview limit for table {table}\n\n"
                ));
            }
            break;
        }
    }

    if total == 0 {
        out.push_str(&format!("-- no rows in {table}\n\n"));
    }
    Ok(())
}

fn sql_literal(value: Option<&str>) -> String {
    match value {
        None => "NULL".to_string(),
        Some(text) => format!("'{}'", text.replace('\'', "''")),
    }
}
