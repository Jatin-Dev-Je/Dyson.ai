import { EntityType, EventSource } from '@/shared/types/entities.js'
import type { NormalizedEvent, SlackEvent } from '../../ingestion.types.js'

// Events we care about — ignore bots, edits, deletes, joins/leaves
const IGNORED_SUBTYPES = new Set([
  'bot_message', 'message_changed', 'message_deleted',
  'channel_join', 'channel_leave', 'channel_topic', 'channel_purpose',
])

export function normalizeSlackEvent(
  event: SlackEvent,
  teamId: string
): NormalizedEvent | null {
  const inner = event.event

  // Skip non-message events and bots
  if (inner.type !== 'message') return null
  if (inner.bot_id)             return null
  if (inner.subtype && IGNORED_SUBTYPES.has(inner.subtype)) return null
  if (!inner.text?.trim())      return null

  // Slack ts is unix timestamp with microseconds: "1712345678.123456"
  const ts          = inner.ts
  const occurredAt  = new Date(parseFloat(ts) * 1000)
  const externalId  = `slack_${event.team_id}_${ts}`
  const channelUrl  = inner.channel
    ? `https://app.slack.com/client/${teamId}/${inner.channel}`
    : null

  return {
    externalId,
    source:      EventSource.Slack,
    entityType:  EntityType.Message,
    content:     inner.text,
    metadata: {
      teamId:    event.team_id,
      channelId: inner.channel ?? null,
      userId:    inner.user ?? null,
      ts,
    },
    occurredAt,
    authorEmail: null,  // Resolved later when we have user-email mapping
    url:         channelUrl,
  }
}
