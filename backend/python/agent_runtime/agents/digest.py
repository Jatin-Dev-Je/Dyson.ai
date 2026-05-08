"""
Digest Agent

Scheduled Monday/Friday per team. Produces a scannable brief:
  - Decisions made this period
  - Open questions older than 7 days
  - At-risk knowledge (single-owner nodes)
  - Upcoming meetings with memory context

Pipeline:
  gather_period_data → categorize → generate_digest → send
"""
from __future__ import annotations

import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

from ..tools.dyson_client import DysonClient, DysonAPIError

logger = logging.getLogger(__name__)


class DigestState(TypedDict, total=False):
    tenant_id:      str
    team:           str
    period_days:    int               # 5 for weekly, 1 for daily
    recipient_ids:  list[str]

    # Gathered
    new_decisions:  list[dict[str, Any]]
    open_questions: list[dict[str, Any]]
    stale_nodes:    list[dict[str, Any]]
    at_risk_nodes:  list[dict[str, Any]]
    new_members:    list[dict[str, Any]]

    # Generated
    digest_title:   str
    sections:       list[dict[str, Any]]
    decision_count: int
    question_count: int

    # Delivery
    digest_id:      str | None
    sent_count:     int

    error:          str | None


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


async def gather_period_data(state: DigestState) -> DigestState:
    """Fetch all activity within the digest period."""
    period_days = state.get("period_days", 7)
    since = (datetime.now(timezone.utc) - timedelta(days=period_days)).isoformat()

    logger.info("[digest] gathering data for team=%s period=%dd", state.get("team"), period_days)

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            decisions = await client.list_decisions(limit=50)
            new_decisions = [
                d for d in decisions
                if d.get("occurredAt", "") >= since
            ]
        except DysonAPIError:
            new_decisions = []

        try:
            open_qs = await client.list_open_questions(status="open", limit=20)
            stale_qs = [
                q for q in open_qs
                if q.get("openedAt", "") < (
                    datetime.now(timezone.utc) - timedelta(days=7)
                ).isoformat()
            ]
        except DysonAPIError:
            stale_qs = []

        try:
            health = await client.get_knowledge_health()
            at_risk  = health.get("data", {}).get("atRiskNodes", [])[:3]
            stale_ns = health.get("data", {}).get("staleDecisions", [])[:3]
        except DysonAPIError:
            at_risk  = []
            stale_ns = []

    return {
        **state,
        "new_decisions":  new_decisions,
        "open_questions": stale_qs,
        "stale_nodes":    stale_ns,
        "at_risk_nodes":  at_risk,
    }


async def categorize(state: DigestState) -> DigestState:
    """
    Organize the raw data into digest sections.
    Ranks decisions by importance, deduplicates questions.
    """
    decisions = state.get("new_decisions", [])
    questions = state.get("open_questions", [])
    at_risk   = state.get("at_risk_nodes", [])

    # Sort decisions by confidence descending
    decisions.sort(key=lambda d: d.get("decisionConfidence", 0), reverse=True)

    sections: list[dict[str, Any]] = []

    if decisions:
        sections.append({
            "type":  "decisions",
            "title": f"Decided this {'week' if state.get('period_days',7) >= 5 else 'period'} ({len(decisions)})",
            "items": [
                {
                    "title":      d.get("title", ""),
                    "source":     d.get("source", ""),
                    "confidence": d.get("decisionConfidence", 0),
                    "url":        d.get("sourceUrl"),
                }
                for d in decisions[:8]
            ],
        })

    if questions:
        sections.append({
            "type":  "questions",
            "title": f"Open questions (unresolved >{7} days)",
            "items": [
                {"question": q.get("question", ""), "id": q.get("id", "")}
                for q in questions[:5]
            ],
        })

    if at_risk:
        sections.append({
            "type":  "risk",
            "title": "Knowledge at risk",
            "items": [
                {
                    "title":  n.get("title", ""),
                    "reason": n.get("riskReason", "Single person owns this knowledge"),
                }
                for n in at_risk
            ],
        })

    team = state.get("team", "your team")
    period_label = "weekly" if state.get("period_days", 7) >= 5 else "daily"

    return {
        **state,
        "sections":       sections,
        "digest_title":   f"Dyson {period_label.capitalize()} Brief — {team}",
        "decision_count": len(decisions),
        "question_count": len(questions),
    }


