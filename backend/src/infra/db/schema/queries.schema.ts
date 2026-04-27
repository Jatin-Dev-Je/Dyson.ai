import { pgTable, uuid, text, timestamp, real, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants.schema.js'
import { users } from './tenants.schema.js'

export const whyQueries = pgTable('why_queries', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:       uuid('user_id').notNull().references(() => users.id),
  question:     text('question').notNull(),
  questionHash: text('question_hash').notNull(),  // SHA256 of question for dedup/caching

  // Result
  answer:       text('answer'),         // null if cannotAnswer
  citations:    jsonb('citations'),     // Citation[]
  sourceNodes:  jsonb('source_nodes'), // ContextNode[] used in composition
  confidence:   real('confidence'),
  cannotAnswer: boolean('cannot_answer').notNull().default(false),

  // Metadata
  model:        text('model'),          // Which LLM composed the answer
  latencyMs:    integer('latency_ms'), // Total end-to-end latency

  // Feedback
  feedbackScore: integer('feedback_score'), // 1 = helpful, -1 = not helpful, null = no feedback

  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, t => ({
  tenantIdx:  index('why_queries_tenant_idx').on(t.tenantId),
  userIdx:    index('why_queries_user_idx').on(t.userId),
  hashIdx:    index('why_queries_hash_idx').on(t.tenantId, t.questionHash),
}))
