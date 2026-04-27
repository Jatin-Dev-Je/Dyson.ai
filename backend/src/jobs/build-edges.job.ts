import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'
import { buildEdgesForNode } from '@/modules/processing/processing.service.js'

const Schema = z.object({
  nodeId:    z.string().uuid(),
  tenantId:  z.string().uuid(),
  metadata:  z.record(z.unknown()),
  issueRefs: z.array(z.string()).default([]),
})

export async function handleBuildEdges(
  payload: unknown,
  logger:  FastifyBaseLogger
) {
  const { nodeId, tenantId, metadata, issueRefs } = Schema.parse(payload)
  await buildEdgesForNode(nodeId, tenantId, metadata, issueRefs, logger)
}
