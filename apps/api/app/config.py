from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _env_files() -> tuple[str, ...]:
    """Collect nearby .env paths without assuming monorepo depth (Docker-safe)."""
    found: list[str] = []
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / ".env"
        if candidate.is_file():
            found.append(str(candidate))
        # Stop at filesystem root
        if parent.parent == parent:
            break
    # Also allow a process cwd .env (and keep order: nearest first)
    cwd_env = Path.cwd() / ".env"
    if cwd_env.is_file() and str(cwd_env) not in found:
        found.append(str(cwd_env))
    return tuple(found) if found else (".env",)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://signal:signal@localhost:5437/signal"

    # openai | azure
    llm_provider: str = "openai"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    embed_model: str = "text-embedding-3-small"
    stt_model: str = "whisper-1"
    tts_model: str = ""

    # Azure OpenAI
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_api_version: str = "2024-08-01-preview"
    azure_chat_deployment: str = "gpt-4o"
    azure_embedding_deployment: str = "text-embedding-3-small"

    # Azure AI Speech
    stt_provider: str = "openai"  # openai | azure
    azure_speech_key: str = ""
    azure_speech_region: str = "swedencentral"
    azure_tts_voice: str = "en-GB-SoniaNeural"

    demo_cache: int = 0
    approach_budget_default: int = 5
    match_direct_threshold: float = 0.85
    match_transferable_threshold: float = 0.70
    cors_origins: str = "http://localhost:3000"

    # Auth: demo personas remain available when allow_demo=1 (hackathon / local).
    auth_allow_demo: int = 1
    auth_expose_dev_link: int = 1
    auth_session_hours: int = 72
    auth_magic_link_minutes: int = 30
    auth_secret: str = "dev-only-change-me"
    app_public_url: str = "http://localhost:3000"
    privacy_notice_version: str = "2026-11-14"

    # Railway / production: run idempotent seed once on boot
    seed_on_startup: int = 0

    def sqlalchemy_url(self) -> str:
        """Railway often injects postgres:// — SQLAlchemy+psycopg needs postgresql+psycopg://."""
        url = self.database_url.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and "+psycopg" not in url:
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
