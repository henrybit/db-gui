use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrateProgressEvent {
    pub phase: String,
    pub level: String,
    pub object_kind: Option<String>,
    pub object_name: Option<String>,
    pub current: u32,
    pub total: u32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrateResult {
    pub source_name: String,
    pub target_name: String,
    pub statement_count: u32,
    pub renamed: bool,
}
