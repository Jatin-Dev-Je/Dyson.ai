import time
import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from ..schemas import (
    PostMortemRequest, PostMortemResponse, PostMortemSection,
    PRReviewRequest, PRReviewResponse, PRReviewComment,
    OnboardingRequest, OnboardingResponse,
    DetectDecisionRequest, DetectDecisionResponse, DetectedDecision,
    MemoryNode, MemoryType, Citation,
)
from ..agents.postmortem import run_postmortem
from ..agents.pr_review  import run_pr_review
from ..ml.decision_detector import detect

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
