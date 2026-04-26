import type { FastifyInstance } from 'fastify'
import { verifySlackSignature } from '@/api/middleware/signature.middleware.js'

export default async function slackWebhook(app: FastifyInstance) {
  app.post('/slack/events', {
    schema: { tags: ['Webhooks'], summary: 'Slack Events API webhook receiver' },
    preHandler: [verifySlackSignature],
    handler: async (request, reply) => {
      const body = request.body as Record<string, unknown>

      // Slack URL verification challenge
      if (body['type'] === 'url_verification') {
        return reply.send({ challenge: body['challenge'] })
      }

      // TODO: enqueue to Cloud Tasks → ingestion module
      return reply.status(200).send()
    },
  })
}
