import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../api/middleware/auth.middleware.js'
import { healthService } from './health.service.js'

export default async function healthRoutes(app: FastifyInstance) {

  app.get('/health/knowledge', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const report = await healthService.getLatestReport(tid)
    return reply.send({ data: report })
  })

  app.post('/health/knowledge', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const body = z.object({
      overallScore:      z.number().min(0).max(100),
      sections:          z.array(z.unknown()).optional(),
      atRiskNodes:       z.array(z.unknown()).optional(),
      staleDecisions:    z.array(z.unknown()).optional(),
      recommendations:   z.array(z.string()).optional(),
      freshnessScore:    z.number().optional(),
      connectivityScore: z.number().optional(),
      coverageScore:     z.number().optional(),
      conflictScore:     z.number().optional(),
    }).parse(req.body)

    const report = await healthService.saveReport(tid, {
      overallScore:      body.overallScore,
      sections:          body.sections ?? [],
      atRiskNodes:       body.atRiskNodes ?? [],
      staleDecisions:    body.staleDecisions ?? [],
      recommendations:   body.recommendations ?? [],
      freshnessScore:    body.freshnessScore,
      connectivityScore: body.connectivityScore,
      coverageScore:     body.coverageScore,
      conflictScore:     body.conflictScore,
    })
    return reply.status(201).send({ data: report })
  })

  app.get('/health/knowledge/history', { preHandler: [authMiddleware] }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const limit = Math.min(Number((req.query as Record<string, string>)['limit'] ?? 12), 52)
    const history = await healthService.getHistory(tid, limit)
    return reply.send({ data: history })
  })
}
