import { eq, and, gt, isNull } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { tenants, users, refreshTokens, invitations } from '@/infra/db/schema/index.js'

// ─── Tenant queries ───────────────────────────────────────────────────────

export async function findTenantBySlug(slug: string) {
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)
  return row ?? null
}

export async function createTenantAndAdmin(opts: {
  tenantName:   string
  tenantSlug:   string
  userName:     string
  email:        string
  passwordHash: string
}) {
  return await db.transaction(async tx => {
    const [tenant] = await tx
      .insert(tenants)
      .values({ name: opts.tenantName, slug: opts.tenantSlug })
      .returning()

    if (!tenant) throw new Error('Failed to create tenant')

    const [user] = await tx
      .insert(users)
      .values({
        tenantId:     tenant.id,
        email:        opts.email,
        name:         opts.userName,
        passwordHash: opts.passwordHash,
        role:         'admin',
      })
      .returning()

    if (!user) throw new Error('Failed to create user')

    return { tenant, user }
  })
}

// ─── User queries ─────────────────────────────────────────────────────────

export async function findUserByEmail(email: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .limit(1)
  return row ?? null
}

// Find user by email across ALL tenants (for login)
export async function findUserByEmailGlobal(email: string) {
  const [row] = await db
    .select({
      id:              users.id,
      tenantId:        users.tenantId,
      email:           users.email,
      name:            users.name,
      passwordHash:    users.passwordHash,
      role:            users.role,
      avatarUrl:       users.avatarUrl,
      isActive:        users.isActive,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, true)))
    .limit(1)
  return row ?? null
}

// Includes passwordHash — only for internal auth operations (verify password, change password)
export async function findUserById(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .limit(1)
  return row ?? null
}

export async function markEmailVerified(userId: string) {
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
}

export async function updateUserLastSeen(userId: string) {
  await db
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, userId))
}

export async function updateUserPassword(userId: string, tenantId: string, passwordHash: string) {
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
}

// ─── Invitation acceptance ────────────────────────────────────────────────

// Creates the new user and marks the invitation accepted in a single transaction.
// If the email already has an account in the workspace, returns the existing user
// and still marks the invite accepted (idempotent re-accept is safe).
export async function acceptInvitationAndCreateUser(opts: {
  inviteId:     string
  tenantId:     string
  email:        string
  name:         string
  role:         'admin' | 'member' | 'viewer'
  passwordHash: string
}) {
  return await db.transaction(async tx => {
    // Check if user already exists (e.g., re-accepting a partially completed flow)
    const [existing] = await tx
      .select()
      .from(users)
      .where(and(eq(users.email, opts.email), eq(users.tenantId, opts.tenantId)))
      .limit(1)

    let user = existing

    if (!user) {
      const [created] = await tx
        .insert(users)
        .values({
          tenantId:     opts.tenantId,
          email:        opts.email,
          name:         opts.name,
          passwordHash: opts.passwordHash,
          role:         opts.role,
          isActive:     true,
        })
        .returning()

      if (!created) throw new Error('Failed to create user from invitation')
      user = created
    }

    await tx
      .update(invitations)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(invitations.id, opts.inviteId))

    return user
  })
}

// ─── Refresh token queries ────────────────────────────────────────────────

export async function storeRefreshToken(opts: {
  userId:    string
  tenantId:  string
  tokenHash: string
  userAgent: string | null
  ipAddress: string | null
  expiresAt: Date
}) {
  const [row] = await db.insert(refreshTokens).values(opts).returning()
  if (!row) throw new Error('storeRefreshToken returned no row')
  return row
}

// List active (non-revoked, non-expired) sessions for a user
export async function listActiveRefreshTokens(userId: string, tenantId: string) {
  return db
    .select({
      id:        refreshTokens.id,
      userAgent: refreshTokens.userAgent,
      ipAddress: refreshTokens.ipAddress,
      createdAt: refreshTokens.createdAt,
      expiresAt: refreshTokens.expiresAt,
    })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId,   userId),
        eq(refreshTokens.tenantId, tenantId),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      )
    )
    .orderBy(refreshTokens.createdAt)
}

// tokenHash is an HMAC-SHA256 hex digest — deterministic, so we can use eq() lookup
export async function findValidRefreshToken(tokenHash: string) {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      )
    )
    .limit(1)
  return row ?? null
}

export async function revokeRefreshToken(id: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, id))
}

export async function revokeAllUserTokens(userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
}
