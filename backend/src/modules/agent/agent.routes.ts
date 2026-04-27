import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { agentAuthMiddleware, requireScope } from './agent.middleware.js'
import { askWhy } from '@/modules/why/why.service.js'
import { getDecisions } from '@/modules/decisions/decisions.service.js'
import { search } from '@/modules/search/search.service.js'
import { UnauthorizedError } from '@/shared/errors.js'

// Narrow agentContext to non-undefined inside route handlers
function requireAgentContext(req: FastifyRequest): { tenantId: string; scopes: string[] } {
  if (!req.agentContext) throw new UnauthorizedError()
  return req.agentContext
}

const AgentQuerySchema = z.object({
  question: z.string().min(3).max(1000).trim(),
})

const AgentContextSchema = z.object({
  topic:  z.string().min(1).max(500).trim(),
  limit:  z.coerce.number().min(1).max(20).default(10),
})

export default async function agentRoutes(app: FastifyInstance) {

  // All agent routes use API key auth, not JWT
  app.addHook('preHandler', agentAuthMiddleware)

  // ── POST /api/v1/agent/query ─────────────────────────────────────────────
  // Same WHY Engine, accessible via API key for AI agents
  app.post('/query', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      tags: ['Agent API'],
      summary: 'Ask a WHY question via API key — for AI agent use',
      body: zodToJsonSchema(AgentQuerySchema),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { question } = AgentQuerySchema.parse(req.body)
    const { tenantId } = requireAgentContext(req)
    // Agent queries use a synthetic actor id; per-tenant rate limiting still applies
    const result = await askWhy(question, tenantId, 'agent', req.log)
    return reply.send({ data: result })
  })

  // ── GET /api/v1/agent/context ────────────────────────────────────────────
  // Query context graph by topic (for agents that want raw context)
  app.get('/context', {
    schema: {
      tags: ['Agent API'],
      summary: 'Query context graph by topic — returns relevant nodes',
      querystring: zodToJsonSchema(AgentContextSchema),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)
    const query        = AgentContextSchema.parse(req.query)
    const result       = await search(tenantId, {
      q:     query.topic,
      type:  'all',
      limit: query.limit,
    })
    return reply.send({ data: result.results })
  })

  // ── GET /api/v1/agent/decisions ──────────────────────────────────────────
  // Get recent decisions — for agents that want the decision log
  app.get('/decisions', {
    schema: {
      tags: ['Agent API'],
      summary: 'Get recent decisions — for agent context',
      querystring: zodToJsonSchema(z.object({
        limit: z.coerce.number().min(1).max(20).default(10),
      })),
    },
    preHandler: [requireScope('read')],
  }, async (req, reply) => {
    const { tenantId } = requireAgentContext(req)
    const { limit }    = req.query as { limit: number }
    const result       = await getDecisions(tenantId, { limit, minConfidence: 0.60 })
    return reply.send({ data: result.decisions })
  })
}
