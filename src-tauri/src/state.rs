use crate::db::{DatabaseEngine, LiveEngine};
use crate::error::{AppError, AppResult};
use crate::models::ConnectionProfile;
use crate::runtime::{run_blocking, run_db};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::sync::RwLock;

#[derive(Serialize, Deserialize, Default)]
struct StoredProfiles {
    connections: Vec<ConnectionProfile>,
}

pub struct AppState {
    data_file: PathBuf,
    profiles: RwLock<Vec<ConnectionProfile>>,
    sessions: DashMap<String, LiveEngine>,
}

impl AppState {
    pub fn load(data_dir: PathBuf) -> AppResult<Self> {
        std::fs::create_dir_all(&data_dir)?;
        let data_file = data_dir.join("connections.json");
        let profiles = if data_file.exists() {
            let raw = std::fs::read_to_string(&data_file)?;
            serde_json::from_str::<StoredProfiles>(&raw)?.connections
        } else {
            Vec::new()
        };

        Ok(Self {
            data_file,
            profiles: RwLock::new(profiles),
            sessions: DashMap::new(),
        })
    }

    pub async fn list_profiles(&self) -> Vec<ConnectionProfile> {
        self.profiles.read().await.clone()
    }

    pub async fn upsert_profile(&self, mut profile: ConnectionProfile) -> AppResult<ConnectionProfile> {
        if profile.name.trim().is_empty() {
            return Err(AppError::msg("connection name is required"));
        }
        if profile.host.trim().is_empty() {
            return Err(AppError::msg("host is required"));
        }
        let engine_kind = profile.engine_kind()?;
        profile.engine = engine_kind.as_str().to_string();
        if profile.port == 0 {
            profile.port = engine_kind.default_port();
        }
        if profile.id.trim().is_empty() {
            profile.id = uuid::Uuid::new_v4().to_string();
        }
        if !profile.save_password {
            profile.password = None;
        }

        {
            let mut profiles = self.profiles.write().await;
            if let Some(existing) = profiles.iter_mut().find(|item| item.id == profile.id) {
                *existing = profile.clone();
            } else {
                profiles.push(profile.clone());
            }
        }
        self.persist().await?;
        Ok(profile)
    }

    pub async fn delete_profile(&self, id: &str) -> AppResult<()> {
        self.disconnect(id).await.ok();
        {
            let mut profiles = self.profiles.write().await;
            let before = profiles.len();
            profiles.retain(|item| item.id != id);
            if profiles.len() == before {
                return Err(AppError::ProfileNotFound(id.to_string()));
            }
        }
        self.persist().await
    }

    pub async fn get_profile(&self, id: &str) -> AppResult<ConnectionProfile> {
        self.profiles
            .read()
            .await
            .iter()
            .find(|item| item.id == id)
            .cloned()
            .ok_or_else(|| AppError::ProfileNotFound(id.to_string()))
    }

    pub async fn connect(&self, id: &str, password_override: Option<String>) -> AppResult<()> {
        if self.sessions.contains_key(id) {
            return Ok(());
        }
        let mut profile = self.get_profile(id).await?;
        if let Some(password) = password_override {
            profile.password = Some(password);
        }
        let engine = run_db(async move {
            let engine = LiveEngine::from_profile(&profile)?;
            match engine.ping().await {
                Ok(()) => Ok(engine),
                Err(error) => {
                    let _ = engine.close().await;
                    Err(error)
                }
            }
        })
        .await?;
        self.sessions.insert(id.to_string(), engine);
        Ok(())
    }

    pub async fn disconnect(&self, id: &str) -> AppResult<()> {
        let engine = self.sessions.remove(id).map(|(_, engine)| engine);
        if let Some(engine) = engine {
            run_db(async move { engine.close().await }).await?;
        }
        Ok(())
    }

    pub fn is_connected(&self, id: &str) -> bool {
        self.sessions.contains_key(id)
    }

    pub fn engine(&self, id: &str) -> AppResult<LiveEngine> {
        self.sessions
            .get(id)
            .map(|entry| entry.clone())
            .ok_or_else(|| AppError::NotConnected(id.to_string()))
    }

    async fn persist(&self) -> AppResult<()> {
        let profiles = self.profiles.read().await;
        let stored = StoredProfiles {
            connections: profiles.iter().map(ConnectionProfile::sanitized).collect(),
        };
        drop(profiles);
        let json = serde_json::to_string_pretty(&stored)?;
        let path = self.data_file.clone();
        run_blocking(move || {
            std::fs::write(path, json)?;
            Ok(())
        })
        .await
    }
}
