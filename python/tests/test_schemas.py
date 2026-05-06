"""
Pydantic v2 schema validation tests.
Fast, no external dependencies.
"""
import pytest
from datetime import datetime
from pydantic import ValidationError

from agent_runtime.schemas import (
    PostMortemRequest, PRReviewRequest, OnboardingRequest,
    DetectDecisionRequest, EmbedRequest,
    MemoryType, AgentType, AgentStatus,
)


class TestPostMortemRequest:

    def test_valid_request(self):
        req = PostMortemRequest(
            tenant_id="t_abc123",
            description="Database connection pool exhausted causing 500 errors on /api/users",
            severity="p1",
        )
        assert req.tenant_id == "t_abc123"
        assert req.severity == "p1"

    def test_description_stripped(self):
        req = PostMortemRequest(
            tenant_id="t_abc",
            description="  Auth service went down  ",
        )
        assert req.description == "Auth service went down"

    def test_description_too_short_raises(self):
        with pytest.raises(ValidationError):
            PostMortemRequest(tenant_id="t_abc", description="short")

    def test_invalid_severity_raises(self):
        with pytest.raises(ValidationError):
            PostMortemRequest(
                tenant_id="t_abc",
                description="Valid incident description here",
                severity="critical",   # not in pattern
            )

    def test_optional_fields_default_none(self):
        req = PostMortemRequest(
            tenant_id="t_abc",
            description="Something broke in production today",
        )
        assert req.incident_id is None
        assert req.channel_id is None
        assert req.repo is None

    def test_default_severity_is_unknown(self):
        req = PostMortemRequest(
            tenant_id="t_abc",
            description="Something broke in production today",
        )
        assert req.severity == "unknown"


class TestPRReviewRequest:

    def test_valid_request(self):
        req = PRReviewRequest(
            tenant_id="t_abc",
            pr_number=123,
            repo="acme/backend",
            title="feat: add Redis rate limiting",
        )
        assert req.pr_number == 123
        assert req.repo == "acme/backend"

    def test_changed_files_defaults_empty(self):
        req = PRReviewRequest(
            tenant_id="t_abc",
            pr_number=1,
            repo="acme/api",
            title="fix: null check",
        )
        assert req.changed_files == []


class TestDetectDecisionRequest:

    def test_valid_request(self):
        req = DetectDecisionRequest(
            tenant_id="t_abc",
            text="We decided to use PostgreSQL over MySQL for JSON support.",
        )
        assert req.source == "manual"  # default

    def test_invalid_source_raises(self):
        with pytest.raises(ValidationError):
            DetectDecisionRequest(
                tenant_id="t_abc",
                text="Some decision text here...",
                source="twitter",   # not in enum
            )

    def test_text_too_short_raises(self):
        with pytest.raises(ValidationError):
            DetectDecisionRequest(tenant_id="t_abc", text="ok")


class TestEmbedRequest:

    def test_valid_request(self):
        req = EmbedRequest(texts=["hello world", "foo bar"])
        assert len(req.texts) == 2

    def test_empty_list_raises(self):
        with pytest.raises(ValidationError):
            EmbedRequest(texts=[])


class TestEnums:

    def test_memory_types_are_complete(self):
        expected = {"decision", "incident", "standard", "context", "constraint", "outcome"}
        actual = {t.value for t in MemoryType}
        assert actual == expected

    def test_agent_types_are_complete(self):
        expected = {"postmortem", "pr_review", "onboarding", "decision_capture", "weekly_digest"}
        actual = {t.value for t in AgentType}
        assert actual == expected

    def test_agent_statuses_are_complete(self):
        expected = {"pending", "running", "completed", "failed"}
        actual = {s.value for s in AgentStatus}
        assert actual == expected
