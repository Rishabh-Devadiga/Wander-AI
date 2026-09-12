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
    # Live hotel search (SerpApi Google Hotels, backend-only). Empty key
    # disables live search; endpoints then report provider-unavailable.
    SERPAPI_API_KEY: str = ""
    SERPAPI_BASE_URL: str = "https://serpapi.com"
    SERPAPI_TIMEOUT_S: float = 20.0
    SERPAPI_MAX_RESULTS: int = 10
    # Live places/attractions (keyless providers, backend-only).
    NOMINATIM_API_URL: str = "https://nominatim.openstreetmap.org"
    OVERPASS_API_URL: str = "https://overpass-api.de/api/interpreter"
    COMMONS_API_URL: str = "https://commons.wikimedia.org/w/api.php"
    PLACES_TIMEOUT_S: float = 8.0
    PLACES_RADIUS_M: int = 30000
    PLACES_MAX_RESULTS: int = 12

settings = Settings()

