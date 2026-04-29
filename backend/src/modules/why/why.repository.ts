import { eq, and, desc, gt } from 'drizzle-orm'
import { createHash } from 'crypto'
import { db } from '@/infra/db/client.js'
import { whyQueries } from '@/infra/db/schema/index.js'
import { DysonError } from '@/shared/errors.js'
import type { WhyEngineResult } from './why.types.js'

export function hashQuestion(question: string): string {
  return createHash('sha256').update(question.toLowerCase().trim()).digest('hex')
}

export async function saveQuery(opts: {
  tenantId:    string
  userId:      string
  question:    string
  result:      WhyEngineResult
  model:       string
  latencyMs:   number
}) {
  const [row] = await db
    .insert(whyQueries)
    .values({
      tenantId:      opts.tenantId,
      userId:        opts.userId,
      question:      opts.question,
      questionHash:  hashQuestion(opts.question),
      answer:        opts.result.answer,
      citations:     opts.result.citations as unknown as typeof whyQueries.$inferInsert['citations'],
      sourceNodes:   opts.result.sourceNodes as unknown as typeof whyQueries.$inferInsert['sourceNodes'],
      confidence:    opts.result.confidence,
      cannotAnswer:  opts.result.cannotAnswer,
      model:         opts.model,
      latencyMs:     opts.latencyMs,
    })
    .returning()
  if (!row) {
    throw new DysonError('QUERY_SAVE_FAILED', 'Failed to save WHY query')
  }
  return row
}

export async function listQueryHistory(tenantId: string, userId: string, opts: {
  cursor?: string
  limit:   number
}) {
  const conditions = [
    eq(whyQueries.tenantId, tenantId),
    eq(whyQueries.userId, userId),
  ]
  if (opts.cursor) conditions.push(gt(whyQueries.id, opts.cursor))

  const rows = await db
    .select()
    .from(whyQueries)
    .where(and(...conditions))
    .orderBy(desc(whyQueries.createdAt))
    .limit(opts.limit + 1)

  const hasMore = rows.length > opts.limit
  return {
    queries:    hasMore ? rows.slice(0, opts.limit) : rows,
    nextCursor: hasMore ? (rows[opts.limit - 1]?.id ?? null) : null,
    hasMore,
  }
}

export async function getQueryById(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(whyQueries)
    .where(and(eq(whyQueries.id, id), eq(whyQueries.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}

export async function updateFeedback(id: string, tenantId: string, score: 1 | -1) {
  const [updated] = await db
    .update(whyQueries)
    .set({ feedbackScore: score })
    .where(and(eq(whyQueries.id, id), eq(whyQueries.tenantId, tenantId)))
    .returning()
  return updated ?? null
}
