use crate::error::{AppError, AppResult};

const MAX_IDENT_LEN: usize = 64;

pub fn validate_ident(name: &str) -> AppResult<()> {
    if name.is_empty() || name.len() > MAX_IDENT_LEN || name.contains('\0') || name.contains('/') {
        return Err(AppError::msg(format!("invalid identifier: {name}")));
    }
    Ok(())
}

pub fn quote_ident(name: &str) -> String {
    format!("`{}`", name.replace('`', "``"))
}

pub fn qualify(schema: &str, name: &str) -> String {
    format!("{}.{}", quote_ident(schema), quote_ident(name))
}

pub fn quote_ident_pg(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

pub fn qualify_pg(schema: &str, name: &str) -> String {
    format!("{}.{}", quote_ident_pg(schema), quote_ident_pg(name))
}

fn nonempty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

pub fn create_mysql_database_sql(
    name: &str,
    charset: Option<&str>,
    collation: Option<&str>,
) -> AppResult<String> {
    let name = name.trim();
    validate_ident(name)?;
    let mut sql = format!("CREATE DATABASE {}", quote_ident(name));
    if let Some(charset) = nonempty(charset) {
        validate_ident(charset)?;
        sql.push_str(" CHARACTER SET ");
        sql.push_str(&quote_ident(charset));
    }
    if let Some(collation) = nonempty(collation) {
        validate_ident(collation)?;
        sql.push_str(" COLLATE ");
        sql.push_str(&quote_ident(collation));
    }
    Ok(sql)
}

pub fn create_pg_schema_sql(name: &str) -> AppResult<String> {
    let name = name.trim();
    validate_ident(name)?;
    Ok(format!("CREATE SCHEMA {}", quote_ident_pg(name)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quotes_special_characters() {
        assert_eq!(quote_ident("users"), "`users`");
        assert_eq!(quote_ident("a`b"), "`a``b`");
        assert_eq!(qualify("shop", "orders"), "`shop`.`orders`");
        assert_eq!(quote_ident_pg("users"), "\"users\"");
        assert_eq!(quote_ident_pg("a\"b"), "\"a\"\"b\"");
        assert_eq!(qualify_pg("shop", "orders"), "\"shop\".\"orders\"");
    }

    #[test]
    fn rejects_empty_and_oversized_names() {
        assert!(validate_ident("").is_err());
        assert!(validate_ident(&"x".repeat(65)).is_err());
        assert!(validate_ident("orders").is_ok());
    }

    #[test]
    fn builds_mysql_create_database_sql() {
        assert_eq!(
            create_mysql_database_sql("shop", None, None).unwrap(),
            "CREATE DATABASE `shop`"
        );
        assert_eq!(
            create_mysql_database_sql(" shop ", Some("utf8mb4"), Some("utf8mb4_unicode_ci"))
                .unwrap(),
            "CREATE DATABASE `shop` CHARACTER SET `utf8mb4` COLLATE `utf8mb4_unicode_ci`"
        );
        assert_eq!(
            create_mysql_database_sql("a`b", Some("  "), Some("")).unwrap(),
            "CREATE DATABASE `a``b`"
        );
        assert!(create_mysql_database_sql("", None, None).is_err());
    }

    #[test]
    fn builds_pg_create_schema_sql() {
        assert_eq!(
            create_pg_schema_sql(" analytics ").unwrap(),
            "CREATE SCHEMA \"analytics\""
        );
        assert_eq!(
            create_pg_schema_sql("a\"b").unwrap(),
            "CREATE SCHEMA \"a\"\"b\""
        );
        assert!(create_pg_schema_sql("").is_err());
    }
}
