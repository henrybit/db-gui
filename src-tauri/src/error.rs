use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),
    #[error("connection not found: {0}")]
    NotConnected(String),
    #[error("profile not found: {0}")]
    ProfileNotFound(String),
    #[error(transparent)]
    Mysql(#[from] mysql_async::Error),
    #[error(transparent)]
    Postgres(#[from] tokio_postgres::Error),
    #[error("{0}")]
    PgPool(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

impl AppError {
    pub fn msg(text: impl Into<String>) -> Self {
        Self::Message(text.into())
    }
}

impl From<deadpool_postgres::PoolError> for AppError {
    fn from(error: deadpool_postgres::PoolError) -> Self {
        Self::PgPool(error.to_string())
    }
}

impl From<deadpool_postgres::CreatePoolError> for AppError {
    fn from(error: deadpool_postgres::CreatePoolError) -> Self {
        Self::PgPool(error.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
