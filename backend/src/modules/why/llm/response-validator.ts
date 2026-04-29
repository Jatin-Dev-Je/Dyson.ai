import { z } from 'zod'
import type { Citation, GeminiWhyResponse, SourceNodeSummary } from '../why.types.js'

const GeminiCitationSchema = z.object({
  claim: z.string().min(1).max(1000),
  sourceNodeIndex: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
})

export const GeminiWhyResponseSchema = z.object({
  answer: z.string().max(4000).nullable().optional(),
  citations: z.array(GeminiCitationSchema).default([]),
  cannotAnswer: z.boolean().default(false),
})

export function parseGeminiWhyResponse(value: unknown): GeminiWhyResponse | null {
  const parsed = GeminiWhyResponseSchema.safeParse(value)
  if (!parsed.success) return null

  return {
    answer: parsed.data.answer ?? '',
    citations: parsed.data.citations,
    cannotAnswer: parsed.data.cannotAnswer,
  }
}

function sentenceLikeParts(answer: string): string[] {
  return answer
    .split(/(?<=[.!?])\s+/)
    .map(part => part.trim())
    .filter(part => /[A-Za-z0-9]/.test(part))
}

function citationMarkers(text: string): number[] {
  return [...text.matchAll(/\[(\d+)\]/g)]
    .map(match => Number(match[1]))
    .filter(Number.isInteger)
}

export function buildVerifiedAnswer(
  response: GeminiWhyResponse,
  nodes: SourceNodeSummary[]
): { answer: string; citations: Citation[] } | null {
  if (response.cannotAnswer) return null

  const answer = response.answer.trim()
  if (!answer) return null

  const sentences = sentenceLikeParts(answer)
  if (sentences.length === 0) return null

  const allSentencesCited = sentences.every(sentence => citationMarkers(sentence).length > 0)
  if (!allSentencesCited) return null

  const markers = new Set(citationMarkers(answer).map(marker => marker - 1))
  if (markers.size === 0) return null

  const citations = response.citations
    .filter(citation => citation.sourceNodeIndex >= 0 && citation.sourceNodeIndex < nodes.length)
    .filter(citation => markers.has(citation.sourceNodeIndex))
    .map(citation => {
      const node = nodes[citation.sourceNodeIndex]
      if (!node) return null
      return {
        claim: citation.claim,
        sourceNodeId: node.id,
        sourceUrl: node.sourceUrl,
        confidence: citation.confidence,
      }
    })
    .filter((citation): citation is Citation => citation !== null)

  const citedNodeIds = new Set(citations.map(citation => citation.sourceNodeId))
  const everyMarkerMapped = [...markers].every(index => {
    const node = nodes[index]
    return node ? citedNodeIds.has(node.id) : false
  })

  if (!everyMarkerMapped || citations.length === 0) return null

  return { answer, citations }
}
