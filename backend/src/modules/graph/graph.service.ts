import { z } from 'zod'
import {
  listNodes, getNodeById, getTimeline,
  getEdgesForNode, getConnectedNodes, flagEdge,
  type NodeFilters,
} from './graph.repository.js'
import { NotFoundError } from '@/shared/errors.js'

export const ListNodesQuerySchema = z.object({
  entityType: z.string().optional(),
  source:     z.string().optional(),
  isDecision: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  from:       z.string().datetime().transform(s => new Date(s)).optional(),
  to:         z.string().datetime().transform(s => new Date(s)).optional(),
  cursor:     z.string().optional(),
  limit:      z.coerce.number().min(1).max(100).default(50),
})

export const TimelineQuerySchema = z.object({
  from:   z.string().datetime().transform(s => new Date(s)),
  to:     z.string().datetime().transform(s => new Date(s)),
  source: z.string().optional(),
  limit:  z.coerce.number().min(1).max(200).default(100),
})

export type ListNodesQuery = z.infer<typeof ListNodesQuerySchema>
export type TimelineQuery  = z.infer<typeof TimelineQuerySchema>

export async function getNodes(tenantId: string, query: ListNodesQuery) {
  const filters: NodeFilters = { limit: query.limit }
  if (query.entityType !== undefined) filters.entityType = query.entityType
  if (query.source     !== undefined) filters.source     = query.source
  if (query.isDecision !== undefined) filters.isDecision = query.isDecision
  if (query.from       !== undefined) filters.from       = query.from
  if (query.to         !== undefined) filters.to         = query.to
  if (query.cursor     !== undefined) filters.cursor     = query.cursor
  return listNodes(tenantId, filters)
}

export async function getNode(id: string, tenantId: string) {
  const node = await getNodeById(id, tenantId)
  if (!node) throw new NotFoundError('Node')
  return node
}

export async function getNodeEdges(id: string, tenantId: string) {
  // Verify node exists before returning its edges
  const node = await getNodeById(id, tenantId)
  if (!node) throw new NotFoundError('Node')
  return getConnectedNodes(id, tenantId)
}

export async function getGraphTimeline(tenantId: string, query: TimelineQuery) {
  const opts: { from: Date; to: Date; limit: number; source?: string } = {
    from:  query.from,
    to:    query.to,
    limit: query.limit,
  }
  if (query.source !== undefined) opts.source = query.source
  return getTimeline(tenantId, opts)
}

export async function flagCausalEdge(
  edgeId:   string,
  tenantId: string,
  userId:   string
) {
  const updated = await flagEdge(edgeId, tenantId, userId)
  if (!updated) throw new NotFoundError('Edge')
  return updated
}
