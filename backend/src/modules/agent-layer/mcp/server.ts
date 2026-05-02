import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

/**
 * Dyson MCP Server — Company Memory for AI Agents
 *
 * Exposes the full company memory graph to any MCP-compatible client:
 * Claude Desktop, Cursor, Continue, custom agents, CI pipelines.
 *
 * Core tools:
 *   recall          — ask anything about what the company knows
 *   remember        — write a memory back (agent actions, decisions, incidents)
 *   search_memory   — full-text + semantic search across all company memory
 *   recent_memories — what has the company been capturing lately
 *   workspace_context — situational awareness snapshot
 *
 * Mounted in two places:
 *   • /mcp (Streamable HTTP) — for hosted agents with a Dyson API key
 *   • bin/dyson-mcp (stdio)  — for local Cursor / Claude Desktop installs
 */

// ─── Handler interface ────────────────────────────────────────────────────
// Shared shape for direct (in-process) and proxy (stdio→HTTP) backends.

export interface DysonMcpHandlers {
  recall(input: { question: string }): Promise<{
    queryId:      string
    question:     string
    answer:       string | null
    confidence:   number
    cannotAnswer: boolean
    citations:    Array<{ claim: string; sourceNodeId: string; sourceUrl: string | null; confidence: number }>
    sourceNodes:  Array<{ id: string; title: string; source: string; sourceUrl: string | null; occurredAt?: string }>
  }>

  remember(input: {
    title:    string
    content:  string
    type?:    string
    url?:     string
    metadata?: Record<string, unknown>
  }): Promise<{ id: string | null; saved: boolean }>

  searchMemory(input: {
    query: string
    type?:  string
    limit?: number
  }): Promise<{
    results: Array<{ id: string; type: string; title: string; summary: string; source?: string; sourceUrl?: string | null; confidence?: number }>
  }>

  recentMemories(input: {
    limit?:         number
    type?:          string
    minConfidence?: number
  }): Promise<{
    memories: Array<{ id: string; title: string; type: string; source: string; sourceUrl: string | null; occurredAt?: string; confidence?: number | null }>
  }>

  getMemory(input: { id: string }): Promise<{
    id: string; title: string; content: string; type: string; source: string; sourceUrl: string | null
    occurredAt?: string; links?: Array<{ targetId: string; relationship: string }>
  }>

  workspaceContext(): Promise<{
    recentMemories: Array<{ id: string; title: string; type: string; source: string; confidence?: number | null; occurredAt?: string }>
    recentRecalls:  Array<{ id: string; question: string }>
    stats:          { totalMemories: number; decisionsCount: number; incidentsCount: number }
    note: string
  }>
}

// ─── Server factory ───────────────────────────────────────────────────────

