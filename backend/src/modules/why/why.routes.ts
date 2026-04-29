import { createHash } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { writeAudit } from '@/modules/audit/audit.service.js'
import {
  AskWhySchema, HistoryQuerySchema, FeedbackSchema,
  askWhy, getHistory, getQuery, submitFeedback,
} from './why.service.js'

export default async function whyRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // ── POST /api/v1/why ─────────────────────────────────────────────────────
  // CLAUDE.md §8: 10 req/min per USER on the WHY Engine (not just per tenant).
  // keyGenerator scopes the limit to the authenticated user's JWT sub so
  // one power-user cannot exhaust the tenant's shared bucket.
  app.post('/', {
    config: {
      rateLimit: {
        max:          10,
        timeWindow:   '1 minute',
        keyGenerator: (req) => {
          const payload = req.user as { sub?: string; tid?: string } | undefined
          return `why:${payload?.tid ?? 'anon'}:${payload?.sub ?? req.ip}`
        },
      },
    },
    schema: {
      tags: ['WHY Engine'],
      summary: 'Ask a WHY question — returns a cited causal timeline',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(AskWhySchema),
    },
  }, async (req, reply) => {
    const { sub, tid }  = req.user as { sub: string; tid: string }
    const { question }  = AskWhySchema.parse(req.body)
    const result        = await askWhy(question, tid, sub, req.log)

    // Audit only the query metadata — never the question text (PII per CLAUDE.md §15)
    void writeAudit({
      tenantId:  tid,
      actorId:   sub,
      action:    'why.query',
      resourceType: 'why_query',
      resourceId: result.queryId,
      metadata:  {
        questionHash: createHash('sha256').update(question).digest('hex').slice(0, 16),
        confidence:   result.confidence,
        cannotAnswer: result.cannotAnswer,
        citations:    result.citations.length,
        latencyMs:    result.latencyMs,
      },
      ipAddress: req.ip,
    })

    return reply.send({
      data: result,
      meta: {
        confidence:   result.confidence,
        cannotAnswer: result.cannotAnswer,
        citations:    result.citations.length,
      },
    })
  })

  // ── GET /api/v1/why/history ──────────────────────────────────────────────
  app.get('/history', {
    schema: {
      tags: ['WHY Engine'],
      summary: 'Get WHY query history for the current user',
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(HistoryQuerySchema),
    },
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const query        = HistoryQuerySchema.parse(req.query)
    const result       = await getHistory(tid, sub, query)

    return reply.send({
      data: result.queries,
      meta: { cursor: result.nextCursor, hasMore: result.hasMore },
    })
  })

  // ── GET /api/v1/why/:id ──────────────────────────────────────────────────
  app.get('/:id', {
    schema: {
      tags: ['WHY Engine'],
      summary: 'Get a specific WHY query result',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id }  = req.params as { id: string }
    const result  = await getQuery(id, tid)
    return reply.send({ data: result })
  })

  // ── PATCH /api/v1/why/:id/feedback ──────────────────────────────────────
  app.patch('/:id/feedback', {
    schema: {
      tags: ['WHY Engine'],
      summary: 'Submit feedback on a WHY query result',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: zodToJsonSchema(FeedbackSchema),
    },
  }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const { id }       = req.params as { id: string }
    const { score }    = FeedbackSchema.parse(req.body)
    const updated      = await submitFeedback(id, tid, score)

    void writeAudit({
      tenantId:  tid,
      actorId:   sub,
      action:    'why.feedback',
      resourceType: 'why_query',
      resourceId: id,
      metadata:  { score },
      ipAddress: req.ip,
    })

    return reply.send({ data: updated })
  })
}
