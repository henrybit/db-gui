use super::with_engine;
use crate::db::DatabaseEngine;
use crate::error::{AppError, AppResult};
use crate::models::{
    CharsetCatalog, ColumnInfo, DatabaseInfo, IndexInfo, ObjectKind, RoutineInfo, TableInfo,
    TriggerInfo, ViewInfo,
};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_databases(
    state: State<'_, AppState>,
    connection_id: String,
) -> AppResult<Vec<DatabaseInfo>> {
    with_engine(&state, connection_id, |engine| async move {
        engine.list_databases().await
    })
    .await
}

#[tauri::command]
pub async fn create_database(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
    charset: Option<String>,
    collation: Option<String>,
) -> AppResult<()> {
    with_engine(&state, connection_id, move |engine| async move {
        engine
            .create_database(&name, charset.as_deref(), collation.as_deref())
            .await
    })
    .await
}

#[tauri::command]
pub async fn drop_database(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> AppResult<()> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.drop_database(&name).await
    })
    .await
}

#[tauri::command]
pub async fn dump_database(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
    include_schema: bool,
    include_data: bool,
) -> AppResult<String> {
    with_engine(&state, connection_id, move |engine| async move {
        engine
            .dump_database(&name, include_schema, include_data)
            .await
    })
    .await
}

#[tauri::command]
pub async fn dump_table(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
) -> AppResult<String> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.dump_table(&schema, &table).await
    })
    .await
}

#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> AppResult<String> {
    let path = path.trim().to_string();
    if path.is_empty() {
        return Err(AppError::msg("save path is empty"));
    }
    tokio::task::spawn_blocking(move || -> AppResult<String> {
        std::fs::write(&path, contents)?;
        Ok(path)
    })
    .await
    .map_err(|error| AppError::msg(format!("failed to save file: {error}")))?
}

#[tauri::command]
pub async fn list_charset_catalog(
    state: State<'_, AppState>,
    connection_id: String,
) -> AppResult<CharsetCatalog> {
    with_engine(&state, connection_id, |engine| async move {
        engine.list_charset_catalog().await
    })
    .await
}

#[tauri::command]
pub async fn list_tables(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> AppResult<Vec<TableInfo>> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.list_tables(&schema).await
    })
    .await
}

#[tauri::command]
pub async fn list_views(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> AppResult<Vec<ViewInfo>> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.list_views(&schema).await
    })
    .await
}

#[tauri::command]
pub async fn list_indexes(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> AppResult<Vec<IndexInfo>> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.list_indexes(&schema).await
    })
    .await
}

#[tauri::command]
pub async fn list_triggers(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> AppResult<Vec<TriggerInfo>> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.list_triggers(&schema).await
    })
    .await
}

#[tauri::command]
pub async fn list_routines(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> AppResult<Vec<RoutineInfo>> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.list_routines(&schema).await
    })
    .await
}

#[tauri::command]
pub async fn get_columns(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
) -> AppResult<Vec<ColumnInfo>> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.get_columns(&schema, &table).await
    })
    .await
}

#[tauri::command]
pub async fn get_ddl(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    kind: ObjectKind,
    name: String,
) -> AppResult<String> {
    with_engine(&state, connection_id, move |engine| async move {
        engine.get_ddl(&schema, kind, &name).await
    })
    .await
}
