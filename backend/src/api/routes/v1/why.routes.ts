import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'

export default async function whyRoutes(app: FastifyInstance) {
  app.post('/why', {
    schema: {
      tags: ['WHY Engine'],
      summary: 'Ask a WHY question — returns a cited causal timeline',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authMiddleware],
    handler: async (_request, reply) => {
      // TODO: implement in query-engine module
      return reply.status(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } })
    },
  })
}
