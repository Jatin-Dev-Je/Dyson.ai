import time
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..schemas import (
    PostMortemRequest, PostMortemResponse, PostMortemSection,
    PRReviewRequest, PRReviewResponse, PRReviewComment,
    OnboardingRequest, OnboardingResponse,
    DetectDecisionRequest, DetectDecisionResponse, DetectedDecision,
    OrchestratorRequest, OrchestratorResponse,
    RelationshipInferenceRequest, RelationshipInferenceResponse, InferredEdge,
    ConflictDetectionRequest, ConflictDetectionResponse, DetectedConflict,
    PreMeetingBriefRequest, PreMeetingBriefResponse, BriefSection,
    DigestRequest, DigestResponse, DigestSection,
    KnowledgeHealthResponse, HealthScores,
    MemoryNode, MemoryType, Citation,
)
from ..agents.postmortem            import run_postmortem
from ..agents.pr_review             import run_pr_review
from ..agents.relationship_inference import run_relationship_inference
from ..agents.conflict_detection    import run_conflict_detection
from ..agents.pre_meeting_brief     import run_pre_meeting_brief
from ..agents.digest                import run_digest
from ..agents.knowledge_health      import run_knowledge_health
from ..agents.orchestrator          import dispatch as orchestrate
from ..ml.decision_detector         import detect

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["Agents"])


# ─── Post-mortem ─────────────────────────────────────────────────────────────

@router.post(
    "/postmortem",
    response_model=PostMortemResponse,
    summary="Generate a post-mortem from an incident description",
    description=(
        "Runs the post-mortem LangGraph pipeline: gathers context from Dyson memory, "
        "analyses the incident timeline, identifies root cause, and returns a structured "
        "post-mortem with action items — typically in under 30 seconds."
    ),
)
async def create_postmortem(req: PostMortemRequest) -> PostMortemResponse:
    t0 = time.monotonic()
    logger.info("[route] POST /agents/postmortem tenant=%s", req.tenant_id)

    try:
        state = await run_postmortem(
            tenant_id=req.tenant_id,
            description=req.description,
            severity=req.severity,
            incident_id=req.incident_id,
            channel_id=req.channel_id,
            repo=req.repo,
        )
    except Exception as e:
        logger.exception("[route] postmortem failed")
        raise HTTPException(status_code=500, detail=str(e)) from e

    latency_ms = int((time.monotonic() - t0) * 1000)

    return PostMortemResponse(
        incident_id=req.incident_id,
        severity=req.severity,
        title=state.get("title", f"Post-mortem: {req.description[:60]}"),
        sections=[
            PostMortemSection(
                title=s["title"],
                content=s["content"],
                citations=[Citation(**c) for c in s.get("citations", [])],
            )
            for s in state.get("sections", [])
        ],
        action_items=state.get("action_items", []),
        related_past_incidents=[
            MemoryNode(
                id=m.get("id", ""),
                title=m.get("title", ""),
                summary=m.get("summary", ""),
                type=MemoryType(m.get("type", "incident")),
                source=m.get("source", "unknown"),
                source_url=m.get("sourceUrl"),
                confidence=m.get("confidence", 1.0),
            )
            for m in state.get("past_incidents", [])
        ],
        confidence=state.get("confidence", 0.0),
        latency_ms=latency_ms,
    )


# ─── PR Review ───────────────────────────────────────────────────────────────

@router.post(
    "/pr-review",
    response_model=PRReviewResponse,
    summary="Review a pull request against company memory",
    description=(
        "Searches Dyson memory for decisions and constraints related to the PR. "
        "Returns inline comments with severity labels. Designed to be posted as a "
        "GitHub PR comment by the GitHub bot."
    ),
)
async def review_pr(req: PRReviewRequest) -> PRReviewResponse:
    t0 = time.monotonic()
    logger.info("[route] POST /agents/pr-review pr=#%s repo=%s", req.pr_number, req.repo)

    try:
        state = await run_pr_review(
            tenant_id=req.tenant_id,
            pr_number=req.pr_number,
            repo=req.repo,
            title=req.title,
            description=req.description,
            diff_summary=req.diff_summary,
            changed_files=req.changed_files,
        )
    except Exception as e:
        logger.exception("[route] pr-review failed")
        raise HTTPException(status_code=500, detail=str(e)) from e

    latency_ms = int((time.monotonic() - t0) * 1000)

    return PRReviewResponse(
        pr_number=req.pr_number,
        repo=req.repo,
        comments=[
            PRReviewComment(
                type=c.get("type", "info"),
                severity=c.get("severity", "info"),
                message=c.get("message", ""),
                citations=[Citation(**ci) for ci in c.get("citations", [])],
            )
            for c in state.get("comments", [])
        ],
        related_decisions=[
            MemoryNode(
                id=m.get("id", ""),
                title=m.get("title", ""),
                summary=m.get("summary", ""),
                type=MemoryType(m.get("type", "decision")),
                source=m.get("source", "unknown"),
                source_url=m.get("sourceUrl"),
                confidence=m.get("confidence", 1.0),
            )
            for m in state.get("related_memories", [])[:5]
        ],
        confidence=state.get("confidence", 0.0),
        latency_ms=latency_ms,
    )


