import type { FastifyBaseLogger } from 'fastify'
import { insertRawEvent } from './ingestion.repository.js'
import { normalizeSlackEvent } from './connectors/slack/slack.handler.js'
import { normalizeGitHubEvent } from './connectors/github/github.handler.js'
import type { SlackEvent, GitHubEvent } from './ingestion.types.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import { EventSource } from '@/shared/types/entities.js'

// ─── Shared: store + enqueue ──────────────────────────────────────────────

async function storeAndEnqueue(
  tenantId: string,
  normalized: ReturnType<typeof normalizeSlackEvent>,
  logger: FastifyBaseLogger
) {
  if (!normalized) return null

  const stored = await insertRawEvent(tenantId, normalized)
  if (!stored) {
    // Duplicate event — idempotent no-op
    logger.debug({ externalId: normalized.externalId }, 'Duplicate event skipped')
    return null
  }

  // Enqueue processing job — decoupled from ingestion
  await enqueue('process-event', {
    eventId:  stored.id,
    tenantId,
    event: {
      ...normalized,
      occurredAt: normalized.occurredAt.toISOString(),
    },
  }, logger)

  return stored
}

// ─── Slack ingestion ──────────────────────────────────────────────────────

export async function ingestSlackEvent(
  tenantId: string,
  payload:  SlackEvent,
  logger:   FastifyBaseLogger
) {
  const normalized = normalizeSlackEvent(payload, payload.team_id)

  if (!normalized) {
    logger.debug({ eventType: payload.event?.type }, 'Slack event not actionable — skipped')
    return null
  }

  const stored = await storeAndEnqueue(tenantId, normalized, logger)

  if (stored) {
    logger.info(
      { tenantId, rawEventId: stored.id, source: EventSource.Slack },
      'Slack event ingested and queued for processing'
    )
  }

  return stored
}

// ─── GitHub ingestion ─────────────────────────────────────────────────────

export async function ingestGitHubEvent(
  tenantId:   string,
  eventType:  string,
  payload:    GitHubEvent,
  deliveryId: string,
  logger:     FastifyBaseLogger
) {
  const normalized = normalizeGitHubEvent(eventType, payload, deliveryId)

  if (!normalized) {
    logger.debug({ eventType }, 'GitHub event not actionable — skipped')
    return null
  }

  const stored = await storeAndEnqueue(tenantId, normalized, logger)

  if (stored) {
    logger.info(
      { tenantId, rawEventId: stored.id, source: EventSource.GitHub, eventType },
      'GitHub event ingested and queued for processing'
    )
  }

  return stored
}

// ─── Tenant resolution from webhook headers ───────────────────────────────
// Webhooks don't carry a JWT — resolve tenantId from stored connector metadata

export async function resolveTenantFromSlackTeam(teamId: string): Promise<string | null> {
  const { db }               = await import('@/infra/db/client.js')
  const { connectedSources } = await import('@/infra/db/schema/index.js')
  const { sql }              = await import('drizzle-orm')

  const [row] = await db
    .select({ tenantId: connectedSources.tenantId })
    .from(connectedSources)
    .where(sql`
      ${connectedSources.metadata}::jsonb ->> 'teamId' = ${teamId}
      AND ${connectedSources.source} = ${EventSource.Slack}
      AND ${connectedSources.isActive} = true
    `)
    .limit(1)

  return row?.tenantId ?? null
}

export async function resolveTenantFromGitHubRepo(_repoFullName: string): Promise<string | null> {
  const { db }               = await import('@/infra/db/client.js')
  const { connectedSources } = await import('@/infra/db/schema/index.js')
  const { eq }               = await import('drizzle-orm')

  // In Week 4 we'll store a repo→tenantId mapping during installation
  // For now, return the first active GitHub connector's tenant
  const [row] = await db
    .select({ tenantId: connectedSources.tenantId })
    .from(connectedSources)
    .where(eq(connectedSources.source, EventSource.GitHub))
    .limit(1)

  return row?.tenantId ?? null
}
