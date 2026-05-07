import { sql, eq, and, desc, gt } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { contextNodes, causalEdges, nodeEmbeddings } from '@/infra/db/schema/index.js'
import { createId } from '@paralleldrive/cuid2'
import { generateEmbedding } from '@/modules/processing/processors/embedding-generator.js'

// Lightweight console logger for use outside request handlers
const log = {
  debug: (_msg: string) => {},
  info:  (_msg: string) => {},
  warn:  (msg: string) => console.warn('[memory]', msg),
  error: (obj: unknown, msg?: string) => console.error('[memory]', msg ?? '', obj),
  child: () => log,
  fatal: (_msg: string) => {},
  trace: (_msg: string) => {},
  level: 'info',
  silent: () => {},
} as unknown as import('fastify').FastifyBaseLogger
import { NotFoundError } from '@/shared/errors.js'
import type { CreateMemoryInput, ListMemoriesQuery } from './memory.types.js'

// ─── Create ───────────────────────────────────────────────────────────────

export async function createMemory(
  tenantId:   string,
  actorId:    string,
  input:      CreateMemoryInput,
) {
  const source     = input.source ?? (actorId === 'agent' ? 'agent' : 'manual')
  const externalId = `memory:${actorId}:${createId()}`
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()

  // Write directly to context_nodes — the same table all auto-ingested events live in.
  // This means manually written memories are immediately searchable and retrievable
  // by the WHY Engine, semantic search, and all MCP tools.
  const [node] = await db.insert(contextNodes).values({
    tenantId,
    entityType:         input.type,
    source,
    externalId,
    title:              input.title,
    summary:            input.content,
    sourceUrl:          input.url ?? null,
    metadata:           {
      ...input.metadata,
      createdBy:  actorId,
      memoryType: input.type,
      isManual:   true,
    },
    isDecision:         input.type === 'decision',
    decisionConfidence: input.type === 'decision' ? 0.95 : null,
    occurredAt,
  }).returning()

  if (!node) throw new Error('Failed to create memory')

  // Generate and store embedding so this memory is immediately semantically searchable
  const embeddingText = `${input.title}\n\n${input.content}`
  const vector = await generateEmbedding(embeddingText, log).catch(() => null)

  if (vector) {
    await db.insert(nodeEmbeddings).values({
      tenantId,
      nodeId:    node.id,
      embedding: vector,
    }).onConflictDoUpdate({
      target: nodeEmbeddings.nodeId,
      set:    { embedding: vector },
    }).catch(() => null) // non-blocking — memory is still useful without embedding
  }

  // If caller wants to link this to an existing memory, create a causal edge
  if (input.linkedTo) {
    const [target] = await db
      .select({ id: contextNodes.id })
      .from(contextNodes)
      .where(and(eq(contextNodes.id, input.linkedTo), eq(contextNodes.tenantId, tenantId)))
      .limit(1)

    if (target) {
      await db.insert(causalEdges).values({
        tenantId,
        sourceNodeId:     node.id,
        targetNodeId:     target.id,
        relationshipType: 'related',
        confidence:       0.9,
      }).onConflictDoNothing()
    }
  }

  return {
    id:         node.id,
    type:       input.type,
    title:      node.title,
    content:    node.summary,
    source,
    url:        node.sourceUrl,
    occurredAt: node.occurredAt,
    createdAt:  node.createdAt,
  }
}

// ─── List / search ────────────────────────────────────────────────────────

