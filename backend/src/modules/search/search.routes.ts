import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { SearchQuerySchema, search } from './search.service.js'

export default async function searchRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  app.get('/', {
    schema: {
      tags: ['Search'],
      summary: 'Full-text search across nodes, decisions, and WHY queries',
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(SearchQuerySchema),
    },
  }, async (req, reply) => {
    const { tid }  = req.user as { tid: string }
    const query    = SearchQuerySchema.parse(req.query)
    const result   = await search(tid, query)
    return reply.send({
      data: result.results,
      meta: { cursor: result.nextCursor, hasMore: result.hasMore },
    })
  })
}
