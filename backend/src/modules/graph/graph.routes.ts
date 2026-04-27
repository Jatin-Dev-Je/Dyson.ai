import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import {
  ListNodesQuerySchema, TimelineQuerySchema,
  getNodes, getNode, getNodeEdges, getGraphTimeline,
} from './graph.service.js'

export default async function graphRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // ── GET /api/v1/graph/nodes ──────────────────────────────────────────────
  app.get('/nodes', {
    schema: {
      tags: ['Graph'],
      summary: 'List context nodes with filters (cursor-paginated)',
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(ListNodesQuerySchema),
    },
  }, async (req, reply) => {
    const { tid }  = req.user as { tid: string }
    const query    = ListNodesQuerySchema.parse(req.query)
    const result   = await getNodes(tid, query)
    return reply.send({
      data: result.nodes,
      meta: { cursor: result.nextCursor, hasMore: result.hasMore },
    })
  })

  // ── GET /api/v1/graph/timeline ───────────────────────────────────────────
  app.get('/timeline', {
    schema: {
      tags: ['Graph'],
      summary: 'Get chronological event timeline for a date range',
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(TimelineQuerySchema),
    },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const query   = TimelineQuerySchema.parse(req.query)
    const nodes   = await getGraphTimeline(tid, query)
    return reply.send({ data: nodes })
  })

  // ── GET /api/v1/graph/nodes/:id ──────────────────────────────────────────
  app.get('/nodes/:id', {
    schema: {
      tags: ['Graph'],
      summary: 'Get a single context node by ID',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { tid }  = req.user as { tid: string }
    const { id }   = req.params as { id: string }
    const node     = await getNode(id, tid)
    return reply.send({ data: node })
  })

  // ── GET /api/v1/graph/nodes/:id/edges ───────────────────────────────────
  app.get('/nodes/:id/edges', {
    schema: {
      tags: ['Graph'],
      summary: 'Get all edges and connected nodes for a context node',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id }  = req.params as { id: string }
    const result  = await getNodeEdges(id, tid)
    return reply.send({ data: result })
  })
}
