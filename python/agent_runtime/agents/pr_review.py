"""
PR Review agent — scans a pull request against company memory.

Surfaces:
  - Decisions that constrain the changed code
  - Past incidents related to the changed areas
  - Architectural constraints the author may not know about

Designed to post as a GitHub PR comment via the GitHub bot.
"""
from __future__ import annotations

import logging
import time
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END

from ..tools.dyson_client import DysonClient, DysonAPIError

logger = logging.getLogger(__name__)


class PRReviewState(TypedDict, total=False):
    tenant_id:    str
    pr_number:    int
    repo:         str
    title:        str
    description:  str
    diff_summary: str
    changed_files: list[str]

    # gathered
    related_memories:  list[dict[str, Any]]
    related_decisions: list[dict[str, Any]]
    recall_result:     dict[str, Any]

    # output
    comments:     list[dict[str, Any]]
    confidence:   float
    error:        str | None


async def gather_pr_context(state: PRReviewState) -> PRReviewState:
    logger.info("[pr_review] gathering context for PR #%s in %s", state["pr_number"], state["repo"])

    search_query = f"{state['title']} {state['description'][:200]} {' '.join(state.get('changed_files', [])[:5])}"

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            memories = await client.search(search_query, limit=8)
        except DysonAPIError:
            memories = []

        try:
            decisions = await client.list_decisions(limit=10)
        except DysonAPIError:
            decisions = []

        try:
            recall = await client.recall(
                f"What decisions or constraints apply to: {state['title']}?"
            )
        except DysonAPIError:
            recall = {"data": {"cannotAnswer": True, "answer": None, "confidence": 0}}

    return {
        **state,
        "related_memories":  memories,
        "related_decisions": decisions,
        "recall_result":     recall.get("data", {}),
    }


async def generate_review_comments(state: PRReviewState) -> PRReviewState:
    logger.info("[pr_review] generating review comments")

    from .postmortem import _get_llm

    llm = _get_llm()

    memories_text = "\n".join([
        f"- [{m.get('type','context').upper()}] {m.get('title','')}: {m.get('summary','')}"
        for m in state.get("related_memories", [])[:6]
    ])

    recall_answer = state.get("recall_result", {}).get("answer", "")
    recall_confidence = state.get("recall_result", {}).get("confidence", 0)

    prompt = f"""You are reviewing a pull request against company memory.

PR: #{state['pr_number']} — {state['title']}
Description: {state.get('description', '')[:300]}
Changed files: {', '.join(state.get('changed_files', [])[:10])}

Relevant company memory:
{memories_text or 'No directly related memories found.'}

WHY Engine answer (confidence={recall_confidence:.0%}):
{recall_answer or 'Could not retrieve context.'}

Generate review comments. Each comment should be:
- A specific, actionable insight grounded in company memory
- Categorised as: warning, info, decision, or constraint
- With severity: high, medium, low, or info

Return JSON array:
[
  {{"type": "warning", "severity": "high", "message": "...", "citations": []}},
  {{"type": "decision", "severity": "info", "message": "...", "citations": []}}
]

If nothing relevant found, return an empty array []."""

    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        import json, re
        text  = response.content
        match = re.search(r"\[.*?\]", text, re.DOTALL)
        comments: list[dict] = json.loads(match.group()) if match else []
    except Exception as e:
        logger.warning("[pr_review] comment generation failed: %s", e)
        comments = []

    confidence = min(0.95, 0.4 + len(state.get("related_memories", [])) * 0.08)

    return {**state, "comments": comments, "confidence": round(confidence, 4)}


def _build_pr_graph() -> Any:
    graph = StateGraph(PRReviewState)
    graph.add_node("gather_context",       gather_pr_context)
    graph.add_node("generate_comments",    generate_review_comments)
    graph.set_entry_point("gather_context")
    graph.add_edge("gather_context",    "generate_comments")
    graph.add_edge("generate_comments", END)
    return graph.compile()


_pr_graph = _build_pr_graph()


async def run_pr_review(
    tenant_id:     str,
    pr_number:     int,
    repo:          str,
    title:         str,
    description:   str = "",
    diff_summary:  str = "",
    changed_files: list[str] | None = None,
) -> PRReviewState:
    t0 = time.monotonic()
    result: PRReviewState = await _pr_graph.ainvoke({
        "tenant_id":    tenant_id,
        "pr_number":    pr_number,
        "repo":         repo,
        "title":        title,
        "description":  description,
        "diff_summary": diff_summary,
        "changed_files": changed_files or [],
    })
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    logger.info("[pr_review] completed in %dms — %d comments", elapsed_ms, len(result.get("comments", [])))
    return result
