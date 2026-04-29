import { eq, and, gt, asc } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { users, invitations } from '@/infra/db/schema/index.js'
import { createId } from '@paralleldrive/cuid2'

// ─── User queries ─────────────────────────────────────────────────────────

// Safe projection — never return passwordHash to route handlers
const safeUserColumns = {
  id:        users.id,
  tenantId:  users.tenantId,
  email:     users.email,
  name:      users.name,
  role:      users.role,
  avatarUrl: users.avatarUrl,
  isActive:  users.isActive,
  lastSeenAt:users.lastSeenAt,
  createdAt: users.createdAt,
}

export async function findUserById(id: string, tenantId: string) {
  const [row] = await db
    .select(safeUserColumns)
    .from(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}

export async function listTenantUsers(tenantId: string, opts: { cursor?: string; limit: number }) {
  const rows = await db
    .select(safeUserColumns)
    .from(users)
    .where(
      opts.cursor
        ? and(eq(users.tenantId, tenantId), gt(users.id, opts.cursor))
        : eq(users.tenantId, tenantId)
    )
    .orderBy(asc(users.createdAt))
    .limit(opts.limit + 1)  // fetch one extra to determine hasMore

  const hasMore = rows.length > opts.limit
  return {
    users:    hasMore ? rows.slice(0, opts.limit) : rows,
    nextCursor: hasMore ? rows[opts.limit - 1]?.id ?? null : null,
    hasMore,
  }
}

export async function updateUser(
  id: string,
  tenantId: string,
  data: { name?: string; avatarUrl?: string | null }
) {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, avatarUrl: users.avatarUrl })
  return updated ?? null
}

export async function deactivateUser(id: string, tenantId: string) {
  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
}

// ─── Invitation queries ───────────────────────────────────────────────────

export async function createInvitation(opts: {
  tenantId:  string
  invitedBy: string
  email:     string
  role:      'admin' | 'member' | 'viewer'
}) {
  const token     = `inv_${createId()}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const [invite] = await db
    .insert(invitations)
    .values({ ...opts, token, expiresAt })
    .returning()
  if (!invite) throw new Error('createInvitation returned no row')
  return invite
}

export async function findInvitationByToken(token: string) {
  const [row] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1)
  return row ?? null
}
