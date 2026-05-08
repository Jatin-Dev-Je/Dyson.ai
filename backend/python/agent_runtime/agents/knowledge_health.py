"""
Knowledge Health Agent

Weekly scan of the entire belief graph to produce a health report:
  - Overall health score (0-100)
  - Stale decisions (not reviewed in >90 days)
  - At-risk knowledge (single owner, no activity)
  - Orphaned nodes (no connections)
  - Unresolved conflicts
  - Coverage gaps (areas with few memories)

Pipeline:
  scan_graph → score_health → identify_risks → generate_report
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


class HealthState(TypedDict, total=False):
    tenant_id:       str

    # Raw scan data
    total_nodes:     int
    total_beliefs:   int
    total_decisions: int
    total_edges:     int
    open_questions:  int
    unresolved_conflicts: int

    stale_decisions:  list[dict[str, Any]]
    orphan_nodes:     list[dict[str, Any]]
    at_risk_nodes:    list[dict[str, Any]]
    low_coverage_areas: list[str]

    # Scores
    overall_score:    float        # 0-100
    freshness_score:  float
    coverage_score:   float
    connectivity_score: float
    conflict_score:   float

    # Report
    report_title:     str
    report_sections:  list[dict[str, Any]]
    recommendations:  list[str]

    # Persisted
    health_id:        str | None

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


async def scan_graph(state: HealthState) -> HealthState:
    """Pull current graph statistics and identify stale/at-risk nodes."""
    logger.info("[health] scanning knowledge graph for tenant=%s", state["tenant_id"])

    now = datetime.now(timezone.utc)
    stale_cutoff    = (now - timedelta(days=90)).isoformat()
    inactive_cutoff = (now - timedelta(days=180)).isoformat()

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            overview = await client.workspace_overview()
            data = overview.get("data", overview)
        except DysonAPIError:
            data = {}

        try:
            decisions = await client.list_decisions(limit=100)
            stale = [
                d for d in decisions
                if d.get("occurredAt", "") < stale_cutoff
            ]
        except DysonAPIError:
            decisions, stale = [], []

        try:
            open_qs = await client.list_open_questions(status="open", limit=50)
        except DysonAPIError:
            open_qs = []

        try:
            conflicts_result = await client.list_conflicts(status="open")
            open_conflicts = conflicts_result.get("data", [])
        except DysonAPIError:
            open_conflicts = []

        try:
            beliefs = await client.list_beliefs(limit=50)
        except DysonAPIError:
            beliefs = []

    # Identify at-risk nodes: decisions with no related edges and old timestamp
    at_risk = [
        {
            "id":         d.get("id", ""),
            "title":      d.get("title", ""),
            "age_days":   (now - datetime.fromisoformat(
                d.get("occurredAt", now.isoformat()).replace("Z", "+00:00")
            )).days if d.get("occurredAt") else 0,
            "riskReason": "No activity for >180 days, may be stale",
        }
        for d in decisions
        if d.get("occurredAt", "") < inactive_cutoff
    ][:10]

    return {
        **state,
        "total_nodes":     data.get("totalMemories", len(decisions)),
        "total_beliefs":   len(beliefs),
        "total_decisions": len(decisions),
        "total_edges":     data.get("totalEdges", 0),
        "open_questions":  len(open_qs),
        "unresolved_conflicts": len(open_conflicts),
        "stale_decisions": stale[:10],
        "at_risk_nodes":   at_risk,
        "orphan_nodes":    [],   # Populated if graph API supports it
    }


async def score_health(state: HealthState) -> HealthState:
    """
    Compute component scores and overall health.
    Each score: 0-100. Overall is weighted average.
    """
    total    = max(state.get("total_decisions", 1), 1)
    stale    = len(state.get("stale_decisions", []))
    at_risk  = len(state.get("at_risk_nodes", []))
    open_qs  = state.get("open_questions", 0)
    conflicts = state.get("unresolved_conflicts", 0)
    edges    = state.get("total_edges", 0)

    # Freshness: penalise stale decisions
    freshness = max(0.0, 100.0 - (stale / total) * 100)

    # Connectivity: nodes should have edges
    connectivity = min(100.0, (edges / max(total, 1)) * 40)  # cap at 100

    # Coverage: fewer open questions is better (relative to total)
    coverage = max(0.0, 100.0 - (open_qs / max(total * 0.2, 1)) * 100)

    # Conflict health: unresolved conflicts hurt score
    conflict_score = max(0.0, 100.0 - conflicts * 15)

    # Overall: weighted
    overall = (
        freshness    * 0.30 +
        connectivity * 0.25 +
        coverage     * 0.25 +
        conflict_score * 0.20
    )

    return {
        **state,
        "freshness_score":    round(freshness, 1),
        "connectivity_score": round(connectivity, 1),
        "coverage_score":     round(coverage, 1),
        "conflict_score":     round(conflict_score, 1),
        "overall_score":      round(overall, 1),
    }


async def identify_risks(state: HealthState) -> HealthState:
    """Use LLM to synthesize risks and generate actionable recommendations."""
    llm = _get_llm()

    stale_text = "\n".join(
        f"• {d.get('title','')[:80]} (age: {d.get('age_days',0) if isinstance(d, dict) else '?'} days)"
        for d in (state.get("stale_decisions", []) or [])[:5]
    )
    at_risk_text = "\n".join(
        f"• {n.get('title','')[:80]} — {n.get('riskReason','')}"
        for n in (state.get("at_risk_nodes", []) or [])[:5]
    )

    prompt = f"""Analyze this knowledge base health report and generate recommendations.

