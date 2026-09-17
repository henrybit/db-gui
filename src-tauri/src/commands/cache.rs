use crate::error::{AppError, AppResult};
use crate::state::AppState;
use std::path::{Path, PathBuf};
use tauri::State;

const MAX_CACHE_BYTES: u64 = 32 * 1024 * 1024;

pub(crate) fn query_cache_path(dir: &Path, tab_id: &str) -> AppResult<PathBuf> {
    if tab_id.is_empty()
        || tab_id.len() > 80
        || !tab_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err(AppError::msg("invalid query cache id"));
    }
    Ok(dir.join(format!("{tab_id}.sql")))
}

#[tauri::command]
pub async fn write_query_cache(
    state: State<'_, AppState>,
    tab_id: String,
    contents: String,
) -> AppResult<()> {
    let path = query_cache_path(state.query_cache_dir(), &tab_id)?;
    let dir = state.query_cache_dir().to_path_buf();
    tokio::task::spawn_blocking(move || -> AppResult<()> {
        std::fs::create_dir_all(&dir)?;
        std::fs::write(path, contents)?;
        Ok(())
    })
    .await
    .map_err(|error| AppError::msg(format!("failed to cache SQL: {error}")))?
}

#[tauri::command]
pub async fn read_query_cache(state: State<'_, AppState>, tab_id: String) -> AppResult<String> {
    let path = query_cache_path(state.query_cache_dir(), &tab_id)?;
    tokio::task::spawn_blocking(move || -> AppResult<String> {
        let meta = std::fs::metadata(&path)?;
        if meta.len() > MAX_CACHE_BYTES {
            return Err(AppError::msg("cached SQL is too large"));
        }
        Ok(std::fs::read_to_string(path)?)
    })
    .await
    .map_err(|error| AppError::msg(format!("failed to read cached SQL: {error}")))?
}

#[tauri::command]
pub async fn delete_query_cache(state: State<'_, AppState>, tab_id: String) -> AppResult<()> {
    let path = query_cache_path(state.query_cache_dir(), &tab_id)?;
    tokio::task::spawn_blocking(move || -> AppResult<()> {
        match std::fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error.into()),
        }
    })
    .await
    .map_err(|error| AppError::msg(format!("failed to delete cached SQL: {error}")))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn accepts_uid_style_ids() {
        let path = query_cache_path(Path::new("/tmp"), "query-mhx123-1").unwrap();
        assert_eq!(path.file_name().unwrap(), "query-mhx123-1.sql");
    }

    #[test]
    fn rejects_path_traversal() {
        assert!(query_cache_path(Path::new("/tmp"), "../secret").is_err());
        assert!(query_cache_path(Path::new("/tmp"), "a/b").is_err());
        assert!(query_cache_path(Path::new("/tmp"), "").is_err());
    }
}