# ─── Decision detection ───────────────────────────────────────────────────────

@router.post(
    "/detect-decision",
    response_model=DetectDecisionResponse,
    summary="Detect whether a text block contains a decision",
    description=(
        "NLP pipeline (spaCy + pattern matching) that determines whether a message "
        "or document contains a decision. Used by the Slack bot and ingestion pipeline "
        "to auto-capture decisions without human tagging."
    ),
)
async def detect_decision(req: DetectDecisionRequest) -> DetectDecisionResponse:
    result = detect(req.text)

    decisions = []
    if result.is_decision:
        decisions.append(DetectedDecision(
            title=result.title,
            summary=result.summary,
            confidence=result.confidence,
            signals=result.signals,
            suggested_type=MemoryType.DECISION,
        ))

    return DetectDecisionResponse(
        is_decision=result.is_decision,
        confidence=result.confidence,
        decisions=decisions,
    )


# ─── Orchestrator ─────────────────────────────────────────────────────────────

@router.post(
    "/trigger",
    response_model=OrchestratorResponse,
    summary="Dispatch a trigger to the appropriate agent",
    description=(
        "Single entry point for all event-driven agent triggers. "
        "Routes new_node → relationship inference, new_decision → conflict detection, "
        "meeting_soon → pre-meeting brief, scheduled_digest → digest, "
        "health_check → knowledge health, incident → postmortem, pr_opened → pr_review."
    ),
)
async def trigger_agent(
    req: OrchestratorRequest,
    background_tasks: BackgroundTasks,
) -> OrchestratorResponse:
    t0 = time.monotonic()
    logger.info("[route] POST /agents/trigger type=%s tenant=%s", req.trigger_type, req.tenant_id)

    result = await orchestrate(
        trigger_type=req.trigger_type,
        tenant_id=req.tenant_id,
        payload=req.payload,
    )
    latency_ms = int((time.monotonic() - t0) * 1000)

    return OrchestratorResponse(
        trigger_type=result.trigger_type,
        agent_used=result.agent_used,
        success=result.success,
        output=result.output,
        latency_ms=latency_ms,
        error=result.error,
    )


# ─── Relationship inference ───────────────────────────────────────────────────

@router.post(
    "/relationship-inference",
    response_model=RelationshipInferenceResponse,
    summary="Infer implicit relationships for a new knowledge node",
)
async def infer_relationships(req: RelationshipInferenceRequest) -> RelationshipInferenceResponse:
    t0 = time.monotonic()
    try:
        state = await run_relationship_inference(
            tenant_id=req.tenant_id,
            node_id=req.node_id,
            node_title=req.node_title,
            node_summary=req.node_summary,
            node_source=req.node_source,
            node_type=req.node_type,
        )
    except Exception as e:
        logger.exception("[route] relationship-inference failed")
        raise HTTPException(status_code=500, detail=str(e)) from e

    return RelationshipInferenceResponse(
        node_id=req.node_id,
        edges_created=state.get("edges_created", 0),
        new_edges=[
            InferredEdge(
                from_id=e["from_id"], to_id=e["to_id"],
                type=e["type"], confidence=e["confidence"], reason=e.get("reason",""),
            )
            for e in state.get("new_edges", [])
        ],
        resolved_questions=state.get("resolved_questions", []),
        challenged_beliefs=state.get("challenged_beliefs", []),
        confidence=state.get("confidence", 0.0),
        latency_ms=int((time.monotonic() - t0) * 1000),
    )


# ─── Conflict detection ───────────────────────────────────────────────────────

