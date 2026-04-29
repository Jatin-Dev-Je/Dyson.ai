import {
  pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex,
} from 'drizzle-orm/pg-core'

// --- Enums (enforced at DB level) -------------------------------------------
export const planEnum   = pgEnum('plan',          ['free', 'team', 'business', 'enterprise'])
export const roleEnum   = pgEnum('role',          ['admin', 'member', 'viewer'])
export const inviteEnum = pgEnum('invite_status', ['pending', 'accepted', 'expired', 'cancelled'])

// --- Tenants (workspaces) ----------------------------------------------------
export const tenants = pgTable('tenants', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  slug:      text('slug').notNull(),
  plan:      planEnum('plan').notNull().default('free'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  slugIdx: uniqueIndex('tenants_slug_idx').on(t.slug),
}))

// --- Users -------------------------------------------------------------------
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email:        text('email').notNull(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role:         roleEnum('role').notNull().default('member'),
  avatarUrl:    text('avatar_url'),
  isActive:     boolean('is_active').notNull().default(true),
  lastSeenAt:   timestamp('last_seen_at'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  emailTenantIdx: uniqueIndex('users_email_tenant_idx').on(t.email, t.tenantId),
  tenantIdx:      index('users_tenant_idx').on(t.tenantId),
}))

// --- Refresh tokens ----------------------------------------------------------
// Stored so tokens can be revoked on logout or security events
export const refreshTokens = pgTable('refresh_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id,   { onDelete: 'cascade' }),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),  // HMAC-SHA256(rawToken, JWT_SECRET) -- deterministic for O(1) lookup
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => ({
  userIdx:      index('refresh_tokens_user_idx').on(t.userId),
  tokenHashIdx: index('refresh_tokens_hash_idx').on(t.tokenHash),
}))

// --- Invitations -------------------------------------------------------------
export const invitations = pgTable('invitations', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invitedBy:  uuid('invited_by').notNull().references(() => users.id),
  email:      text('email').notNull(),
  role:       roleEnum('role').notNull().default('member'),
  token:      text('token').notNull(),  // secure random, single-use
  status:     inviteEnum('status').notNull().default('pending'),
  expiresAt:  timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, t => ({
  tokenIdx:  uniqueIndex('invitations_token_idx').on(t.token),
  tenantIdx: index('invitations_tenant_idx').on(t.tenantId),
}))

// --- Connected sources -------------------------------------------------------
export const connectedSources = pgTable('connected_sources', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  source:       text('source').notNull(),
  accessToken:  text('access_token').notNull(),  // encrypted
  metadata:     text('metadata'),                // JSON blob
  lastSyncedAt: timestamp('last_synced_at'),
  syncError:    text('sync_error'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  tenantSourceIdx: uniqueIndex('sources_tenant_source_idx').on(t.tenantId, t.source),
}))
