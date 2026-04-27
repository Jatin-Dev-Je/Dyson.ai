import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { writeAudit } from '@/modules/audit/audit.service.js'
import { CreatePackSchema, listPacks, createPack, getPack, deletePack } from './packs.service.js'

export default async function packsRoutes(app: FastifyInstance) {

  app.addHook('preHandler', authMiddleware)

  // GET /api/v1/onboarding-packs
  app.get('/', {
    schema: { tags: ['Onboarding Packs'], summary: 'List all onboarding packs', security: [{ bearerAuth: [] }] },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    return reply.send({ data: await listPacks(tid) })
  })

  // POST /api/v1/onboarding-packs
  app.post('/', {
    schema: {
      tags: ['Onboarding Packs'],
      summary: 'Generate an onboarding context pack for a new hire',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(CreatePackSchema),
    },
  }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const input        = CreatePackSchema.parse(req.body)
    const pack         = await createPack(tid, sub, input, req.log)

    void writeAudit({
      tenantId:  tid,
      actorId:   sub,
      action:    'pack.generated',
      resourceType: 'onboarding_pack',
      resourceId: pack.id,
      metadata:  { team: input.team },
      ipAddress: req.ip,
    })

    return reply.status(201).send({ data: pack })
  })

  // GET /api/v1/onboarding-packs/:id
  app.get('/:id', {
    schema: {
      tags: ['Onboarding Packs'],
      summary: 'Get a specific onboarding pack',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id }  = req.params as { id: string }
    return reply.send({ data: await getPack(id, tid) })
  })

  // DELETE /api/v1/onboarding-packs/:id
  app.delete('/:id', {
    schema: {
      tags: ['Onboarding Packs'],
      summary: 'Delete an onboarding pack',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id }  = req.params as { id: string }
    await deletePack(id, tid)
    return reply.status(204).send()
  })
}
