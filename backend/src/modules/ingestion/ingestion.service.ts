import type { FastifyBaseLogger } from 'fastify'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { connectedSources } from '@/infra/db/schema/index.js'
import { insertRawEvent } from './ingestion.repository.js'
import { normalizeSlackEvent } from './connectors/slack/slack.handler.js'
import { normalizeGitHubEvent } from './connectors/github/github.handler.js'
import type { SlackEvent, GitHubEvent } from './ingestion.types.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import { EventSource } from '@/shared/types/entities.js'

// ─── Shared: store + enqueue ──────────────────────────────────────────────

async function storeAndEnqueue(
  tenantId:   string,
  normalized: ReturnType<typeof normalizeSlackEvent>,
  logger:     FastifyBaseLogger
) {
  if (!normalized) return null

  const stored = await insertRawEvent(tenantId, normalized)
  if (!stored) {
    logger.debug({ externalId: normalized.externalId }, 'Duplicate event skipped')
    return null
  }

  await enqueue('process-event', {
    eventId:  stored.id,
    tenantId,
    event: { ...normalized, occurredAt: normalized.occurredAt.toISOString() },
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
    logger.info({ tenantId, rawEventId: stored.id, source: EventSource.Slack }, 'Slack event ingested')
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
    logger.info({ tenantId, rawEventId: stored.id, source: EventSource.GitHub, eventType }, 'GitHub event ingested')
  }
  return stored
}

// ─── Tenant resolution ────────────────────────────────────────────────────
// Webhooks don't carry a JWT — resolve tenantId from stored connector metadata.

export async function resolveTenantFromSlackTeam(teamId: string): Promise<string | null> {
  const [row] = await db
    .select({ tenantId: connectedSources.tenantId })
    .from(connectedSources)
    .where(and(
      eq(connectedSources.source, EventSource.Slack),
      eq(connectedSources.isActive, true),
      sql`${connectedSources.metadata}::jsonb ->> 'teamId' = ${teamId}`,
    ))
    .limit(1)

  return row?.tenantId ?? null
}

export async function resolveTenantFromGitHubInstallation(installationId: number): Promise<string | null> {
  const [row] = await db
    .select({ tenantId: connectedSources.tenantId })
    .from(connectedSources)
    .where(and(
      eq(connectedSources.source, EventSource.GitHub),
      eq(connectedSources.isActive, true),
      sql`${connectedSources.metadata}::jsonb ->> 'installationId' = ${String(installationId)}`,
    ))
    .limit(1)

  return row?.tenantId ?? null
}
