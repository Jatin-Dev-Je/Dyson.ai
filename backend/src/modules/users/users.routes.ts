import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { UpdateMeSchema, InviteUserSchema, ListUsersQuerySchema } from './users.schema.js'
import { getMe, updateMe, listUsers, inviteUser, removeUser } from './users.service.js'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'

export default async function usersRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // ── GET /api/v1/users/me ─────────────────────────────────────────────────
  app.get('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Get authenticated user profile',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const user = await getMe(sub, tid)
    return reply.send({ data: user })
  })

  // ── PATCH /api/v1/users/me ───────────────────────────────────────────────
  app.patch('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Update authenticated user profile',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(UpdateMeSchema),
    },
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const input = UpdateMeSchema.parse(req.body)
    const updated = await updateMe(sub, tid, input)
    return reply.send({ data: updated })
  })

  // ── GET /api/v1/users ────────────────────────────────────────────────────
  app.get('/', {
    schema: {
      tags: ['Users'],
      summary: 'List all users in the workspace (cursor-paginated)',
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(ListUsersQuerySchema),
    },
  }, async (req, reply) => {
    const { tid }  = req.user as { tid: string }
    const query    = ListUsersQuerySchema.parse(req.query)
    const result   = await listUsers(tid, query)
    return reply.send({
      data: result.users,
      meta: { cursor: result.nextCursor, hasMore: result.hasMore },
    })
  })

  // ── POST /api/v1/users/invite ────────────────────────────────────────────
  app.post('/invite', {
    schema: {
      tags: ['Users'],
      summary: 'Invite a user to the workspace by email (admin only)',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(InviteUserSchema),
    },
  }, async (req, reply) => {
    const { sub, tid, role } = req.user as { sub: string; tid: string; role: string }
    const input              = InviteUserSchema.parse(req.body)
    const invite             = await inviteUser(tid, sub, role, input)
    return reply.status(201).send({ data: invite })
  })

  // ── DELETE /api/v1/users/:id ─────────────────────────────────────────────
  app.delete('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Remove a user from the workspace (admin only)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { sub, tid, role } = req.user as { sub: string; tid: string; role: string }
    const { id }             = req.params as { id: string }
    await removeUser(sub, role, id, tid)
    return reply.status(204).send()
  })
}
