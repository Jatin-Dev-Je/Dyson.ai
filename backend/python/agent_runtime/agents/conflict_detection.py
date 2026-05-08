"""
Conflict Detection Agent

Triggered whenever a new decision is detected. Checks the incoming decision
against all existing beliefs and principles to surface contradictions before
they become technical debt.

Pipeline:
  load_beliefs → check_conflicts → score_severity → dispatch_alerts
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

from ..tools.dyson_client import DysonClient, DysonAPIError

logger = logging.getLogger(__name__)


class ConflictState(TypedDict, total=False):
    tenant_id:        str
    decision_id:      str
    decision_title:   str
    decision_summary: str
    decision_source:  str

    # Retrieved
    beliefs:          list[dict[str, Any]]
    principles:       list[dict[str, Any]]
    recent_decisions: list[dict[str, Any]]

    # Detected
    conflicts:        list[dict[str, Any]]
    warnings:         list[dict[str, Any]]

    # Output
    has_conflicts:    bool
    severity:         str   # none | low | medium | high | critical
    alert_sent:       bool
    conflict_ids:     list[str]

    error:            str | None


def _get_llm() -> Any:
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from ..config import get_settings
        cfg = get_settings()
        return ChatGoogleGenerativeAI(
            model=cfg.gemini_model,
            google_api_key=cfg.gemini_api_key,
            temperature=0,
        )
    except Exception:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o-mini", temperature=0)


async def load_beliefs(state: ConflictState) -> ConflictState:
    """Fetch current beliefs, principles, and recent decisions for comparison."""
    logger.info("[conflict] loading beliefs for decision=%s", state["decision_id"])

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            beliefs = await client.list_beliefs(limit=30)
        except DysonAPIError:
            beliefs = []

        try:
            principles = await client.list_principles(limit=20)
        except DysonAPIError:
            principles = []

        try:
            recent = await client.list_decisions(limit=20)
            # Exclude the current decision
            recent = [d for d in recent if d.get("id") != state["decision_id"]]
        except DysonAPIError:
            recent = []

    return {**state, "beliefs": beliefs, "principles": principles, "recent_decisions": recent}


async def check_conflicts(state: ConflictState) -> ConflictState:
    """
    LLM-powered conflict analysis. Checks the new decision against every
    belief and principle. Returns structured conflict objects with severity.
    """
    beliefs    = state.get("beliefs", [])
    principles = state.get("principles", [])
    recent     = state.get("recent_decisions", [])

    if not beliefs and not principles:
        return {**state, "conflicts": [], "warnings": []}

    belief_text = "\n".join(
        f'  [B{i}] "{b.get("statement","")}" (confidence={b.get("confidence",0):.2f})'
        for i, b in enumerate(beliefs[:15])
    )
    principle_text = "\n".join(
        f'  [P{i}] "{p.get("statement","")}" applies_to={p.get("appliesTo",[])}'
        for i, p in enumerate(principles[:10])
    )
    recent_text = "\n".join(
        f'  [D{i}] "{d.get("title","")}" ({d.get("occurredAt","")[:10]})'
        for i, d in enumerate(recent[:8])
    )

    llm = _get_llm()
    prompt = f"""You are the institutional immune system. Analyze whether a new decision
conflicts with existing company beliefs, principles, or recent decisions.

NEW DECISION:
  title: "{state["decision_title"]}"
  summary: "{state.get("decision_summary","")}"
  source: {state.get("decision_source","unknown")}

COMPANY BELIEFS:
{belief_text or "  none established yet"}

COMPANY PRINCIPLES:
{principle_text or "  none established yet"}

RECENT DECISIONS (last 20):
{recent_text or "  none"}

For each conflict found, classify severity:
- critical: directly contradicts a high-confidence principle (would break the system)
- high: contradicts a belief with confidence > 0.80
- medium: partially contradicts a belief, or conflicts with recent decision
- low: minor tension, may coexist

IMPORTANT: Only flag genuine conflicts, not just related topics.
A decision about auth USING a principle is not a conflict.

Respond ONLY with JSON:
{{
  "conflicts": [
    {{
      "ref": "B0",
      "type": "belief",
      "statement": "...",
      "conflict_reason": "...",
      "severity": "high",
      "confidence": 0.88
    }}
  ],
  "warnings": [
    {{
      "ref": "D2",
      "type": "decision",
      "statement": "...",
      "warning_reason": "...",
      "confidence": 0.72
    }}
  ]
}}"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="You detect genuine conflicts in organizational decisions. Be precise, not overly cautious."),
            HumanMessage(content=prompt),
        ])
        text  = response.content
        match = re.search(r"\{.*\}", text, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}

        all_items = beliefs + principles + recent

        def deref(ref: str) -> dict[str, Any]:
            for prefix, items in [("B", beliefs), ("P", principles), ("D", recent)]:
                if ref.startswith(prefix):
                    try:
                        return items[int(ref[len(prefix):])]
                    except (IndexError, ValueError):
                        pass
            return {}

        conflicts = []
        for c in parsed.get("conflicts", []):
            item = deref(c.get("ref", ""))
            if c.get("confidence", 0) >= 0.65:
                conflicts.append({
                    "item_id":       item.get("id", ""),
                    "item_type":     c.get("type", "belief"),
                    "statement":     c.get("statement", ""),
                    "conflict_reason": c.get("conflict_reason", ""),
                    "severity":      c.get("severity", "medium"),
                    "confidence":    float(c.get("confidence", 0.7)),
                })

        warnings = []
        for w in parsed.get("warnings", []):
            item = deref(w.get("ref", ""))
            if w.get("confidence", 0) >= 0.60:
                warnings.append({
                    "item_id":      item.get("id", ""),
                    "item_type":    w.get("type", "decision"),
                    "statement":    w.get("statement", ""),
                    "warning_reason": w.get("warning_reason", ""),
                    "confidence":   float(w.get("confidence", 0.65)),
                })

    except Exception as exc:
        logger.warning("[conflict] LLM check failed: %s", exc)
        conflicts, warnings = [], []

    return {**state, "conflicts": conflicts, "warnings": warnings}


