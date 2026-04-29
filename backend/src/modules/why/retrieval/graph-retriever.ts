import { eq, and, or, inArray, gte } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { contextNodes, causalEdges } from '@/infra/db/schema/index.js'
import { CONFIDENCE_THRESHOLD } from '@/config/constants.js'
import type { SourceNodeSummary } from '../why.types.js'

// Expand seed nodes by one hop through the causal graph
// Returns additional context nodes not found by vector search
export async function graphExpand(
  seedIds:   string[],
  tenantId:  string,
  existing:  Set<string>  // Already-found node IDs to avoid duplicates
): Promise<SourceNodeSummary[]> {
  if (seedIds.length === 0) return []

  // Find edges connected to seed nodes (both directions)
  const edges = await db
    .select({
      sourceNodeId: causalEdges.sourceNodeId,
      targetNodeId: causalEdges.targetNodeId,
      confidence:   causalEdges.confidence,
    })
    .from(causalEdges)
    .where(and(
      eq(causalEdges.tenantId, tenantId),
      or(
        inArray(causalEdges.sourceNodeId, seedIds),
        inArray(causalEdges.targetNodeId, seedIds),
      ),
      gte(causalEdges.confidence, CONFIDENCE_THRESHOLD),
    ))

  // Collect IDs of connected nodes not already in our set
  const connectedIds = [
    ...new Set(
      edges
        .flatMap(e => [e.sourceNodeId, e.targetNodeId])
        .filter(id => !existing.has(id))
    )
  ]

  if (connectedIds.length === 0) return []

  const nodes = await db
    .select({
      id:          contextNodes.id,
      entityType:  contextNodes.entityType,
      source:      contextNodes.source,
      title:       contextNodes.title,
      summary:     contextNodes.summary,
      sourceUrl:   contextNodes.sourceUrl,
      metadata:    contextNodes.metadata,
      occurredAt:  contextNodes.occurredAt,
      isDecision:  contextNodes.isDecision,
    })
    .from(contextNodes)
    .where(and(
      eq(contextNodes.tenantId, tenantId),
      inArray(contextNodes.id, connectedIds),
    ))

  // Graph-expanded nodes get a base similarity of 0.60
  // (lower than direct vector matches, but above noise floor)
  return nodes.map(n => ({
    ...n,
    metadata: n.metadata as Record<string, unknown> | null ?? {},
    similarity: 0.60,
    retrieval: 'graph' as const,
  }))
}
