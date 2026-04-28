import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

/**
 * MCP server for Dyson — exposes the WHY Engine, search, and decisions to any
 * MCP-compatible client (Claude Desktop, Cursor, Continue, custom agents, …).
 *
 * The same server is mounted in two places:
 *   • In-process on Fastify at /mcp via Streamable HTTP transport — for hosted
 *     agents authenticating with a Dyson API key (Bearer dys_…).
 *   • Standalone via the bin/dyson-mcp stdio entry — for local installs in
 *     Cursor / Claude Desktop. That entry proxies tool calls back to a hosted
 *     Dyson over the same HTTP API key.
 *
 * The handler interface lets us swap the implementation between "call services
 * directly" (hosted, in-process) and "proxy to remote Dyson over HTTP" (stdio).
 */

// ─── Handler interface — shared shape for direct and proxy backends ──────
export interface DysonMcpHandlers {
  askWhy(input: { question: string }): Promise<{
    queryId:      string
    question:     string
    answer:       string | null
    confidence:   number
    cannotAnswer: boolean
    citations:    Array<{ claim: string; sourceNodeId: string; sourceUrl: string | null; confidence: number }>
    sourceNodes:  Array<{ id: string; title: string; source: string; sourceUrl: string | null; occurredAt?: string }>
  }>

  searchContext(input: { query: string; type?: 'all' | 'decision' | 'event' | 'query'; limit?: number }): Promise<{
    results: Array<{ id: string; type: string; title: string; summary: string; source?: string; sourceUrl?: string | null; confidence?: number }>
  }>

  recentDecisions(input: { limit?: number; minConfidence?: number }): Promise<{
    decisions: Array<{ id: string; title: string; summary: string; source: string; sourceUrl: string | null; occurredAt?: string; decisionConfidence?: number | null }>
  }>

  getDecision(input: { id: string }): Promise<{
    id:       string
    title:    string
    summary:  string
    timeline: Array<{ id: string; title: string; source: string; occurredAt?: string }>
    sourceUrl?: string | null
  }>

  getNode(input: { id: string }): Promise<{
    id: string; title: string; summary: string; source: string; sourceUrl: string | null
    occurredAt?: string; isDecision?: boolean
  }>
}

