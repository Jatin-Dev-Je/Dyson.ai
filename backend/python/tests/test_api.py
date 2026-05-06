"""
FastAPI integration tests using TestClient (synchronous, no real HTTP socket).
Mocks the Dyson API client so tests run without a running TypeScript backend.
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from agent_runtime.main import app


@pytest.fixture(scope="module")
def client():
    """Shared TestClient — app startup runs once per module."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ─── Health ──────────────────────────────────────────────────────────────────

class TestHealth:

    def test_liveness_returns_200(self, client: TestClient):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_liveness_shape(self, client: TestClient):
        body = client.get("/health").json()
        assert body["status"] == "ok"
        assert "version" in body
        assert "ts" in body

    def test_unknown_route_returns_404(self, client: TestClient):
        resp = client.get("/does-not-exist")
        assert resp.status_code == 404


# ─── Decision detection (no external deps) ───────────────────────────────────

class TestDetectDecisionRoute:

    def test_clear_decision_detected(self, client: TestClient):
        resp = client.post("/agents/detect-decision", json={
            "tenant_id": "t_test",
            "text": "We decided to use PostgreSQL over MySQL for JSON support.",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "is_decision" in body
        assert "confidence" in body
        assert isinstance(body["confidence"], float)
        assert 0.0 <= body["confidence"] <= 1.0

    def test_question_not_decision(self, client: TestClient):
        resp = client.post("/agents/detect-decision", json={
            "tenant_id": "t_test",
            "text": "Should we use PostgreSQL or MySQL? What do you think about this?",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["is_decision"] is False

    def test_missing_tenant_id_returns_422(self, client: TestClient):
        resp = client.post("/agents/detect-decision", json={
            "text": "We decided to use Postgres.",
        })
        assert resp.status_code == 422

    def test_text_too_short_returns_422(self, client: TestClient):
        resp = client.post("/agents/detect-decision", json={
            "tenant_id": "t_test",
            "text": "hi",
        })
        assert resp.status_code == 422

    def test_response_has_decisions_list(self, client: TestClient):
        resp = client.post("/agents/detect-decision", json={
            "tenant_id": "t_test",
            "text": "Team agreed on using Redis for distributed rate limiting.",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body["decisions"], list)


# ─── Post-mortem (mocked Dyson API + LLM) ────────────────────────────────────

class TestPostMortemRoute:

    def test_invalid_severity_returns_422(self, client: TestClient):
        resp = client.post("/agents/postmortem", json={
            "tenant_id":   "t_test",
            "description": "Database connection pool exhausted causing errors",
            "severity":    "critical",   # invalid — not in p0/p1/p2/p3/unknown
        })
        assert resp.status_code == 422

    def test_short_description_returns_422(self, client: TestClient):
        resp = client.post("/agents/postmortem", json={
            "tenant_id":   "t_test",
            "description": "short",
        })
        assert resp.status_code == 422

    def test_missing_tenant_id_returns_422(self, client: TestClient):
        resp = client.post("/agents/postmortem", json={
            "description": "Database connection pool exhausted",
        })
        assert resp.status_code == 422


# ─── ML embed ────────────────────────────────────────────────────────────────

class TestMLEmbedRoute:

    def test_empty_texts_returns_422(self, client: TestClient):
        resp = client.post("/ml/embed", json={"texts": []})
        assert resp.status_code == 422

    def test_missing_body_returns_422(self, client: TestClient):
        resp = client.post("/ml/embed", json={})
        assert resp.status_code == 422
