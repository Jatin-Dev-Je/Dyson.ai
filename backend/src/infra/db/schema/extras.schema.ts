import {
  pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { tenants, users } from './tenants.schema.js'

// ─── Onboarding packs ─────────────────────────────────────────────────────

export const onboardingPacks = pgTable('onboarding_packs', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  memberName:  text('member_name').notNull(),
  team:        text('team').notNull(),
  status:      text('status').notNull().default('generating'),  // generating | ready | failed
  sections:    jsonb('sections'),      // PackSection[]
  nodeIds:     jsonb('node_ids'),      // string[] — nodes used
  generatedAt: timestamp('generated_at'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, t => ({
  tenantIdx: index('packs_tenant_idx').on(t.tenantId),
}))

// ─── API keys ─────────────────────────────────────────────────────────────

export const apiKeys = pgTable('api_keys', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  createdBy:  uuid('created_by').notNull().references(() => users.id),
  name:       text('name').notNull(),
  keyPrefix:  text('key_prefix').notNull(),   // First 12 chars — shown in UI
  keyHash:    text('key_hash').notNull(),     // SHA256 of full key — never plaintext
  scopes:     text('scopes').array().notNull().default(['read']),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt:  timestamp('revoked_at'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, t => ({
  tenantIdx:    index('api_keys_tenant_idx').on(t.tenantId),
  keyHashIdx:   uniqueIndex('api_keys_hash_idx').on(t.keyHash),
}))

// ─── Notification preferences ─────────────────────────────────────────────
// One row per user — created on first save, defaults used if row absent.

export const notificationPrefs = pgTable('notification_prefs', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email:     jsonb('email').notNull().default({}),   // NotificationPrefs JSON
  slack:     jsonb('slack').notNull().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  userIdx:   uniqueIndex('notif_prefs_user_idx').on(t.userId),
  tenantIdx: index('notif_prefs_tenant_idx').on(t.tenantId),
}))

// ─── Audit log ────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  actorId:      uuid('actor_id').references(() => users.id),
  action:       text('action').notNull(),      // e.g. 'auth.login', 'why.query', 'decision.flagged'
  resourceType: text('resource_type'),         // e.g. 'decision', 'connector', 'user'
  resourceId:   text('resource_id'),
  metadata:     jsonb('metadata'),             // Extra context — never PII
  ipAddress:    text('ip_address'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, t => ({
  tenantIdx: index('audit_log_tenant_idx').on(t.tenantId),
  actionIdx: index('audit_log_action_idx').on(t.tenantId, t.action),
  timeIdx:   index('audit_log_time_idx').on(t.tenantId, t.createdAt),
}))
