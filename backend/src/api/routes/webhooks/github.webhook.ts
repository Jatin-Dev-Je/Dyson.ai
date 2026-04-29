import type { FastifyInstance } from 'fastify'
import { verifyGitHubSignature } from '@/api/middleware/signature.middleware.js'
import { ingestGitHubEvent, resolveTenantFromGitHubInstallation } from '@/modules/ingestion/ingestion.service.js'
import { handlePrOpened } from '@/modules/github-bot/github-bot.service.js'
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

    void reply.status(200).send()

    const payload = request.body as GitHubEvent

    // All GitHub App events carry installation.id — use it for precise tenant routing.
    // This prevents cross-tenant event leakage when multiple tenants use GitHub.
    const installationId = payload.installation?.id
    if (!installationId) {
      request.log.warn({ eventType, deliveryId }, 'GitHub event missing installation.id — ignoring')
      return
    }

    const tenantId = await resolveTenantFromGitHubInstallation(installationId)
    if (!tenantId) {
      request.log.warn({ installationId, eventType }, 'GitHub installation not mapped to any tenant')
      return
    }

    // PR opened — inject context comment proactively
    if (eventType === 'pull_request' && payload.action === 'opened' && payload.pull_request) {
      const pr           = payload.pull_request
      const repoFullName = payload.repository?.full_name ?? ''

      void handlePrOpened({
        tenantId,
        installationId: String(installationId),
        repoFullName,
        prNumber: pr.number,
        prTitle:  pr.title,
        prBody:   pr.body ?? null,
        logger:   request.log,
      }).catch(err => request.log.error({ err, repoFullName, prNumber: pr.number }, 'GitHub PR comment failed'))
    }

    void ingestGitHubEvent(tenantId, eventType, payload, deliveryId, request.log)
      .catch(err => request.log.error({ err, eventType, deliveryId }, 'GitHub ingestion failed'))
  })
}
