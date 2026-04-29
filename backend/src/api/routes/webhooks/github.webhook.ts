import type { FastifyInstance } from 'fastify'
import { verifyGitHubSignature } from '@/api/middleware/signature.middleware.js'
import { ingestGitHubEvent, resolveTenantFromGitHubRepo } from '@/modules/ingestion/ingestion.service.js'
import { handlePrOpened } from '@/modules/github-bot/github-bot.service.js'
import { db } from '@/infra/db/client.js'
import { connectedSources } from '@/infra/db/schema/index.js'
import { eq, and, sql } from 'drizzle-orm'
import { EventSource } from '@/shared/types/entities.js'
import type { GitHubEvent } from '@/modules/ingestion/ingestion.types.js'

async function getInstallationIdForTenant(tenantId: string): Promise<string | null> {
  const [connector] = await db
    .select({ metadata: connectedSources.metadata })
    .from(connectedSources)
    .where(and(
      eq(connectedSources.tenantId, tenantId),
      eq(connectedSources.source, EventSource.GitHub),
    ))
    .limit(1)

  if (!connector?.metadata) return null

  try {
    const meta = JSON.parse(connector.metadata) as { installationId?: number | string }
    return meta.installationId != null ? String(meta.installationId) : null
  } catch {
    return null
  }
}

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

    const payload  = request.body as GitHubEvent
    const repoName = payload.repository?.full_name ?? null

    const tenantId = repoName
      ? await resolveTenantFromGitHubRepo(repoName)
      : null

    if (!tenantId) {
      request.log.warn({ repoName, eventType }, 'GitHub event from unknown repo — ignoring')
      return
    }

    // ── PR opened — inject context comment ───────────────────────────────
    if (eventType === 'pull_request' && payload.action === 'opened' && payload.pull_request) {
      const pr            = payload.pull_request
      const installId     = await getInstallationIdForTenant(tenantId)
      const repoFullName  = repoName ?? payload.repository?.full_name ?? ''

      if (installId && repoFullName) {
        void handlePrOpened({
          tenantId,
          installationId: installId,
          repoFullName,
          prNumber: pr.number,
          prTitle:  pr.title,
          prBody:   pr.body ?? null,
          logger:   request.log,
        }).catch(err => request.log.error({ err, repoFullName, prNumber: pr.number }, 'GitHub PR comment failed'))
      }
    }

    // Standard ingestion
    void ingestGitHubEvent(tenantId, eventType, payload, deliveryId, request.log)
      .catch(err => request.log.error({ err, eventType, deliveryId }, 'GitHub ingestion failed'))
  })
}
