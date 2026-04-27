import type { FastifyBaseLogger } from 'fastify'
import { insertRawEvent } from './ingestion.repository.js'
import { normalizeSlackEvent } from './connectors/slack/slack.handler.js'
import { normalizeGitHubEvent } from './connectors/github/github.handler.js'
import type { SlackEvent, GitHubEvent } from './ingestion.types.js'
import { findConnector } from '../connectors/connectors.repository.js'
import { EventSource } from '@/shared/types/entities.js'

// ─── Slack ingestion ──────────────────────────────────────────────────────

export async function ingestSlackEvent(
  tenantId: string,
  payload: SlackEvent,
  logger: FastifyBaseLogger
) {
  const normalized = normalizeSlackEvent(payload, payload.team_id)

  if (!normalized) {
    logger.debug({ eventType: payload.event?.type }, 'Slack event skipped (not actionable)')
    return null
  }

  const stored = await insertRawEvent(tenantId, normalized)

  if (!stored) {
    logger.debug({ externalId: normalized.externalId }, 'Slack event duplicate — skipped')
    return null
  }

  logger.info(
    { tenantId, source: EventSource.Slack, externalId: normalized.externalId },
    'Raw event ingested'
  )

  return stored
}

// ─── GitHub ingestion ─────────────────────────────────────────────────────

export async function ingestGitHubEvent(
  tenantId: string,
  eventType: string,
  payload: GitHubEvent,
  deliveryId: string,
  logger: FastifyBaseLogger
) {
  const normalized = normalizeGitHubEvent(eventType, payload, deliveryId)

  if (!normalized) {
    logger.debug({ eventType }, 'GitHub event skipped (not actionable)')
    return null
  }

  const stored = await insertRawEvent(tenantId, normalized)

  if (!stored) {
    logger.debug({ externalId: normalized.externalId }, 'GitHub event duplicate — skipped')
    return null
  }

  logger.info(
    { tenantId, source: EventSource.GitHub, externalId: normalized.externalId, eventType },
    'Raw event ingested'
  )

  return stored
}

// ─── Resolve tenant from webhook ─────────────────────────────────────────
// Webhooks don't carry a JWT — we resolve tenantId from the connected source

export async function resolveTenantFromSlackTeam(teamId: string): Promise<string | null> {
  // Search connected_sources for this Slack team
  // We store teamId in the metadata JSON
  const { db } = await import('@/infra/db/client.js')
  const { connectedSources } = await import('@/infra/db/schema/index.js')
  const { eq, sql } = await import('drizzle-orm')

  const [row] = await db
    .select({ tenantId: connectedSources.tenantId })
    .from(connectedSources)
    .where(
      sql`${connectedSources.metadata}::jsonb ->> 'teamId' = ${teamId}
          AND ${connectedSources.source} = ${EventSource.Slack}
          AND ${connectedSources.isActive} = true`
    )
    .limit(1)

  return row?.tenantId ?? null
}

export async function resolveTenantFromGitHubRepo(repoFullName: string): Promise<string | null> {
  // For GitHub App installs, all repos under the installation map to the same tenant
  // We'll resolve by checking which connector has an active GitHub installation
  // In a real impl, store repo→tenantId mapping during installation
  const { db } = await import('@/infra/db/client.js')
  const { connectedSources } = await import('@/infra/db/schema/index.js')
  const { eq } = await import('drizzle-orm')

  const [row] = await db
    .select({ tenantId: connectedSources.tenantId })
    .from(connectedSources)
    .where(eq(connectedSources.source, EventSource.GitHub))
    .limit(1)

  return row?.tenantId ?? null
}
