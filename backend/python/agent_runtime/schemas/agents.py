from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


# ─── Enums ────────────────────────────────────────────────────────────────────

class AgentType(StrEnum):
    POSTMORTEM              = "postmortem"
    PR_REVIEW               = "pr_review"
    ONBOARDING              = "onboarding"
    DECISION_CAPTURE        = "decision_capture"
    WEEKLY_DIGEST           = "weekly_digest"
    RELATIONSHIP_INFERENCE  = "relationship_inference"
    CONFLICT_DETECTION      = "conflict_detection"
    PRE_MEETING_BRIEF       = "pre_meeting_brief"
    KNOWLEDGE_HEALTH        = "knowledge_health"
    ORCHESTRATOR            = "orchestrator"


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


# ─── Orchestrator ─────────────────────────────────────────────────────────────

class TriggerType(StrEnum):
    NEW_NODE         = "new_node"
    NEW_DECISION     = "new_decision"
    MEETING_SOON     = "meeting_soon"
    SCHEDULED_DIGEST = "scheduled_digest"
    HEALTH_CHECK     = "health_check"
    INCIDENT         = "incident"
    PR_OPENED        = "pr_opened"


class OrchestratorRequest(BaseModel):
    tenant_id:    str
    trigger_type: TriggerType
    payload:      dict[str, Any] = Field(default_factory=dict)


class OrchestratorResponse(BaseModel):
    run_id:       str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    trigger_type: str
    agent_used:   str
    success:      bool
    output:       dict[str, Any]
    latency_ms:   int
    error:        str | None = None
    triggered_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Relationship inference ───────────────────────────────────────────────────

class RelationshipInferenceRequest(BaseModel):
    tenant_id:    str
    node_id:      str
    node_title:   str
    node_summary: str = ""
    node_source:  str = "unknown"
    node_type:    str = "context"


class InferredEdge(BaseModel):
    from_id:    str
    to_id:      str
    type:       str
    confidence: float = Field(ge=0.0, le=1.0)
    reason:     str


class RelationshipInferenceResponse(BaseModel):
    run_id:        str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    node_id:       str
    edges_created: int
    new_edges:     list[InferredEdge]
    resolved_questions: list[str]
    challenged_beliefs: list[str]
    confidence:    float = Field(ge=0.0, le=1.0)
    latency_ms:    int


# ─── Conflict detection ───────────────────────────────────────────────────────

class ConflictDetectionRequest(BaseModel):
    tenant_id:        str
    decision_id:      str
    decision_title:   str
    decision_summary: str = ""
    decision_source:  str = "unknown"


class DetectedConflict(BaseModel):
    item_id:         str
    item_type:       str
    statement:       str
    conflict_reason: str
    severity:        str
    confidence:      float = Field(ge=0.0, le=1.0)


class ConflictDetectionResponse(BaseModel):
    run_id:       str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    decision_id:  str
    has_conflicts: bool
    severity:     str
    conflicts:    list[DetectedConflict]
    conflict_ids: list[str]
    alert_sent:   bool
    latency_ms:   int


# ─── Pre-meeting brief ────────────────────────────────────────────────────────

class PreMeetingBriefRequest(BaseModel):
    tenant_id:     str
    meeting_id:    str
    meeting_title: str
    meeting_time:  str
    attendee_ids:  list[str] = []
    agenda:        str | None = None


class BriefSection(BaseModel):
    heading: str
    items:   list[str]


class PreMeetingBriefResponse(BaseModel):
    run_id:        str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    meeting_id:    str
    brief_id:      str | None
    title:         str
    summary:       str
    sections:      list[BriefSection]
    sent_to:       list[str]
    latency_ms:    int


# ─── Digest ───────────────────────────────────────────────────────────────────

class DigestRequest(BaseModel):
    tenant_id:     str
    team:          str
    recipient_ids: list[str] = []
    period_days:   int = Field(default=7, ge=1, le=30)


class DigestSection(BaseModel):
    type:    str
    title:   str
    items:   list[Any] = []
    content: str = ""
    data:    dict[str, Any] = Field(default_factory=dict)


class DigestResponse(BaseModel):
    run_id:         str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    team:           str
    digest_id:      str | None
    title:          str
    sections:       list[DigestSection]
    decision_count: int
    question_count: int
    sent_count:     int
    latency_ms:     int


# ─── Knowledge health ─────────────────────────────────────────────────────────

class HealthScores(BaseModel):
    overall:      float
    freshness:    float
    connectivity: float
    coverage:     float
    conflicts:    float


class KnowledgeHealthResponse(BaseModel):
    run_id:            str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}")
    health_id:         str | None
    scores:            HealthScores
    total_decisions:   int
    stale_count:       int
    at_risk_count:     int
    open_questions:    int
    unresolved_conflicts: int
    recommendations:   list[str]
    report_title:      str
    latency_ms:        int