@router.post(
    "/conflict-detection",
    response_model=ConflictDetectionResponse,
    summary="Check a new decision for conflicts with existing beliefs and principles",
)
async def detect_conflicts(req: ConflictDetectionRequest) -> ConflictDetectionResponse:
    t0 = time.monotonic()
    try:
        state = await run_conflict_detection(
            tenant_id=req.tenant_id,
            decision_id=req.decision_id,
            decision_title=req.decision_title,
            decision_summary=req.decision_summary,
            decision_source=req.decision_source,
        )
    except Exception as e:
        logger.exception("[route] conflict-detection failed")
        raise HTTPException(status_code=500, detail=str(e)) from e

    return ConflictDetectionResponse(
        decision_id=req.decision_id,
        has_conflicts=state.get("has_conflicts", False),
        severity=state.get("severity", "none"),
        conflicts=[
            DetectedConflict(
                item_id=c["item_id"], item_type=c["item_type"],
                statement=c["statement"], conflict_reason=c["conflict_reason"],
                severity=c["severity"], confidence=c["confidence"],
            )
            for c in state.get("conflicts", [])
        ],
        conflict_ids=state.get("conflict_ids", []),
        alert_sent=state.get("alert_sent", False),
        latency_ms=int((time.monotonic() - t0) * 1000),
    )


# ─── Pre-meeting brief ────────────────────────────────────────────────────────

@router.post(
    "/pre-meeting-brief",
    response_model=PreMeetingBriefResponse,
    summary="Generate and send a pre-meeting context brief to attendees",
)
async def create_brief(req: PreMeetingBriefRequest) -> PreMeetingBriefResponse:
    t0 = time.monotonic()
    try:
        state = await run_pre_meeting_brief(
            tenant_id=req.tenant_id,
            meeting_id=req.meeting_id,
            meeting_title=req.meeting_title,
            meeting_time=req.meeting_time,
            attendee_ids=req.attendee_ids,
            agenda=req.agenda,
        )
    except Exception as e:
        logger.exception("[route] pre-meeting-brief failed")
        raise HTTPException(status_code=500, detail=str(e)) from e

    return PreMeetingBriefResponse(
        meeting_id=req.meeting_id,
        brief_id=state.get("brief_id"),
        title=state.get("brief_title", ""),
        summary=state.get("brief_summary", ""),
        sections=[
            BriefSection(heading=s.get("heading",""), items=s.get("items",[]))
            for s in state.get("brief_sections", [])
        ],
        sent_to=state.get("sent_to", []),
        latency_ms=int((time.monotonic() - t0) * 1000),
    )


# ─── Digest ───────────────────────────────────────────────────────────────────

@router.post(
    "/digest",
    response_model=DigestResponse,
    summary="Generate and send a team knowledge digest",
)
async def create_digest(req: DigestRequest) -> DigestResponse:
    t0 = time.monotonic()
    try:
        state = await run_digest(
            tenant_id=req.tenant_id,
            team=req.team,
            recipient_ids=req.recipient_ids,
            period_days=req.period_days,
        )
    except Exception as e:
        logger.exception("[route] digest failed")
        raise HTTPException(status_code=500, detail=str(e)) from e

    return DigestResponse(
        team=req.team,
        digest_id=state.get("digest_id"),
        title=state.get("digest_title", ""),
        sections=[
            DigestSection(
                type=s.get("type",""), title=s.get("title",""),
                items=s.get("items",[]), content=s.get("content",""),
                data=s.get("data",{}),
            )
            for s in state.get("sections", [])
        ],
        decision_count=state.get("decision_count", 0),
        question_count=state.get("question_count", 0),
        sent_count=state.get("sent_count", 0),
        latency_ms=int((time.monotonic() - t0) * 1000),
    )


# ─── Knowledge health ─────────────────────────────────────────────────────────

@router.post(
    "/knowledge-health",
    response_model=KnowledgeHealthResponse,
    summary="Run a full knowledge graph health scan",
)
async def knowledge_health(tenant_id: str) -> KnowledgeHealthResponse:
    t0 = time.monotonic()
    try:
        state = await run_knowledge_health(tenant_id=tenant_id)
    except Exception as e:
        logger.exception("[route] knowledge-health failed")
        raise HTTPException(status_code=500, detail=str(e)) from e

    return KnowledgeHealthResponse(
        health_id=state.get("health_id"),
        scores=HealthScores(
            overall=state.get("overall_score", 0),
            freshness=state.get("freshness_score", 0),
            connectivity=state.get("connectivity_score", 0),
            coverage=state.get("coverage_score", 0),
            conflicts=state.get("conflict_score", 0),
        ),
        total_decisions=state.get("total_decisions", 0),
        stale_count=len(state.get("stale_decisions", [])),
        at_risk_count=len(state.get("at_risk_nodes", [])),
        open_questions=state.get("open_questions", 0),
        unresolved_conflicts=state.get("unresolved_conflicts", 0),
        recommendations=state.get("recommendations", []),
        report_title=state.get("report_title", ""),
        latency_ms=int((time.monotonic() - t0) * 1000),
    )
