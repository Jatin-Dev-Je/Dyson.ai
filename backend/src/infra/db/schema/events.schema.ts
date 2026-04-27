import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants.schema.js'

export const rawEvents = pgTable('raw_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),    // Stable ID from source system
  source: text('source').notNull(),              // EventSource enum
  entityType: text('entity_type').notNull(),     // EntityType enum
  content: text('content').notNull(),            // Raw text content
  metadata: jsonb('metadata'),                   // Source-specific fields (channel, repo, etc.)
  status: text('status').notNull().default('pending'), // IngestionStatus enum
  occurredAt: timestamp('occurred_at').notNull(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('raw_events_tenant_idx').on(table.tenantId),
  // Deduplication: same external event never ingested twice per tenant
  dedupeIdx: index('raw_events_dedupe_idx').on(table.tenantId, table.externalId, table.source),
  statusIdx: index('raw_events_status_idx').on(table.tenantId, table.status),
  occurredIdx: index('raw_events_occurred_idx').on(table.tenantId, table.occurredAt),
}))

