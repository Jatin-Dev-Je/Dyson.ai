"""
Dyson Agent Runtime — FastAPI microservice.

Handles all Python-native workloads:
  - LangGraph agent orchestration (post-mortem, PR review, onboarding)
  - NLP pipelines (spaCy decision detection, entity extraction)
  - Local embeddings (sentence-transformers)

Called by the TypeScript Fastify backend via HTTP. All heavy ML models
are loaded once at startup via the lifespan context manager.

Architecture decision:
  Separate microservice (not merged into Fastify) because:
  1. Python-only ML ecosystem (sentence-transformers, spaCy, LangGraph)
  2. Independent scaling — ML inference can be CPU/GPU bound
  3. Clean language boundary — TypeScript owns auth/routing, Python owns inference
"""
from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import agents_router, ml_router, health_router

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("dyson.agent_runtime")


# ─── Startup / shutdown ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Warm up expensive resources on startup so the first request is fast.
    Sentence-transformers model is ~90 MB — loading takes ~3s cold.
    """
    cfg = get_settings()
    logger.info("starting Dyson Agent Runtime v%s", cfg.app_version)

    # Pre-warm embedding model (lazy-loaded singleton)
    try:
        from .ml.embeddings import _load_model
        _load_model(cfg.embedding_model)
        logger.info("embedding model warm: %s", cfg.embedding_model)
    except Exception as e:
        logger.warning("embedding model warm-up failed (will retry on first request): %s", e)

    # Pre-warm spaCy model
    try:
        from .ml.decision_detector import _load_nlp
        _load_nlp(cfg.spacy_model)
        logger.info("spaCy model warm: %s", cfg.spacy_model)
    except Exception as e:
        logger.warning("spaCy warm-up failed (will retry on first request): %s", e)

    logger.info("agent runtime ready — listening on :8001")
    yield

    logger.info("shutting down agent runtime")


# ─── App ──────────────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    cfg = get_settings()

    app = FastAPI(
        title=cfg.app_name,
        version=cfg.app_version,
        description=(
            "Python agent runtime for Dyson. Provides LangGraph agents, "
            "NLP pipelines, and local embeddings. Called by the Fastify API."
        ),
        lifespan=lifespan,
        docs_url="/docs" if cfg.debug else None,
        redoc_url="/redoc" if cfg.debug else None,
    )

    # CORS — only the Fastify backend + frontend should call this service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # ── Routers ───────────────────────────────────────────────────────────
    app.include_router(health_router)
    app.include_router(agents_router)
    app.include_router(ml_router)

    # ── Global error handler ─────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "INTERNAL_ERROR", "message": "Something went wrong"}},
        )

    return app


app = create_app()


if __name__ == "__main__":
    uvicorn.run(
        "agent_runtime.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
    )
