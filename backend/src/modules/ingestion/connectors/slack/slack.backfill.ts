import type { FastifyBaseLogger } from 'fastify'
import { EntityType, EventSource } from '@/shared/types/entities.js'
import { insertRawEvent } from '@/modules/ingestion/ingestion.repository.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import type { NormalizedEvent } from '@/modules/ingestion/ingestion.types.js'

const SLACK_API = 'https://slack.com/api'
const CHANNELS_PER_SYNC = 25
const MESSAGES_PER_CHANNEL = 100

type SlackChannel = { id: string; name?: string; is_archived?: boolean }
type SlackHistoryMsg = {
  ts:       string
  text?:    string
  user?:    string
  bot_id?:  string
  subtype?: string
}

const IGNORED_SUBTYPES = new Set([
  'bot_message', 'message_changed', 'message_deleted',
  'channel_join', 'channel_leave', 'channel_topic', 'channel_purpose',
])

async function slackApi<T>(token: string, path: string, params: Record<string, string>): Promise<T> {
  const url = `${SLACK_API}/${path}?${new URLSearchParams(params).toString()}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Slack API ${path} failed: HTTP ${res.status}`)
  const data = await res.json() as { ok: boolean; error?: string } & T
  if (!data.ok) throw new Error(`Slack API ${path} failed: ${data.error}`)
  return data
}

function normalizeHistoryMessage(
  msg:    SlackHistoryMsg,
  teamId: string,
  channel:string
): NormalizedEvent | null {
  if (msg.bot_id)                                       return null
  if (msg.subtype && IGNORED_SUBTYPES.has(msg.subtype)) return null
  if (!msg.text?.trim())                                return null

  return {
    externalId: `slack_${teamId}_${msg.ts}`,
    source:     EventSource.Slack,
    entityType: EntityType.Message,
    content:    msg.text,
    metadata:   { teamId, channelId: channel, userId: msg.user ?? null, ts: msg.ts },
    occurredAt: new Date(parseFloat(msg.ts) * 1000),
    authorEmail: null,
    url:        `https://app.slack.com/client/${teamId}/${channel}`,
  }
}

export async function backfillSlack(
  tenantId:    string,
  accessToken: string,
  teamId:      string,
  logger:      FastifyBaseLogger
): Promise<{ inserted: number; channels: number }> {
  // 1. List channels the bot is a member of
  const channelsRes = await slackApi<{ channels: SlackChannel[] }>(
    accessToken,
    'conversations.list',
    { types: 'public_channel,private_channel', exclude_archived: 'true', limit: String(CHANNELS_PER_SYNC) }
  )

  const channels = channelsRes.channels.filter(c => !c.is_archived)
  let totalInserted = 0

  // 2. For each channel, pull recent history + ingest
  for (const channel of channels) {
    try {
      const history = await slackApi<{ messages: SlackHistoryMsg[] }>(
        accessToken,
        'conversations.history',
        { channel: channel.id, limit: String(MESSAGES_PER_CHANNEL) }
      )

      for (const msg of history.messages) {
        const normalized = normalizeHistoryMessage(msg, teamId, channel.id)
        if (!normalized) continue

        const stored = await insertRawEvent(tenantId, normalized)
        if (!stored) continue  // duplicate — skip

        await enqueue('process-event', {
          eventId:  stored.id,
          tenantId,
          event: { ...normalized, occurredAt: normalized.occurredAt.toISOString() },
        }, logger)

        totalInserted++
      }
    } catch (err) {
      // One channel failing should not abort the whole backfill
      logger.warn({ err, channelId: channel.id }, 'Slack channel backfill failed')
    }
  }

  return { inserted: totalInserted, channels: channels.length }
}
