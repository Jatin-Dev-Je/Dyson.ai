import type { FastifyInstance } from 'fastify'
import { verifyGitHubSignature } from '@/api/middleware/signature.middleware.js'

export default async function githubWebhook(app: FastifyInstance) {
  app.post('/github/events', {
    schema: { tags: ['Webhooks'], summary: 'GitHub webhook receiver' },
    preHandler: [verifyGitHubSignature],
    handler: async (_request, reply) => {
      // TODO: enqueue to Cloud Tasks → ingestion module
      return reply.status(200).send()
    },
  })
}
