import { db } from '../../infra/db/client.js'
import { conflicts } from '../../infra/db/schema/beliefs.schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { NotFoundError } from '../../shared/errors.js'

type CreateConflictInput = {
  decisionId: string
  itemId:     string
  itemType:   string
  reason:     string
  severity:   string
  confidence: number
}

export const conflictsService = {

  async listConflicts(
    tenantId: string,
    opts: { status?: 'open' | 'resolved'; limit?: number } = {},
  ) {
    const conditions = [eq(conflicts.tenantId, tenantId)]
    if (opts.status) conditions.push(eq(conflicts.status, opts.status))

    return db
      .select()
      .from(conflicts)
      .where(and(...conditions))
      .orderBy(desc(conflicts.createdAt))
      .limit(opts.limit ?? 50)
  },

  async createConflict(tenantId: string, input: CreateConflictInput) {
    const [row] = await db.insert(conflicts).values({
      tenantId,
      decisionId: input.decisionId,
      itemId:     input.itemId,
      itemType:   input.itemType,
      reason:     input.reason,
      severity:   input.severity,
      confidence: input.confidence,
    }).returning()
    return row
  },

  async resolveConflict(tenantId: string, conflictId: string, userId: string, resolution: string) {
    const [existing] = await db
      .select()
      .from(conflicts)
      .where(and(eq(conflicts.tenantId, tenantId), eq(conflicts.id, conflictId)))
      .limit(1)

    if (!existing) throw new NotFoundError('Conflict not found')

    await db
      .update(conflicts)
      .set({
        status:     'resolved',
        resolution,
        resolvedBy: userId,
        resolvedAt: new Date(),
      })
      .where(and(eq(conflicts.tenantId, tenantId), eq(conflicts.id, conflictId)))
  },

  async dismissConflict(tenantId: string, conflictId: string, userId: string) {
    const [existing] = await db
      .select()
      .from(conflicts)
      .where(and(eq(conflicts.tenantId, tenantId), eq(conflicts.id, conflictId)))
      .limit(1)

    if (!existing) throw new NotFoundError('Conflict not found')

    await db
      .update(conflicts)
      .set({
        status:     'dismissed',
        resolvedBy: userId,
        resolvedAt: new Date(),
      })
      .where(and(eq(conflicts.tenantId, tenantId), eq(conflicts.id, conflictId)))
  },
}
