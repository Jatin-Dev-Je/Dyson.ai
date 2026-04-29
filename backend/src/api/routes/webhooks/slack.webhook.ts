import type { FastifyInstance } from 'fastify'
import { verifySlackSignature } from '@/api/middleware/signature.middleware.js'
import { ingestSlackEvent, resolveTenantFromSlackTeam } from '@/modules/ingestion/ingestion.service.js'
import { handleBotMention, isWhyQuestion, stripBotMention, isIncidentChannel, handleIncidentChannelCreated } from '@/modules/slack-bot/slack-bot.service.js'
import { getBotUserId } from '@/modules/slack-bot/slack-bot.client.js'
import type { SlackEvent } from '@/modules/ingestion/ingestion.types.js'
import { db } from '@/infra/db/client.js'
import { connectedSources } from '@/infra/db/schema/index.js'
import { eq, and } from 'drizzle-orm'
import { EventSource } from '@/shared/types/entities.js'

// Cache the bot user ID — set once per process, never changes
let cachedBotUserId: string | null = null
async function getOrFetchBotUserId(): Promise<string | null> {
  if (!cachedBotUserId) cachedBotUserId = await getBotUserId()
  return cachedBotUserId
}

// Resolve the installation metadata (stores botUserId per workspace)
async function getBotUserIdForTeam(tenantId: string, teamId: string): Promise<string | null> {
  const [connector] = await db
    .select({ metadata: connectedSources.metadata })
    .from(connectedSources)
    .where(and(
      eq(connectedSources.tenantId, tenantId),
      eq(connectedSources.source, EventSource.Slack),
    ))
    .limit(1)

  if (!connector?.metadata) return getOrFetchBotUserId()

  try {
    const meta = JSON.parse(connector.metadata) as { botUserId?: string }
    return meta.botUserId ?? getOrFetchBotUserId()
  } catch {
    return getOrFetchBotUserId()
  }
}

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

    const teamId = body['team_id'] as string | undefined
    if (!teamId) return

    const tenantId = await resolveTenantFromSlackTeam(teamId)
    if (!tenantId) {
      request.log.warn({ teamId }, 'Slack event from unknown team — ignoring')
      return
    }

    const event = (body['event'] ?? {}) as Record<string, unknown>
    const eventType = (body['event_type'] ?? event['type']) as string | undefined

    // ── channel_created — detect incident channels ────────────────────────
    if (eventType === 'channel_created' || event['type'] === 'channel_created') {
      const channel = event['channel'] as Record<string, unknown> | undefined
      const channelId   = (channel?.['id']   ?? '') as string
      const channelName = (channel?.['name'] ?? '') as string

      if (isIncidentChannel(channelName)) {
        void handleIncidentChannelCreated({ tenantId, channelId, channelName, logger: request.log })
          .catch(err => request.log.error({ err, channelName }, 'Incident post-mortem draft failed'))
      }
    }

    // ── app_mention — @Dyson was mentioned ───────────────────────────────
    if (event['type'] === 'app_mention') {
      const text      = (event['text']       ?? '') as string
      const userId    = (event['user']       ?? '') as string
      const channel   = (event['channel']    ?? '') as string
      const ts        = (event['ts']         ?? '') as string

      const botUserId = await getBotUserIdForTeam(tenantId, teamId)

      // Strip the @mention and check if it's a WHY question
      const question = botUserId ? stripBotMention(text, botUserId) : text.replace(/<@[A-Z0-9]+>/g, '').trim()

      if (question.length >= 5 && isWhyQuestion(question)) {
        void handleBotMention({
          tenantId,
          userId,
          channel,
          threadTs: ts,
          question,
          logger: request.log,
        }).catch(err => request.log.error({ err, channel }, 'Slack bot reply failed'))
      }
    }

    // ── Standard ingestion for all message events ─────────────────────────
    void ingestSlackEvent(tenantId, body as unknown as SlackEvent, request.log)
      .catch(err => request.log.error({ err, teamId }, 'Slack ingestion failed'))
  })
}
