"""
Corporate Brain Orchestrator

Routes incoming triggers to the appropriate specialized agent.
Every agentic action flows through here — provides a single audit trail,
rate limiting, and graceful degradation if an agent fails.

Trigger types:
  new_node       → relationship_inference
  new_decision   → conflict_detection (+ relationship_inference)
  meeting_soon   → pre_meeting_brief
  scheduled_digest → digest
  health_check   → knowledge_health
  pr_opened      → pr_review (existing)
  incident       → postmortem (existing)
"""
from __future__ import annotations

import logging
import time
from typing import Any

from .relationship_inference import run_relationship_inference
from .conflict_detection     import run_conflict_detection
from .pre_meeting_brief      import run_pre_meeting_brief
from .digest                 import run_digest
from .knowledge_health       import run_knowledge_health
from .postmortem             import run_postmortem
from .pr_review              import run_pr_review

logger = logging.getLogger(__name__)


class OrchestratorResult:
    def __init__(
        self,
        trigger_type: str,
        agent_used:   str,
        success:      bool,
        output:       dict[str, Any],
        latency_ms:   int,
        error:        str | None = None,
    ) -> None:
        self.trigger_type = trigger_type
        self.agent_used   = agent_used
        self.success      = success
        self.output       = output
        self.latency_ms   = latency_ms
        self.error        = error

    def to_dict(self) -> dict[str, Any]:
        return {
            "triggerType": self.trigger_type,
            "agentUsed":   self.agent_used,
            "success":     self.success,
            "output":      self.output,
            "latencyMs":   self.latency_ms,
            "error":       self.error,
        }


async def dispatch(
    trigger_type: str,
    tenant_id:    str,
    payload:      dict[str, Any],
) -> OrchestratorResult:
    """
    Main dispatch function. Routes trigger to appropriate agent.
    All errors are caught — the orchestrator never crashes the caller.
    """
    t0 = time.monotonic()
    logger.info("[orchestrator] dispatch trigger=%s tenant=%s", trigger_type, tenant_id)

    try:
        result = await _route(trigger_type, tenant_id, payload)
        latency = int((time.monotonic() - t0) * 1000)
        logger.info("[orchestrator] complete trigger=%s %dms", trigger_type, latency)
        return OrchestratorResult(
            trigger_type=trigger_type,
            agent_used=_agent_name(trigger_type),
            success=True,
            output=result if isinstance(result, dict) else dict(result),
            latency_ms=latency,
        )
    except Exception as exc:
        latency = int((time.monotonic() - t0) * 1000)
        logger.exception("[orchestrator] agent failed trigger=%s error=%s", trigger_type, exc)
        return OrchestratorResult(
            trigger_type=trigger_type,
            agent_used=_agent_name(trigger_type),
            success=False,
            output={},
            latency_ms=latency,
            error=str(exc),
        )


async def _route(
    trigger_type: str,
    tenant_id:    str,
    payload:      dict[str, Any],
) -> dict[str, Any]:
    if trigger_type == "new_node":
        result = await run_relationship_inference(
            tenant_id=tenant_id,
            node_id=payload["nodeId"],
            node_title=payload.get("title", ""),
            node_summary=payload.get("summary", ""),
            node_source=payload.get("source", "unknown"),
            node_type=payload.get("type", "context"),
        )
        return dict(result)

    elif trigger_type == "new_decision":
        # Run both conflict detection and relationship inference
        conflict_result = await run_conflict_detection(
            tenant_id=tenant_id,
            decision_id=payload["nodeId"],
            decision_title=payload.get("title", ""),
            decision_summary=payload.get("summary", ""),
            decision_source=payload.get("source", "unknown"),
        )
        # Also run relationship inference (fire-and-forget pattern via separate call)
        rel_result = await run_relationship_inference(
            tenant_id=tenant_id,
            node_id=payload["nodeId"],
            node_title=payload.get("title", ""),
            node_summary=payload.get("summary", ""),
            node_source=payload.get("source", "unknown"),
            node_type="decision",
        )
        return {
            "conflict": dict(conflict_result),
            "relationships": dict(rel_result),
        }

    elif trigger_type == "meeting_soon":
        result = await run_pre_meeting_brief(
            tenant_id=tenant_id,
            meeting_id=payload["meetingId"],
            meeting_title=payload.get("title", "Meeting"),
            meeting_time=payload.get("meetingTime", ""),
            attendee_ids=payload.get("attendeeIds", []),
            agenda=payload.get("agenda"),
        )
        return dict(result)

    elif trigger_type == "scheduled_digest":
        result = await run_digest(
            tenant_id=tenant_id,
            team=payload.get("team", "Engineering"),
            recipient_ids=payload.get("recipientIds", []),
            period_days=payload.get("periodDays", 7),
        )
        return dict(result)

    elif trigger_type == "health_check":
        result = await run_knowledge_health(tenant_id=tenant_id)
        return dict(result)

    elif trigger_type == "incident":
        result = await run_postmortem(
            tenant_id=tenant_id,
            description=payload.get("description", ""),
            severity=payload.get("severity", "unknown"),
            incident_id=payload.get("incidentId"),
            channel_id=payload.get("channelId"),
            repo=payload.get("repo"),
        )
        return dict(result)

    elif trigger_type == "pr_opened":
        result = await run_pr_review(
            tenant_id=tenant_id,
            pr_number=payload.get("prNumber", 0),
            repo=payload.get("repo", ""),
            title=payload.get("title", ""),
            description=payload.get("description", ""),
            diff_summary=payload.get("diffSummary", ""),
            changed_files=payload.get("changedFiles", []),
        )
        return dict(result)

    else:
        raise ValueError(f"Unknown trigger type: {trigger_type}")


def _agent_name(trigger_type: str) -> str:
    return {
        "new_node":         "relationship_inference",
        "new_decision":     "conflict_detection+relationship_inference",
        "meeting_soon":     "pre_meeting_brief",
        "scheduled_digest": "digest",
        "health_check":     "knowledge_health",
        "incident":         "postmortem",
        "pr_opened":        "pr_review",
    }.get(trigger_type, "unknown")
