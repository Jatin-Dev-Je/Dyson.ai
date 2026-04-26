import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'

export default async function decisionsRoutes(app: FastifyInstance) {
  app.get('/decisions', {
    schema: { tags: ['Decisions'], summary: 'List all detected decisions for the tenant', security: [{ bearerAuth: [] }] },
    preHandler: [authMiddleware],
    handler: async (_request, reply) => {
      return reply.status(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } })
    },
  })
}
