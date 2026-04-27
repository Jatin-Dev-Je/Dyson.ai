import { eq, and, gte, lte, asc, desc, inArray, or, gt } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { contextNodes, causalEdges } from '@/infra/db/schema/index.js'
import { CONFIDENCE_THRESHOLD } from '@/config/constants.js'

// ─── Nodes ────────────────────────────────────────────────────────────────

export type NodeFilters = {
  entityType?: string
  source?:     string
  isDecision?: boolean
  from?:       Date
  to?:         Date
  cursor?:     string
  limit:       number
}

export async function listNodes(tenantId: string, filters: NodeFilters) {
  const conditions = [eq(contextNodes.tenantId, tenantId)]

  if (filters.entityType) conditions.push(eq(contextNodes.entityType, filters.entityType))
  if (filters.source)     conditions.push(eq(contextNodes.source, filters.source))
  if (filters.isDecision !== undefined) conditions.push(eq(contextNodes.isDecision, filters.isDecision))
  if (filters.from)       conditions.push(gte(contextNodes.occurredAt, filters.from))
  if (filters.to)         conditions.push(lte(contextNodes.occurredAt, filters.to))
  if (filters.cursor)     conditions.push(gt(contextNodes.id, filters.cursor))

  const rows = await db
    .select()
    .from(contextNodes)
    .where(and(...conditions))
    .orderBy(desc(contextNodes.occurredAt))
    .limit(filters.limit + 1)

  const hasMore = rows.length > filters.limit
  return {
    nodes:      hasMore ? rows.slice(0, filters.limit) : rows,
    nextCursor: hasMore ? (rows[filters.limit - 1]?.id ?? null) : null,
    hasMore,
  }
}

export async function getNodeById(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(contextNodes)
    .where(and(eq(contextNodes.id, id), eq(contextNodes.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}

// Get node timeline: all nodes within a date window, sorted chronologically
export async function getTimeline(tenantId: string, opts: {
  from:   Date
  to:     Date
  source?: string
  limit:  number
}) {
  const conditions = [
    eq(contextNodes.tenantId, tenantId),
    gte(contextNodes.occurredAt, opts.from),
    lte(contextNodes.occurredAt, opts.to),
  ]
  if (opts.source) conditions.push(eq(contextNodes.source, opts.source))

  return db
    .select()
    .from(contextNodes)
    .where(and(...conditions))
    .orderBy(asc(contextNodes.occurredAt))
    .limit(opts.limit)
}

// ─── Edges ────────────────────────────────────────────────────────────────

export async function getEdgesForNode(nodeId: string, tenantId: string) {
  // Fetch both outgoing and incoming edges, only above confidence threshold
  return db
    .select()
    .from(causalEdges)
    .where(and(
      eq(causalEdges.tenantId, tenantId),
      or(
        eq(causalEdges.sourceNodeId, nodeId),
        eq(causalEdges.targetNodeId, nodeId),
      ),
      gte(causalEdges.confidence, CONFIDENCE_THRESHOLD),
    ))
    .orderBy(desc(causalEdges.confidence))
}

// Fetch all nodes connected to a given node (one hop)
export async function getConnectedNodes(nodeId: string, tenantId: string) {
  const edges = await getEdgesForNode(nodeId, tenantId)

  const connectedIds = [
    ...new Set(
      edges.flatMap(e => [e.sourceNodeId, e.targetNodeId]).filter(id => id !== nodeId)
    )
  ]

  if (connectedIds.length === 0) return { edges, nodes: [] }

  const nodes = await db
    .select()
    .from(contextNodes)
    .where(and(
      eq(contextNodes.tenantId, tenantId),
      inArray(contextNodes.id, connectedIds),
    ))

  return { edges, nodes }
}

export async function flagEdge(id: string, tenantId: string, flaggedBy: string) {
  const [updated] = await db
    .update(causalEdges)
    .set({ isFlagged: true, flaggedAt: new Date(), flaggedBy })
    .where(and(eq(causalEdges.id, id), eq(causalEdges.tenantId, tenantId)))
    .returning()
  return updated ?? null
}
