import { pgTable, uuid, text, real, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const beliefs = pgTable('beliefs', {
  id:              uuid('id').defaultRandom().primaryKey(),
  tenantId:        uuid('tenant_id').notNull(),
  statement:       text('statement').notNull(),
  confidence:      real('confidence').notNull().default(0.8),
  stalenessScore:  real('staleness_score').notNull().default(0),
  status:          text('status').notNull().default('active'), // active | challenged | superseded
  ownerUserId:     uuid('owner_user_id'),
  supportingNodes: jsonb('supporting_nodes').$type<string[]>().default([]),
  challengingNodes:jsonb('challenging_nodes').$type<string[]>().default([]),
  establishedAt:   timestamp('established_at', { withTimezone: true }).defaultNow().notNull(),
  lastChallengedAt:timestamp('last_challenged_at', { withTimezone: true }),
  lastReviewedAt:  timestamp('last_reviewed_at', { withTimezone: true }),
  metadata:        jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx:  index('beliefs_tenant_idx').on(t.tenantId),
  statusIdx:  index('beliefs_status_idx').on(t.status),
}))

export const principles = pgTable('principles', {
  id:            uuid('id').defaultRandom().primaryKey(),
  tenantId:      uuid('tenant_id').notNull(),
  statement:     text('statement').notNull(),
  appliesTo:     jsonb('applies_to').$type<string[]>().default([]),
  exceptions:    jsonb('exceptions').$type<string[]>().default([]),
  establishedAt: timestamp('established_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx: index('principles_tenant_idx').on(t.tenantId),
}))

export const openQuestions = pgTable('open_questions', {
  id:             uuid('id').defaultRandom().primaryKey(),
  tenantId:       uuid('tenant_id').notNull(),
  question:       text('question').notNull(),
  status:         text('status').notNull().default('open'), // open | resolved | abandoned
  openedByUserId: uuid('opened_by_user_id'),
  contextNodeIds: jsonb('context_node_ids').$type<string[]>().default([]),
  blockingItems:  jsonb('blocking_items').$type<string[]>().default([]),
  resolvedAt:     timestamp('resolved_at', { withTimezone: true }),
  resolvingNodeId:uuid('resolving_node_id'),
  resolution:     text('resolution'),
  openedAt:       timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx: index('open_questions_tenant_idx').on(t.tenantId),
  statusIdx: index('open_questions_status_idx').on(t.status),
}))

export const conflicts = pgTable('conflicts', {
  id:          uuid('id').defaultRandom().primaryKey(),
  tenantId:    uuid('tenant_id').notNull(),
  decisionId:  uuid('decision_id').notNull(),
  itemId:      text('item_id').notNull(),
  itemType:    text('item_type').notNull(),   // belief | principle | decision
  reason:      text('reason').notNull(),
  severity:    text('severity').notNull(),    // critical | high | medium | low
  confidence:  real('confidence').notNull(),
  status:      text('status').notNull().default('open'), // open | resolved | dismissed
  resolution:  text('resolution'),
  resolvedAt:  timestamp('resolved_at', { withTimezone: true }),
  resolvedBy:  uuid('resolved_by'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx:   index('conflicts_tenant_idx').on(t.tenantId),
  statusIdx:   index('conflicts_status_idx').on(t.status),
  decisionIdx: index('conflicts_decision_idx').on(t.decisionId),
}))

export const briefs = pgTable('briefs', {
  id:            uuid('id').defaultRandom().primaryKey(),
  tenantId:      uuid('tenant_id').notNull(),
  meetingId:     text('meeting_id').notNull(),
  meetingTitle:  text('meeting_title').notNull(),
  meetingTime:   timestamp('meeting_time', { withTimezone: true }),
  title:         text('title').notNull(),
  summary:       text('summary').notNull(),
  sections:      jsonb('sections').$type<unknown[]>().default([]),
  attendeeIds:   jsonb('attendee_ids').$type<string[]>().default([]),
  sourceNodeIds: jsonb('source_node_ids').$type<string[]>().default([]),
  sentAt:        timestamp('sent_at', { withTimezone: true }),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx:  index('briefs_tenant_idx').on(t.tenantId),
  meetingIdx: index('briefs_meeting_idx').on(t.meetingId),
}))

export const digests = pgTable('digests', {
  id:            uuid('id').defaultRandom().primaryKey(),
  tenantId:      uuid('tenant_id').notNull(),
  team:          text('team').notNull(),
  title:         text('title').notNull(),
  sections:      jsonb('sections').$type<unknown[]>().default([]),
  periodDays:    text('period_days').notNull().default('7'),
  decisionCount: text('decision_count').notNull().default('0'),
  questionCount: text('question_count').notNull().default('0'),
  sentAt:        timestamp('sent_at', { withTimezone: true }),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx: index('digests_tenant_idx').on(t.tenantId),
}))

export const knowledgeHealth = pgTable('knowledge_health', {
  id:              uuid('id').defaultRandom().primaryKey(),
  tenantId:        uuid('tenant_id').notNull(),
  overallScore:    real('overall_score').notNull(),
  freshnessScore:  real('freshness_score').notNull().default(0),
  connectivityScore: real('connectivity_score').notNull().default(0),
  coverageScore:   real('coverage_score').notNull().default(0),
  conflictScore:   real('conflict_score').notNull().default(0),
  sections:        jsonb('sections').$type<unknown[]>().default([]),
  atRiskNodes:     jsonb('at_risk_nodes').$type<unknown[]>().default([]),
  staleDecisions:  jsonb('stale_decisions').$type<unknown[]>().default([]),
  recommendations: jsonb('recommendations').$type<string[]>().default([]),
  scoredAt:        timestamp('scored_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx: index('knowledge_health_tenant_idx').on(t.tenantId),
}))

export const agentRuns = pgTable('agent_runs', {
  id:          uuid('id').defaultRandom().primaryKey(),
  tenantId:    uuid('tenant_id').notNull(),
  agentType:   text('agent_type').notNull(),
  triggerType: text('trigger_type').notNull(),
  triggerData: jsonb('trigger_data').$type<Record<string, unknown>>().default({}),
  status:      text('status').notNull().default('completed'), // running | completed | failed
  success:     text('success').notNull().default('true'),
  output:      jsonb('output').$type<Record<string, unknown>>().default({}),
  error:       text('error'),
  latencyMs:   text('latency_ms'),
  startedAt:   timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx: index('agent_runs_tenant_idx').on(t.tenantId),
  typeIdx:   index('agent_runs_type_idx').on(t.agentType),
}))

export const agentAlerts = pgTable('agent_alerts', {
  id:          uuid('id').defaultRandom().primaryKey(),
  tenantId:    uuid('tenant_id').notNull(),
  alertType:   text('alert_type').notNull(),
  severity:    text('severity').notNull().default('info'), // info | warning | critical
  message:     text('message').notNull(),
  metadata:    jsonb('metadata').$type<Record<string, unknown>>().default({}),
  readBy:      jsonb('read_by').$type<string[]>().default([]),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  tenantIdx:   index('agent_alerts_tenant_idx').on(t.tenantId),
  severityIdx: index('agent_alerts_severity_idx').on(t.severity),
}))
