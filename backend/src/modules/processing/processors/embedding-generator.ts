import { env } from '@/config/env.js'
import type { FastifyBaseLogger } from 'fastify'

const COHERE_EMBED_URL = 'https://api.cohere.ai/v1/embed'
const MODEL            = 'embed-english-v3.0'
const MAX_CHARS        = 2048   // ~512 tokens — Cohere's practical limit per text
const MAX_RETRIES      = 3
const RETRY_DELAY_MS   = 1000

function truncateForEmbedding(text: string): string {
  if (text.length <= MAX_CHARS) return text
  return text.slice(0, MAX_CHARS - 3) + '…'
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function generateEmbedding(
  text: string,
  logger: FastifyBaseLogger
): Promise<number[] | null> {
  if (!env.COHERE_API_KEY) {
    logger.debug('Cohere API key not configured — skipping embedding generation')
    return null
  }

  const input = truncateForEmbedding(text)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(COHERE_EMBED_URL, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${env.COHERE_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          texts:      [input],
          model:      MODEL,
          input_type: 'search_document',  // Optimises for document retrieval
        }),
      })

      if (res.status === 429) {
        // Rate limited — wait and retry
        const retryAfter = parseInt(res.headers.get('retry-after') ?? '2', 10)
        logger.warn({ attempt, retryAfter }, 'Cohere rate limit — retrying')
        await sleep(retryAfter * 1000)
        continue
      }

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Cohere API error ${res.status}: ${body}`)
      }

      const data  = await res.json() as { embeddings: number[][] }
      const embed = data.embeddings[0]

      if (!embed || embed.length === 0) {
        throw new Error('Cohere returned empty embedding')
      }

      return embed

    } catch (err) {
      if (attempt === MAX_RETRIES) {
        logger.error({ err, attempt }, 'Embedding generation failed after max retries')
        return null  // Graceful degradation — embeddings are not blocking
      }
      logger.warn({ err, attempt }, 'Embedding generation failed — retrying')
      await sleep(RETRY_DELAY_MS * attempt)  // Exponential-ish backoff
    }
  }

  return null
}

// Batch embedding for efficiency (up to 96 texts at once)
export async function generateEmbeddingsBatch(
  texts: string[],
  logger: FastifyBaseLogger
): Promise<Array<number[] | null>> {
  if (!env.COHERE_API_KEY || texts.length === 0) {
    return texts.map(() => null)
  }

  const inputs = texts.map(truncateForEmbedding)

  try {
    const res = await fetch(COHERE_EMBED_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${env.COHERE_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        texts:      inputs,
        model:      MODEL,
        input_type: 'search_document',
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Cohere batch API error ${res.status}: ${body}`)
    }

    const data = await res.json() as { embeddings: number[][] }
    return data.embeddings.map(e => (e.length > 0 ? e : null))
  } catch (err) {
    logger.error({ err }, 'Batch embedding generation failed')
    return texts.map(() => null)
  }
}
