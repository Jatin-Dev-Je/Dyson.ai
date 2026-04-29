import { eq, and } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { contextNodes, causalEdges, nodeEmbeddings } from '@/infra/db/schema/index.js'
import { RelationshipType } from '@/shared/types/entities.js'

// ─── Context nodes ────────────────────────────────────────────────────────

type InsertNode = {
  tenantId:           string
  rawEventId:         string | null
  entityType:         string
  source:             string
  externalId:         string
  title:              string
  summary:            string
  sourceUrl:          string | null
  metadata:           Record<string, unknown>
  isDecision:         boolean
  decisionConfidence: number | null
  decisionSignals:    string[] | null
  occurredAt:         Date
}

export async function upsertContextNode(node: InsertNode) {
  const [row] = await db
    .insert(contextNodes)
    .values(node)
    .onConflictDoUpdate({
      // If same external artifact re-ingested, update its content + decision state
      target: [contextNodes.tenantId, contextNodes.externalId, contextNodes.source],
      set: {
        title:              node.title,
        summary:            node.summary,
        isDecision:         node.isDecision,
        decisionConfidence: node.decisionConfidence,
        decisionSignals:    node.decisionSignals,
      },
    })
    .returning()
  if (!row) throw new Error('upsertContextNode returned no row — constraint violation')
  return row
}

export async function findNodeByExternalId(tenantId: string, externalId: string, source: string) {
  const [row] = await db
    .select()
    .from(contextNodes)
    .where(and(
      eq(contextNodes.tenantId, tenantId),
      eq(contextNodes.externalId, externalId),
      eq(contextNodes.source, source),
    ))
    .limit(1)
  return row ?? null
}

export async function findNodeById(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(contextNodes)
    .where(and(eq(contextNodes.id, id), eq(contextNodes.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}

// ─── Embeddings ───────────────────────────────────────────────────────────

export async function upsertNodeEmbedding(opts: {
  tenantId:  string
  nodeId:    string
  embedding: number[]
  model:     string
}) {
  await db
    .insert(nodeEmbeddings)
    .values(opts)
    .onConflictDoUpdate({
      target: [nodeEmbeddings.nodeId],
      set: { embedding: opts.embedding, model: opts.model },
    })
}

// ─── Edges ────────────────────────────────────────────────────────────────

export async function upsertEdge(edge: {
  tenantId:         string
  sourceNodeId:     string
  targetNodeId:     string
  relationshipType: RelationshipType
  confidence:       number
  metadata:         Record<string, unknown>
}) {
  await db
    .insert(causalEdges)
    .values(edge)
    .onConflictDoNothing()  // uniqueEdgeIdx prevents duplicate edges
}

export async function getNodeEdges(nodeId: string, tenantId: string) {
  return db
    .select()
    .from(causalEdges)
    .where(and(
      eq(causalEdges.tenantId, tenantId),
      eq(causalEdges.sourceNodeId, nodeId),
    ))
}

export async function flagEdge(id: string, tenantId: string, flaggedBy: string) {
  await db
    .update(causalEdges)
    .set({ isFlagged: true, flaggedAt: new Date(), flaggedBy })
    .where(and(eq(causalEdges.id, id), eq(causalEdges.tenantId, tenantId)))
}
