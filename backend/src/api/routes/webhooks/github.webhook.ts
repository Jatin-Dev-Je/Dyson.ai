import type { FastifyInstance } from 'fastify'
import { verifyGitHubSignature } from '@/api/middleware/signature.middleware.js'
import { ingestGitHubEvent, resolveTenantFromGitHubRepo } from '@/modules/ingestion/ingestion.service.js'
import type { GitHubEvent } from '@/modules/ingestion/ingestion.types.js'

export default async function githubWebhook(app: FastifyInstance) {

  app.post('/github/events', {
    schema: { tags: ['Webhooks'], summary: 'GitHub webhook receiver' },
    preHandler: [verifyGitHubSignature],
  }, async (request, reply) => {
    const eventType  = request.headers['x-github-event'] as string | undefined
    const deliveryId = request.headers['x-github-delivery'] as string | undefined

    if (!eventType || !deliveryId) {
      return reply.status(400).send({ error: { code: 'INVALID_WEBHOOK', message: 'Missing GitHub headers' } })
    }

    // Acknowledge immediately
    void reply.status(200).send()

    const payload = request.body as GitHubEvent
    const repoName = payload.repository?.full_name ?? null

    const tenantId = repoName
      ? await resolveTenantFromGitHubRepo(repoName)
      : null

    if (!tenantId) {
      request.log.warn({ repoName, eventType }, 'GitHub event from unknown repo — ignoring')
      return
    }

    void ingestGitHubEvent(tenantId, eventType, payload, deliveryId, request.log)
      .catch(err => request.log.error({ err, eventType, deliveryId }, 'GitHub ingestion failed'))
  })
}
