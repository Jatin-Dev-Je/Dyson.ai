import type { FastifyBaseLogger } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { contextNodes } from '@/infra/db/schema/index.js'
import { askWhy }                 from '@/modules/why/why.service.js'
import { search }                 from '@/modules/search/search.service.js'
import { getDecisions, getDecision } from '@/modules/decisions/decisions.service.js'
import { NotFoundError }          from '@/shared/errors.js'
import type { DysonMcpHandlers }  from './server.js'

/**
 * MCP handlers for the in-process server. Each call must already have a
 * resolved tenantId (typically from the API key on the connecting agent).
 *
 * userId is set to a synthetic 'agent' marker so audit / WHY-history rows
 * are attributable to API-key callers without a real user identity.
 */
export function createDirectHandlers(
  tenantId: string,
  logger:   FastifyBaseLogger
): DysonMcpHandlers {
  const userId = 'agent'

  return {
    async askWhy({ question }) {
      const r = await askWhy(question, tenantId, userId, logger)
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
        sourceNodes:  r.sourceNodes.map(n => ({
          id:         n.id,
          title:      n.title,
          source:     n.source,
          sourceUrl:  n.sourceUrl ?? null,
          ...(n.occurredAt && { occurredAt: new Date(n.occurredAt).toISOString() }),
        })),
      }
    },

    async searchContext({ query, type, limit }) {
      const r = await search(tenantId, {
        q:     query,
        type:  type ?? 'all',
        limit: limit ?? 20,
      })
      return {
        results: r.results.map(res => ({
          id:        res.id,
          type:      res.type,
          title:     res.title,
          summary:   res.summary,
          ...(res.source     && { source:     res.source }),
          ...(res.sourceUrl !== undefined && { sourceUrl:  res.sourceUrl }),
          ...(res.confidence !== undefined && { confidence: res.confidence }),
        })),
      }
    },

    async recentDecisions({ limit, minConfidence }) {
      const r = await getDecisions(tenantId, {
        limit:         limit ?? 10,
        minConfidence: minConfidence ?? 0.60,
      })
      return {
        decisions: r.decisions.map(d => ({
          id:        d.id,
          title:     d.title,
          summary:   d.summary,
          source:    d.source,
          sourceUrl: d.sourceUrl ?? null,
          ...(d.occurredAt && { occurredAt: new Date(d.occurredAt).toISOString() }),
          ...(d.decisionConfidence !== undefined && d.decisionConfidence !== null && { decisionConfidence: d.decisionConfidence }),
        })),
      }
    },

    async getDecision({ id }) {
      const r = await getDecision(id, tenantId)
      // getDecision returns { decision, timeline, edges }
      const d = r.decision
      return {
        id:        d.id,
        title:     d.title,
        summary:   d.summary,
        sourceUrl: d.sourceUrl ?? null,
        timeline:  (r.timeline ?? []).map(t => ({
          id:        t.id,
          title:     t.title,
          source:    t.source,
          ...(t.occurredAt && { occurredAt: new Date(t.occurredAt).toISOString() }),
        })),
      }
    },

    async getNode({ id }) {
      const [row] = await db
        .select()
        .from(contextNodes)
        .where(and(eq(contextNodes.id, id), eq(contextNodes.tenantId, tenantId)))
        .limit(1)
      if (!row) throw new NotFoundError('Node')
      return {
        id:         row.id,
        title:      row.title,
        summary:    row.summary,
        source:     row.source,
        sourceUrl:  row.sourceUrl ?? null,
        ...(row.occurredAt && { occurredAt: new Date(row.occurredAt).toISOString() }),
        ...(row.isDecision && { isDecision: true }),
      }
    },
  }
}
