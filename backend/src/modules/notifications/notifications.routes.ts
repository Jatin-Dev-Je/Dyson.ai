import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { UpdatePrefsSchema } from './notifications.schema.js'
import { getNotificationPrefs, updateNotificationPrefs } from './notifications.service.js'

export default async function notificationsRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // GET /api/v1/notifications — fetch current preferences
  app.get('/', {
    schema: {
      tags:    ['Notifications'],
      summary: 'Get notification preferences for the current user',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const prefs = await getNotificationPrefs(sub, tid)
    return reply.send({ data: prefs })
  })

  // PATCH /api/v1/notifications — update preferences (partial update)
  app.patch('/', {
    schema: {
      tags:    ['Notifications'],
      summary: 'Update notification preferences — partial update, omit unchanged channels',
      security: [{ bearerAuth: [] }],
      body:    zodToJsonSchema(UpdatePrefsSchema),
    },
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const input  = UpdatePrefsSchema.parse(req.body)
    const prefs  = await updateNotificationPrefs(sub, tid, input)
    return reply.send({ data: prefs })
  })
}
