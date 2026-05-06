"""
Local embedding pipeline using sentence-transformers.

Loaded once at startup (heavy model, ~90 MB). All requests share the
same instance — thread-safe, no GPU needed for this model size.

Falls back to Cohere API when COHERE_API_KEY is configured (1024-dim
vs 384-dim local — higher quality for production, but costs money).
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_model(model_name: str) -> "SentenceTransformer":
    from sentence_transformers import SentenceTransformer  # lazy import — heavy

    logger.info("loading embedding model: %s", model_name)
    model = SentenceTransformer(model_name)
    logger.info("embedding model ready — dim=%d", model.get_sentence_embedding_dimension())
    return model


def embed(texts: list[str], model_name: str = "all-MiniLM-L6-v2") -> list[list[float]]:
    """
    Encode a batch of texts into normalised float32 vectors.

    Returns a list of vectors — one per input text.
    Vectors are L2-normalised (cosine similarity == dot product).
    """
    if not texts:
        return []

    model = _load_model(model_name)

    # encode() returns np.ndarray shape (N, dim)
    vectors: np.ndarray = model.encode(
        texts,
        batch_size=32,
        normalize_embeddings=True,   # L2 normalise — cosine similarity becomes dot product
        show_progress_bar=False,
    )

    return vectors.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    Cosine similarity between two pre-normalised vectors.
    Since vectors are L2-normalised, this is just the dot product.
    """
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.dot(va, vb))


def top_k(
    query: list[float],
    candidates: list[tuple[str, list[float]]],   # (id, vector)
    k: int = 10,
) -> list[tuple[str, float]]:
    """
    Return the top-k candidates by cosine similarity.
    Returns list of (id, score) sorted descending.
    """
    scored = [
        (cid, cosine_similarity(query, vec))
        for cid, vec in candidates
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:k]
