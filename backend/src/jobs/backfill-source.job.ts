import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import { db } from '@/infra/db/client.js'
import { connectedSources } from '@/infra/db/schema/index.js'
import { EventSource } from '@/shared/types/entities.js'
import { backfillSlack }  from '@/modules/ingestion/connectors/slack/slack.backfill.js'
import { backfillGitHub } from '@/modules/ingestion/connectors/github/github.backfill.js'
import { markSyncComplete, markSyncError } from '@/modules/connectors/connectors.repository.js'

const Schema = z.object({
  connectorId: z.string().uuid(),
  tenantId:    z.string().uuid(),
  source:      z.string(),
})

export async function handleBackfillSource(
  payload: unknown,
  logger:  FastifyBaseLogger
) {
  const { connectorId, tenantId, source } = Schema.parse(payload)

  // Re-fetch the connector — never trust the payload alone for credentials
  const [conn] = await db
    .select()
    .from(connectedSources)
    .where(and(
      eq(connectedSources.id, connectorId),
      eq(connectedSources.tenantId, tenantId),
      eq(connectedSources.isActive, true),
    ))
    .limit(1)

  if (!conn) {
    logger.warn({ connectorId, tenantId }, 'Backfill skipped — connector not found or inactive')
    return
  }

  try {
    if (source === EventSource.Slack) {
      const meta = JSON.parse(conn.metadata ?? '{}') as { teamId?: string }
      if (!meta.teamId) throw new Error('Slack connector missing teamId metadata')
      const result = await backfillSlack(tenantId, conn.accessToken, meta.teamId, logger)
      logger.info({ tenantId, ...result }, 'Slack backfill complete')
    } else if (source === EventSource.GitHub) {
      const result = await backfillGitHub(tenantId, conn.accessToken, logger)
      logger.info({ tenantId, ...result }, 'GitHub backfill complete')
    } else {
      throw new Error(`Unknown source: ${source}`)
    }

    await markSyncComplete(connectorId)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ err, connectorId, tenantId, source }, 'Backfill failed')
    await markSyncError(connectorId, msg)
    throw err  // Let the queue retry per its policy
  }
}
