use mysql_async::{Row, Value};

pub use crate::db::sql::statement_kind;

pub fn row_to_strings(row: &Row) -> Vec<Option<String>> {
    (0..row.len())
        .map(|index| row.as_ref(index).and_then(value_to_display))
        .collect()
}

pub fn value_to_display(value: &Value) -> Option<String> {
    match value {
        Value::NULL => None,
        Value::Bytes(bytes) => Some(bytes_to_string(bytes)),
        Value::Int(v) => Some(v.to_string()),
        Value::UInt(v) => Some(v.to_string()),
        Value::Float(v) => Some(v.to_string()),
        Value::Double(v) => Some(v.to_string()),
        Value::Date(year, month, day, hour, minute, second, micros) => Some(format!(
            "{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}:{second:02}{}",
            if *micros > 0 {
                format!(".{micros:06}")
            } else {
                String::new()
            }
        )),
        Value::Time(neg, days, hour, minute, second, micros) => {
            let sign = if *neg { "-" } else { "" };
            Some(format!(
                "{sign}{days} {hour:02}:{minute:02}:{second:02}{}",
                if *micros > 0 {
                    format!(".{micros:06}")
                } else {
                    String::new()
                }
            ))
        }
    }
}

fn bytes_to_string(bytes: &[u8]) -> String {
    match std::str::from_utf8(bytes) {
        Ok(text) => text.to_string(),
        Err(_) => {
            let preview = bytes.iter().take(32).copied().collect::<Vec<_>>();
            let hex = preview
                .iter()
                .map(|byte| format!("{byte:02X}"))
                .collect::<Vec<_>>()
                .join(" ");
            if bytes.len() > 32 {
                format!("0x{hex}… ({} bytes)", bytes.len())
            } else {
                format!("0x{hex}")
            }
        }
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
    }

    #[test]
    fn renders_null_and_numbers() {
        assert_eq!(value_to_display(&Value::NULL), None);
        assert_eq!(value_to_display(&Value::Int(42)), Some("42".into()));
        assert_eq!(
            value_to_display(&Value::Bytes(b"hello".to_vec())),
            Some("hello".into())
        );
    }
}
