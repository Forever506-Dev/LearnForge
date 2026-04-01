"""
LearnForge — Application settings (Pydantic BaseSettings).
Reads from environment variables / .env file.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Placeholder values that must be replaced before deployment.
_PLACEHOLDER_JWT_SECRET = "CHANGE-ME-use-a-long-random-secret-in-production"
_PLACEHOLDER_ADMIN_PASSWORD = "ChangeMe!Admin1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # ── Database ──
    DATABASE_URL: str = "postgresql+asyncpg://learnforge:learnforge@postgres:5432/learnforge"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://learnforge:learnforge@postgres:5432/learnforge"

    # ── Redis ──
    REDIS_URL: str = "redis://redis:6379/0"

    # ── Auth / JWT ──
    JWT_SECRET: str = _PLACEHOLDER_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # ── Piston code runner ──
    PISTON_URL: str = "http://piston:2000"

    # ── CORS ──
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"

    # ── Lab Governance ──
    MAX_CONCURRENT_LABS: int = 3
    LAB_TTL_MINUTES: int = 120

    # ── Default Admin ──
    DEFAULT_ADMIN_EMAIL: str = "admin@learnforge.dev"
    DEFAULT_ADMIN_PASSWORD: str = _PLACEHOLDER_ADMIN_PASSWORD
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_DISPLAY_NAME: str = "Admin"

    @model_validator(mode="after")
    def _reject_placeholder_secrets(self) -> "Settings":
        """Refuse to start if critical secrets have not been replaced."""
        errors: list[str] = []

        if self.JWT_SECRET == _PLACEHOLDER_JWT_SECRET:
            errors.append(
                "JWT_SECRET is still set to the placeholder value. "
                "Generate one with: openssl rand -hex 32"
            )

        if self.DEFAULT_ADMIN_PASSWORD == _PLACEHOLDER_ADMIN_PASSWORD:
            errors.append(
                "DEFAULT_ADMIN_PASSWORD is still set to the placeholder value. "
                "Set a strong password in your .env file."
            )

        if len(self.JWT_SECRET) < 32:
            errors.append(
                "JWT_SECRET is too short (minimum 32 characters). "
                "Generate one with: openssl rand -hex 32"
            )

        if errors:
            raise ValueError(
                "LearnForge cannot start — insecure configuration detected:\n"
                + "\n".join(f"  • {e}" for e in errors)
                + "\n\nSee .env.example for setup instructions."
            )

        return self

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
