import { db } from '../../infra/db/client.js'
import {
  beliefs, principles, openQuestions,
} from '../../infra/db/schema/beliefs.schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { NotFoundError } from '../../shared/errors.js'

type CreateBeliefInput = {
  statement:   string
  confidence:  number | undefined
  ownerUserId: string | undefined
  metadata:    Record<string, unknown> | undefined
}

type CreatePrincipleInput = {
  statement: string
  appliesTo: string[] | undefined
}

type CreateQuestionInput = {
  question:       string
  contextNodeIds: string[] | undefined
  blockingItems:  string[] | undefined
}

type ResolveQuestionInput = {
  resolution:      string
  resolvingNodeId: string | undefined
}

export const beliefsService = {

  // ── Beliefs ──────────────────────────────────────────────────────────────────

  async listBeliefs(tenantId: string, limit = 50) {
    return db
      .select()
      .from(beliefs)
      .where(and(eq(beliefs.tenantId, tenantId), eq(beliefs.status, 'active')))
      .orderBy(desc(beliefs.confidence))
      .limit(limit)
  },

  async createBelief(tenantId: string, userId: string, input: CreateBeliefInput) {
    const [row] = await db.insert(beliefs).values({
      tenantId,
      statement:   input.statement,
      confidence:  input.confidence ?? 0.8,
      ownerUserId: input.ownerUserId ?? userId,
      metadata:    input.metadata ?? {},
    }).returning()
    return row
  },

  async challengeBelief(tenantId: string, beliefId: string, challengingNodeId: string) {
    const [existing] = await db
      .select()
      .from(beliefs)
      .where(and(eq(beliefs.tenantId, tenantId), eq(beliefs.id, beliefId)))
      .limit(1)

    if (!existing) throw new NotFoundError('Belief not found')

    const currentChallenging = (existing.challengingNodes as string[]) ?? []
    const updated = Array.from(new Set([...currentChallenging, challengingNodeId]))
    const newConf = Math.max(0.3, (existing.confidence ?? 0.8) - 0.05)

    await db
      .update(beliefs)
      .set({
        challengingNodes: updated,
        confidence:       newConf,
        status:           newConf < 0.5 ? 'challenged' : existing.status,
        lastChallengedAt: new Date(),
        updatedAt:        new Date(),
      })
      .where(and(eq(beliefs.tenantId, tenantId), eq(beliefs.id, beliefId)))
  },

  async supportBelief(tenantId: string, beliefId: string, supportingNodeId: string) {
    const [existing] = await db
      .select()
      .from(beliefs)
      .where(and(eq(beliefs.tenantId, tenantId), eq(beliefs.id, beliefId)))
      .limit(1)

    if (!existing) throw new NotFoundError('Belief not found')

    const currentSupporting = (existing.supportingNodes as string[]) ?? []
    const updated = Array.from(new Set([...currentSupporting, supportingNodeId]))
    const newConf = Math.min(0.99, (existing.confidence ?? 0.8) + 0.03)

    await db
      .update(beliefs)
      .set({
        supportingNodes: updated,
        confidence:      newConf,
        updatedAt:       new Date(),
      })
      .where(and(eq(beliefs.tenantId, tenantId), eq(beliefs.id, beliefId)))
  },

  // ── Principles ───────────────────────────────────────────────────────────────

  async listPrinciples(tenantId: string, limit = 30) {
    return db
      .select()
      .from(principles)
      .where(eq(principles.tenantId, tenantId))
      .orderBy(desc(principles.establishedAt))
      .limit(limit)
  },

  async createPrinciple(tenantId: string, input: CreatePrincipleInput) {
    const [row] = await db.insert(principles).values({
      tenantId,
      statement: input.statement,
      appliesTo: input.appliesTo ?? [],
    }).returning()
    return row
  },

  // ── Open questions ────────────────────────────────────────────────────────────

  async listOpenQuestions(
    tenantId: string,
    opts: { status?: 'open' | 'resolved'; limit?: number } = {},
  ) {
    const conditions = [eq(openQuestions.tenantId, tenantId)]
    if (opts.status !== undefined) conditions.push(eq(openQuestions.status, opts.status))

    return db
      .select()
      .from(openQuestions)
      .where(and(...conditions))
      .orderBy(desc(openQuestions.openedAt))
      .limit(opts.limit ?? 30)
  },

  async createOpenQuestion(tenantId: string, userId: string, input: CreateQuestionInput) {
    const [row] = await db.insert(openQuestions).values({
      tenantId,
      question:       input.question,
      openedByUserId: userId,
      contextNodeIds: input.contextNodeIds ?? [],
      blockingItems:  input.blockingItems ?? [],
    }).returning()
    return row
  },

  async resolveQuestion(tenantId: string, questionId: string, input: ResolveQuestionInput) {
    const [existing] = await db
      .select()
      .from(openQuestions)
      .where(and(eq(openQuestions.tenantId, tenantId), eq(openQuestions.id, questionId)))
      .limit(1)

    if (!existing) throw new NotFoundError('Question not found')

    await db
      .update(openQuestions)
      .set({
        status:          'resolved',
        resolution:      input.resolution,
        resolvingNodeId: input.resolvingNodeId,
        resolvedAt:      new Date(),
      })
      .where(and(eq(openQuestions.tenantId, tenantId), eq(openQuestions.id, questionId)))
  },
}
