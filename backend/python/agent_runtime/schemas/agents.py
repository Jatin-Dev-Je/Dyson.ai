from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


# ─── Enums ────────────────────────────────────────────────────────────────────

class AgentType(StrEnum):
    POSTMORTEM       = "postmortem"
    PR_REVIEW        = "pr_review"
    ONBOARDING       = "onboarding"
    DECISION_CAPTURE = "decision_capture"
    WEEKLY_DIGEST    = "weekly_digest"


class AgentStatus(StrEnum):
    PENDING   = "pending"
    RUNNING   = "running"
    COMPLETED = "completed"
    FAILED    = "failed"


class MemoryType(StrEnum):
    DECISION   = "decision"
    INCIDENT   = "incident"
    STANDARD   = "standard"
    CONTEXT    = "context"
    CONSTRAINT = "constraint"
    OUTCOME    = "outcome"


# ─── Shared ───────────────────────────────────────────────────────────────────

class Citation(BaseModel):
    claim:       str
    source_url:  str | None = None
    source_id:   str | None = None
    confidence:  float = Field(ge=0.0, le=1.0)


class MemoryNode(BaseModel):
    id:           str
    title:        str
    summary:      str
    type:         MemoryType
    source:       str
    source_url:   str | None = None
    occurred_at:  datetime | None = None
    confidence:   float = Field(ge=0.0, le=1.0, default=1.0)


# ─── Post-mortem ──────────────────────────────────────────────────────────────

class PostMortemRequest(BaseModel):
    tenant_id:   str
    incident_id: str | None = None
    description: str = Field(min_length=10, max_length=2000)
    severity:    str = Field(default="unknown", pattern=r"^(p0|p1|p2|p3|unknown)$")
    started_at:  datetime | None = None
    channel_id:  str | None = None      # Slack channel to pull messages from
    repo:        str | None = None      # GitHub repo to pull events from

    @field_validator("description")
    @classmethod
    def strip_description(cls, v: str) -> str:
        return v.strip()


class PostMortemSection(BaseModel):
    title:    str
    content:  str
    citations: list[Citation] = []


class PostMortemResponse(BaseModel):
    run_id:        str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    incident_id:   str | None
    severity:      str
    title:         str
    sections:      list[PostMortemSection]
    action_items:  list[str]
    related_past_incidents: list[MemoryNode]
    confidence:    float = Field(ge=0.0, le=1.0)
    generated_at:  datetime = Field(default_factory=datetime.utcnow)
    latency_ms:    int


# ─── PR Review ────────────────────────────────────────────────────────────────

class PRReviewRequest(BaseModel):
    tenant_id:   str
    pr_number:   int
    repo:        str
    title:       str
    description: str = ""
    diff_summary: str = ""             # summarised diff, not full patch
    changed_files: list[str] = []


class PRReviewComment(BaseModel):
    type:       str = Field(pattern=r"^(warning|info|decision|constraint)$")
    message:    str
    citations:  list[Citation] = []
    severity:   str = Field(default="info", pattern=r"^(high|medium|low|info)$")


class PRReviewResponse(BaseModel):
    run_id:        str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    pr_number:     int
    repo:          str
    comments:      list[PRReviewComment]
    related_decisions: list[MemoryNode]
    confidence:    float = Field(ge=0.0, le=1.0)
    generated_at:  datetime = Field(default_factory=datetime.utcnow)
    latency_ms:    int


# ─── Onboarding ───────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    tenant_id:    str
    member_name:  str = Field(min_length=2)
    team:         str
    role:         str
    focus_areas:  list[str] = []      # e.g. ["auth", "payments", "infra"]


class OnboardingSection(BaseModel):
    title:    str
    summary:  str
    memories: list[MemoryNode]


class OnboardingResponse(BaseModel):
    run_id:        str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    member_name:   str
    team:          str
    sections:      list[OnboardingSection]
    key_people:    list[str]
    must_reads:    list[MemoryNode]
    generated_at:  datetime = Field(default_factory=datetime.utcnow)
    latency_ms:    int


# ─── Decision detection ───────────────────────────────────────────────────────

class DetectDecisionRequest(BaseModel):
    tenant_id:  str
    text:       str = Field(min_length=5, max_length=10_000)
    source:     str = Field(default="manual", pattern=r"^(slack|github|notion|linear|manual)$")
    source_url: str | None = None
    author:     str | None = None


class DetectedDecision(BaseModel):
    title:      str
    summary:    str
    confidence: float = Field(ge=0.0, le=1.0)
    signals:    list[str]           # phrases that triggered detection
    suggested_type: MemoryType


class DetectDecisionResponse(BaseModel):
    is_decision:  bool
    confidence:   float = Field(ge=0.0, le=1.0)
    decisions:    list[DetectedDecision]


# ─── Agent run (generic status) ───────────────────────────────────────────────

class AgentRunStatus(BaseModel):
    run_id:     str
    agent_type: AgentType
    status:     AgentStatus
    started_at: datetime
    ended_at:   datetime | None = None
    error:      str | None = None
    output:     dict[str, Any] | None = None


# ─── Embedding ───────────────────────────────────────────────────────────────

class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model:      str
    dim:        int
