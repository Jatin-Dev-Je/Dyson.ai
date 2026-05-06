import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { writeAudit } from '@/modules/audit/audit.service.js'
import { SearchQuerySchema, search } from './search.service.js'

export default async function searchRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // Rate limit search more strictly than browsing — it runs expensive SQL
  app.get('/', {
    config: {
      rateLimit: {
        max:        30,
        timeWindow: '1 minute',
        keyGenerator: (req) => {
          const p = req.user as { tid?: string; sub?: string } | undefined
          return `search:${p?.tid ?? 'anon'}:${p?.sub ?? req.ip}`
        },
      },
    },
    schema: {
      tags: ['Search'],
      summary: 'Full-text search across nodes, decisions, and recall history',
      description: [
        'Supports websearch-style syntax: phrases in quotes, OR, negation with -.',
        'Filter by source (slack, github, notion...), date range (from/to ISO 8601),',
        'and result type (decision, event, query, or all).',
      ].join(' '),
      security:    [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(SearchQuerySchema),
    },
  }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const query        = SearchQuerySchema.parse(req.query)
    const result       = await search(tid, query)

    // Fire-and-forget audit (q is not stored — we log usage patterns without the query text)
    void writeAudit({
      tenantId:     tid,
      actorId:      sub,
      action:       'memory.recall',
      resourceType: 'search',
      metadata: {
        resultCount: result.results.length,
        type:        query.type,
        hasFilters:  !!(query.source ?? query.from ?? query.to),
      },
    })

    return reply.send({
      data: result.results,
      meta: { cursor: result.nextCursor, hasMore: result.hasMore },
    })
  })
}
