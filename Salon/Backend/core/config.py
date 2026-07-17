"""Konfiguracija aplikacije.

Postavke se učitavaju iz .env datoteke (Backend/.env) preko pydantic-settings.
Ne držimo tajne (lozinke) u kodu — sve dolazi iz okoline / .env datoteke.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env se traži pored ove datoteke: Backend/.env (config.py je u Backend/core/).
# Rezolvira se apsolutno da radi neovisno o tome iz kojeg foldera pokrećemo uvicorn.
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Postavke spajanja na PostgreSQL bazu."""

    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_user: str
    postgres_password: str
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str

    @property
    def database_url(self) -> str:
        """SQLAlchemy/SQLModel URL za sinkroni psycopg (v3) driver."""
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


# Jedna instanca koju uvozi ostatak aplikacije.
settings = Settings()
