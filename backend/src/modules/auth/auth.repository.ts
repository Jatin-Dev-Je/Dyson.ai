import { eq, and, gt, isNull } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { tenants, users, refreshTokens } from '@/infra/db/schema/index.js'

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
  // Single transaction — both succeed or both fail
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

// Find user by email across ALL tenants (for login without knowing workspace)
export async function findUserByEmailGlobal(email: string) {
  const [row] = await db
    .select({
      id:           users.id,
      tenantId:     users.tenantId,
      email:        users.email,
      name:         users.name,
      passwordHash: users.passwordHash,
      role:         users.role,
      avatarUrl:    users.avatarUrl,
      isActive:     users.isActive,
    })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, true)))
    .limit(1)
  return row ?? null
}

export async function findUserById(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .limit(1)
  return row ?? null
}

export async function updateUserLastSeen(userId: string) {
  await db
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, userId))
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
  return row!
}

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

// Revoke ALL tokens for a user (security event / logout all devices)
export async function revokeAllUserTokens(userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
}
