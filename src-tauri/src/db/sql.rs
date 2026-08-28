pub fn statement_kind(sql: &str) -> &'static str {
    let trimmed = sql.trim_start();
    let first = trimmed.split_whitespace().next().unwrap_or_default();
    match first.to_ascii_uppercase().as_str() {
        "SELECT" | "SHOW" | "DESCRIBE" | "DESC" | "EXPLAIN" | "WITH" | "TABLE" | "VALUES" => {
            "query"
        }
        "INSERT" => "insert",
        "UPDATE" => "update",
        "DELETE" => "delete",
        "CREATE" => "create",
        "ALTER" => "alter",
        "DROP" => "drop",
        "TRUNCATE" => "truncate",
        "USE" | "SET" | "RESET" => "session",
        "COPY" => "copy",
        _ => "other",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_sql_kind() {
        assert_eq!(statement_kind("  select 1"), "query");
        assert_eq!(statement_kind("INSERT INTO t VALUES (1)"), "insert");
        assert_eq!(statement_kind("drop table t"), "drop");
        assert_eq!(statement_kind("SET search_path TO public"), "session");
    }
}
