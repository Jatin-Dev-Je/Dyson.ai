import type { FastifyBaseLogger } from 'fastify'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { contextNodes, whyQueries } from '@/infra/db/schema/index.js'
import { recall }                        from '@/modules/why/why.service.js'
import { search }                        from '@/modules/search/search.service.js'
import { getDecisions }                  from '@/modules/decisions/decisions.service.js'
import { createMemory }                  from '@/modules/memory/memory.service.js'
import { NotFoundError }                 from '@/shared/errors.js'
import type { DysonMcpHandlers }         from './server.js'

/**
 * MCP handlers for the in-process server (Streamable HTTP transport).
 * Each call has a resolved tenantId from the API key on the connecting agent.
 * userId is set to 'agent' so audit rows are attributable to API-key callers.
 */
export function createDirectHandlers(
  tenantId: string,
  logger:   FastifyBaseLogger
): DysonMcpHandlers {
  return {

    async recall({ question }) {
      const r = await recall(question, tenantId, 'agent', logger)
      return {
        queryId:      r.queryId,
        question:     r.question,
        answer:       r.answer,
        confidence:   r.confidence,
        cannotAnswer: r.cannotAnswer,
        citations:    r.citations.map(c => ({
          claim:        c.claim,
          sourceNodeId: c.sourceNodeId,
          sourceUrl:    c.sourceUrl ?? null,
          confidence:   c.confidence,
        })),
        sourceNodes: r.sourceNodes.map(n => ({
          id:        n.id,
          title:     n.title,
          source:    n.source,
          sourceUrl: n.sourceUrl ?? null,
          ...(n.occurredAt && { occurredAt: new Date(n.occurredAt).toISOString() }),
        })),
      }
    },

    async remember(input) {
      const memory = await createMemory(tenantId, 'agent', {
        title:   input.title,
        content: input.content,
        type:    (input.type ?? 'context') as 'decision' | 'incident' | 'standard' | 'context' | 'constraint' | 'outcome',
        source:  'agent',
        ...(input.url      && { url:      input.url }),
        ...(input.metadata && { metadata: input.metadata }),
      })
      return { id: memory.id, saved: true }
    },

    async searchMemory({ query, type, limit }) {
      const r = await search(tenantId, {
        q:     query,
        type:  (type as 'all' | 'decision' | 'event' | 'query' | undefined) ?? 'all',
        limit: limit ?? 20,
      })
      return {
        results: r.results.map(res => ({
          id:      res.id,
          type:    res.type,
          title:   res.title,
          summary: res.summary,
          ...(res.source                   && { source:     res.source }),
          ...(res.sourceUrl !== undefined  && { sourceUrl:  res.sourceUrl }),
          ...(res.confidence !== undefined && { confidence: res.confidence }),
        })),
      }
    },

    async recentMemories({ limit, type, minConfidence }) {
      if (type === 'decision' || !type) {
        const r = await getDecisions(tenantId, {
          limit:         limit ?? 10,
          minConfidence: minConfidence ?? 0.0,
        })
        return {
          memories: r.decisions.map(d => ({
            id:        d.id,
            title:     d.title,
            type:      'decision',
            source:    d.source,
            sourceUrl: d.sourceUrl ?? null,
            ...(d.occurredAt && { occurredAt: new Date(d.occurredAt).toISOString() }),
            ...(d.decisionConfidence !== null && d.decisionConfidence !== undefined && { confidence: d.decisionConfidence }),
          })),
        }
      }

      // For non-decision types, query context_nodes directly
      const rows = await db
        .select({
          id:         contextNodes.id,
          title:      contextNodes.title,
          entityType: contextNodes.entityType,
          source:     contextNodes.source,
          sourceUrl:  contextNodes.sourceUrl,
          occurredAt: contextNodes.occurredAt,
        })
        .from(contextNodes)
        .where(
          and(
            eq(contextNodes.tenantId, tenantId),
            ...(type ? [eq(contextNodes.entityType, type)] : []),
          )
        )
        .orderBy(desc(contextNodes.occurredAt))
        .limit(limit ?? 10)

      return {
        memories: rows.map(r => ({
          id:        r.id,
          title:     r.title,
          type:      r.entityType,
          source:    r.source,
          sourceUrl: r.sourceUrl ?? null,
          ...(r.occurredAt && { occurredAt: new Date(r.occurredAt).toISOString() }),
        })),
      }
    },

    async getMemory({ id }) {
      const [row] = await db
        .select()
        .from(contextNodes)
        .where(and(eq(contextNodes.id, id), eq(contextNodes.tenantId, tenantId)))
        .limit(1)
      if (!row) throw new NotFoundError('Memory')
      return {
        id:        row.id,
        title:     row.title,
        content:   row.summary,
        type:      row.entityType,
        source:    row.source,
        sourceUrl: row.sourceUrl ?? null,
        ...(row.occurredAt && { occurredAt: new Date(row.occurredAt).toISOString() }),
      }
    },

    async workspaceContext() {
      const [memories, recalls, statsRow] = await Promise.all([
        getDecisions(tenantId, { limit: 5, minConfidence: 0.0 }),
        db
          .select({ id: whyQueries.id, question: whyQueries.question })
          .from(whyQueries)
          .where(eq(whyQueries.tenantId, tenantId))
          .orderBy(desc(whyQueries.createdAt))
          .limit(5),
        db.execute(sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_decision = true)::int AS decisions,
            COUNT(*) FILTER (WHERE entity_type = 'incident')::int AS incidents
          FROM context_nodes WHERE tenant_id = ${tenantId}::uuid
        `),
      ])

      const stats = (statsRow[0] as { total: number; decisions: number; incidents: number } | undefined)

      return {
        recentMemories: memories.decisions.map(d => ({
          id:     d.id,
          title:  d.title,
          type:   'decision',
          source: d.source,
          ...(d.decisionConfidence !== null && d.decisionConfidence !== undefined && { confidence: d.decisionConfidence }),
          ...(d.occurredAt && { occurredAt: new Date(d.occurredAt).toISOString() }),
        })),
        recentRecalls: recalls.map(q => ({ id: q.id, question: q.question })),
        stats: {
          totalMemories:  stats?.total    ?? 0,
          decisionsCount: stats?.decisions ?? 0,
          incidentsCount: stats?.incidents ?? 0,
        },
        note: 'Use recall() to ask anything. Use remember() to write new memories. All answers are cited.',
      }
    },
  }
}
