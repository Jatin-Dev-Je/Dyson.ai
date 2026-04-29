import { describe, expect, it } from 'vitest'
import { filterAccessibleNodes } from '@/modules/why/retrieval/access-filter.js'
import { buildVerifiedAnswer, parseGeminiWhyResponse } from '@/modules/why/llm/response-validator.js'
import type { SourceNodeSummary } from '@/modules/why/why.types.js'

function node(overrides: Partial<SourceNodeSummary> = {}): SourceNodeSummary {
  return {
    id: overrides.id ?? 'node-1',
    entityType: overrides.entityType ?? 'message',
    source: overrides.source ?? 'slack',
    title: overrides.title ?? 'Incident thread',
    summary: overrides.summary ?? 'The auth migration was triggered by session flooding.',
    sourceUrl: overrides.sourceUrl ?? 'https://example.com/source',
    metadata: overrides.metadata ?? {},
    occurredAt: overrides.occurredAt ?? new Date('2026-04-01T00:00:00Z'),
    similarity: overrides.similarity ?? 0.82,
    isDecision: overrides.isDecision ?? false,
    retrieval: overrides.retrieval ?? 'vector',
  }
}

describe('WHY RAG access filtering', () => {
  it('allows unrestricted source nodes', () => {
    const result = filterAccessibleNodes([node()], 'user-1')
    expect(result.allowed).toHaveLength(1)
    expect(result.deniedCount).toBe(0)
  })

  it('filters restricted source nodes without explicit access', () => {
    const result = filterAccessibleNodes([
      node({ metadata: { channelIsPrivate: true, memberIds: ['user-2'] } }),
    ], 'user-1')

    expect(result.allowed).toHaveLength(0)
    expect(result.deniedCount).toBe(1)
  })

  it('allows restricted source nodes with explicit access', () => {
    const result = filterAccessibleNodes([
      node({ metadata: { channelIsPrivate: true, memberIds: ['user-1'] } }),
    ], 'user-1')

    expect(result.allowed).toHaveLength(1)
    expect(result.deniedCount).toBe(0)
  })
})

describe('WHY RAG LLM response validation', () => {
  it('rejects malformed Gemini output', () => {
    expect(parseGeminiWhyResponse({ answer: 123, citations: [], cannotAnswer: false })).toBeNull()
  })

  it('accepts valid Gemini output', () => {
    const parsed = parseGeminiWhyResponse({
      answer: 'The migration happened because sessions flooded the rate limiter [1].',
      citations: [{ claim: 'Sessions flooded the rate limiter.', sourceNodeIndex: 0, confidence: 0.9 }],
      cannotAnswer: false,
    })

    expect(parsed?.citations).toHaveLength(1)
  })

  it('rejects answers with uncited factual sentences', () => {
    const verified = buildVerifiedAnswer({
      answer: 'Sessions flooded the rate limiter [1]. The team chose JWT.',
      citations: [{ claim: 'Sessions flooded the rate limiter.', sourceNodeIndex: 0, confidence: 0.9 }],
      cannotAnswer: false,
    }, [node()])

    expect(verified).toBeNull()
  })

  it('rejects citations that point outside supplied source nodes', () => {
    const verified = buildVerifiedAnswer({
      answer: 'The team chose JWT after the incident [2].',
      citations: [{ claim: 'The team chose JWT after the incident.', sourceNodeIndex: 1, confidence: 0.9 }],
      cannotAnswer: false,
    }, [node()])

    expect(verified).toBeNull()
  })

  it('maps valid citations to source node IDs', () => {
    const verified = buildVerifiedAnswer({
      answer: 'The team chose JWT after the incident [1].',
      citations: [{ claim: 'The team chose JWT after the incident.', sourceNodeIndex: 0, confidence: 0.9 }],
      cannotAnswer: false,
    }, [node({ id: 'node-auth' })])

    expect(verified?.answer).toContain('[1]')
    expect(verified?.citations[0]?.sourceNodeId).toBe('node-auth')
  })
})
