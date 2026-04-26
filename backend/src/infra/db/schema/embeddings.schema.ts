import { pgTable, uuid, text, timestamptz, index } from 'drizzle-orm/pg-core'
import { vector } from 'drizzle-orm/pg-core'
import { tenants } from './tenants.schema.js'
import { contextNodes } from './graph.schema.js'

export const nodeEmbeddings = pgTable('node_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  nodeId: uuid('node_id').notNull().references(() => contextNodes.id, { onDelete: 'cascade' }).unique(),
  // 1024 dimensions — Cohere embed-v3
  embedding: vector('embedding', { dimensions: 1024 }).notNull(),
  model: text('model').notNull().default('embed-english-v3.0'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('embeddings_tenant_idx').on(table.tenantId),
  // HNSW index created via raw SQL migration — Drizzle doesn't support it natively yet
  // See: migrations/0002_add_hnsw_index.sql
}))
