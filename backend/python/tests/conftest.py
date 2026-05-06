"""
Shared pytest fixtures for the agent runtime test suite.

Fixtures here are available in all test files without importing.
"""
import os
import pytest
from fastapi.testclient import TestClient

# Set test environment before importing app (prevents real model loading on startup)
os.environ.setdefault("DYSON_API_URL",  "http://localhost:8080")
os.environ.setdefault("GEMINI_API_KEY", "test-key-not-real")
os.environ.setdefault("DEBUG",          "true")


@pytest.fixture(scope="session")
def client():
    """
    Shared TestClient for the full FastAPI app.
    Session-scoped: app starts once, reused across all test modules.
    Significantly faster than module-scoped for large test suites.
    """
    from agent_runtime.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def anyio_backend():
    """Use asyncio for all async tests (required by pytest-asyncio)."""
    return "asyncio"
