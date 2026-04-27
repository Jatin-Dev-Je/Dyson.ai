import { pgTable, uuid, text, timestamp, real, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants.schema.js'
import { rawEvents } from './events.schema.js'

export const contextNodes = pgTable('context_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  rawEventId: uuid('raw_event_id').references(() => rawEvents.id),
  entityType: text('entity_type').notNull(),     // EntityType enum
  source: text('source').notNull(),              // EventSource enum
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),            // LLM-generated summary for retrieval
  sourceUrl: text('source_url'),                 // Deep link to original artifact
  metadata: jsonb('metadata'),
  occurredAt: timestamp('occurred_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('nodes_tenant_idx').on(table.tenantId),
  entityTypeIdx: index('nodes_entity_type_idx').on(table.tenantId, table.entityType),
  occurredIdx: index('nodes_occurred_idx').on(table.tenantId, table.occurredAt),
}))

export const causalEdges = pgTable('causal_edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sourceNodeId: uuid('source_node_id').notNull().references(() => contextNodes.id, { onDelete: 'cascade' }),
  targetNodeId: uuid('target_node_id').notNull().references(() => contextNodes.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // RelationshipType enum
  confidence: real('confidence').notNull(),              // 0â€“1, from cross-source linker
  // User can flag an edge as incorrect â€” feeds back to linker training
  isFlagged: text('is_flagged'),
  flaggedAt: timestamp('flagged_at'),
  flaggedBy: uuid('flagged_by'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('edges_tenant_idx').on(table.tenantId),
  sourceIdx: index('edges_source_idx').on(table.sourceNodeId),
  targetIdx: index('edges_target_idx').on(table.targetNodeId),
  // Only publish edges above confidence threshold
  confidenceIdx: index('edges_confidence_idx').on(table.tenantId, table.confidence),
}))

