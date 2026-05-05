from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_base_url: str = "http://localhost:8000"
    app_frontend_url: str = "http://localhost:3000"

    jwt_secret: str = Field(default="change-me", min_length=8)
    jwt_algorithm: str = "HS256"
    jwt_guest_ttl_days: int = 30
    jwt_admin_ttl_days: int = 30

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    telegram_bot_token: str = ""
    telegram_bot_username: str = ""

    seed_admins: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
