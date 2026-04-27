import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { writeAudit } from '@/modules/audit/audit.service.js'
import {
  ListDecisionsQuerySchema, FlagEdgeSchema,
  getDecisions, getDecision, getDecisionTimeline, flagEdge,
} from './decisions.service.js'

export default async function decisionsRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // ── GET /api/v1/decisions ────────────────────────────────────────────────
  app.get('/', {
    schema: {
      tags: ['Decisions'],
      summary: 'List all detected decisions (cursor-paginated)',
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(ListDecisionsQuerySchema),
    },
  }, async (req, reply) => {
    const { tid }  = req.user as { tid: string }
    const query    = ListDecisionsQuerySchema.parse(req.query)
    const result   = await getDecisions(tid, query)
    return reply.send({
      data: result.decisions,
      meta: {
        cursor:  result.nextCursor,
        hasMore: result.hasMore,
      },
    })
  })

  // ── GET /api/v1/decisions/:id ────────────────────────────────────────────
  app.get('/:id', {
    schema: {
      tags: ['Decisions'],
      summary: 'Get a decision with its full causal context',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id }  = req.params as { id: string }
    const result  = await getDecision(id, tid)
    return reply.send({ data: result })
  })

  // ── GET /api/v1/decisions/:id/timeline ───────────────────────────────────
  app.get('/:id/timeline', {
    schema: {
      tags: ['Decisions'],
      summary: 'Get the chronological causal timeline for a decision',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { tid }   = req.user as { tid: string }
    const { id }    = req.params as { id: string }
    const timeline  = await getDecisionTimeline(id, tid)
    return reply.send({ data: timeline })
  })

  // ── PATCH /api/v1/decisions/:id/flag ────────────────────────────────────
  // Flag a causal edge as incorrect — feeds the linker training loop
  app.patch('/:id/flag', {
    schema: {
      tags: ['Decisions'],
      summary: 'Flag a causal edge in this decision as incorrect',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: zodToJsonSchema(FlagEdgeSchema),
    },
  }, async (req, reply) => {
    const { tid, sub }       = req.user as { tid: string; sub: string }
    const { id }             = req.params as { id: string }
    const { edgeId, reason } = FlagEdgeSchema.parse(req.body)
    const updated            = await flagEdge(edgeId, tid, sub)

    void writeAudit({
      tenantId:  tid,
      actorId:   sub,
      action:    'decision.flagged',
      resourceType: 'decision',
      resourceId: id,
      metadata:  { edgeId, reason: reason ?? null },
      ipAddress: req.ip,
    })

    return reply.send({ data: updated })
  })
}
