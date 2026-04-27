import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { requireRole } from '@/api/middleware/rbac.middleware.js'
import { listAuditLog } from './audit.service.js'

const QuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().min(1).max(100).default(50),
})

export default async function auditRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)
  app.addHook('preHandler', requireRole('admin'))

  app.get('/', {
    schema: {
      tags: ['Audit'],
      summary: 'List audit log for the workspace (admin only)',
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(QuerySchema),
    },
  }, async (req, reply) => {
    const { tid }  = req.user as { tid: string }
    const query    = QuerySchema.parse(req.query)
    const opts: { limit: number; cursor?: string } = { limit: query.limit }
    if (query.cursor) opts.cursor = query.cursor
    const result   = await listAuditLog(tid, opts)
    return reply.send({
      data: result.logs,
      meta: { cursor: result.nextCursor, hasMore: result.hasMore },
    })
  })
}
