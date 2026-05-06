from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ───────────────────────────────────────────────────────────────
    app_name: str = "Dyson Agent Runtime"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "INFO"

    # ── Dyson API ─────────────────────────────────────────────────────────
    dyson_api_url: str = "http://localhost:8080"
    dyson_api_key: str = ""

    # ── LLM ──────────────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash-latest"
    openai_api_key: str = ""                       # optional fallback

    # ── Embeddings ────────────────────────────────────────────────────────
    # Local sentence-transformers model — free, privacy-preserving
    # Falls back to Cohere API when COHERE_API_KEY is set
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384
    cohere_api_key: str = ""

    # ── Agent runtime ────────────────────────────────────────────────────
    agent_timeout_seconds: int = 120
    max_context_nodes: int = 12
    confidence_threshold: float = 0.72

    # ── NLP ──────────────────────────────────────────────────────────────
    spacy_model: str = "en_core_web_sm"

    # ── CORS ─────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8080"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
