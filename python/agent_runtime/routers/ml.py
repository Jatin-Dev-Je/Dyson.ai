import logging
from fastapi import APIRouter, HTTPException

from ..schemas import EmbedRequest, EmbedResponse
from ..ml.embeddings import embed
from ..config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ml", tags=["ML"])


@router.post(
    "/embed",
    response_model=EmbedResponse,
    summary="Embed texts using local sentence-transformers",
    description=(
        "Encodes a batch of texts into L2-normalised float32 vectors using the "
        "configured sentence-transformers model. Vectors are ready for cosine "
        "similarity search (dot product on normalised vectors). "
        "Max 100 texts per request."
    ),
)
async def embed_texts(req: EmbedRequest) -> EmbedResponse:
    cfg = get_settings()
    logger.info("[route] POST /ml/embed texts=%d", len(req.texts))

    try:
        vectors = embed(req.texts, cfg.embedding_model)
    except Exception as e:
        logger.exception("[route] embedding failed")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}") from e

    return EmbedResponse(
        embeddings=vectors,
        model=cfg.embedding_model,
        dim=len(vectors[0]) if vectors else cfg.embedding_dim,
    )