async def generate_digest(state: DigestState) -> DigestState:
    """Use LLM to write the digest narrative from structured sections."""
    sections  = state.get("sections", [])
    decisions = state.get("new_decisions", [])

    if not sections:
        return {**state}

    decisions_text = "\n".join(
        f"• {d.get('title','')}"
        for d in decisions[:5]
    )
    questions_text = "\n".join(
        f"• {q.get('question','')}"
        for q in state.get("open_questions", [])[:3]
    )

    llm = _get_llm()
    prompt = f"""Write a 3-sentence executive summary for this team digest.

Team: {state.get("team","Engineering")}
Period: last {state.get("period_days",7)} days

Decisions made: {len(decisions)}
{decisions_text or "(none)"}

Stale open questions: {len(state.get("open_questions",[]))}
{questions_text or "(none)"}

At-risk knowledge items: {len(state.get("at_risk_nodes",[]))}

Write an honest, useful summary. Be direct. No fluff.
Respond ONLY with a plain string (no JSON)."""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="Write terse, honest team digests."),
            HumanMessage(content=prompt),
        ])
        summary = response.content.strip()
    except Exception as exc:
        logger.warning("[digest] generation failed: %s", exc)
        d_count = state.get("decision_count", 0)
        q_count = state.get("question_count", 0)
        summary = (
            f"{d_count} decisions captured this period. "
            f"{q_count} open questions remain unresolved."
        )

    # Inject narrative into first section
    updated = [{"type": "summary", "title": "This period", "content": summary}] + sections

    return {**state, "sections": updated}


async def send(state: DigestState) -> DigestState:
    """Persist the digest and send to all recipients."""
    sent_count = 0

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            result = await client.create_digest(
                team=state.get("team", ""),
                title=state.get("digest_title", ""),
                sections=state.get("sections", []),
                period_days=state.get("period_days", 7),
                decision_count=state.get("decision_count", 0),
                question_count=state.get("question_count", 0),
            )
            digest_id = result.get("data", {}).get("id")
        except DysonAPIError as e:
            logger.warning("[digest] persist failed: %s", e.message)
            digest_id = None

        for uid in state.get("recipient_ids", [])[:50]:
            try:
                await client.send_agent_alert(
                    alert_type="weekly_digest",
                    severity="info",
                    message=f"📊 *{state.get('digest_title','')}*",
                    metadata={
                        "digest_id":    digest_id,
                        "recipient_id": uid,
                        "team":         state.get("team"),
                    },
                )
                sent_count += 1
            except DysonAPIError:
                pass

    logger.info("[digest] sent=%d decisions=%d", sent_count, state.get("decision_count", 0))

    return {**state, "digest_id": digest_id, "sent_count": sent_count}


def _build_graph() -> Any:
    graph = StateGraph(DigestState)
    graph.add_node("gather_period_data", gather_period_data)
    graph.add_node("categorize",         categorize)
    graph.add_node("generate_digest",    generate_digest)
    graph.add_node("send",               send)
    graph.set_entry_point("gather_period_data")
    graph.add_edge("gather_period_data", "categorize")
    graph.add_edge("categorize",         "generate_digest")
    graph.add_edge("generate_digest",    "send")
    graph.add_edge("send",               END)
    return graph.compile()


_graph = _build_graph()


async def run_digest(
    tenant_id:     str,
    team:          str,
    recipient_ids: list[str],
    period_days:   int = 7,
) -> DigestState:
    t0 = time.monotonic()
    result: DigestState = await _graph.ainvoke({
        "tenant_id":     tenant_id,
        "team":          team,
        "recipient_ids": recipient_ids,
        "period_days":   period_days,
    })
    logger.info(
        "[digest] %dms — decisions=%d sent=%d",
        int((time.monotonic() - t0) * 1000),
        result.get("decision_count", 0),
        result.get("sent_count", 0),
    )
    return result
