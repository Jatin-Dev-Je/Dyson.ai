import { env } from '@/config/env.js'
import type { FastifyBaseLogger } from 'fastify'
import { SYSTEM_PROMPT, buildPrompt } from './prompt-builder.js'
import { parseGeminiWhyResponse } from './response-validator.js'
import type { SourceNodeSummary, GeminiWhyResponse } from '../why.types.js'

const MAX_RETRIES   = 2
const TIMEOUT_MS    = 30_000

export async function callGemini(
  question: string,
  nodes:    SourceNodeSummary[],
  logger:   FastifyBaseLogger
): Promise<GeminiWhyResponse | null> {
  if (!env.GEMINI_API_KEY) {
    logger.debug('Gemini API key not configured — LLM composition skipped')
    return null
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`

  const userPrompt = buildPrompt(question, nodes)

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature:       0,         // Zero temp — we need deterministic, grounded answers
      maxOutputTokens:   1024,
      responseMimeType:  'application/json',  // Force JSON output
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  controller.signal,
      })

      clearTimeout(timer)

      if (res.status === 429) {
        logger.warn({ attempt }, 'Gemini rate limited — retrying')
        await new Promise(r => setTimeout(r, 2000 * attempt))
        continue
      }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Gemini API error ${res.status}: ${text}`)
      }

      const data = await res.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> }
          finishReason?: string
        }>
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Gemini returned empty response')

      const parsed = parseGeminiWhyResponse(JSON.parse(text))
      if (!parsed) throw new Error('Gemini response failed schema validation')
      return parsed

    } catch (err) {
      clearTimeout(timer)

      if (attempt === MAX_RETRIES) {
        logger.error({ err }, 'Gemini call failed after max retries')
        return null
      }
      logger.warn({ err, attempt }, 'Gemini call failed — retrying')
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }

  return null
}