async def score_severity(state: ConflictState) -> ConflictState:
    """Compute overall severity and persist conflicts to the Dyson API."""
    conflicts = state.get("conflicts", [])
    warnings  = state.get("warnings", [])
    conflict_ids: list[str] = []

    severity_rank = {"critical": 4, "high": 3, "medium": 2, "low": 1, "none": 0}
    max_severity  = "none"

    for c in conflicts:
        rank = severity_rank.get(c.get("severity", "medium"), 2)
        if rank > severity_rank.get(max_severity, 0):
            max_severity = c.get("severity", "medium")

    if conflicts:
        async with DysonClient(tenant_id=state["tenant_id"]) as client:
            for c in conflicts:
                try:
                    result = await client.create_conflict(
                        decision_id=state["decision_id"],
                        item_id=c["item_id"],
                        item_type=c["item_type"],
                        reason=c["conflict_reason"],
                        severity=c["severity"],
                        confidence=c["confidence"],
                    )
                    conflict_ids.append(result.get("data", {}).get("id", ""))
                except DysonAPIError as e:
                    logger.warning("[conflict] persist failed: %s", e.message)

    return {
        **state,
        "has_conflicts": len(conflicts) > 0,
        "severity":      max_severity,
        "conflict_ids":  conflict_ids,
    }


async def dispatch_alerts(state: ConflictState) -> ConflictState:
    """Send alerts for high/critical conflicts to the relevant decision-makers."""
    if not state.get("has_conflicts") or state.get("severity") not in ("high", "critical", "medium"):
        return {**state, "alert_sent": False}

    conflicts = state.get("conflicts", [])
    severity  = state.get("severity", "medium")

    # Build alert message
    conflict_lines = "\n".join(
        f"• {c['conflict_reason']} (severity: {c['severity']})"
        for c in conflicts[:3]
    )

    message = (
        f"⚠️ *Decision conflict detected* [{severity.upper()}]\n\n"
        f"*New decision:* {state['decision_title']}\n\n"
        f"*Conflicts with existing beliefs:*\n{conflict_lines}\n\n"
        f"Review and resolve at your Dyson workspace."
    )

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            await client.send_agent_alert(
                alert_type="conflict_detected",
                severity=severity,
                message=message,
                metadata={
                    "decision_id":  state["decision_id"],
                    "conflict_ids": state.get("conflict_ids", []),
                },
            )
            alert_sent = True
        except DysonAPIError as e:
            logger.warning("[conflict] alert dispatch failed: %s", e.message)
            alert_sent = False

    logger.info(
        "[conflict] complete — conflicts=%d severity=%s alert=%s",
        len(conflicts), severity, alert_sent,
    )

    return {**state, "alert_sent": alert_sent}


def _build_graph() -> Any:
    graph = StateGraph(ConflictState)
    graph.add_node("load_beliefs",   load_beliefs)
    graph.add_node("check_conflicts", check_conflicts)
    graph.add_node("score_severity", score_severity)
    graph.add_node("dispatch_alerts", dispatch_alerts)
    graph.set_entry_point("load_beliefs")
    graph.add_edge("load_beliefs",    "check_conflicts")
    graph.add_edge("check_conflicts", "score_severity")
    graph.add_edge("score_severity",  "dispatch_alerts")
    graph.add_edge("dispatch_alerts", END)
    return graph.compile()


_graph = _build_graph()


async def run_conflict_detection(
    tenant_id:        str,
    decision_id:      str,
    decision_title:   str,
    decision_summary: str = "",
    decision_source:  str = "unknown",
) -> ConflictState:
    t0 = time.monotonic()
    result: ConflictState = await _graph.ainvoke({
        "tenant_id":        tenant_id,
        "decision_id":      decision_id,
        "decision_title":   decision_title,
        "decision_summary": decision_summary,
        "decision_source":  decision_source,
    })
    logger.info(
        "[conflict] %dms — has_conflicts=%s severity=%s",
        int((time.monotonic() - t0) * 1000),
        result.get("has_conflicts"),
        result.get("severity"),
    )
    return result
