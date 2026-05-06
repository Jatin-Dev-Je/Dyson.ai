"""
Unit tests for the ML pipelines.
These run without a GPU, without the Dyson API, without any LLM keys.
"""
import pytest
from agent_runtime.ml.decision_detector import detect, batch_detect, DetectionResult
from agent_runtime.ml.embeddings import cosine_similarity


# ─── Decision detector ────────────────────────────────────────────────────────

class TestDecisionDetector:

    def test_clear_decision_detected(self):
        result = detect("We decided to use pgvector over Pinecone for cost reasons.")
        assert result.is_decision is True
        assert result.confidence > 0.35
        assert len(result.signals) > 0
        assert len(result.title) > 0

    def test_question_not_a_decision(self):
        result = detect("Should we use pgvector or Pinecone? What do you think?")
        assert result.is_decision is False

    def test_empty_text_returns_false(self):
        result = detect("")
        assert result.is_decision is False
        assert result.confidence == 0.0

    def test_short_text_returns_false(self):
        result = detect("ok")
        assert result.is_decision is False

    def test_going_with_pattern(self):
        result = detect("We're going with FastAPI for the agent runtime, not Flask.")
        assert result.is_decision is True
        assert "going with" in result.signals

    def test_agreed_on_pattern(self):
        result = detect("Team agreed on cursor-based pagination for all list endpoints.")
        assert result.is_decision is True

    def test_negative_decision(self):
        result = detect("We won't use Redis for session storage due to persistence concerns.")
        assert result.is_decision is True

    def test_confidence_is_normalised(self):
        for text in [
            "We decided to migrate to TypeScript.",
            "Maybe we should consider Python.",
            "Hello world",
        ]:
            result = detect(text)
            assert 0.0 <= result.confidence <= 1.0

    def test_batch_detect_maintains_order(self):
        texts = [
            "We decided to use PostgreSQL.",
            "Should we use MySQL?",
            "Team agreed on microservices architecture.",
        ]
        results = batch_detect(texts)
        assert len(results) == 3
        assert results[0].is_decision is True
        assert results[1].is_decision is False
        assert results[2].is_decision is True

    def test_result_has_required_fields(self):
        result = detect("We decided to deprecate the v1 API.")
        assert isinstance(result, DetectionResult)
        assert isinstance(result.is_decision, bool)
        assert isinstance(result.confidence, float)
        assert isinstance(result.signals, list)
        assert isinstance(result.title, str)
        assert isinstance(result.summary, str)


# ─── Embeddings ───────────────────────────────────────────────────────────────

class TestCosimeSimilarity:
    """Tests cosine similarity without loading the heavy model."""

    def test_identical_vectors_have_similarity_one(self):
        v = [0.6, 0.8]
        assert cosine_similarity(v, v) == pytest.approx(1.0, abs=1e-5)

    def test_orthogonal_vectors_have_similarity_zero(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert cosine_similarity(a, b) == pytest.approx(0.0, abs=1e-5)

    def test_opposite_vectors_have_negative_similarity(self):
        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        assert cosine_similarity(a, b) == pytest.approx(-1.0, abs=1e-5)

    def test_similarity_is_commutative(self):
        a = [0.3, 0.7, 0.5]
        b = [0.8, 0.2, 0.1]
        assert cosine_similarity(a, b) == pytest.approx(cosine_similarity(b, a), abs=1e-5)
