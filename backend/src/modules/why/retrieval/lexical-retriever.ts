import { sql } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import type { SourceNodeSummary } from '../why.types.js'

const TOP_K = 20

export async function lexicalSearch(
  question: string,
  tenantId: string
): Promise<SourceNodeSummary[]> {
  const rows = await db.execute(sql`
    SELECT
      id,
      entity_type AS "entityType",
      source,
      title,
      summary,
      source_url AS "sourceUrl",
      metadata,
      occurred_at AS "occurredAt",
      is_decision AS "isDecision",
      ts_rank_cd(
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')),
        websearch_to_tsquery('english', ${question})
      ) AS rank
    FROM context_nodes
    WHERE tenant_id = ${tenantId}::uuid
      AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
        @@ websearch_to_tsquery('english', ${question})
    ORDER BY rank DESC, occurred_at DESC
    LIMIT ${TOP_K}
  `)

  const typedRows = rows as unknown as Array<{
    id: string
    entityType: string
    source: string
    title: string
    summary: string
    sourceUrl: string | null
    metadata: Record<string, unknown> | null
    occurredAt: Date
    isDecision: boolean
    rank: number
  }>

  const maxRank = Math.max(...typedRows.map(row => row.rank), 0)

  return typedRows.map(row => ({
    id: row.id,
    entityType: row.entityType,
    source: row.source,
    title: row.title,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    metadata: row.metadata ?? {},
    occurredAt: row.occurredAt,
    isDecision: row.isDecision,
    similarity: maxRank > 0 ? Math.min(0.85, 0.55 + (row.rank / maxRank) * 0.30) : 0.55,
    retrieval: 'lexical',
  }))
}
