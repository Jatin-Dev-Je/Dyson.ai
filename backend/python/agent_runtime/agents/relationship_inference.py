"""
Relationship Inference Agent

Triggered on every new context node. Finds implicit connections to the
existing belief graph that weren't captured at ingestion time.

Pipeline:
  find_candidates → score_relationships → write_edges → update_beliefs

This is the compound intelligence engine — every run makes the graph richer.
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


class RelationshipState(TypedDict, total=False):
    tenant_id:        str
    node_id:          str
    node_title:       str
    node_summary:     str
    node_source:      str
    node_type:        str

    # Retrieved
    candidates:       list[dict[str, Any]]
    beliefs:          list[dict[str, Any]]
    open_questions:   list[dict[str, Any]]

    # Inferred
    new_edges:        list[dict[str, Any]]
    resolved_questions: list[str]
    challenged_beliefs: list[str]
    updated_beliefs:  list[str]

    confidence:       float
    edges_created:    int
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


async def find_candidates(state: RelationshipState) -> RelationshipState:
    """
    Search for existing nodes, beliefs, and open questions that might
    be related to the new node. Uses semantic search + keyword matching.
    """
    logger.info("[relationship] finding candidates for node=%s", state["node_id"])

    query = f"{state['node_title']} {state.get('node_summary', '')}"[:400]

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        try:
            candidates = await client.search(query=query, limit=12)
            # Exclude the node itself
            candidates = [c for c in candidates if c.get("id") != state["node_id"]]
        except DysonAPIError as e:
            logger.warning("[relationship] search failed: %s", e.message)
            candidates = []

        try:
            beliefs = await client.list_beliefs(limit=20)
        except DysonAPIError:
            beliefs = []

        try:
            open_qs = await client.list_open_questions(status="open", limit=15)
        except DysonAPIError:
            open_qs = []

    return {
        **state,
        "candidates":     candidates,
        "beliefs":        beliefs,
        "open_questions": open_qs,
    }


async def score_relationships(state: RelationshipState) -> RelationshipState:
    """
    Use the LLM to reason about which relationships are real, what type
    they are, and what confidence to assign. Also checks if this node
    resolves an open question or challenges a belief.
    """
    logger.info("[relationship] scoring relationships for %d candidates", len(state.get("candidates", [])))

    candidates = state.get("candidates", [])
    beliefs    = state.get("beliefs", [])
    open_qs    = state.get("open_questions", [])

    if not candidates and not beliefs and not open_qs:
        return {**state, "new_edges": [], "resolved_questions": [], "challenged_beliefs": []}

    cand_text  = "\n".join(
        f'  [{i}] id={c.get("id","")} title="{c.get("title","")}" type={c.get("type","")}'
        for i, c in enumerate(candidates[:8])
    )
    belief_text = "\n".join(
        f'  [B{i}] id={b.get("id","")} statement="{b.get("statement","")}" confidence={b.get("confidence",0)}'
        for i, b in enumerate(beliefs[:8])
    )
    question_text = "\n".join(
        f'  [Q{i}] id={q.get("id","")} question="{q.get("question","")}"'
        for i, q in enumerate(open_qs[:6])
    )

    llm = _get_llm()
    prompt = f"""You are analyzing a new knowledge node to find implicit relationships.

NEW NODE:
  id: {state["node_id"]}
  title: "{state["node_title"]}"
  summary: "{state.get("node_summary","")}"
  type: {state.get("node_type","unknown")}
  source: {state.get("node_source","unknown")}

EXISTING NODES (potential connections):
{cand_text or "  none"}

COMPANY BELIEFS (check if supported or challenged):
{belief_text or "  none"}

OPEN QUESTIONS (check if resolved):
{question_text or "  none"}

Task: Identify meaningful relationships. Only include relationships that are genuinely
implied by the content — do NOT invent connections.

Relationship types:
- implements_decision: new node is the implementation of a past decision
- led_to: new node was caused by an existing node
- contradicts: new node contradicts an existing node or belief
- supports: new node provides evidence for a belief
- resolves_question: new node answers an open question
- depends_on: new node requires an existing node
- supersedes: new node replaces an existing approach

