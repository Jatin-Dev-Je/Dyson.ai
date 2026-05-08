"""
Pre-Meeting Brief Agent

Triggered 30 minutes before a calendar event. Extracts topics from the
meeting title and agenda, queries company memory, and sends each attendee
a concise brief with relevant decisions, open questions, and context.

Pipeline:
  extract_topics → gather_context → generate_brief → send_briefs
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


class BriefState(TypedDict, total=False):
    tenant_id:      str
    meeting_id:     str
    meeting_title:  str
    meeting_time:   str
    attendee_ids:   list[str]
    agenda:         str | None

    # Extracted
    topics:         list[str]
    keywords:       list[str]

    # Gathered context
    relevant_decisions: list[dict[str, Any]]
    open_questions:     list[dict[str, Any]]
    rejected_options:   list[dict[str, Any]]
    key_people:         list[dict[str, Any]]

    # Generated
    brief_title:    str
    brief_sections: list[dict[str, Any]]
    brief_summary:  str

    # Delivery
    sent_to:        list[str]
    brief_id:       str | None

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


async def extract_topics(state: BriefState) -> BriefState:
    """Extract searchable topics and keywords from meeting title + agenda."""
    logger.info("[brief] extracting topics for meeting: %s", state["meeting_title"])

    llm = _get_llm()

    agenda_text = state.get("agenda", "") or ""

    prompt = f"""Extract search topics from this meeting title and agenda.

Meeting: "{state["meeting_title"]}"
Agenda: "{agenda_text[:500]}"

Extract:
1. Main topics to search in company memory (3-5 specific concepts)
2. Keywords for semantic search

Respond ONLY with JSON:
{{
  "topics": ["JWT authentication strategy", "rate limiting approach"],
  "keywords": ["auth", "rate limit", "payments", "architecture"]
}}"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="Extract precise, searchable topics from meeting descriptions."),
            HumanMessage(content=prompt),
        ])
        text  = response.content
        match = re.search(r"\{.*\}", text, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}
        topics   = parsed.get("topics", [state["meeting_title"]])
        keywords = parsed.get("keywords", [])
    except Exception as exc:
        logger.warning("[brief] topic extraction failed: %s", exc)
        topics   = [state["meeting_title"]]
        keywords = []

    return {**state, "topics": topics, "keywords": keywords}


async def gather_context(state: BriefState) -> BriefState:
    """
    Query company memory for each extracted topic. Gathers decisions,
    open questions, rejected options, and key people.
    """
    logger.info("[brief] gathering context for %d topics", len(state.get("topics", [])))

    all_decisions: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        for topic in state.get("topics", [])[:4]:
            try:
                results = await client.search(query=topic, limit=5)
                for r in results:
                    if r.get("id") not in seen_ids:
                        seen_ids.add(r.get("id", ""))
                        all_decisions.append(r)
            except DysonAPIError:
                pass

        try:
            open_qs = await client.list_open_questions(status="open", limit=10)
            # Filter to relevant ones using keyword matching
            keywords = [k.lower() for k in state.get("keywords", [])]
            relevant_qs = [
                q for q in open_qs
                if any(k in q.get("question", "").lower() for k in keywords)
            ] if keywords else open_qs[:5]
        except DysonAPIError:
            relevant_qs = []

        try:
            decisions = await client.list_decisions(limit=30)
            rejected = [
                d for d in decisions
                if d.get("type") == "decision" and "rejected" in d.get("summary", "").lower()
            ][:3]
        except DysonAPIError:
            rejected = []

    return {
        **state,
        "relevant_decisions": all_decisions[:8],
        "open_questions":     relevant_qs[:4],
        "rejected_options":   rejected,
    }


