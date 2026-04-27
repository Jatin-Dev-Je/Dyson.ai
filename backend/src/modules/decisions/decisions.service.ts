import { z } from 'zod'
import {
  listDecisions,
  getDecisionWithTimeline,
  flagDecisionEdge,
  type DecisionFilters,
} from './decisions.repository.js'
import { NotFoundError } from '@/shared/errors.js'

export const ListDecisionsQuerySchema = z.object({
  source:      z.string().optional(),
  from:        z.string().datetime().transform(s => new Date(s)).optional(),
  to:          z.string().datetime().transform(s => new Date(s)).optional(),
  minConfidence: z.coerce.number().min(0).max(1).default(0.50),
  cursor:      z.string().optional(),
  limit:       z.coerce.number().min(1).max(100).default(50),
})

export const FlagEdgeSchema = z.object({
  edgeId: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

export type ListDecisionsQuery = z.infer<typeof ListDecisionsQuerySchema>

export async function getDecisions(tenantId: string, query: ListDecisionsQuery) {
  const filters: DecisionFilters = {
    limit:         query.limit,
    minConfidence: query.minConfidence,
  }
  if (query.source !== undefined) filters.source = query.source
  if (query.from   !== undefined) filters.from   = query.from
  if (query.to     !== undefined) filters.to     = query.to
  if (query.cursor !== undefined) filters.cursor = query.cursor
  return listDecisions(tenantId, filters)
}

export async function getDecision(id: string, tenantId: string) {
  const result = await getDecisionWithTimeline(id, tenantId)
  if (!result) throw new NotFoundError('Decision')
  return result
}

export async function getDecisionTimeline(id: string, tenantId: string) {
  const result = await getDecisionWithTimeline(id, tenantId)
  if (!result) throw new NotFoundError('Decision')
  return result.timeline
}

export async function flagEdge(edgeId: string, tenantId: string, userId: string) {
  const updated = await flagDecisionEdge(edgeId, tenantId, userId)
  if (!updated) throw new NotFoundError('Edge')
  return updated
}