Respond ONLY with JSON:
{{
  "edges": [
    {{"from_id": "...", "to_id": "...", "type": "led_to", "confidence": 0.85, "reason": "..."}}
  ],
  "resolved_question_ids": ["Q0", "Q2"],
  "challenged_belief_ids": ["B1"],
  "supported_belief_ids": ["B0"]
}}"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="You find implicit knowledge relationships. Be precise, not speculative."),
            HumanMessage(content=prompt),
        ])
        text  = response.content
        match = re.search(r"\{.*\}", text, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}

        raw_edges      = parsed.get("edges", [])
        resolved_ids   = parsed.get("resolved_question_ids", [])
        challenged_ids = parsed.get("challenged_belief_ids", [])
        supported_ids  = parsed.get("supported_belief_ids", [])

        # Map index refs back to real IDs
        def resolve_idx(ref: str, items: list[dict[str, Any]], prefix: str) -> str:
            if ref.startswith(prefix):
                try:
                    return items[int(ref[len(prefix):])].get("id", ref)
                except (IndexError, ValueError):
                    pass
            return ref

        edges: list[dict[str, Any]] = []
        for e in raw_edges:
            from_id = resolve_idx(e.get("from_id", ""), candidates, "")
            to_id   = resolve_idx(e.get("to_id", ""), candidates, "")
            if from_id and to_id and e.get("confidence", 0) >= 0.65:
                edges.append({
                    "from_id":   from_id,
                    "to_id":     to_id,
                    "type":      e.get("type", "related"),
                    "confidence": float(e.get("confidence", 0.7)),
                    "reason":    e.get("reason", ""),
                })

        resolved  = [resolve_idx(r, open_qs, "Q") for r in resolved_ids]
        challenged = [resolve_idx(c, beliefs, "B") for c in challenged_ids]
        supported  = [resolve_idx(s, beliefs, "B") for s in supported_ids]

    except Exception as exc:
        logger.warning("[relationship] scoring failed: %s", exc)
        edges, resolved, challenged, supported = [], [], [], []

    return {
        **state,
        "new_edges":          edges,
        "resolved_questions": resolved,
        "challenged_beliefs": challenged,
        "updated_beliefs":    supported,
    }


async def write_edges(state: RelationshipState) -> RelationshipState:
    """
    Persist inferred edges, resolve open questions, update belief confidence.
    All writes go through the Dyson API — no direct DB access from agents.
    """
    edges_created = 0
    edges     = state.get("new_edges", [])
    resolved  = state.get("resolved_questions", [])
    challenged = state.get("challenged_beliefs", [])
    updated   = state.get("updated_beliefs", [])

    async with DysonClient(tenant_id=state["tenant_id"]) as client:
        for edge in edges:
            try:
                await client.create_edge(
                    from_id=edge["from_id"],
                    to_id=edge["to_id"],
                    relationship_type=edge["type"],
                    confidence=edge["confidence"],
                    metadata={"reason": edge.get("reason", ""), "inferred": True},
                )
                edges_created += 1
            except DysonAPIError as e:
                logger.debug("[relationship] edge write failed: %s", e.message)

        for q_id in resolved:
            try:
                await client.resolve_question(
                    question_id=q_id,
                    resolution=f"Resolved by node: {state['node_title']}",
                    resolving_node_id=state["node_id"],
                )
            except DysonAPIError as e:
                logger.debug("[relationship] question resolve failed: %s", e.message)

        for b_id in challenged:
            try:
                await client.challenge_belief(
                    belief_id=b_id,
                    challenging_node_id=state["node_id"],
                )
            except DysonAPIError as e:
                logger.debug("[relationship] belief challenge failed: %s", e.message)

        for b_id in updated:
            try:
                await client.support_belief(
                    belief_id=b_id,
                    supporting_node_id=state["node_id"],
                )
            except DysonAPIError as e:
                logger.debug("[relationship] belief support failed: %s", e.message)

    confidence = min(0.95, 0.6 + edges_created * 0.08)

    logger.info(
        "[relationship] complete — edges=%d resolved=%d challenged=%d",
        edges_created, len(resolved), len(challenged),
    )

    return {**state, "edges_created": edges_created, "confidence": confidence}


def _build_graph() -> Any:
    graph = StateGraph(RelationshipState)
    graph.add_node("find_candidates",    find_candidates)
    graph.add_node("score_relationships", score_relationships)
    graph.add_node("write_edges",        write_edges)
    graph.set_entry_point("find_candidates")
    graph.add_edge("find_candidates",    "score_relationships")
    graph.add_edge("score_relationships", "write_edges")
    graph.add_edge("write_edges",        END)
    return graph.compile()


_graph = _build_graph()


async def run_relationship_inference(
    tenant_id:   str,
    node_id:     str,
    node_title:  str,
    node_summary: str = "",
    node_source: str = "unknown",
    node_type:   str = "context",
) -> RelationshipState:
    t0 = time.monotonic()
    result: RelationshipState = await _graph.ainvoke({
        "tenant_id":   tenant_id,
        "node_id":     node_id,
        "node_title":  node_title,
        "node_summary": node_summary,
        "node_source": node_source,
        "node_type":   node_type,
    })
    logger.info(
        "[relationship] %dms — edges=%d",
        int((time.monotonic() - t0) * 1000),
        result.get("edges_created", 0),
    )
    return result
