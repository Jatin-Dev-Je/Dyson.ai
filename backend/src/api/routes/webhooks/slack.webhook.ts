import type { FastifyInstance } from 'fastify'
import { verifySlackSignature } from '@/api/middleware/signature.middleware.js'
import { ingestSlackEvent, resolveTenantFromSlackTeam } from '@/modules/ingestion/ingestion.service.js'
import type { SlackEvent } from '@/modules/ingestion/ingestion.types.js'

export default async function slackWebhook(app: FastifyInstance) {

  app.post('/slack/events', {
    schema: { tags: ['Webhooks'], summary: 'Slack Events API receiver' },
    preHandler: [verifySlackSignature],
  }, async (request, reply) => {
    const body = request.body as Record<string, unknown>

    // Slack URL verification — one-time during app setup
    if (body['type'] === 'url_verification') {
      return reply.send({ challenge: body['challenge'] })
    }

    // Acknowledge immediately — Slack requires response within 3 seconds
    void reply.status(200).send()

    // Resolve which tenant owns this Slack workspace
    const teamId = body['team_id'] as string | undefined
    if (!teamId) return

    const tenantId = await resolveTenantFromSlackTeam(teamId)
    if (!tenantId) {
      request.log.warn({ teamId }, 'Slack event from unknown team — ignoring')
      return
    }

    // Ingest asynchronously — will be queued via Cloud Tasks in Week 3
    void ingestSlackEvent(tenantId, body as unknown as SlackEvent, request.log)
      .catch(err => request.log.error({ err, teamId }, 'Slack ingestion failed'))
  })
}
