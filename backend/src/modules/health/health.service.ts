import { db } from '../../infra/db/client.js'
import { knowledgeHealth } from '../../infra/db/schema/beliefs.schema.js'
import { eq, desc } from 'drizzle-orm'

type SaveReportInput = {
  overallScore:      number
  sections:          unknown[]
  atRiskNodes:       unknown[]
  staleDecisions:    unknown[]
  recommendations:   string[]
  freshnessScore:    number | undefined
  connectivityScore: number | undefined
  coverageScore:     number | undefined
  conflictScore:     number | undefined
}

export const healthService = {

  async getLatestReport(tenantId: string) {
    const [row] = await db
      .select()
      .from(knowledgeHealth)
      .where(eq(knowledgeHealth.tenantId, tenantId))
      .orderBy(desc(knowledgeHealth.scoredAt))
      .limit(1)
    return row ?? null
  },

  async saveReport(tenantId: string, input: SaveReportInput) {
    const [row] = await db.insert(knowledgeHealth).values({
      tenantId,
      overallScore:     input.overallScore,
      freshnessScore:   input.freshnessScore ?? 0,
      connectivityScore: input.connectivityScore ?? 0,
      coverageScore:    input.coverageScore ?? 0,
      conflictScore:    input.conflictScore ?? 0,
      sections:         input.sections ?? [],
      atRiskNodes:      input.atRiskNodes ?? [],
      staleDecisions:   input.staleDecisions ?? [],
      recommendations:  input.recommendations ?? [],
    }).returning()
    return row
  },

  async getHistory(tenantId: string, limit = 12) {
    return db
      .select({
        id:           knowledgeHealth.id,
        overallScore: knowledgeHealth.overallScore,
        freshnessScore: knowledgeHealth.freshnessScore,
        scoredAt:     knowledgeHealth.scoredAt,
      })
      .from(knowledgeHealth)
      .where(eq(knowledgeHealth.tenantId, tenantId))
      .orderBy(desc(knowledgeHealth.scoredAt))
      .limit(limit)
  },
}
