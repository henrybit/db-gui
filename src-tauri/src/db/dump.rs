use super::engine::DatabaseEngine;
use super::ident::{quote_ident, quote_ident_pg, validate_ident};
use crate::error::{AppError, AppResult};
use crate::models::ObjectKind;

#[derive(Clone, Copy)]
pub enum DumpDialect {
    Mysql,
    Postgres,
}

pub fn dump_mode_label(include_schema: bool, include_data: bool) -> &'static str {
    match (include_schema, include_data) {
        (true, true) => "schema + data",
        (true, false) => "schema only",
        (false, true) => "data only",
        (false, false) => "empty",
    }
}

pub async fn build_dump(
    engine: &impl DatabaseEngine,
    schema: &str,
    include_schema: bool,
    include_data: bool,
    dialect: DumpDialect,
) -> AppResult<String> {
    validate_ident(schema)?;
    if !include_schema && !include_data {
        return Err(AppError::msg("dump must include schema or data"));
    }

    let mut out = String::new();
    out.push_str(&dump_header(schema, include_schema, include_data));
    append_database_preamble(&mut out, schema, include_schema, dialect);

    let tables = engine.list_tables(schema).await?;
    for table in &tables {
        if include_schema {
            out.push_str(&format!("-- Table: {}\n", table.name));
            match engine.get_ddl(schema, ObjectKind::Table, &table.name).await {
                Ok(ddl) => {
                    out.push_str(ddl.trim_end());
                    out.push_str(";\n\n");
                }
                Err(error) => {
                    out.push_str(&format!("-- skipped table DDL: {error}\n\n"));
                }
            }
        }

        if include_data {
            append_table_data(&mut out, engine, schema, &table.name, dialect).await?;
        }
    }

    if include_schema {
        append_object_ddl(&mut out, engine, schema).await?;
    }

    out.push_str("-- Dump completed\n");
    Ok(out)
}

pub async fn build_table_data_dump(
    engine: &impl DatabaseEngine,
    schema: &str,
    table: &str,
    dialect: DumpDialect,
) -> AppResult<String> {
    validate_ident(schema)?;
    validate_ident(table)?;

    let mut out = String::new();
    out.push_str(&dump_header(&format!("{schema}.{table}"), false, true));
    append_database_preamble(&mut out, schema, false, dialect);
    append_table_data(&mut out, engine, schema, table, dialect).await?;
    out.push_str("-- Dump completed\n");
    Ok(out)
}

fn dump_header(target: &str, include_schema: bool, include_data: bool) -> String {
    format!(
        "-- HiDataLinker dump\n-- Target: {target}\n-- Mode: {}\n\n",
        dump_mode_label(include_schema, include_data)
    )
}

fn append_database_preamble(
    out: &mut String,
    schema: &str,
    include_schema: bool,
    dialect: DumpDialect,
) {
    match dialect {
        DumpDialect::Mysql => {
            if include_schema {
                out.push_str(&format!(
                    "CREATE DATABASE IF NOT EXISTS {};\n",
                    quote_ident(schema)
                ));
            }
            out.push_str(&format!("USE {};\n\n", quote_ident(schema)));
        }
        DumpDialect::Postgres => {
            if include_schema {
                out.push_str(&format!(
                    "CREATE SCHEMA IF NOT EXISTS {};\n\n",
                    quote_ident_pg(schema)
                ));
            } else {
                out.push_str(&format!(
                    "SET search_path TO {};\n\n",
                    quote_ident_pg(schema)
                ));
            }
        }
    }
}

async fn append_object_ddl(
    out: &mut String,
    engine: &impl DatabaseEngine,
    schema: &str,
) -> AppResult<()> {
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

    Ok(())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn labels_dump_modes() {
        assert_eq!(dump_mode_label(true, true), "schema + data");
        assert_eq!(dump_mode_label(true, false), "schema only");
        assert_eq!(dump_mode_label(false, true), "data only");
    }

    #[test]
    fn builds_dump_header() {
        let header = dump_header("shop.orders", false, true);
        assert!(header.contains("-- Target: shop.orders"));
        assert!(header.contains("-- Mode: data only"));
    }
}
