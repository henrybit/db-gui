use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfo {
    pub name: String,
    pub charset: Option<String>,
    pub collation: Option<String>,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub name: String,
    pub engine: Option<String>,
    pub table_rows: Option<u64>,
    pub data_length: Option<u64>,
    pub comment: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewInfo {
    pub name: String,
    pub updatable: bool,
    pub check_option: Option<String>,
    pub security_type: Option<String>,
    pub definer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexInfo {
    pub name: String,
    pub table_name: String,
    pub unique: bool,
    pub primary: bool,
    pub index_type: String,
    pub columns: Vec<String>,
    pub comment: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerInfo {
    pub name: String,
    pub table_name: String,
    pub event: String,
    pub timing: String,
    pub definer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineInfo {
    pub name: String,
    pub routine_type: String,
    pub returns: Option<String>,
    pub deterministic: bool,
    pub data_access: Option<String>,
    pub security_type: Option<String>,
    pub definer: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub column_type: String,
    pub nullable: bool,
    pub key: String,
    pub default_value: Option<String>,
    pub extra: String,
    pub comment: String,
    pub ordinal: u32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ObjectKind {
    Table,
    View,
    Index,
    Trigger,
    Function,
    Procedure,
}
