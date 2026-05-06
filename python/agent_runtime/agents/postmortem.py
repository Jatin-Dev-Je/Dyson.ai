"""
Post-mortem agent — LangGraph StateGraph implementation.

Pipeline:
  gather_context → analyse_timeline → identify_root_cause → generate_output

Each node is a pure async function that receives + returns the full state.
LangGraph handles retries, streaming, and checkpointing automatically.

Why LangGraph over bare LangChain chains:
  - Stateful: each node sees accumulated state, not just previous output
  - Branching: can route to different nodes based on confidence
  - Resumable: long-running agents can be paused and continued
  - Observable: every node transition is logged for the audit trail
"""
from __future__ import annotations

import logging
import time
from typing import Any, TypedDict

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END

from ..tools.dyson_client import DysonClient, DysonAPIError

logger = logging.getLogger(__name__)


# ─── State ────────────────────────────────────────────────────────────────────

class PostMortemState(TypedDict, total=False):
    # Input
    tenant_id:        str
    incident_id:      str | None
    description:      str
    severity:         str
    channel_id:       str | None
    repo:             str | None

    # Gathered context
    related_memories: list[dict[str, Any]]
    past_incidents:   list[dict[str, Any]]
    recall_result:    dict[str, Any]

    # Analysis
    timeline_events:  list[str]
    root_cause:       str
    contributing_factors: list[str]

    # Output
    title:            str
    sections:         list[dict[str, Any]]
    action_items:     list[str]
    confidence:       float

    # Meta
    error:            str | None


# ─── LLM helper ───────────────────────────────────────────────────────────────

def _get_llm():
    """Lazy-load the LLM — avoids import errors when key is not set."""
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
        # Fallback: OpenAI if Gemini key is missing
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o-mini", temperature=0)


# ─── Graph nodes ──────────────────────────────────────────────────────────────

async def gather_context(state: PostMortemState) -> PostMortemState:
    """
    Query Dyson memory for relevant past incidents and context.
    Runs the WHY engine against the incident description.
    """
    logger.info("[postmortem] gathering context for incident: %s", state.get("incident_id", "unknown"))

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        # Search for related memories
        try:
            related = await client.search(
                query=f"incident {state['description']}",
                limit=8,
            )
        except DysonAPIError as e:
            logger.warning("[postmortem] search failed: %s", e.message)
            related = []

        # Pull past incidents specifically
        try:
            all_memories = await client.list_memories(memory_type="incident", limit=5)
        except DysonAPIError:
            all_memories = []

        # Ask WHY engine for context
        try:
            recall = await client.recall(
                f"Have we seen a similar incident before? {state['description'][:300]}"
            )
        except DysonAPIError as e:
            logger.warning("[postmortem] recall failed: %s", e.message)
            recall = {"data": {"cannotAnswer": True, "answer": None, "confidence": 0}}

    return {
        **state,
        "related_memories": related,
        "past_incidents":   all_memories,
        "recall_result":    recall.get("data", {}),
    }


async def analyse_timeline(state: PostMortemState) -> PostMortemState:
    """
    Build a timeline of events leading to the incident.
    Uses the LLM to synthesise context into ordered events.
    """
    logger.info("[postmortem] analysing timeline")

    llm = _get_llm()

    context_text = "\n".join([
        f"- {m.get('title', '')}: {m.get('summary', '')}"
        for m in state.get("related_memories", [])[:6]
    ])

    recall_answer = state.get("recall_result", {}).get("answer", "")

    prompt = f"""You are analysing an incident to build a post-mortem timeline.

Incident description: {state['description']}
Severity: {state['severity']}

Related context from company memory:
{context_text or 'No related context found.'}

Past incident context: {recall_answer or 'No similar past incidents found.'}

Extract a timeline of events that likely led to this incident.
Return as a JSON list of strings, each describing one event in chronological order.
Maximum 8 events. Be concise and factual.

Respond ONLY with a JSON array, e.g.:
["Event 1 at T-2h", "Event 2 at T-1h", "Incident triggered at T+0"]"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="You extract structured timelines from incident descriptions."),
            HumanMessage(content=prompt),
        ])

        import json, re
        text = response.content
        match = re.search(r"\[.*?\]", text, re.DOTALL)
        events: list[str] = json.loads(match.group()) if match else [state["description"]]
    except Exception as e:
        logger.warning("[postmortem] timeline extraction failed: %s", e)
        events = [f"Incident: {state['description']}"]

    return {**state, "timeline_events": events}


async def identify_root_cause(state: PostMortemState) -> PostMortemState:
    """
    Identify root cause and contributing factors using the LLM.
    """
    logger.info("[postmortem] identifying root cause")

    llm = _get_llm()

    timeline_text = "\n".join(f"  {i+1}. {e}" for i, e in enumerate(state.get("timeline_events", [])))

    prompt = f"""Based on this incident timeline, identify the root cause and contributing factors.

