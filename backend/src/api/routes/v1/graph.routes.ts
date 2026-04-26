import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'

export default async function graphRoutes(app: FastifyInstance) {
  app.get('/graph/nodes', {
    schema: { tags: ['Graph'], summary: 'List context nodes for the tenant', security: [{ bearerAuth: [] }] },
    preHandler: [authMiddleware],
    handler: async (_request, reply) => {
      return reply.status(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } })
    },
  })
}
