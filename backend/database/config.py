from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
    )

    PROJECT_NAME: str = "TourFlow AI"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    BACKEND_PORT: int = 8000
    DATABASE_URL: str
    GEMINI_API_KEY: str = ""

settings = Settings()

