import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { UpdateWorkspaceSchema } from './workspace.schema.js'
import { getWorkspace, updateWorkspace } from './workspace.service.js'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { requireRole } from '@/api/middleware/rbac.middleware.js'

export default async function workspaceRoutes(app: FastifyInstance) {

  // All workspace routes require auth
  app.addHook('preHandler', authMiddleware)

  // ── GET /api/v1/workspaces/me ────────────────────────────────────────────
  app.get('/me', {
    schema: {
      tags: ['Workspace'],
      summary: 'Get current workspace details',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const workspace = await getWorkspace(tid)
    return reply.send({ data: workspace })
  })

  // ── PATCH /api/v1/workspaces/me ──────────────────────────────────────────
  app.patch('/me', {
    schema: {
      tags: ['Workspace'],
      summary: 'Update workspace name or slug (admin only)',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(UpdateWorkspaceSchema),
    },
    preHandler: [requireRole('admin')],
  }, async (req, reply) => {
    const { tid }  = req.user as { tid: string }
    const input    = UpdateWorkspaceSchema.parse(req.body)
    const updated  = await updateWorkspace(tid, input)
    return reply.send({ data: updated })
  })
}
