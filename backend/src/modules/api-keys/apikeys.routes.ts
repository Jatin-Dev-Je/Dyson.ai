import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { requireRole } from '@/api/middleware/rbac.middleware.js'
import { writeAudit } from '@/modules/audit/audit.service.js'
import { CreateApiKeySchema, listApiKeys, createApiKey, revokeApiKey } from './apikeys.service.js'

export default async function apiKeysRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // GET /api/v1/api-keys
  app.get('/', {
    schema: { tags: ['API Keys'], summary: 'List active API keys', security: [{ bearerAuth: [] }] },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    return reply.send({ data: await listApiKeys(tid) })
  })

  // POST /api/v1/api-keys
  app.post('/', {
    schema: {
      tags: ['API Keys'],
      summary: 'Create a new API key — returns plaintext once (admin only)',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(CreateApiKeySchema),
    },
    preHandler: [requireRole('admin')],
  }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const input        = CreateApiKeySchema.parse(req.body)
    const result       = await createApiKey(tid, sub, input)

    void writeAudit({
      tenantId:  tid,
      actorId:   sub,
      action:    'apikey.created',
      resourceType: 'api_key',
      resourceId: result.id,
      metadata:  { name: input.name, scopes: input.scopes, keyPrefix: result.keyPrefix },
      ipAddress: req.ip,
    })

    return reply.status(201).send({ data: result })
  })

  // DELETE /api/v1/api-keys/:id
  app.delete('/:id', {
    schema: {
      tags: ['API Keys'],
      summary: 'Revoke an API key (admin only)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
    preHandler: [requireRole('admin')],
  }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const { id }       = req.params as { id: string }
    await revokeApiKey(id, tid, sub)

    void writeAudit({
      tenantId:  tid,
      actorId:   sub,
      action:    'apikey.revoked',
      resourceType: 'api_key',
      resourceId: id,
      ipAddress: req.ip,
    })

    return reply.status(204).send()
  })
}