// ─── Build & register a fresh McpServer ──────────────────────────────────
export function createDysonMcpServer(handlers: DysonMcpHandlers): McpServer {
  const server = new McpServer(
    {
      name:    'dyson',
      title:   'Dyson — context infrastructure',
      version: '1.0.0',
    },
    {
      // Long-form description so picker UIs in Claude Desktop / Cursor have something useful
      instructions:
        'Dyson is the system of record for "why". It connects Slack, GitHub, Notion and meetings into one ' +
        'queryable context graph. Use ask_why to get a cited causal timeline for any decision question. ' +
        'Use search_context to find specific events or decisions. Use recent_decisions to get a list of ' +
        'detected decisions for situational awareness. All answers carry citations and a confidence score; ' +
        'below 0.72 confidence Dyson refuses to compose an interpretation and returns the raw events instead.',
    }
  )

  // ── Tool: ask_why ───────────────────────────────────────────────────────
  server.registerTool(
    'ask_why',
    {
      title:       'Ask WHY',
      description:
        'Ask a "why did we…?" question against the workspace context graph. Returns a reconstructed ' +
        'causal timeline with citations on every claim and a calibrated confidence score. If confidence ' +
        'is below the threshold, returns the source events without interpretation rather than guessing.',
      inputSchema: {
        question: z.string().min(3).max(1000).describe('The natural-language WHY question to answer.'),
      },
    },
    async ({ question }) => {
      const r = await handlers.askWhy({ question })

      const lines = [
        r.cannotAnswer
          ? `**Cannot answer with confidence** (${(r.confidence * 100).toFixed(0)}%). Returning ${r.sourceNodes.length} source events for you to interpret.`
          : `**Answer** (confidence ${(r.confidence * 100).toFixed(0)}%):\n\n${r.answer ?? '(no answer)'}`,
      ]

      if (r.citations.length > 0) {
        lines.push('\n**Citations**')
        r.citations.forEach((c, i) => {
          lines.push(`[${i + 1}] ${c.claim}${c.sourceUrl ? ` — ${c.sourceUrl}` : ''} (${(c.confidence * 100).toFixed(0)}%)`)
        })
      }

      if (r.sourceNodes.length > 0) {
        lines.push('\n**Source events**')
        r.sourceNodes.forEach((n, i) => {
          const when = n.occurredAt ? ` · ${n.occurredAt}` : ''
          lines.push(`${i + 1}. [${n.source}] ${n.title}${when}${n.sourceUrl ? ` — ${n.sourceUrl}` : ''}`)
        })
      }

      return {
        content:           [{ type: 'text', text: lines.join('\n') }],
        structuredContent: r as unknown as Record<string, unknown>,
      }
    }
  )

  // ── Tool: search_context ───────────────────────────────────────────────
  server.registerTool(
    'search_context',
    {
      title:       'Search context',
      description:
        'Full-text + semantic search across the workspace graph. Use to find specific events, decisions, ' +
        'or past WHY queries. Always tenant-scoped.',
      inputSchema: {
        query: z.string().min(1).max(500).describe('Search query.'),
        type:  z.enum(['all', 'decision', 'event', 'query']).optional().describe('Filter by entity type.'),
        limit: z.number().int().min(1).max(50).optional().describe('Max results (default 20).'),
      },
    },
    async (input) => {
      // exactOptionalPropertyTypes: only forward keys that are actually set
      const args: Parameters<typeof handlers.searchContext>[0] = { query: input.query }
      if (input.type  !== undefined) args.type  = input.type
      if (input.limit !== undefined) args.limit = input.limit
      const r = await handlers.searchContext(args)
      const text = r.results.length === 0
        ? '_No results._'
        : r.results.map((res, i) =>
            `${i + 1}. [${res.type}${res.source ? `/${res.source}` : ''}] ${res.title}\n   ${res.summary}${res.sourceUrl ? `\n   ${res.sourceUrl}` : ''}`
          ).join('\n\n')
      return {
        content:           [{ type: 'text', text }],
        structuredContent: r as unknown as Record<string, unknown>,
      }
    }
  )

  // ── Tool: recent_decisions ─────────────────────────────────────────────
  server.registerTool(
    'recent_decisions',
    {
      title:       'Recent decisions',
      description:
        'List recent detected decisions across the workspace. Useful for situational awareness — what ' +
        'has the team been deciding lately? Decisions are detected automatically from message + PR + ' +
        'meeting signals.',
      inputSchema: {
        limit:         z.number().int().min(1).max(50).optional().describe('Max decisions (default 10).'),
        minConfidence: z.number().min(0).max(1).optional().describe('Only return decisions ≥ this confidence (default 0.60).'),
      },
    },
    async (input) => {
      const args: Parameters<typeof handlers.recentDecisions>[0] = {}
      if (input.limit         !== undefined) args.limit         = input.limit
      if (input.minConfidence !== undefined) args.minConfidence = input.minConfidence
      const r = await handlers.recentDecisions(args)
      const text = r.decisions.length === 0
        ? '_No decisions detected yet._'
        : r.decisions.map((d, i) => {
            const when = d.occurredAt ? ` · ${d.occurredAt}` : ''
            const conf = d.decisionConfidence !== null && d.decisionConfidence !== undefined ? ` · conf ${(d.decisionConfidence * 100).toFixed(0)}%` : ''
            return `${i + 1}. [${d.source}] ${d.title}${when}${conf}\n   ${d.summary}${d.sourceUrl ? `\n   ${d.sourceUrl}` : ''}`
          }).join('\n\n')
      return {
        content:           [{ type: 'text', text }],
        structuredContent: r as unknown as Record<string, unknown>,
      }
    }
  )

  // ── Resource: dyson://decision/{id} ────────────────────────────────────
  server.registerResource(
    'decision',
    new ResourceTemplate('dyson://decision/{id}', { list: undefined }),
    {
      title:       'Dyson decision',
      description: 'Read a specific detected decision with its full causal timeline.',
      mimeType:    'text/markdown',
    },
    async (uri, vars) => {
      const id = String(vars.id)
      const d  = await handlers.getDecision({ id })
      const lines = [
        `# ${d.title}`,
        '',
        d.summary,
        '',
        '## Causal timeline',
        ...d.timeline.map((t, i) => {
          const when = t.occurredAt ? ` · ${t.occurredAt}` : ''
          return `${i + 1}. **${t.title}** _(${t.source}${when})_`
        }),
        '',
        d.sourceUrl ? `Source: ${d.sourceUrl}` : '',
      ].filter(Boolean).join('\n')

      return {
        contents: [{ uri: uri.href, mimeType: 'text/markdown', text: lines }],
      }
    }
  )

  // ── Resource: dyson://node/{id} ────────────────────────────────────────
  server.registerResource(
    'node',
    new ResourceTemplate('dyson://node/{id}', { list: undefined }),
    {
      title:       'Dyson context node',
      description: 'Read a single context-graph node (event, decision, message, code change, …).',
      mimeType:    'text/markdown',
    },
    async (uri, vars) => {
      const id = String(vars.id)
      const n  = await handlers.getNode({ id })
      const meta = [
        `Source: ${n.source}`,
        n.occurredAt ? `Occurred: ${n.occurredAt}` : '',
        n.isDecision ? 'Type: decision' : '',
      ].filter(Boolean).join(' · ')
      const text = `# ${n.title}\n\n${meta}\n\n${n.summary}${n.sourceUrl ? `\n\n${n.sourceUrl}` : ''}`
      return {
        contents: [{ uri: uri.href, mimeType: 'text/markdown', text }],
      }
    }
  )

  return server
}
