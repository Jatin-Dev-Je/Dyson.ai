import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'
import { processEmbedding } from '@/modules/processing/processing.service.js'

const Schema = z.object({
  nodeId:   z.string().uuid(),
  tenantId: z.string().uuid(),
  content:  z.string().min(1),
})

export async function handleGenerateEmbeddings(
  payload: unknown,
  logger:  FastifyBaseLogger
) {
  const { nodeId, tenantId, content } = Schema.parse(payload)
  await processEmbedding(nodeId, tenantId, content, logger)
}
