import type { FastifyBaseLogger } from 'fastify'
import { postMessage } from './slack-bot.client.js'
import { recall } from '@/modules/why/why.service.js'
import { CONFIDENCE_THRESHOLD } from '@/config/constants.js'
import type { SlackBlock } from './slack-bot.client.js'

// â”€â”€â”€ Pattern detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Fires when a message that @mentions the bot also looks like a WHY question.
const WHY_PATTERNS = [
  /\bwhy\b/i,
  /\bwhat\s+caused\b/i,
  /\bwhat\s+led\b/i,
  /\bwho\s+decided\b/i,
  /\bwhen\s+did\s+we\b/i,
  /\bhow\s+did\s+we\s+end\s+up\b/i,
]

export function isWhyQuestion(text: string): boolean {
  return WHY_PATTERNS.some(p => p.test(text))
}

/** Strip the @mention prefix so we get a clean question */
export function stripBotMention(text: string, botUserId: string): string {
  return text
    .replace(new RegExp(`<@${botUserId}>`, 'gi'), '')
    .trim()
    .replace(/^[,\s:]+/, '')
    .trim()
}

// â”€â”€â”€ Block Kit formatter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildReplyBlocks(result: Awaited<ReturnType<typeof recall>>): SlackBlock[] {
  const blocks: SlackBlock[] = []

  if (result.cannotAnswer) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Dyson couldn't answer with confidence* (${(result.confidence * 100).toFixed(0)}%)\n\nNot enough context to draw a conclusion. Here are the ${result.sourceNodes.length} closest events I found:`,
      },
    })

    result.sourceNodes.slice(0, 4).forEach(n => {
      const when = n.occurredAt ? `_${new Date(n.occurredAt).toLocaleDateString()}_ Â· ` : ''
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `${when}*${n.source}* â€” ${n.title}${n.sourceUrl ? ` <${n.sourceUrl}|â†—>` : ''}` }],
      })
    })

    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `_Connect more sources to improve context coverage_ Â· <https://app.dyson.ai|dyson.ai>` }],
    })
    return blocks
  }

  // Main answer
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: result.answer ?? '' },
  })

  // Citations
  if (result.citations.length > 0) {
    blocks.push({ type: 'divider' })
    const citeText = result.citations
      .slice(0, 5)
      .map((c, i) => `[${i + 1}] ${c.claim}${c.sourceUrl ? ` <${c.sourceUrl}|source>` : ''}`)
      .join('\n')
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Citations*\n${citeText}` },
    })
  }

  // Footer
  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `Confidence: *${(result.confidence * 100).toFixed(0)}%* Â· ${result.sourceNodes.length} events Â· <https://app.dyson.ai/app/recall/${result.queryId}|View full timeline>`,
    }],
  })

  return blocks
}

// â”€â”€â”€ Main handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function handleBotMention(opts: {
  tenantId:  string
  userId:    string
  channel:   string
  threadTs:  string
  question:  string
  logger:    FastifyBaseLogger
}) {
  const { tenantId, userId, channel, threadTs, question, logger } = opts

  logger.info({ tenantId, channel, questionLen: question.length }, 'Slack bot: handling @mention WHY question')

  const result = await recall(question, tenantId, userId, logger)

  const fallbackText = result.cannotAnswer
    ? `Dyson couldn't answer with confidence (${(result.confidence * 100).toFixed(0)}%). Here are the relevant events.`
    : result.answer?.slice(0, 150) ?? 'Dyson answered your question.'

  await postMessage({
    channel,
    threadTs,       // reply in the original thread
    text:   fallbackText,
    blocks: buildReplyBlocks(result),
  })

  logger.info({ tenantId, channel, confidence: result.confidence, cannotAnswer: result.cannotAnswer }, 'Slack bot: reply sent')
}

// â”€â”€â”€ Incident post-mortem draft â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Triggered when a channel matching #inc-* or #incident-* is created.

const INCIDENT_PATTERN = /^#?(inc[-_]|incident[-_]|outage[-_]|postmortem[-_])/i

export function isIncidentChannel(channelName: string): boolean {
  return INCIDENT_PATTERN.test(channelName)
}

export async function handleIncidentChannelCreated(opts: {
  tenantId:    string
  channelId:   string
  channelName: string
  logger:      FastifyBaseLogger
}) {
  const { tenantId, channelId, channelName, logger } = opts

  logger.info({ tenantId, channelId, channelName }, 'Incident channel detected â€” starting post-mortem draft')

  // Extract incident topic from channel name for the query
  const topic = channelName
    .replace(/^#?(inc[-_]|incident[-_]|outage[-_]|postmortem[-_])/i, '')
    .replace(/[-_]/g, ' ')
    .trim() || 'this incident'

  const questions = [
    `What caused ${topic}?`,
    `What recent changes led to ${topic}?`,
    `Were there past incidents similar to ${topic}?`,
  ]

  const results = await Promise.allSettled(
    questions.map(q => recall(q, tenantId, 'agent', logger))
  )

  const answered = results
    .filter(r => r.status === 'fulfilled' && !r.value.cannotAnswer && r.value.confidence >= CONFIDENCE_THRESHOLD)
    .map(r => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof recall>>>).value)

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'ðŸ” Dyson Post-Mortem Starter', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `I detected this incident channel and started reconstructing context. Here's what I found in the context graph for *${topic}*:`,
      },
    },
    { type: 'divider' },
  ]

  if (answered.length === 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_Not enough context yet â€” the graph is still building. Try asking me directly once events are ingested:_ \`@Dyson what caused ${topic}?\``,
      },
    })
  } else {
    answered.forEach((result, i) => {
      const q = questions[i] ?? ''
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${q}*\n${result.answer ?? ''}`,
        },
      })
      if (result.citations.length > 0) {
        const cites = result.citations.slice(0, 3)
          .map((c, j) => `[${j + 1}] ${c.claim}${c.sourceUrl ? ` <${c.sourceUrl}|â†—>` : ''}`)
          .join('\n')
        blocks.push({
          type: 'context',
          elements: [{ type: 'mrkdwn', text: cites }],
        })
      }
      blocks.push({ type: 'divider' })
    })
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `<https://app.dyson.ai/app/why|Ask more questions on Dyson> Â· Confidence: ${answered.map(r => `${(r.confidence * 100).toFixed(0)}%`).join(', ') || 'N/A'}` }],
  })

  // Top-level post to the incident channel â€” no threadTs
  await postMessage({
    channel: channelId,
    text:    `Dyson post-mortem starter for ${topic}`,
    blocks,
  })
}


