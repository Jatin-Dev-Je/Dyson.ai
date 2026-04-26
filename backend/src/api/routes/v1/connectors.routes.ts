import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'

export default async function connectorsRoutes(app: FastifyInstance) {
  app.get('/connectors', {
    schema: { tags: ['Connectors'], summary: 'List connected sources for the tenant', security: [{ bearerAuth: [] }] },
    preHandler: [authMiddleware],
    handler: async (_request, reply) => {
      return reply.status(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } })
    },
  })
}
