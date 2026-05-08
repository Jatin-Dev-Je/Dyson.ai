import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../api/middleware/auth.middleware.js'
import { agentFeedService } from './agent-feed.service.js'

export default async function agentFeedRoutes(app: FastifyInstance) {

  app.get('/agent-feed', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const q = req.query as Record<string, string>
    const agentType = q['agentType']
    const cursor    = q['cursor']
    const feed = await agentFeedService.getFeed(tid, {
      limit: Math.min(Number(q['limit'] ?? 50), 100),
      ...(agentType !== undefined ? { agentType } : {}),
      ...(cursor !== undefined ? { cursor } : {}),
    })
    return reply.send(feed)
  })

  app.post('/agent-feed/alert', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const body = z.object({
      alertType: z.string(),
      severity:  z.enum(['info', 'warning', 'critical']).default('info'),
      message:   z.string().max(2000),
      metadata:  z.record(z.unknown()).optional(),
    }).parse(req.body)

    const alert = await agentFeedService.createAlert(tid, {
      alertType: body.alertType,
      severity:  body.severity,
      message:   body.message,
      metadata:  body.metadata ?? {},
    })
    return reply.status(201).send({ data: alert })
  })

  app.post('/agent-feed/mark-read', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const { alertIds } = z.object({ alertIds: z.array(z.string().uuid()) }).parse(req.body)
    await agentFeedService.markRead(tid, sub, alertIds)
    return reply.status(204).send()
  })

  app.get('/agent-feed/unread-count', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const count = await agentFeedService.getUnreadCount(tid, sub)
    return reply.send({ data: { count } })
  })

  app.post('/agent-feed/run', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const body = z.object({
      agentType:   z.string(),
      triggerType: z.string(),
      triggerData: z.record(z.unknown()).optional(),
      success:     z.boolean(),
      output:      z.record(z.unknown()).optional(),
      error:       z.string().optional(),
      latencyMs:   z.number().optional(),
    }).parse(req.body)

    const run = await agentFeedService.logRun(tid, {
      agentType:   body.agentType,
      triggerType: body.triggerType,
      triggerData: body.triggerData ?? {},
      success:     body.success,
      output:      body.output ?? {},
      error:       body.error,
      latencyMs:   body.latencyMs,
    })
    return reply.status(201).send({ data: run })
  })

  app.get('/agent-feed/runs', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const q = req.query as Record<string, string>
    const agentTypeFilter = q['agentType']
    const runs = await agentFeedService.listRuns(tid, {
      limit: Math.min(Number(q['limit'] ?? 30), 100),
      ...(agentTypeFilter !== undefined ? { agentType: agentTypeFilter } : {}),
    })
    return reply.send({ data: runs })
  })
}
