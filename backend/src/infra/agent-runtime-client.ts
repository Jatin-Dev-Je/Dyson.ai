/**
 * HTTP client for the Python Agent Runtime microservice.
 *
 * The TypeScript API delegates all ML/agent workloads to the Python service
 * running at AGENT_RUNTIME_URL (default: http://localhost:8001).
 *
 * Design:
 *   - Thin wrapper around fetch — no heavy SDK
 *   - Circuit-breaker aware: if Python service is down, callers get a typed
 *     error they can handle (degrade gracefully, not 500)
 *   - All requests carry tenant_id so the Python service can scope logs/traces
 *   - Timeout: 90s (agents can be slow on first cold run)
 *
 * Engineering tradeoff:
 *   We use a plain fetch client rather than an OpenAPI-generated SDK because:
 *   1. The Python service schema changes often during development
 *   2. Generated SDK adds a build step and a sync burden
 *   3. The surface is small (5 endpoints) — a typed wrapper is better
 */

import { env } from '@/config/env.js'

export class AgentRuntimeError extends Error {
  constructor(
    readonly status: number,
    readonly code:   string,
    message:         string,
  ) {
    super(message)
    this.name = 'AgentRuntimeError'
  }
}

export class AgentRuntimeUnavailableError extends AgentRuntimeError {
  constructor() {
    super(503, 'AGENT_RUNTIME_UNAVAILABLE', 'Agent runtime is currently unavailable — try again shortly')
  }
}

// ─── Response types (mirror python/agent_runtime/schemas/agents.py) ──────────

export interface PostMortemResult {
  run_id:       string
  title:        string
  severity:     string
  incident_id:  string | null
  sections:     Array<{ title: string; content: string; citations: unknown[] }>
  action_items: string[]
  related_past_incidents: unknown[]
  confidence:   number
  generated_at: string
  latency_ms:   number
}

export interface PRReviewResult {
  run_id:            string
  pr_number:         number
  repo:              string
  comments:          Array<{ type: string; severity: string; message: string; citations: unknown[] }>
  related_decisions: unknown[]
  confidence:        number
  generated_at:      string
  latency_ms:        number
}

export interface DetectDecisionResult {
  is_decision: boolean
  confidence:  number
  decisions:   Array<{
    title:          string
    summary:        string
    confidence:     number
    signals:        string[]
    suggested_type: string
  }>
}

export interface EmbedResult {
  embeddings: number[][]
  model:      string
  dim:        number
}

// ─── Client ───────────────────────────────────────────────────────────────────

async function agentFetch<T>(
  path:   string,
  init:   RequestInit = {},
): Promise<T> {
  const base = env.AGENT_RUNTIME_URL
  if (!base) throw new AgentRuntimeUnavailableError()

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), 90_000)

  try {
    const resp = await fetch(`${base}${path}`, {
      ...init,
      signal:  controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })

    if (!resp.ok) {
      let code = 'AGENT_RUNTIME_ERROR'
      let msg  = `Agent runtime returned ${resp.status}`
      try {
        const body = await resp.json() as { detail?: string; error?: { code: string; message: string } }
        code = body.error?.code  ?? code
        msg  = body.error?.message ?? body.detail ?? msg
      } catch { /* ignore parse error */ }
      throw new AgentRuntimeError(resp.status, code, msg)
    }

    return resp.json() as Promise<T>
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new AgentRuntimeError(504, 'AGENT_RUNTIME_TIMEOUT', 'Agent runtime timed out after 90s')
    }
    if (err instanceof AgentRuntimeError) throw err
    // Network error (service is down)
    throw new AgentRuntimeUnavailableError()
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const agentRuntimeClient = {
  /**
   * Run the post-mortem agent.
   * Incident description → structured post-mortem with sections + action items.
   * Typical latency: 15–30 seconds.
   */
  async runPostMortem(params: {
    tenant_id:   string
    description: string
    severity?:   string
    incident_id?: string | null
    channel_id?:  string | null
    repo?:        string | null
  }): Promise<PostMortemResult> {
    return agentFetch<PostMortemResult>('/agents/postmortem', {
      method: 'POST',
      body:   JSON.stringify(params),
    })
  },

  /**
   * Run the PR review agent.
   * PR metadata → typed review comments grounded in company memory.
   */
  async runPRReview(params: {
    tenant_id:     string
    pr_number:     number
    repo:          string
    title:         string
    description?:  string
    diff_summary?: string
    changed_files?: string[]
  }): Promise<PRReviewResult> {
    return agentFetch<PRReviewResult>('/agents/pr-review', {
      method: 'POST',
      body:   JSON.stringify(params),
    })
  },

  /**
   * Detect whether a text contains a decision.
   * Used by the ingestion pipeline for automatic memory capture.
   */
  async detectDecision(params: {
    tenant_id:  string
    text:       string
    source?:    string
    source_url?: string | null
    author?:    string | null
  }): Promise<DetectDecisionResult> {
    return agentFetch<DetectDecisionResult>('/agents/detect-decision', {
      method: 'POST',
      body:   JSON.stringify(params),
    })
  },

  /**
   * Embed texts using the Python service's local sentence-transformers model.
   * Used when Cohere is unavailable or for cost-sensitive bulk operations.
   */
  async embed(texts: string[]): Promise<EmbedResult> {
    return agentFetch<EmbedResult>('/ml/embed', {
      method: 'POST',
      body:   JSON.stringify({ texts }),
    })
  },

  /** Health check — returns true if the Python service is reachable. */
  async isHealthy(): Promise<boolean> {
    try {
      const resp = await fetch(`${env.AGENT_RUNTIME_URL ?? ''}/health`, { signal: AbortSignal.timeout(3_000) })
      return resp.ok
    } catch {
      return false
    }
  },
}
