import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { sql, eq, desc } from 'drizzle-orm'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { agentAuthMiddleware, requireScope } from './agent.middleware.js'
import { recall } from '@/modules/why/why.service.js'
import { getDecisions } from '@/modules/decisions/decisions.service.js'
import { search } from '@/modules/search/search.service.js'
import { createMemory } from '@/modules/memory/memory.service.js'
import { insertRawEvent } from '@/modules/ingestion/ingestion.repository.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import { UnauthorizedError } from '@/shared/errors.js'
import { EventSource, EntityType } from '@/shared/types/entities.js'
import { db } from '@/infra/db/client.js'
import { whyQueries } from '@/infra/db/schema/index.js'

function requireAgentContext(req: FastifyRequest): { tenantId: string; scopes: string[] } {
  if (!req.agentContext) throw new UnauthorizedError()
  return req.agentContext
}

const AgentQuerySchema = z.object({
  question: z.string().min(3).max(1000).trim(),
})

const AgentContextSchema = z.object({
  topic: z.string().min(1).max(500).trim(),
  limit: z.coerce.number().min(1).max(20).default(10),
})

const MemoryTypeEnum = z.enum(['decision', 'incident', 'standard', 'context', 'constraint', 'outcome'])

export default async function agentRoutes(app: FastifyInstance) {

  app.addHook('preHandler', agentAuthMiddleware)

  // ── POST /api/v1/agent/query — recall from company memory ────────────────
  app.post('/query', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      tags: ['Agent API'],
      summary: 'Recall from company memory — returns cited answer with confidence score',
      body: zodToJsonSchema(AgentQuerySchema),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { question } = AgentQuerySchema.parse(req.body)
    const { tenantId } = requireAgentContext(req)
    const result = await recall(question, tenantId, 'agent', req.log)
    return reply.send({ data: result })
  })

  // ── GET /api/v1/agent/context — search company memory by topic ───────────
  app.get('/context', {
    schema: {
      tags: ['Agent API'],
      summary: 'Search company memory by topic — returns relevant memory nodes',
      querystring: zodToJsonSchema(AgentContextSchema),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)
    const query        = AgentContextSchema.parse(req.query)
    const result       = await search(tenantId, { q: query.topic, type: 'all', limit: query.limit })
    return reply.send({ data: result.results })
  })

  // ── GET /api/v1/agent/decisions — recent decisions from memory ───────────
  app.get('/decisions', {
    schema: {
      tags: ['Agent API'],
      summary: 'List recent decisions captured in company memory',
      querystring: zodToJsonSchema(z.object({
        limit: z.coerce.number().min(1).max(20).default(10),
      })),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)
    const { limit }    = req.query as { limit: number }
    const result       = await getDecisions(tenantId, { limit, minConfidence: 0.0 })
    return reply.send({ data: result.decisions })
  })

  // ── POST /api/v1/agent/memory — write a memory (structured) ─────────────
  // Agents write typed memories back into the company knowledge graph.
  // These are immediately searchable and surface in future recalls.
  const WriteMemorySchema = z.object({
    title:   z.string().min(3).max(300).trim(),
    content: z.string().min(10).max(8000).trim(),
    type:    MemoryTypeEnum.default('context'),
    url:     z.string().url().optional(),
    metadata: z.record(z.unknown()).optional(),
  })

  app.post('/memory', {
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    schema: {
      tags: ['Agent API'],
      summary: 'Write a typed memory to the company knowledge graph',
      body: zodToJsonSchema(WriteMemorySchema),
    },
    preHandler: [requireScope('write')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)
    const input        = WriteMemorySchema.parse(req.body)
    const memory       = await createMemory(tenantId, 'agent', input)
    return reply.status(201).send({ data: memory })
  })

  // ── POST /api/v1/agent/events — raw event write-back (legacy) ───────────
  // For agents that need to write raw events (ingestion path).
  // Prefer /memory for structured writes.
  const WriteEventSchema = z.object({
    type:     z.nativeEnum(EntityType).default(EntityType.Message),
    title:    z.string().min(1).max(300).trim(),
    content:  z.string().min(1).max(8000).trim(),
    url:      z.string().url().optional(),
    metadata: z.record(z.unknown()).optional(),
  })

  app.post('/events', {
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    schema: {
      tags: ['Agent API'],
      summary: 'Write a raw event to the memory graph (use /memory for structured writes)',
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

    return reply.status(201).send({ data: { id: stored?.id ?? null, queued: !!stored } })
  })

  // ── GET /api/v1/agent/workspace-overview — memory graph snapshot ─────────
  app.get('/workspace-overview', {
    schema: {
      tags: ['Agent API'],
      summary: 'Company memory snapshot — recent memories, recalls, and graph stats',
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)

    const [recentDecisions, recentRecalls, statsRows] = await Promise.all([
      getDecisions(tenantId, { limit: 5, minConfidence: 0.0 }),
      db
        .select({ id: whyQueries.id, question: whyQueries.question })
        .from(whyQueries)
        .where(eq(whyQueries.tenantId, tenantId))
        .orderBy(desc(whyQueries.createdAt))
        .limit(5),
      db.execute(sql`
        SELECT
          COUNT(*)::int                                              AS total,
          COUNT(*) FILTER (WHERE is_decision = true)::int           AS decisions,
          COUNT(*) FILTER (WHERE entity_type = 'incident')::int     AS incidents
        FROM context_nodes WHERE tenant_id = ${tenantId}::uuid
      `),
    ])

    const stats = statsRows[0] as { total: number; decisions: number; incidents: number } | undefined

    return reply.send({
      data: {
        recentMemories: recentDecisions.decisions.map(d => ({
          id:         d.id,
          title:      d.title,
          type:       'decision',
          source:     d.source,
          confidence: d.decisionConfidence,
          occurredAt: d.occurredAt,
        })),
        recentRecalls: recentRecalls.map(q => ({ id: q.id, question: q.question })),
        stats: {
          totalMemories:  stats?.total    ?? 0,
          decisionsCount: stats?.decisions ?? 0,
          incidentsCount: stats?.incidents ?? 0,
        },
        note: 'Use POST /query to recall from company memory. Use POST /memory to write new memories.',
      },
    })
  })
}