export async function listMemories(tenantId: string, query: ListMemoriesQuery) {
  const limit = query.limit + 1

  let rows: Array<{
    id: string; entityType: string; source: string
    title: string; summary: string; sourceUrl: string | null
    isDecision: boolean; occurredAt: Date; createdAt: Date
  }>

  if (query.q) {
    // Full-text search
    rows = await db.execute(sql`
      SELECT
        id, entity_type AS "entityType", source,
        title, summary, source_url AS "sourceUrl",
        is_decision AS "isDecision", occurred_at AS "occurredAt", created_at AS "createdAt"
      FROM context_nodes
      WHERE tenant_id = ${tenantId}::uuid
        ${query.type ? sql`AND entity_type = ${query.type}` : sql``}
        ${query.cursor ? sql`AND id > ${query.cursor}` : sql``}
        AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,''))
            @@ plainto_tsquery('english', ${query.q})
      ORDER BY occurred_at DESC
      LIMIT ${limit}
    `) as unknown as typeof rows
  } else {
    rows = await db
      .select({
        id:         contextNodes.id,
        entityType: contextNodes.entityType,
        source:     contextNodes.source,
        title:      contextNodes.title,
        summary:    contextNodes.summary,
        sourceUrl:  contextNodes.sourceUrl,
        isDecision: contextNodes.isDecision,
        occurredAt: contextNodes.occurredAt,
        createdAt:  contextNodes.createdAt,
      })
      .from(contextNodes)
      .where(
        and(
          eq(contextNodes.tenantId, tenantId),
          ...(query.type ? [eq(contextNodes.entityType, query.type)] : []),
          ...(query.cursor ? [gt(contextNodes.occurredAt, new Date(query.cursor))] : []),
        )
      )
      .orderBy(desc(contextNodes.occurredAt))
      .limit(limit) as typeof rows
  }

  const hasMore = rows.length > query.limit
  const items   = hasMore ? rows.slice(0, query.limit) : rows

  // Get total count for the tenant
  const [countRow] = await db.execute(sql`
    SELECT COUNT(*)::int AS total FROM context_nodes WHERE tenant_id = ${tenantId}::uuid
  `) as unknown as [{ total: number }]

  return {
    items: items.map(r => ({
      id:         r.id,
      type:       r.entityType,
      source:     r.source,
      title:      r.title,
      summary:    r.summary,
      url:        r.sourceUrl,
      isDecision: r.isDecision,
      occurredAt: r.occurredAt,
      createdAt:  r.createdAt,
    })),
    hasMore,
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    total:      countRow?.total ?? 0,
  }
}

// ─── Get single ───────────────────────────────────────────────────────────

export async function getMemory(id: string, tenantId: string) {
  const [node] = await db
    .select()
    .from(contextNodes)
    .where(and(eq(contextNodes.id, id), eq(contextNodes.tenantId, tenantId)))
    .limit(1)

  if (!node) throw new NotFoundError('Memory')

  // Fetch linked memories (both directions)
  const edges = await db
    .select({
      id:               causalEdges.id,
      sourceNodeId:     causalEdges.sourceNodeId,
      targetNodeId:     causalEdges.targetNodeId,
      relationshipType: causalEdges.relationshipType,
      confidence:       causalEdges.confidence,
    })
    .from(causalEdges)
    .where(
      and(
        eq(causalEdges.tenantId, tenantId),
        sql`(${causalEdges.sourceNodeId} = ${id}::uuid OR ${causalEdges.targetNodeId} = ${id}::uuid)`,
      )
    )
    .limit(20)

  return {
    id:         node.id,
    type:       node.entityType,
    source:     node.source,
    title:      node.title,
    content:    node.summary,
    url:        node.sourceUrl,
    metadata:   node.metadata,
    isDecision: node.isDecision,
    occurredAt: node.occurredAt,
    createdAt:  node.createdAt,
    links:      edges,
  }
}

// ─── Link ─────────────────────────────────────────────────────────────────

export async function linkMemories(
  sourceId:         string,
  targetId:         string,
  tenantId:         string,
  relationshipType: string,
) {
  // Verify both nodes belong to this tenant
  const [source] = await db
    .select({ id: contextNodes.id })
    .from(contextNodes)
    .where(and(eq(contextNodes.id, sourceId), eq(contextNodes.tenantId, tenantId)))
    .limit(1)

  const [target] = await db
    .select({ id: contextNodes.id })
    .from(contextNodes)
    .where(and(eq(contextNodes.id, targetId), eq(contextNodes.tenantId, tenantId)))
    .limit(1)

  if (!source) throw new NotFoundError('Source memory')
  if (!target) throw new NotFoundError('Target memory')

  await db.insert(causalEdges).values({
    tenantId,
    sourceNodeId:     sourceId,
    targetNodeId:     targetId,
    relationshipType,
    confidence:       0.9,
  }).onConflictDoNothing()
}