SCORES:
  Overall: {state.get("overall_score",0)}/100
  Freshness: {state.get("freshness_score",0)}/100
  Connectivity: {state.get("connectivity_score",0)}/100
  Coverage: {state.get("coverage_score",0)}/100
  Conflicts: {state.get("conflict_score",0)}/100

STATISTICS:
  Total decisions: {state.get("total_decisions",0)}
  Stale (>90 days): {len(state.get("stale_decisions",[]))}
  At risk: {len(state.get("at_risk_nodes",[]))}
  Open questions: {state.get("open_questions",0)}
  Unresolved conflicts: {state.get("unresolved_conflicts",0)}

STALE DECISIONS:
{stale_text or "  none"}

AT-RISK NODES:
{at_risk_text or "  none"}

Generate 3-5 specific, actionable recommendations.
Prioritize by impact (highest impact first).

Respond ONLY with JSON:
{{
  "recommendations": [
    "Review these 3 stale decisions with the team: ...",
    "...",
  ],
  "coverage_gaps": ["payments", "security"],
  "headline": "One sentence health summary"
}}"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="Generate actionable knowledge health recommendations."),
            HumanMessage(content=prompt),
        ])
        text  = response.content
        match = re.search(r"\{.*\}", text, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}
        recommendations  = parsed.get("recommendations", [])
        coverage_gaps    = parsed.get("coverage_gaps", [])
        headline         = parsed.get("headline", "")
    except Exception as exc:
        logger.warning("[health] recommendations failed: %s", exc)
        recommendations = ["Review stale decisions with team", "Resolve open conflicts"]
        coverage_gaps   = []
        headline        = f"Knowledge base health: {state.get('overall_score',0)}/100"

    return {
        **state,
        "recommendations":    recommendations,
        "low_coverage_areas": coverage_gaps,
        "report_title":       headline,
    }


async def generate_report(state: HealthState) -> HealthState:
    """Assemble the report and persist it."""
    sections = [
        {
            "type":  "scores",
            "title": "Health scores",
            "data": {
                "overall":      state.get("overall_score", 0),
                "freshness":    state.get("freshness_score", 0),
                "connectivity": state.get("connectivity_score", 0),
                "coverage":     state.get("coverage_score", 0),
                "conflicts":    state.get("conflict_score", 0),
            },
        },
        {
            "type":  "stats",
            "title": "Statistics",
            "data": {
                "totalDecisions":      state.get("total_decisions", 0),
                "staleDecisions":      len(state.get("stale_decisions", [])),
                "atRiskNodes":         len(state.get("at_risk_nodes", [])),
                "openQuestions":       state.get("open_questions", 0),
                "unresolvedConflicts": state.get("unresolved_conflicts", 0),
            },
        },
        {
            "type":  "risks",
            "title": "At-risk knowledge",
            "items": state.get("at_risk_nodes", [])[:5],
        },
        {
            "type":  "stale",
            "title": "Decisions needing review",
            "items": state.get("stale_decisions", [])[:5],
        },
        {
            "type":  "recommendations",
            "title": "Recommendations",
            "items": state.get("recommendations", []),
        },
    ]

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            result = await client.save_health_report(
                overall_score=state.get("overall_score", 0),
                sections=sections,
                at_risk_nodes=state.get("at_risk_nodes", []),
                stale_decisions=state.get("stale_decisions", []),
                recommendations=state.get("recommendations", []),
            )
            health_id = result.get("data", {}).get("id")
        except DysonAPIError as e:
            logger.warning("[health] report save failed: %s", e.message)
            health_id = None

        try:
            await client.send_agent_alert(
                alert_type="health_report",
                severity="info" if state.get("overall_score", 0) >= 70 else "warning",
                message=(
                    f"📊 *Knowledge Health Report*\n"
                    f"Overall: {state.get('overall_score',0)}/100\n"
                    f"{state.get('report_title','')}"
                ),
                metadata={"health_id": health_id},
            )
        except DysonAPIError:
            pass

    logger.info(
        "[health] report complete — score=%.1f stale=%d at_risk=%d",
        state.get("overall_score", 0),
        len(state.get("stale_decisions", [])),
        len(state.get("at_risk_nodes", [])),
    )

    return {**state, "report_sections": sections, "health_id": health_id}


def _build_graph() -> Any:
    graph = StateGraph(HealthState)
    graph.add_node("scan_graph",       scan_graph)
    graph.add_node("score_health",     score_health)
    graph.add_node("identify_risks",   identify_risks)
    graph.add_node("generate_report",  generate_report)
    graph.set_entry_point("scan_graph")
    graph.add_edge("scan_graph",      "score_health")
    graph.add_edge("score_health",    "identify_risks")
    graph.add_edge("identify_risks",  "generate_report")
    graph.add_edge("generate_report", END)
    return graph.compile()


_graph = _build_graph()


async def run_knowledge_health(tenant_id: str) -> HealthState:
    t0 = time.monotonic()
    result: HealthState = await _graph.ainvoke({"tenant_id": tenant_id})
    logger.info(
        "[health] %dms — score=%.1f",
        int((time.monotonic() - t0) * 1000),
        result.get("overall_score", 0),
    )
    return result
