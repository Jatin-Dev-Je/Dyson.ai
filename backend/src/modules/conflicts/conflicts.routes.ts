import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../api/middleware/auth.middleware.js'
import { conflictsService } from './conflicts.service.js'

export default async function conflictsRoutes(app: FastifyInstance) {

  app.get('/conflicts', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const q = req.query as Record<string, string>
    const rawStatus = q['status']
    const status = rawStatus === 'open' || rawStatus === 'resolved' ? rawStatus : undefined
    const items = await conflictsService.listConflicts(tid, {
      limit: Math.min(Number(q['limit'] ?? 50), 100),
      ...(status !== undefined ? { status } : {}),
    })
    return reply.send({ data: items })
  })

  app.post('/conflicts', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const body = z.object({
      decisionId: z.string(),
      itemId:     z.string(),
      itemType:   z.string(),
      reason:     z.string(),
      severity:   z.string(),
      confidence: z.number().min(0).max(1),
    }).parse(req.body)
    const conflict = await conflictsService.createConflict(tid, body)
    return reply.status(201).send({ data: conflict })
  })

  app.patch('/conflicts/:id/resolve', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const { id } = req.params as { id: string }
    const { resolution } = z.object({ resolution: z.string().min(5).max(1000) }).parse(req.body)
    await conflictsService.resolveConflict(tid, id, sub, resolution)
    return reply.status(204).send()
  })

  app.patch('/conflicts/:id/dismiss', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const { id } = req.params as { id: string }
    await conflictsService.dismissConflict(tid, id, sub)
    return reply.status(204).send()
  })
}
