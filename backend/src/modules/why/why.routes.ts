import { createHash } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { writeAudit } from '@/modules/audit/audit.service.js'
import {
  RecallSchema, HistoryQuerySchema, FeedbackSchema,
  recall, getHistory, getQuery, submitFeedback,
} from './why.service.js'

// Mounted at /api/v1/recall — the semantic memory retrieval layer.
// Ingests a natural-language question, runs hybrid retrieval across the
// full company memory graph, ranks with confidence scoring, composes a
// cited answer via Gemini only when confidence ≥ threshold.
export default async function recallRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // ── POST /api/v1/recall ──────────────────────────────────────────────────
  // 10 req/min per USER — scoped to JWT sub so one user can't exhaust the tenant bucket.
  app.post('/', {
    config: {
      rateLimit: {
        max:          10,
        timeWindow:   '1 minute',
        keyGenerator: (req) => {
          const payload = req.user as { sub?: string; tid?: string } | undefined
          return `recall:${payload?.tid ?? 'anon'}:${payload?.sub ?? req.ip}`
        },
      },
    },
    schema: {
      tags: ['Memory Recall'],
      summary: 'Recall from company memory — returns a cited, confidence-scored answer',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(RecallSchema),
    },
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const { question } = RecallSchema.parse(req.body)
    const result       = await recall(question, tid, sub, req.log)

    void writeAudit({
      tenantId:    tid,
      actorId:     sub,
      action:      'memory.recall',
      resourceType: 'recall',
      resourceId:  result.queryId,
      metadata: {
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

  // ── GET /api/v1/recall/history ───────────────────────────────────────────
  app.get('/history', {
    schema: {
      tags: ['Memory Recall'],
      summary: 'Recall history — past questions and answers for this user',
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

  // ── GET /api/v1/recall/:id ───────────────────────────────────────────────
  app.get('/:id', {
    schema: {
      tags: ['Memory Recall'],
      summary: 'Get a specific recall result by ID',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id }  = req.params as { id: string }
    const result  = await getQuery(id, tid)
    return reply.send({ data: result })
  })

  // ── PATCH /api/v1/recall/:id/feedback ───────────────────────────────────
  app.patch('/:id/feedback', {
    schema: {
      tags: ['Memory Recall'],
      summary: 'Submit feedback on a recall result',
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
      tenantId:    tid,
      actorId:     sub,
      action:      'memory.feedback',
      resourceType: 'recall',
      resourceId:  id,
      metadata:    { score },
      ipAddress:   req.ip,
    })

    return reply.send({ data: updated })
  })
}
