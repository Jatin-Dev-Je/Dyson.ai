import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../api/middleware/auth.middleware.js'
import { beliefsService } from './beliefs.service.js'

const CreateBeliefSchema = z.object({
  statement:   z.string().min(5).max(1000),
  confidence:  z.number().min(0).max(1).optional(),
  ownerUserId: z.string().uuid().optional(),
  metadata:    z.record(z.unknown()).optional(),
})

const CreatePrincipleSchema = z.object({
  statement: z.string().min(5).max(1000),
  appliesTo: z.array(z.string()).optional(),
})

const CreateQuestionSchema = z.object({
  question:       z.string().min(5).max(500),
  contextNodeIds: z.array(z.string().uuid()).optional(),
  blockingItems:  z.array(z.string()).optional(),
})

const ResolveQuestionSchema = z.object({
  resolution:      z.string().min(5),
  resolvingNodeId: z.string().uuid().optional(),
})

export default async function beliefsRoutes(app: FastifyInstance) {

  // ── Beliefs ──────────────────────────────────────────────────────────────────

  app.get('/beliefs', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const limit = Math.min(Number((req.query as Record<string, string>)['limit'] ?? 50), 100)
    const items = await beliefsService.listBeliefs(tid, limit)
    return reply.send({ data: items })
  })

  app.post('/beliefs', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const body = CreateBeliefSchema.parse(req.body)
    const belief = await beliefsService.createBelief(tid, sub, {
      statement:   body.statement,
      confidence:  body.confidence,
      ownerUserId: body.ownerUserId,
      metadata:    body.metadata,
    })
    return reply.status(201).send({ data: belief })
  })

  app.post('/beliefs/:id/challenge', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id } = req.params as { id: string }
    const { challengingNodeId } = z.object({ challengingNodeId: z.string() }).parse(req.body)
    await beliefsService.challengeBelief(tid, id, challengingNodeId)
    return reply.status(204).send()
  })

  app.post('/beliefs/:id/support', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id } = req.params as { id: string }
    const { supportingNodeId } = z.object({ supportingNodeId: z.string() }).parse(req.body)
    await beliefsService.supportBelief(tid, id, supportingNodeId)
    return reply.status(204).send()
  })

  // ── Principles ───────────────────────────────────────────────────────────────

  app.get('/beliefs/principles', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const limit = Math.min(Number((req.query as Record<string, string>)['limit'] ?? 30), 100)
    const items = await beliefsService.listPrinciples(tid, limit)
    return reply.send({ data: items })
  })

  app.post('/beliefs/principles', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const body = CreatePrincipleSchema.parse(req.body)
    const principle = await beliefsService.createPrinciple(tid, {
      statement: body.statement,
      appliesTo: body.appliesTo,
    })
    return reply.status(201).send({ data: principle })
  })

  // ── Open questions ────────────────────────────────────────────────────────────

  app.get('/beliefs/questions', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const q = req.query as Record<string, string>
    const rawStatus = q['status']
    const status = rawStatus === 'open' || rawStatus === 'resolved' ? rawStatus : undefined
    const items = await beliefsService.listOpenQuestions(tid, {
      limit: Math.min(Number(q['limit'] ?? 30), 100),
      ...(status !== undefined ? { status } : {}),
    })
    return reply.send({ data: items })
  })

  app.post('/beliefs/questions', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const body = CreateQuestionSchema.parse(req.body)
    const question = await beliefsService.createOpenQuestion(tid, sub, {
      question:       body.question,
      contextNodeIds: body.contextNodeIds,
      blockingItems:  body.blockingItems,
    })
    return reply.status(201).send({ data: question })
  })

  app.post('/beliefs/questions/:id/resolve', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id } = req.params as { id: string }
    const body = ResolveQuestionSchema.parse(req.body)
    await beliefsService.resolveQuestion(tid, id, {
      resolution:      body.resolution,
      resolvingNodeId: body.resolvingNodeId,
    })
    return reply.status(204).send()
  })
}
