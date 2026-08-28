use crate::db::LiveEngine;
use crate::error::AppResult;
use crate::models::{ConnectionListItem, ConnectionProfile, TestConnectionRequest};
use crate::runtime::run_db;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_connections(state: State<'_, AppState>) -> AppResult<Vec<ConnectionListItem>> {
    let profiles = state.list_profiles().await;
    Ok(profiles
        .into_iter()
        .map(|profile| {
            let connected = state.is_connected(&profile.id);
            ConnectionListItem { profile, connected }
        })
        .collect())
}

#[tauri::command]
pub async fn upsert_connection(
    state: State<'_, AppState>,
    profile: ConnectionProfile,
) -> AppResult<ConnectionProfile> {
    state.upsert_profile(profile).await
}

#[tauri::command]
pub async fn delete_connection(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.delete_profile(&id).await
}

#[tauri::command]
pub async fn test_connection(request: TestConnectionRequest) -> AppResult<()> {
    run_db(async move { LiveEngine::test(&request).await }).await
}

#[tauri::command]
pub async fn connect_session(
    state: State<'_, AppState>,
    id: String,
    password: Option<String>,
) -> AppResult<()> {
    state.connect(&id, password).await
}

#[tauri::command]
pub async fn disconnect_session(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.disconnect(&id).await
}
