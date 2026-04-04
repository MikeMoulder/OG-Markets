from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "OG Markets"
    frontend_origin: str = "http://localhost:3000"

    # Database
    database_url: str = "sqlite+aiosqlite:///./og_markets.db"

    # CoinGecko
    coingecko_base_url: str = "https://api.coingecko.com/api/v3"

    # OpenGradient
    opengradient_enabled: bool = Field(default=True)
    opengradient_private_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OPENGRADIENT_PRIVATE_KEY", "OG_PRIVATE_KEY"),
    )
    opengradient_model: str = "anthropic/claude-sonnet-4-6"
    opengradient_settlement_mode: str = "BATCH_HASHED"
    opengradient_approval_amount: float = 5.0
    allow_mock_opengradient: bool = True

    # Cache & Rate Limits
    price_refresh_seconds: int = 60
    prediction_cache_ttl: int = 90
    rate_limit_requests: int = 30
    rate_limit_window_seconds: int = 60


settings = Settings()
