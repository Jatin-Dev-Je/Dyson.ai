import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/infra/db/client.js'

export const SearchQuerySchema = z.object({
  q:      z.string().min(1).max(500).trim(),
  type:   z.enum(['all', 'decision', 'event', 'query']).default('all'),
  cursor: z.string().optional(),
  limit:  z.coerce.number().min(1).max(50).default(20),
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>

type SearchResult = {
  id:         string
  type:       'decision' | 'event' | 'query'
  title:      string
  summary:    string
  source?:    string
  sourceUrl?: string | null
  confidence?: number
  occurredAt?: Date
  createdAt:  Date
  rank:       number
}

export async function search(tenantId: string, query: SearchQuery): Promise<{
  results: SearchResult[]
  hasMore: boolean
  nextCursor: string | null
}> {
  const results: SearchResult[] = []
  const limit = query.limit

  // ── Node search (events + decisions) ─────────────────────────────────────
  if (query.type === 'all' || query.type === 'event' || query.type === 'decision') {
    const isDecisionOnly = query.type === 'decision'

    const nodeRows = await db.execute(sql`
      SELECT
        id,
        entity_type   AS "entityType",
        source,
        title,
        summary,
        source_url    AS "sourceUrl",
        occurred_at   AS "occurredAt",
        is_decision   AS "isDecision",
        ts_rank(
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')),
          plainto_tsquery('english', ${query.q})
        ) AS rank
      FROM context_nodes
      WHERE tenant_id = ${tenantId}::uuid
        AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
            @@ plainto_tsquery('english', ${query.q})
        ${isDecisionOnly ? sql`AND is_decision = true` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `)

    for (const row of nodeRows as unknown as Array<{
      id: string; entityType: string; source: string
      title: string; summary: string; sourceUrl: string | null
      occurredAt: Date; isDecision: boolean; rank: number
    }>) {
      results.push({
        id:         row.id,
        type:       row.isDecision ? 'decision' : 'event',
        title:      row.title,
        summary:    row.summary,
        source:     row.source,
        sourceUrl:  row.sourceUrl,
        occurredAt: row.occurredAt,
        createdAt:  row.occurredAt,
        rank:       row.rank,
      })
    }
  }

  // ── WHY query search ──────────────────────────────────────────────────────
  if (query.type === 'all' || query.type === 'query') {
    const queryRows = await db.execute(sql`
      SELECT
        id,
        question,
        answer,
        confidence,
        created_at AS "createdAt",
        ts_rank(
          to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, '')),
          plainto_tsquery('english', ${query.q})
        ) AS rank
      FROM why_queries
      WHERE tenant_id = ${tenantId}::uuid
        AND to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, ''))
            @@ plainto_tsquery('english', ${query.q})
      ORDER BY rank DESC
      LIMIT ${limit}
    `)

    for (const row of queryRows as unknown as Array<{
      id: string; question: string; answer: string | null
      confidence: number | null; createdAt: Date; rank: number
    }>) {
      const result: SearchResult = {
        id:         row.id,
        type:       'query',
        title:      row.question,
        summary:    row.answer?.slice(0, 200) ?? 'No answer generated',
        createdAt:  row.createdAt,
        rank:       row.rank,
      }
      if (row.confidence !== null) result.confidence = row.confidence
      results.push(result)
    }
  }

  // Merge + re-rank by full-text rank score
  const sorted = results
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit + 1)

  const hasMore = sorted.length > limit

  return {
    results:    hasMore ? sorted.slice(0, limit) : sorted,
    hasMore,
    nextCursor: hasMore ? (sorted[limit - 1]?.id ?? null) : null,
  }
}
