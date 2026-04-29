import { env } from '@/config/env.js'

const SLACK_API = 'https://slack.com/api'

export type SlackBlock =
  | { type: 'section';   text: { type: 'mrkdwn'; text: string } }
  | { type: 'divider' }
  | { type: 'context';   elements: Array<{ type: 'mrkdwn'; text: string }> }
  | { type: 'header';    text: { type: 'plain_text'; text: string; emoji?: boolean } }

async function slackPost<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = env.SLACK_BOT_TOKEN
  if (!token) throw new Error('SLACK_BOT_TOKEN not configured')

  const res = await fetch(`${SLACK_API}/${method}`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Slack API ${method} HTTP ${res.status}`)

  const data = await res.json() as { ok: boolean; error?: string } & T
  if (!data.ok) throw new Error(`Slack API ${method} error: ${data.error}`)

  return data
}

/** Post a threaded reply with Block Kit blocks */
export async function postThreadedReply(opts: {
  channel:   string
  threadTs:  string
  text:      string          // fallback text for notifications
  blocks:    SlackBlock[]
}) {
  return slackPost('chat.postMessage', {
    channel:   opts.channel,
    thread_ts: opts.threadTs,
    text:      opts.text,
    blocks:    opts.blocks,
  })
}

/** Join a channel so the bot can post (public channels) */
export async function joinChannel(channelId: string) {
  return slackPost('conversations.join', { channel: channelId }).catch(() => undefined)
}

/** Look up the bot's own user ID from the token */
export async function getBotUserId(): Promise<string | null> {
  try {
    const res = await slackPost<{ user_id: string }>('auth.test', {})
    return res.user_id
  } catch {
    return null
  }
}
