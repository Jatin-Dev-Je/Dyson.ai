import { eq, and, gte, lte, desc, gt, inArray } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { contextNodes, causalEdges } from '@/infra/db/schema/index.js'
import { CONFIDENCE_THRESHOLD } from '@/config/constants.js'

export type DecisionFilters = {
  source?:    string
  team?:      string
  from?:      Date
  to?:        Date
  minConfidence?: number
  cursor?:    string
  limit:      number
}

// ─── List decisions ───────────────────────────────────────────────────────

export async function listDecisions(tenantId: string, filters: DecisionFilters) {
  const conditions = [
    eq(contextNodes.tenantId, tenantId),
    eq(contextNodes.isDecision, true),
    gte(contextNodes.decisionConfidence, filters.minConfidence ?? CONFIDENCE_THRESHOLD),
  ]

  if (filters.source) conditions.push(eq(contextNodes.source, filters.source))
  if (filters.from)   conditions.push(gte(contextNodes.occurredAt, filters.from))
  if (filters.to)     conditions.push(lte(contextNodes.occurredAt, filters.to))
  if (filters.cursor) conditions.push(gt(contextNodes.id, filters.cursor))

  const rows = await db
    .select()
    .from(contextNodes)
    .where(and(...conditions))
    .orderBy(desc(contextNodes.occurredAt))
    .limit(filters.limit + 1)

  const hasMore = rows.length > filters.limit
  return {
    decisions:  hasMore ? rows.slice(0, filters.limit) : rows,
    nextCursor: hasMore ? (rows[filters.limit - 1]?.id ?? null) : null,
    hasMore,
  }
}

// ─── Get decision with full causal timeline ───────────────────────────────

export async function getDecisionWithTimeline(id: string, tenantId: string) {
  // Step 1: Get the decision node itself
  const [decision] = await db
    .select()
    .from(contextNodes)
    .where(and(
      eq(contextNodes.id, id),
      eq(contextNodes.tenantId, tenantId),
      eq(contextNodes.isDecision, true),
    ))
    .limit(1)

  if (!decision) return null

  // Step 2: Get all edges connected to this decision
  const edges = await db
    .select()
    .from(causalEdges)
    .where(and(
      eq(causalEdges.tenantId, tenantId),
      eq(causalEdges.sourceNodeId, id),
      gte(causalEdges.confidence, CONFIDENCE_THRESHOLD),
    ))
    .orderBy(desc(causalEdges.confidence))

  // Step 3: Get all nodes referenced by those edges
  const connectedIds = [...new Set(edges.map(e => e.targetNodeId))]

  const connectedNodes = connectedIds.length > 0
    ? await db
        .select()
        .from(contextNodes)
        .where(and(
          eq(contextNodes.tenantId, tenantId),
          inArray(contextNodes.id, connectedIds),
        ))
        .orderBy(desc(contextNodes.occurredAt))
    : []

  // Step 4: Build chronological timeline
  // Include the decision itself + all connected nodes, sorted by occurredAt
  const allNodes = [decision, ...connectedNodes]
  const timeline = allNodes.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  )

  return { decision, timeline, edges }
}

// ─── Flag an edge ─────────────────────────────────────────────────────────

export async function flagDecisionEdge(edgeId: string, tenantId: string, flaggedBy: string) {
  const [updated] = await db
    .update(causalEdges)
    .set({ isFlagged: true, flaggedAt: new Date(), flaggedBy })
    .where(and(eq(causalEdges.id, edgeId), eq(causalEdges.tenantId, tenantId)))
    .returning()
  return updated ?? null
}
