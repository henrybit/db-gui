mod commands;
mod db;
mod error;
mod models;
mod runtime;
mod state;

use commands::{
    connect_session, create_database, delete_connection, disconnect_session, execute_sql,
    get_columns, get_ddl, list_charset_catalog, list_connections, list_databases, list_indexes,
    list_routines, list_tables, list_triggers, list_views, preview_table, table_row_count,
    test_connection, upsert_connection,
};
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let data_dir = app.path().app_data_dir()?;
            crate::runtime::handle();
            app.manage(AppState::load(data_dir)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_connections,
            upsert_connection,
            delete_connection,
            test_connection,
            connect_session,
            disconnect_session,
            list_databases,
            create_database,
            list_charset_catalog,
            list_tables,
            list_views,
            list_indexes,
            list_triggers,
            list_routines,
            get_columns,
            get_ddl,
            preview_table,
            table_row_count,
            execute_sql,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
