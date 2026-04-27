import { pgTable, uuid, text, timestamp, real, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants.schema.js'
import { rawEvents } from './events.schema.js'

export const contextNodes = pgTable('context_nodes', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  rawEventId:         uuid('raw_event_id').references(() => rawEvents.id),
  entityType:         text('entity_type').notNull(),
  source:             text('source').notNull(),
  externalId:         text('external_id').notNull(),
  title:              text('title').notNull(),
  summary:            text('summary').notNull(),
  sourceUrl:          text('source_url'),
  metadata:           jsonb('metadata'),
  // Decision detection
  isDecision:         boolean('is_decision').notNull().default(false),
  decisionConfidence: real('decision_confidence'),
  decisionSignals:    jsonb('decision_signals'),  // Which signals fired
  occurredAt:         timestamp('occurred_at').notNull(),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
}, t => ({
  tenantIdx:    index('nodes_tenant_idx').on(t.tenantId),
  entityIdx:    index('nodes_entity_type_idx').on(t.tenantId, t.entityType),
  occurredIdx:  index('nodes_occurred_idx').on(t.tenantId, t.occurredAt),
  decisionIdx:  index('nodes_decision_idx').on(t.tenantId, t.isDecision),
  // Deduplication — same external artifact cannot appear twice per tenant
  dedupeIdx:    uniqueIndex('nodes_dedupe_idx').on(t.tenantId, t.externalId, t.source),
}))

export const causalEdges = pgTable('causal_edges', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenantId:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sourceNodeId:     uuid('source_node_id').notNull().references(() => contextNodes.id, { onDelete: 'cascade' }),
  targetNodeId:     uuid('target_node_id').notNull().references(() => contextNodes.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(),
  confidence:       real('confidence').notNull(),
  // User-feedback loop — corrections feed the linker model
  isFlagged:        boolean('is_flagged').notNull().default(false),
  flaggedAt:        timestamp('flagged_at'),
  flaggedBy:        uuid('flagged_by'),
  metadata:         jsonb('metadata'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
}, t => ({
  tenantIdx:     index('edges_tenant_idx').on(t.tenantId),
  sourceIdx:     index('edges_source_idx').on(t.sourceNodeId),
  targetIdx:     index('edges_target_idx').on(t.targetNodeId),
  confidenceIdx: index('edges_confidence_idx').on(t.tenantId, t.confidence),
  // Prevent duplicate edges of the same type between the same nodes
  uniqueEdgeIdx: uniqueIndex('edges_unique_idx').on(t.sourceNodeId, t.targetNodeId, t.relationshipType),
}))
