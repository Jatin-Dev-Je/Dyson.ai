import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { agentAuthMiddleware, requireScope } from './agent.middleware.js'
import { askWhy } from '@/modules/why/why.service.js'
import { getDecisions } from '@/modules/decisions/decisions.service.js'
import { search } from '@/modules/search/search.service.js'
import { insertRawEvent } from '@/modules/ingestion/ingestion.repository.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import { UnauthorizedError } from '@/shared/errors.js'
import { EventSource, EntityType } from '@/shared/types/entities.js'

// Narrow agentContext to non-undefined inside route handlers
function requireAgentContext(req: FastifyRequest): { tenantId: string; scopes: string[] } {
  if (!req.agentContext) throw new UnauthorizedError()
  return req.agentContext
}

const AgentQuerySchema = z.object({
  question: z.string().min(3).max(1000).trim(),
})

const AgentContextSchema = z.object({
  topic:  z.string().min(1).max(500).trim(),
  limit:  z.coerce.number().min(1).max(20).default(10),
})

export default async function agentRoutes(app: FastifyInstance) {

  // All agent routes use API key auth, not JWT
  app.addHook('preHandler', agentAuthMiddleware)

  // ── POST /api/v1/agent/query ─────────────────────────────────────────────
  // Same WHY Engine, accessible via API key for AI agents
  app.post('/query', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      tags: ['Agent API'],
      summary: 'Ask a WHY question via API key — for AI agent use',
      body: zodToJsonSchema(AgentQuerySchema),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { question } = AgentQuerySchema.parse(req.body)
    const { tenantId } = requireAgentContext(req)
    // Agent queries use a synthetic actor id; per-tenant rate limiting still applies
    const result = await askWhy(question, tenantId, 'agent', req.log)
    return reply.send({ data: result })
  })

  // ── GET /api/v1/agent/context ────────────────────────────────────────────
  // Query context graph by topic (for agents that want raw context)
  app.get('/context', {
    schema: {
      tags: ['Agent API'],
      summary: 'Query context graph by topic — returns relevant nodes',
      querystring: zodToJsonSchema(AgentContextSchema),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)
    const query        = AgentContextSchema.parse(req.query)
    const result       = await search(tenantId, {
      q:     query.topic,
      type:  'all',
      limit: query.limit,
    })
    return reply.send({ data: result.results })
  })

  // ── GET /api/v1/agent/decisions ──────────────────────────────────────────
  app.get('/decisions', {
    schema: {
      tags: ['Agent API'],
      summary: 'Get recent decisions — for agent context',
      querystring: zodToJsonSchema(z.object({
        limit: z.coerce.number().min(1).max(20).default(10),
      })),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)
    const { limit }    = req.query as { limit: number }
    const result       = await getDecisions(tenantId, { limit, minConfidence: 0.60 })
    return reply.send({ data: result.decisions })
  })

  // ── POST /api/v1/agent/events — agent write-back ─────────────────────────
  // Agents write context events back to the graph. This is what makes the
  // context graph grow from agent actions, not just human tools.
  // Examples: "I refactored auth.ts because we deprecated sessions"
  //           "I added rate limiting after load testing revealed X"
  const WriteEventSchema = z.object({
    type:    z.nativeEnum(EntityType).default(EntityType.Message),
    title:   z.string().min(1).max(300).trim(),
    content: z.string().min(1).max(8000).trim(),
    url:     z.string().url().optional(),
    metadata: z.record(z.unknown()).optional(),
  })

  app.post('/events', {
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    schema: {
      tags: ['Agent API'],
      summary: 'Write an event to the context graph — agents contribute institutional memory',
      body: zodToJsonSchema(WriteEventSchema),
    },
    preHandler: [requireScope('write')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)
    const input        = WriteEventSchema.parse(req.body)

    const event = {
      externalId:  `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      source:      EventSource.Agent,
      entityType:  input.type,
      content:     input.content,
      metadata:    { title: input.title, ...(input.metadata ?? {}) },
      occurredAt:  new Date(),
      authorEmail: null,
      url:         input.url ?? null,
    }

    const stored = await insertRawEvent(tenantId, event)

    if (stored) {
      await enqueue('process-event', {
        eventId: stored.id,
        tenantId,
        event:   { ...event, occurredAt: event.occurredAt.toISOString() },
      }, req.log)
    }

    return reply.status(201).send({
      data: { id: stored?.id ?? null, queued: !!stored },
    })
  })

  // ── GET /api/v1/agent/workspace-overview ─────────────────────────────────
  // High-level digest for agents that need situational awareness before acting.
  app.get('/workspace-overview', {
    schema: {
      tags: ['Agent API'],
      summary: 'Workspace digest — recent decisions, activity, and context graph stats',
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)

    const [recentDecisions, recentQueries] = await Promise.all([
      getDecisions(tenantId, { limit: 5, minConfidence: 0.60 }),
      search(tenantId, { q: '', type: 'query', limit: 5 }).catch(() => ({ results: [] })),
    ])

    return reply.send({
      data: {
        recentDecisions: recentDecisions.decisions.map(d => ({
          id:         d.id,
          title:      d.title,
          source:     d.source,
          confidence: d.decisionConfidence,
          occurredAt: d.occurredAt,
        })),
        recentQueries: recentQueries.results.map(q => ({
          id:    q.id,
          title: q.title,
        })),
        note: 'Use ask_why to get a cited causal timeline. Use write_event to contribute context from agent actions.',
      },
    })
  })
}
