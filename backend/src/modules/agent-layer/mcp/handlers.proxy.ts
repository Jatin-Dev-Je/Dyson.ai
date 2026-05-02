import type { DysonMcpHandlers } from './server.js'

/**
 * MCP handlers for the stdio entry — proxies each tool call to a hosted
 * Dyson instance over its agent HTTP API.
 * Used by `bin/dyson-mcp` so Cursor / Claude Desktop can talk to a remote workspace.
 */
export function createProxyHandlers(opts: {
  apiUrl: string   // e.g. https://api.dyson.ai
  apiKey: string   // dys_…
}): DysonMcpHandlers {
  const base = opts.apiUrl.replace(/\/$/, '')

  async function call<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization:  `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Dyson API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`)
    }
    if (res.status === 204) return undefined as T
    const wrapped = await res.json() as { data: T }
    return wrapped.data
  }

  return {
    async recall(input) {
      return call('POST', '/api/v1/agent/query', input)
    },

    async remember(input) {
      return call('POST', '/api/v1/memory/agent', input)
    },

    async searchMemory(input) {
      const params = new URLSearchParams({ topic: input.query })
      if (input.limit) params.set('limit', String(input.limit))
      const results = await call<unknown[]>('GET', `/api/v1/agent/context?${params}`)
      return {
        results: results.map((r: unknown) => r as {
          id: string; type: string; title: string; summary: string
          source?: string; sourceUrl?: string | null; confidence?: number
        }),
      }
    },

    async recentMemories(input) {
      const params = new URLSearchParams({ limit: String(input.limit ?? 10) })
      if (input.type) params.set('type', input.type)
      const memories = await call<unknown[]>('GET', `/api/v1/agent/decisions?${params}`)
      return {
        memories: memories.map((m: unknown) => m as {
          id: string; title: string; type: string; source: string
          sourceUrl: string | null; occurredAt?: string; confidence?: number | null
        }),
      }
    },

    async getMemory({ id }) {
      const node = await call<{
        id: string; title: string; summary: string; entityType: string
        source: string; sourceUrl: string | null; occurredAt?: string
      }>('GET', `/api/v1/graph/nodes/${encodeURIComponent(id)}`)
      return {
        id:        node.id,
        title:     node.title,
        content:   node.summary,
        type:      node.entityType,
        source:    node.source,
        sourceUrl: node.sourceUrl,
        ...(node.occurredAt && { occurredAt: node.occurredAt }),
      }
    },

    async workspaceContext() {
      return call('GET', '/api/v1/agent/workspace-overview')
    },
  }
}