Timeline:
{timeline_text}

Incident: {state['description']}

Respond in JSON:
{{
  "root_cause": "one clear sentence",
  "contributing_factors": ["factor 1", "factor 2", "factor 3"]
}}"""

    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        import json, re
        text = response.content
        match = re.search(r"\{.*?\}", text, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}
        root_cause = parsed.get("root_cause", "Root cause could not be determined automatically.")
        factors    = parsed.get("contributing_factors", [])
    except Exception as e:
        logger.warning("[postmortem] root cause extraction failed: %s", e)
        root_cause = "Root cause analysis pending manual review."
        factors    = []

    return {**state, "root_cause": root_cause, "contributing_factors": factors}


async def generate_output(state: PostMortemState) -> PostMortemState:
    """
    Assemble the final post-mortem document.
    Builds structured sections and action items.
    """
    logger.info("[postmortem] generating final output")

    llm = _get_llm()

    timeline_text  = "\n".join(f"- {e}" for e in state.get("timeline_events", []))
    factors_text   = "\n".join(f"- {f}" for f in state.get("contributing_factors", []))
    past_incidents = state.get("past_incidents", [])

    prompt = f"""Write a structured post-mortem document section.

Root cause: {state.get('root_cause', 'Unknown')}
Timeline: {timeline_text}
Contributing factors: {factors_text}
Similar past incidents: {len(past_incidents)} found

Generate action items that would prevent recurrence.
Return JSON:
{{
  "title": "Post-mortem: [brief title]",
  "action_items": ["action 1", "action 2", "action 3"],
  "summary": "2-3 sentence executive summary"
}}"""

    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        import json, re
        text  = response.content
        match = re.search(r"\{.*?\}", text, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}
        title   = parsed.get("title",   f"Post-mortem: {state['description'][:60]}")
        items   = parsed.get("action_items", [])
        summary = parsed.get("summary", state.get("root_cause", ""))
    except Exception as e:
        logger.warning("[postmortem] output generation failed: %s", e)
        title   = f"Post-mortem: {state['description'][:60]}"
        items   = ["Review incident timeline", "Add monitoring", "Update runbook"]
        summary = state.get("root_cause", "")

    # Confidence: higher when we found related context
    related_count = len(state.get("related_memories", []))
    confidence = min(0.95, 0.5 + related_count * 0.07)

    sections = [
        {
            "title":   "Executive Summary",
            "content": summary,
            "citations": [],
        },
        {
            "title":   "Timeline",
            "content": timeline_text,
            "citations": [],
        },
        {
            "title":   "Root Cause",
            "content": state.get("root_cause", ""),
            "citations": [],
        },
        {
            "title":   "Contributing Factors",
            "content": factors_text,
            "citations": [],
        },
    ]

    return {
        **state,
        "title":        title,
        "sections":     sections,
        "action_items": items,
        "confidence":   round(confidence, 4),
    }


# ─── Build graph ──────────────────────────────────────────────────────────────

def _build_graph() -> Any:
    graph = StateGraph(PostMortemState)

    graph.add_node("gather_context",    gather_context)
    graph.add_node("analyse_timeline",  analyse_timeline)
    graph.add_node("identify_root_cause", identify_root_cause)
    graph.add_node("generate_output",   generate_output)

    graph.set_entry_point("gather_context")
    graph.add_edge("gather_context",      "analyse_timeline")
    graph.add_edge("analyse_timeline",    "identify_root_cause")
    graph.add_edge("identify_root_cause", "generate_output")
    graph.add_edge("generate_output",     END)

    return graph.compile()


# Singleton — compiled once, reused across requests
_postmortem_graph = _build_graph()


# ─── Public interface ─────────────────────────────────────────────────────────

async def run_postmortem(
    tenant_id:   str,
    description: str,
    severity:    str = "unknown",
    incident_id: str | None = None,
    channel_id:  str | None = None,
    repo:        str | None = None,
) -> PostMortemState:
    """
    Run the full post-mortem pipeline.

    Returns the completed state dict with sections, action_items,
    root_cause, timeline, and confidence score.
    """
    initial: PostMortemState = {
        "tenant_id":   tenant_id,
        "incident_id": incident_id,
        "description": description,
        "severity":    severity,
        "channel_id":  channel_id,
        "repo":        repo,
    }

    t0 = time.monotonic()
    result: PostMortemState = await _postmortem_graph.ainvoke(initial)
    elapsed_ms = int((time.monotonic() - t0) * 1000)

    logger.info(
        "[postmortem] completed in %dms — confidence=%.2f sections=%d actions=%d",
        elapsed_ms,
        result.get("confidence", 0),
        len(result.get("sections", [])),
        len(result.get("action_items", [])),
    )

    return result
