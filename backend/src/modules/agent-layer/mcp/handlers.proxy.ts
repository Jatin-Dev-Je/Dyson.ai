import type { DysonMcpHandlers } from './server.js'

/**
 * MCP handlers for the stdio entry — proxy each tool call to a hosted Dyson
 * over its agent HTTP API. Used by `bin/dyson-mcp` so users can install
 * Dyson into Cursor / Claude Desktop and have it talk to their workspace.
 */
export function createProxyHandlers(opts: {
  apiUrl: string                  // e.g. https://dyson.example.com
  apiKey: string                  // dys_…
}): DysonMcpHandlers {
  const base = opts.apiUrl.replace(/\/$/, '')

  async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
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
      throw new Error(`Dyson API ${method} ${path} failed: ${res.status} ${text.slice(0, 200)}`)
    }
    const wrapped = await res.json() as { data: T }
    return wrapped.data
  }

  return {
    async askWhy(input) {
      return call('POST', '/api/v1/agent/query', input) as Promise<ReturnType<DysonMcpHandlers['askWhy']> extends Promise<infer T> ? T : never>
    },

    async searchContext(input) {
      const params = new URLSearchParams({ topic: input.query })
      if (input.limit) params.set('limit', String(input.limit))
      const data = await call<Array<unknown>>('GET', `/api/v1/agent/context?${params.toString()}`)
      return { results: data as ReturnType<DysonMcpHandlers['searchContext']> extends Promise<infer T> ? T extends { results: infer R } ? R : never : never }
    },

    async recentDecisions(input) {
      const params = new URLSearchParams({ limit: String(input.limit ?? 10) })
      const data = await call<Array<unknown>>('GET', `/api/v1/agent/decisions?${params.toString()}`)
      return { decisions: data as ReturnType<DysonMcpHandlers['recentDecisions']> extends Promise<infer T> ? T extends { decisions: infer D } ? D : never : never }
    },

    async getDecision(input) {
      // Reuse the user-facing decisions endpoint via API key
      return call('GET', `/api/v1/decisions/${encodeURIComponent(input.id)}`) as Promise<ReturnType<DysonMcpHandlers['getDecision']> extends Promise<infer T> ? T : never>
    },

    async getNode(input) {
      return call('GET', `/api/v1/graph/nodes/${encodeURIComponent(input.id)}`) as Promise<ReturnType<DysonMcpHandlers['getNode']> extends Promise<infer T> ? T : never>
    },

    async writeEvent(input) {
      return call('POST', '/api/v1/agent/events', input) as Promise<ReturnType<DysonMcpHandlers['writeEvent']> extends Promise<infer T> ? T : never>
    },

    async workspaceOverview() {
      return call('GET', '/api/v1/agent/workspace-overview') as Promise<ReturnType<DysonMcpHandlers['workspaceOverview']> extends Promise<infer T> ? T : never>
    },
  }
}
