import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { agentAuthMiddleware, requireScope } from '@/modules/agent/agent.middleware.js'
import { createMemory, listMemories, getMemory, linkMemories } from './memory.service.js'

// ─── Schemas ──────────────────────────────────────────────────────────────

export const MemoryTypeEnum = z.enum([
  'decision',    // a choice was made
  'incident',    // something broke — postmortem knowledge
  'standard',    // how we do things here
  'context',     // general knowledge about a system / team / person
  'constraint',  // we can't do X because Y
  'outcome',     // we tried X, result was Y
])
export type MemoryType = z.infer<typeof MemoryTypeEnum>

export const CreateMemorySchema = z.object({
  title:     z.string().min(3).max(300).trim(),
  content:   z.string().min(10).max(10_000).trim(),
  type:      MemoryTypeEnum.default('context'),
  source:    z.string().max(50).optional(),   // 'slack', 'github', 'manual', 'agent', ...
  url:       z.string().url().optional(),
  linkedTo:  z.string().uuid().optional(),    // creates a causal edge to this memory
  metadata:  z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(), // defaults to now
})

export const ListMemoriesSchema = z.object({
  type:   MemoryTypeEnum.optional(),
  q:      z.string().max(500).optional(),
  cursor: z.string().optional(),
  limit:  z.coerce.number().min(1).max(100).default(50),
})

export const LinkMemoriesSchema = z.object({
  targetId:         z.string().uuid(),
  relationshipType: z.enum(['caused', 'related', 'superseded', 'referenced']).default('related'),
})

// ─── Routes ───────────────────────────────────────────────────────────────

export default async function memoryRoutes(app: FastifyInstance) {

  // ── POST /api/v1/memory — create a memory (JWT auth) ─────────────────────
  app.post('/', {
    schema: {
      tags: ['Memory'],
      summary: 'Create a company memory — decision, incident, standard, context, or outcome',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(CreateMemorySchema),
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const input = CreateMemorySchema.parse(req.body)
    const memory = await createMemory(tid, sub, input)
    return reply.status(201).send({ data: memory })
  })

  // ── POST /api/v1/memory/agent — create a memory (API key auth, write scope) ─
  app.post('/agent', {
    schema: {
      tags: ['Memory'],
      summary: 'Create a company memory via API key — for agent use',
      body: zodToJsonSchema(CreateMemorySchema),
    },
    preHandler: [agentAuthMiddleware, requireScope('write')],
  }, async (req, reply) => {
    if (!req.agentContext) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } })
    }
    const { tenantId } = req.agentContext
    const input = CreateMemorySchema.parse(req.body)
    const memory = await createMemory(tenantId, 'agent', input)
    return reply.status(201).send({ data: memory })
  })

  // ── GET /api/v1/memory — list / search memories ───────────────────────────
  app.get('/', {
    schema: {
      tags: ['Memory'],
      summary: 'List and search company memories',
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(ListMemoriesSchema),
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const query   = ListMemoriesSchema.parse(req.query)
    const result  = await listMemories(tid, query)
    return reply.send({
      data: result.items,
      meta: { cursor: result.nextCursor, hasMore: result.hasMore, total: result.total },
    })
  })

  // ── GET /api/v1/memory/:id — get a single memory ─────────────────────────
  app.get('/:id', {
    schema: {
      tags: ['Memory'],
      summary: 'Get a memory with its linked context',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id }  = req.params as { id: string }
    const memory  = await getMemory(id, tid)
    return reply.send({ data: memory })
  })

  // ── POST /api/v1/memory/:id/link — link two memories causally ────────────
  app.post('/:id/link', {
    schema: {
      tags: ['Memory'],
      summary: 'Create a causal link between two memories',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: zodToJsonSchema(LinkMemoriesSchema),
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const { id }  = req.params as { id: string }
    const input   = LinkMemoriesSchema.parse(req.body)
    await linkMemories(id, input.targetId, tid, input.relationshipType)
    return reply.status(204).send()
  })
}
