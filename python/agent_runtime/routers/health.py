from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel

from ..config import get_settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status:  str
    version: str
    ts:      str


class ReadinessResponse(BaseModel):
    status:       str
    dyson_api:    str
    embedding_model: str


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health() -> HealthResponse:
    cfg = get_settings()
    return HealthResponse(
        status="ok",
        version=cfg.app_version,
        ts=datetime.utcnow().isoformat() + "Z",
    )


@router.get("/health/ready", response_model=ReadinessResponse, summary="Readiness probe")
async def readiness() -> ReadinessResponse:
    cfg = get_settings()

    # Check Dyson API reachability
    import httpx
    dyson_status = "unreachable"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{cfg.dyson_api_url}/health")
            dyson_status = "ok" if resp.status_code == 200 else f"http_{resp.status_code}"
    except Exception:
        pass

    return ReadinessResponse(
        status="ok" if dyson_status == "ok" else "degraded",
        dyson_api=dyson_status,
        embedding_model=cfg.embedding_model,
    )