export function createDysonMcpServer(handlers: DysonMcpHandlers): McpServer {
  const server = new McpServer(
    {
      name:    'dyson',
      title:   'Dyson — Company Memory',
      version: '2.0.0',
    },
    {
      instructions:
        'Dyson is the persistent memory system for your company. It captures every decision, incident, ' +
        'standard, and context across Slack, GitHub, docs, and direct writes — connecting them into a ' +
        'searchable, queryable knowledge graph that compounds in value over time.\n\n' +
        'Use recall() to ask anything the company has ever known. ' +
        'Use remember() to write new memories after you act. ' +
        'Use search_memory() to find specific context. ' +
        'All answers carry citations and confidence scores. ' +
        'Below 0.72 confidence, Dyson returns raw source memories instead of composing an answer.',
    }
  )

  // ── Tool: recall ─────────────────────────────────────────────────────────
  server.registerTool(
    'recall',
    {
      title:       'Recall from company memory',
      description:
        'Ask any question against the full company memory graph. Returns a cited, confidence-scored answer ' +
        'reconstructed from real company events, decisions, and context. Use for: "Why did we X?", ' +
        '"What do we know about Y?", "Who decided Z and when?", "What caused this incident?". ' +
        'If confidence is below threshold, returns raw memories instead of interpreting them.',
      inputSchema: {
        question: z.string().min(3).max(1000).describe(
          'Any question about what the company knows. Natural language. Examples: ' +
          '"Why did we move to JWT auth?", "What do we know about our payments system?", ' +
          '"Who has context on the rate limiter?"'
        ),
      },
    },
    async ({ question }) => {
      const r = await handlers.recall({ question })

      const lines: string[] = []

      if (r.cannotAnswer) {
        lines.push(
          `**Not enough memory** (confidence ${(r.confidence * 100).toFixed(0)}%)`,
          '',
          `Dyson found ${r.sourceNodes.length} related memories but confidence is too low to compose a reliable answer. Raw memories below.`,
        )
      } else {
        lines.push(
          `**${r.answer}**`,
          '',
          `Confidence: ${(r.confidence * 100).toFixed(0)}%`,
        )
      }

      if (r.citations.length > 0) {
        lines.push('', '**Citations**')
        r.citations.forEach((c, i) => {
          lines.push(`[${i + 1}] ${c.claim}${c.sourceUrl ? ` — ${c.sourceUrl}` : ''} (${(c.confidence * 100).toFixed(0)}%)`)
        })
      }

      if (r.sourceNodes.length > 0) {
        lines.push('', '**Source memories**')
        r.sourceNodes.forEach((n, i) => {
          const when = n.occurredAt ? ` · ${n.occurredAt}` : ''
          lines.push(`${i + 1}. [${n.source}] ${n.title}${when}${n.sourceUrl ? ` — ${n.sourceUrl}` : ''}`)
        })
      }

      return {
        content:           [{ type: 'text' as const, text: lines.join('\n') }],
        structuredContent: r as unknown as Record<string, unknown>,
      }
    }
  )

  // ── Tool: remember ────────────────────────────────────────────────────────
  server.registerTool(
    'remember',
    {
      title:       'Write to company memory',
      description:
        'Write a memory into the company knowledge graph. Use this when you (as an AI agent) take an ' +
        'action, observe something important, or encounter a decision — so it becomes permanent ' +
        'institutional memory, searchable by every future agent and team member.\n\n' +
        'Memory types:\n' +
        '  decision   — a choice was made ("we chose X over Y because Z")\n' +
        '  incident   — something broke, here\'s what happened\n' +
        '  standard   — how we do things here ("always do X")\n' +
        '  context    — general knowledge about a system or team\n' +
        '  constraint — we can\'t do X because Y\n' +
        '  outcome    — we tried X, result was Y\n\n' +
        'The richer the content, the better causal connections the memory graph can draw.',
      inputSchema: {
        title:   z.string().min(3).max(300).describe('One-line title for this memory.'),
        content: z.string().min(10).max(8000).describe(
          'Full content — what happened, why it matters, what was decided. The more context, the better.'
        ),
        type: z.enum(['decision', 'incident', 'standard', 'context', 'constraint', 'outcome'])
          .optional()
          .describe('Memory type (default: context).'),
        url: z.string().url().optional().describe('Source URL — PR, issue, doc, Slack thread.'),
      },
    },
    async (input) => {
      const args: Parameters<typeof handlers.remember>[0] = {
        title:   input.title,
        content: input.content,
      }
      if (input.type !== undefined) args.type = input.type
      if (input.url  !== undefined) args.url  = input.url

      const r = await handlers.remember(args)
      const text = r.saved
        ? `✓ Memory saved (id: ${r.id ?? 'pending'}). It is now part of the company knowledge graph and immediately searchable.`
        : `Memory was a duplicate — already exists in the graph.`

      return {
        content:           [{ type: 'text' as const, text }],
        structuredContent: r as unknown as Record<string, unknown>,
      }
    }
  )

  // ── Tool: search_memory ───────────────────────────────────────────────────
  server.registerTool(
    'search_memory',
    {
      title:       'Search company memory',
      description:
        'Full-text + semantic search across the entire company memory graph. Use to find specific events, ' +
        'decisions, incidents, standards, or context. More targeted than recall — use when you know ' +
        'what you\'re looking for rather than asking an open question.',
      inputSchema: {
        query: z.string().min(1).max(500).describe('What to search for.'),
        type:  z.enum(['decision', 'incident', 'standard', 'context', 'constraint', 'outcome', 'event'])
          .optional()
          .describe('Filter by memory type.'),
        limit: z.number().int().min(1).max(50).optional().describe('Max results (default 20).'),
      },
    },
    async (input) => {
      const args: Parameters<typeof handlers.searchMemory>[0] = { query: input.query }
      if (input.type  !== undefined) args.type  = input.type
      if (input.limit !== undefined) args.limit = input.limit

      const r = await handlers.searchMemory(args)
      const text = r.results.length === 0
        ? '_No memories found._'
        : r.results.map((res, i) =>
            `${i + 1}. [${res.type}${res.source ? `/${res.source}` : ''}] **${res.title}**\n   ${res.summary}${res.sourceUrl ? `\n   ${res.sourceUrl}` : ''}`
          ).join('\n\n')

      return {
        content:           [{ type: 'text' as const, text }],
        structuredContent: r as unknown as Record<string, unknown>,
      }
    }
  )

  // ── Tool: recent_memories ─────────────────────────────────────────────────
  server.registerTool(
    'recent_memories',
    {
      title:       'Recent company memories',
      description:
        'List what the company has been capturing recently — decisions made, incidents logged, ' +
        'context written. Use at the start of an agentic session for situational awareness.',
      inputSchema: {
        limit:         z.number().int().min(1).max(50).optional().describe('Max results (default 10).'),
        type:          z.enum(['decision', 'incident', 'standard', 'context', 'constraint', 'outcome'])
          .optional().describe('Filter by memory type.'),
        minConfidence: z.number().min(0).max(1).optional().describe('Min confidence score.'),
      },
    },
    async (input) => {
      const args: Parameters<typeof handlers.recentMemories>[0] = {}
      if (input.limit         !== undefined) args.limit         = input.limit
      if (input.type          !== undefined) args.type          = input.type
      if (input.minConfidence !== undefined) args.minConfidence = input.minConfidence

      const r = await handlers.recentMemories(args)
      const text = r.memories.length === 0
        ? '_No memories yet — connect Slack and GitHub to start ingesting company context._'
        : r.memories.map((m, i) => {
            const when = m.occurredAt ? ` · ${m.occurredAt}` : ''
            const conf = m.confidence != null ? ` · ${(m.confidence * 100).toFixed(0)}%` : ''
            return `${i + 1}. [${m.type}/${m.source}] **${m.title}**${when}${conf}${m.sourceUrl ? `\n   ${m.sourceUrl}` : ''}`
          }).join('\n\n')

      return {
        content:           [{ type: 'text' as const, text }],
        structuredContent: r as unknown as Record<string, unknown>,
      }
    }
  )

  // ── Tool: workspace_context ───────────────────────────────────────────────
  server.registerTool(
    'workspace_context',
    {
      title:       'Workspace memory snapshot',
      description:
        'Get a full situational awareness snapshot of the workspace — recent memories, past recalls, ' +
        'and memory graph stats. Use at the start of a session or when you need to orient yourself.',
      inputSchema: {},
    },
    async () => {
      const r   = await handlers.workspaceContext()
      const mem = r.recentMemories.map((m, i) =>
        `${i + 1}. [${m.type}/${m.source}] ${m.title}${m.confidence != null ? ` · ${(m.confidence * 100).toFixed(0)}%` : ''}`
      ).join('\n')
      const rec = r.recentRecalls.map((q, i) => `${i + 1}. ${q.question}`).join('\n')

      const text = [
        `**Memory graph stats:** ${r.stats.totalMemories} total · ${r.stats.decisionsCount} decisions · ${r.stats.incidentsCount} incidents`,
        '',
        '**Recent memories:**',
        mem || '_None yet_',
        '',
        '**Recent recalls:**',
        rec || '_None yet_',
        '',
        `_${r.note}_`,
      ].join('\n')

      return {
        content:           [{ type: 'text' as const, text }],
        structuredContent: r as unknown as Record<string, unknown>,
      }
    }
  )

  // ── Resource: dyson://memory/{id} ─────────────────────────────────────────
  server.registerResource(
    'memory',
    new ResourceTemplate('dyson://memory/{id}', { list: undefined }),
    {
      title:       'Dyson memory node',
      description: 'Read a specific company memory with its linked context.',
      mimeType:    'text/markdown',
    },
    async (uri, vars) => {
      const id = String(vars.id)
      const m  = await handlers.getMemory({ id })
      const meta = [`Type: ${m.type}`, `Source: ${m.source}`, m.occurredAt ? `Occurred: ${m.occurredAt}` : '']
        .filter(Boolean).join(' · ')
      const links = m.links?.length
        ? `\n\n## Linked memories\n${m.links.map(l => `- [${l.relationship}] ${l.targetId}`).join('\n')}`
        : ''
      const text = `# ${m.title}\n\n${meta}\n\n${m.content}${m.sourceUrl ? `\n\n${m.sourceUrl}` : ''}${links}`
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text }] }
    }
  )

  // ── Prompts — role-specific agent system context ──────────────────────────

  server.prompt('coding-agent', 'Company memory context for a coding AI agent', {}, () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          'You have access to your company\'s full institutional memory through Dyson.',
          '',
          'Before suggesting any change, refactor, or deletion:',
          '1. Call workspace_context — know what\'s been decided recently',
          '2. Call recall with a question about the area you\'re changing',
          '3. Call search_memory for specific standards or constraints that apply',
          '4. Surface any relevant past decisions to the user before proceeding',
          '',
          'After making a change:',
          '5. Call remember with type="decision" or type="context" to record what you did and why',
          '',
          'Never re-introduce patterns that company memory shows were deprecated.',
          'When in doubt, recall first.',
        ].join('\n'),
      },
    }],
  }))

  server.prompt('sre-agent', 'Company memory context for an SRE or on-call agent', {}, () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          'You have access to your company\'s full incident and operational memory through Dyson.',
          '',
          'During an incident:',
          '1. recall("What caused [symptom]?") — find causal history',
          '2. recall("Were there similar past incidents?") — find patterns',
          '3. search_memory([service name]) — find all context about the affected system',
          '4. After resolving: remember(type="incident") — record root cause and resolution',
          '',
          'Below 72% confidence, say "company memory doesn\'t have enough context" — don\'t guess.',
        ].join('\n'),
      },
    }],
  }))

  server.prompt('onboarding-agent', 'Company memory context for an onboarding assistant', {}, () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          'You help new team members access company memory and get up to speed fast.',
          '',
          '1. workspace_context — show what the company has been working on',
          '2. recall about the systems and teams the new member will work with',
          '3. recent_memories(type="standard") — what are the active conventions?',
          '4. recent_memories(type="decision") — what architectural choices should they know?',
          '',
          'Be honest about gaps. If recall returns cannotAnswer, say so and point to a team member.',
        ].join('\n'),
      },
    }],
  }))

  return server
}
