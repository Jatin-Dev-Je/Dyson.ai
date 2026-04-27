import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import {
  AskWhySchema, HistoryQuerySchema, FeedbackSchema,
  askWhy, getHistory, getQuery, submitFeedback,
} from './why.service.js'

export default async function whyRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // ── POST /api/v1/why ─────────────────────────────────────────────────────
  app.post('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
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
    const { tid }   = req.user as { tid: string }
    const { id }    = req.params as { id: string }
    const { score } = FeedbackSchema.parse(req.body)
    const updated   = await submitFeedback(id, tid, score)
    return reply.send({ data: updated })
  })
}