async def generate_brief(state: BriefState) -> BriefState:
    """Generate a structured, scannable brief from gathered context."""
    logger.info("[brief] generating brief")

    llm = _get_llm()

    decisions_text = "\n".join(
        f"• {d.get('title','')}: {(d.get('summary','') or '')[:100]}"
        for d in state.get("relevant_decisions", [])[:6]
    )
    questions_text = "\n".join(
        f"• {q.get('question','')}"
        for q in state.get("open_questions", [])
    )
    rejected_text = "\n".join(
        f"• {r.get('title','')}"
        for r in state.get("rejected_options", [])
    )

    prompt = f"""Write a concise pre-meeting brief for engineers.

Meeting: "{state["meeting_title"]}"
Time: {state["meeting_time"]}

Relevant company memory:
PAST DECISIONS:
{decisions_text or "None found"}

OPEN QUESTIONS:
{questions_text or "None found"}

PREVIOUSLY REJECTED APPROACHES:
{rejected_text or "None found"}

Write a brief with these sections (only include sections with real content):
1. Context — 1-2 sentences on what's relevant from company history
2. Key past decisions — bullet list, most important first
3. Open questions — unresolved topics the meeting might address
4. Watch out for — rejected approaches to be aware of

Keep it scannable. Engineers will read this in 90 seconds.

Respond ONLY with JSON:
{{
  "title": "Brief: [meeting title]",
  "summary": "One sentence context",
  "sections": [
    {{"heading": "Key past decisions", "items": ["...", "..."]}},
    {{"heading": "Open questions", "items": ["..."]}},
    {{"heading": "Watch out for", "items": ["..."]}}
  ]
}}"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="Write concise, actionable pre-meeting briefs for engineers."),
            HumanMessage(content=prompt),
        ])
        text  = response.content
        match = re.search(r"\{.*\}", text, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}

        title    = parsed.get("title", f"Brief: {state['meeting_title']}")
        summary  = parsed.get("summary", "")
        sections = parsed.get("sections", [])

    except Exception as exc:
        logger.warning("[brief] generation failed: %s", exc)
        title    = f"Brief: {state['meeting_title']}"
        summary  = "Company memory context for this meeting."
        sections = []

    return {**state, "brief_title": title, "brief_summary": summary, "brief_sections": sections}


async def send_briefs(state: BriefState) -> BriefState:
    """Persist the brief and send it to each attendee."""
    sent_to: list[str] = []

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            result = await client.create_brief(
                meeting_id=state["meeting_id"],
                meeting_title=state["meeting_title"],
                meeting_time=state["meeting_time"],
                title=state.get("brief_title", ""),
                summary=state.get("brief_summary", ""),
                sections=state.get("brief_sections", []),
                attendee_ids=state.get("attendee_ids", []),
                source_node_ids=[
                    d.get("id", "") for d in state.get("relevant_decisions", [])
                ],
            )
            brief_id = result.get("data", {}).get("id")
        except DysonAPIError as e:
            logger.warning("[brief] persist failed: %s", e.message)
            brief_id = None

        for uid in state.get("attendee_ids", [])[:20]:
            try:
                await client.send_agent_alert(
                    alert_type="pre_meeting_brief",
                    severity="info",
                    message=f"📋 *{state.get('brief_title','')}*\n\n{state.get('brief_summary','')}",
                    metadata={
                        "brief_id":     brief_id,
                        "meeting_id":   state["meeting_id"],
                        "recipient_id": uid,
                    },
                )
                sent_to.append(uid)
            except DysonAPIError as e:
                logger.debug("[brief] send to %s failed: %s", uid, e.message)

    logger.info("[brief] sent to %d/%d attendees", len(sent_to), len(state.get("attendee_ids", [])))

    return {**state, "sent_to": sent_to, "brief_id": brief_id}


def _build_graph() -> Any:
    graph = StateGraph(BriefState)
    graph.add_node("extract_topics",  extract_topics)
    graph.add_node("gather_context",  gather_context)
    graph.add_node("generate_brief",  generate_brief)
    graph.add_node("send_briefs",     send_briefs)
    graph.set_entry_point("extract_topics")
    graph.add_edge("extract_topics", "gather_context")
    graph.add_edge("gather_context", "generate_brief")
    graph.add_edge("generate_brief", "send_briefs")
    graph.add_edge("send_briefs",    END)
    return graph.compile()


_graph = _build_graph()


async def run_pre_meeting_brief(
    tenant_id:     str,
    meeting_id:    str,
    meeting_title: str,
    meeting_time:  str,
    attendee_ids:  list[str],
    agenda:        str | None = None,
) -> BriefState:
    t0 = time.monotonic()
    result: BriefState = await _graph.ainvoke({
        "tenant_id":     tenant_id,
        "meeting_id":    meeting_id,
        "meeting_title": meeting_title,
        "meeting_time":  meeting_time,
        "attendee_ids":  attendee_ids,
        "agenda":        agenda,
    })
    logger.info(
        "[brief] %dms — sent_to=%d sections=%d",
        int((time.monotonic() - t0) * 1000),
        len(result.get("sent_to", [])),
        len(result.get("brief_sections", [])),
    )
    return result
