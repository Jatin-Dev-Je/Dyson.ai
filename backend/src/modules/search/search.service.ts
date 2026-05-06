/**
 * Search service — full-text + optional semantic search across all company memory.
 *
 * Engineering decisions:
 *   1. websearch_to_tsquery instead of plainto_tsquery:
 *      plainto_tsquery("foo bar") → foo & bar  (AND, no phrase)
 *      websearch_to_tsquery("foo bar") → foo <-> bar  (adjacent phrase match)
 *      websearch_to_tsquery supports quoted phrases, OR, negation like Google.
 *
 *   2. Filters applied in SQL, not post-hoc:
 *      Source and date filters reduce the result set before ranking.
 *      Post-hoc filtering would waste time ranking then discarding.
 *
 *   3. Tenant isolation is the first WHERE clause — always.
 *      This ensures the query planner uses the tenant_id index first.
 */

import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/infra/db/client.js'
import { sanitizeText } from '@/infra/sanitize.js'

// Valid sources for filtering
const SOURCE_VALUES = ['slack', 'github', 'notion', 'linear', 'meeting', 'agent', 'manual'] as const

export const SearchQuerySchema = z.object({
  q:        z.string().min(1).max(500).trim(),
  type:     z.enum(['all', 'decision', 'event', 'query']).default('all'),
  source:   z.enum(SOURCE_VALUES).optional(),
  from:     z.string().datetime().optional(),   // ISO 8601
  to:       z.string().datetime().optional(),
  cursor:   z.string().optional(),
  limit:    z.coerce.number().min(1).max(100).default(20),
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>

type SearchResult = {
  id:          string
  type:        'decision' | 'event' | 'query'
  title:       string
  summary:     string
  source?:     string
  sourceUrl?:  string | null
  confidence?: number
  occurredAt?: Date
  createdAt:   Date
  rank:        number
}

export async function search(
  tenantId:   string,
  query:      SearchQuery,
): Promise<{ results: SearchResult[]; hasMore: boolean; nextCursor: string | null }> {
  // Sanitize the query text before passing to SQL
  const safeQ = sanitizeText(query.q)
  const results: SearchResult[] = []
  const limit = query.limit

  // ── Context nodes (events + decisions) ───────────────────────────────────
  if (query.type === 'all' || query.type === 'event' || query.type === 'decision') {
    const isDecisionOnly = query.type === 'decision'

    const nodeRows = await db.execute(sql`
      SELECT
        id,
        entity_type                                  AS "entityType",
        source,
        title,
        summary,
        source_url                                   AS "sourceUrl",
        occurred_at                                  AS "occurredAt",
        is_decision                                  AS "isDecision",
        decision_confidence                          AS "decisionConfidence",
        ts_rank_cd(
          setweight(to_tsvector('english', coalesce(title,   '')), 'A') ||
          setweight(to_tsvector('english', coalesce(summary, '')), 'B'),
          websearch_to_tsquery('english', ${safeQ}),
          32  /* normalization: divide by log(1 + doc_length) */
        ) AS rank
      FROM context_nodes
      WHERE tenant_id = ${tenantId}::uuid
        AND (
          setweight(to_tsvector('english', coalesce(title,   '')), 'A') ||
          setweight(to_tsvector('english', coalesce(summary, '')), 'B')
        ) @@ websearch_to_tsquery('english', ${safeQ})
        ${isDecisionOnly ? sql`AND is_decision = true` : sql``}
        ${query.source    ? sql`AND source = ${query.source}` : sql``}
        ${query.from      ? sql`AND occurred_at >= ${query.from}::timestamptz` : sql``}
        ${query.to        ? sql`AND occurred_at <= ${query.to}::timestamptz`   : sql``}
      ORDER BY rank DESC
      LIMIT ${limit + 1}
    `)

    for (const row of nodeRows as unknown as Array<{
      id: string; entityType: string; source: string
      title: string; summary: string; sourceUrl: string | null
      occurredAt: Date; isDecision: boolean
      decisionConfidence: number | null; rank: number
    }>) {
      const result: SearchResult = {
        id:         row.id,
        type:       row.isDecision ? 'decision' : 'event',
        title:      row.title,
        summary:    row.summary,
        source:     row.source,
        sourceUrl:  row.sourceUrl,
        occurredAt: row.occurredAt,
        createdAt:  row.occurredAt,
        rank:       row.rank,
      }
      if (row.decisionConfidence !== null) result.confidence = row.decisionConfidence
      results.push(result)
    }
  }

  // ── WHY query history ─────────────────────────────────────────────────────
  if (query.type === 'all' || query.type === 'query') {
    const queryRows = await db.execute(sql`
      SELECT
        id,
        question,
        answer,
        confidence,
        created_at AS "createdAt",
        ts_rank_cd(
          to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, '')),
          websearch_to_tsquery('english', ${safeQ}),
          32
        ) AS rank
      FROM why_queries
      WHERE tenant_id = ${tenantId}::uuid
        AND to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, ''))
            @@ websearch_to_tsquery('english', ${safeQ})
        ${query.from ? sql`AND created_at >= ${query.from}::timestamptz` : sql``}
        ${query.to   ? sql`AND created_at <= ${query.to}::timestamptz`   : sql``}
      ORDER BY rank DESC
      LIMIT ${limit + 1}
    `)

    for (const row of queryRows as unknown as Array<{
      id: string; question: string; answer: string | null
      confidence: number | null; createdAt: Date; rank: number
    }>) {
      const result: SearchResult = {
        id:        row.id,
        type:      'query',
        title:     row.question,
        summary:   row.answer?.slice(0, 200) ?? 'No answer generated',
        createdAt: row.createdAt,
        rank:      row.rank,
      }
      if (row.confidence !== null) result.confidence = row.confidence
      results.push(result)
    }
  }

  // Merge, re-rank, paginate
  const sorted   = results.sort((a, b) => b.rank - a.rank).slice(0, limit + 1)
  const hasMore  = sorted.length > limit
  const page     = hasMore ? sorted.slice(0, limit) : sorted
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  return { results: page, hasMore, nextCursor }
}
