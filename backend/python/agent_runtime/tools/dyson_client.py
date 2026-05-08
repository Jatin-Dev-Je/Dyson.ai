"""
Async HTTP client for the Dyson TypeScript API.

Used by all agents to read memory, call the WHY engine, and write new
memories. Thin wrapper around httpx — retries on 5xx, raises structured
errors, never swallows exceptions silently.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


class DysonAPIError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status  = status
        self.code    = code
        self.message = message


class DysonClient:
    """
    Async client for the Dyson REST API.

    Usage (inside a FastAPI endpoint or agent node):
        async with DysonClient(tenant_id="t_...") as client:
            result = await client.recall("Why did we choose pgvector?")
    """

    def __init__(self, tenant_id: str, api_key: str | None = None) -> None:
        cfg = get_settings()
        self._base    = cfg.dyson_api_url.rstrip("/")
        self._key     = api_key or cfg.dyson_api_key
        self._tenant  = tenant_id
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "DysonClient":
        self._client = httpx.AsyncClient(
            base_url=self._base,
            headers={
                "Authorization": f"Bearer {self._key}",
                "X-Tenant-Id":   self._tenant,
                "Content-Type":  "application/json",
            },
            timeout=httpx.Timeout(30.0),
        )
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._client:
            await self._client.aclose()

    # ── Internal ─────────────────────────────────────────────────────────

    async def _get(self, path: str, **params: Any) -> dict[str, Any]:
        assert self._client, "use as async context manager"
        resp = await self._client.get(path, params={k: v for k, v in params.items() if v is not None})
        return self._unwrap(resp)

    async def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        assert self._client, "use as async context manager"
        resp = await self._client.post(path, json=body)
        return self._unwrap(resp)

    @staticmethod
    def _unwrap(resp: httpx.Response) -> dict[str, Any]:
        if resp.status_code >= 400:
            try:
                err = resp.json().get("error", {})
            except Exception:
                err = {}
            raise DysonAPIError(
                status=resp.status_code,
                code=err.get("code", "UNKNOWN"),
                message=err.get("message", resp.text),
            )
        return resp.json()

    # ── Public API ───────────────────────────────────────────────────────

    async def recall(self, question: str) -> dict[str, Any]:
        """Call the WHY Engine — returns grounded answer + citations."""
        return await self._post("/api/v1/recall", {"question": question})

    async def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        """Full-text + semantic search across company memory."""
        result = await self._get("/api/v1/search", q=query, limit=limit)
        return result.get("data", [])

    async def list_memories(
        self,
        memory_type: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """List recent memories, optionally filtered by type."""
        result = await self._get("/api/v1/memory", type=memory_type, limit=limit)
        return result.get("data", [])

    async def get_memory(self, memory_id: str) -> dict[str, Any]:
        """Get a single memory with linked nodes."""
        result = await self._get(f"/api/v1/memory/{memory_id}")
        return result.get("data", {})

    async def write_memory(
        self,
        title: str,
        content: str,
        memory_type: str = "context",
        url: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Write a new memory node."""
        return await self._post("/api/v1/memory", {
            "title":    title,
            "content":  content,
            "type":     memory_type,
            "url":      url,
            "metadata": metadata or {},
        })

    async def list_decisions(self, limit: int = 10) -> list[dict[str, Any]]:
        """Recent auto-detected decisions."""
        result = await self._get("/api/v1/decisions", limit=limit)
        return result.get("data", [])

    async def workspace_overview(self) -> dict[str, Any]:
        """Full workspace snapshot — memories, recalls, graph stats."""
        result = await self._get("/api/v1/agent/workspace-overview")
        return result.get("data", {})

    # ── Belief graph ─────────────────────────────────────────────────────

    async def list_beliefs(self, limit: int = 20) -> list[dict[str, Any]]:
        result = await self._get("/api/v1/beliefs", limit=limit)
        return result.get("data", [])

    async def list_principles(self, limit: int = 20) -> list[dict[str, Any]]:
        result = await self._get("/api/v1/beliefs/principles", limit=limit)
        return result.get("data", [])

    async def challenge_belief(self, belief_id: str, challenging_node_id: str) -> dict[str, Any]:
        return await self._post(f"/api/v1/beliefs/{belief_id}/challenge", {
            "challengingNodeId": challenging_node_id,
        })

    async def support_belief(self, belief_id: str, supporting_node_id: str) -> dict[str, Any]:
        return await self._post(f"/api/v1/beliefs/{belief_id}/support", {
            "supportingNodeId": supporting_node_id,
        })

    # ── Open questions ────────────────────────────────────────────────────

    async def list_open_questions(
        self,
        status: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        result = await self._get("/api/v1/beliefs/questions", status=status, limit=limit)
        return result.get("data", [])

    async def resolve_question(
        self,
        question_id: str,
        resolution: str,
        resolving_node_id: str,
    ) -> dict[str, Any]:
        return await self._post(f"/api/v1/beliefs/questions/{question_id}/resolve", {
            "resolution":       resolution,
            "resolvingNodeId":  resolving_node_id,
        })

    # ── Graph edges ───────────────────────────────────────────────────────

    async def create_edge(
        self,
        from_id:           str,
        to_id:             str,
        relationship_type: str,
        confidence:        float,
        metadata:          dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self._post("/api/v1/graph/edges", {
            "fromId":           from_id,
            "toId":             to_id,
            "relationshipType": relationship_type,
            "confidence":       confidence,
            "metadata":         metadata or {},
        })

    # ── Conflicts ─────────────────────────────────────────────────────────

    async def create_conflict(
        self,
        decision_id: str,
        item_id:     str,
        item_type:   str,
        reason:      str,
        severity:    str,
        confidence:  float,
    ) -> dict[str, Any]:
        return await self._post("/api/v1/conflicts", {
            "decisionId": decision_id,
            "itemId":     item_id,
            "itemType":   item_type,
            "reason":     reason,
            "severity":   severity,
            "confidence": confidence,
        })

    async def list_conflicts(self, status: str | None = None) -> dict[str, Any]:
        return await self._get("/api/v1/conflicts", status=status)

    # ── Briefs ────────────────────────────────────────────────────────────

    async def create_brief(
        self,
        meeting_id:      str,
        meeting_title:   str,
        meeting_time:    str,
        title:           str,
        summary:         str,
        sections:        list[dict[str, Any]],
        attendee_ids:    list[str],
        source_node_ids: list[str],
    ) -> dict[str, Any]:
        return await self._post("/api/v1/briefs", {
            "meetingId":     meeting_id,
            "meetingTitle":  meeting_title,
            "meetingTime":   meeting_time,
            "title":         title,
            "summary":       summary,
            "sections":      sections,
            "attendeeIds":   attendee_ids,
            "sourceNodeIds": source_node_ids,
        })

    # ── Digests ───────────────────────────────────────────────────────────

    async def create_digest(
        self,
        team:           str,
        title:          str,
        sections:       list[dict[str, Any]],
        period_days:    int,
        decision_count: int,
        question_count: int,
    ) -> dict[str, Any]:
        return await self._post("/api/v1/digests", {
            "team":          team,
            "title":         title,
            "sections":      sections,
            "periodDays":    period_days,
            "decisionCount": decision_count,
            "questionCount": question_count,
        })

    # ── Health ────────────────────────────────────────────────────────────

    async def get_knowledge_health(self) -> dict[str, Any]:
        return await self._get("/api/v1/health/knowledge")

    async def save_health_report(
        self,
        overall_score:   float,
        sections:        list[dict[str, Any]],
        at_risk_nodes:   list[dict[str, Any]],
        stale_decisions: list[dict[str, Any]],
        recommendations: list[str],
    ) -> dict[str, Any]:
        return await self._post("/api/v1/health/knowledge", {
            "overallScore":   overall_score,
            "sections":       sections,
            "atRiskNodes":    at_risk_nodes,
            "staleDecisions": stale_decisions,
            "recommendations": recommendations,
        })

    # ── Alerts ────────────────────────────────────────────────────────────

    async def send_agent_alert(
        self,
        alert_type: str,
        severity:   str,
        message:    str,
        metadata:   dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self._post("/api/v1/agent-feed/alert", {
            "alertType": alert_type,
            "severity":  severity,
            "message":   message,
            "metadata":  metadata or {},
        })
