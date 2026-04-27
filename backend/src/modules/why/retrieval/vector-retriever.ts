import { sql } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { generateEmbedding } from '@/modules/processing/processors/embedding-generator.js'
import type { FastifyBaseLogger } from 'fastify'
import type { SourceNodeSummary } from '../why.types.js'

const TOP_K         = 20    // Candidate nodes from vector search
const MIN_SIMILARITY = 0.55  // Below this, the node is not relevant

export async function vectorSearch(
  question:  string,
  tenantId:  string,
  logger:    FastifyBaseLogger
): Promise<SourceNodeSummary[]> {
  // Generate embedding for the question
  const embedding = await generateEmbedding(question, logger)

  if (!embedding) {
    logger.warn({ tenantId }, 'No embedding generated for question — vector search skipped')
    return []
  }

  // pgvector cosine distance search
  // <=> = cosine distance, so 1 - distance = similarity
  // We filter by tenant via JOIN on context_nodes
  const embeddingStr = `[${embedding.join(',')}]`

  const rows = await db.execute(sql`
    SELECT
      cn.id,
      cn.entity_type    AS "entityType",
      cn.source,
      cn.title,
      cn.summary,
      cn.source_url     AS "sourceUrl",
      cn.occurred_at    AS "occurredAt",
      cn.is_decision    AS "isDecision",
      ROUND((1 - (ne.embedding <=> ${embeddingStr}::vector))::numeric, 4)::float AS similarity
    FROM node_embeddings ne
    JOIN context_nodes cn ON cn.id = ne.node_id
    WHERE cn.tenant_id = ${tenantId}::uuid
    ORDER BY ne.embedding <=> ${embeddingStr}::vector
    LIMIT ${TOP_K}
  `)

  const results = (rows as unknown as Array<{
    id:         string
    entityType: string
    source:     string
    title:      string
    summary:    string
    sourceUrl:  string | null
    occurredAt: Date
    isDecision: boolean
    similarity: number
  }>).filter(r => r.similarity >= MIN_SIMILARITY)

  logger.debug(
    { tenantId, questionLen: question.length, resultCount: results.length },
    'Vector search complete'
  )

  return results.map(r => ({
    id:          r.id,
    entityType:  r.entityType,
    source:      r.source,
    title:       r.title,
    summary:     r.summary,
    sourceUrl:   r.sourceUrl,
    occurredAt:  r.occurredAt,
    isDecision:  r.isDecision,
    similarity:  r.similarity,
  }))
}
