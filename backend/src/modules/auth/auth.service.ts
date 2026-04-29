import { createHmac } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'
import type { FastifyInstance } from 'fastify'
import {
  findTenantBySlug,
  createTenantAndAdmin,
  findUserByEmailGlobal,
  findUserById,
  updateUserLastSeen,
  storeRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  acceptInvitationAndCreateUser,
  updateUserPassword,
} from './auth.repository.js'
import { findInvitationByToken } from '@/modules/users/users.repository.js'
import { env } from '@/config/env.js'
import { DysonError } from '@/shared/errors.js'
import type { SignupInput, LoginInput, AcceptInviteInput, ChangePasswordInput } from './auth.schema.js'
import type { TokenPair, AuthUser, JwtPayload } from './auth.types.js'

const BCRYPT_ROUNDS      = 12
const ACCESS_TOKEN_TTL   = 15 * 60        // 15 minutes in seconds
const REFRESH_TOKEN_TTL  = 30 * 24 * 3600 // 30 days in seconds

// ─── Password utilities ───────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

// Timing-safe comparison — prevents timing attacks
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ─── Token utilities ──────────────────────────────────────────────────────

function issueAccessToken(app: FastifyInstance, payload: Omit<JwtPayload, 'type'>): string {
  return app.jwt.sign(
    { ...payload, type: 'access' },
    { expiresIn: ACCESS_TOKEN_TTL }
  )
}

// HMAC-SHA256 of the raw token — deterministic, so we can look it up in the DB
// with a simple equality query. bcrypt is intentionally NOT used here because
// bcrypt is not deterministic: two hashes of the same input differ, making
// indexed DB lookup impossible without scanning every row.
function hashRefreshToken(rawToken: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(rawToken).digest('hex')
}

async function issueRefreshToken(
  userId: string,
  tenantId: string,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<string> {
  const rawToken  = `${createId()}.${createId()}.${Date.now()}`
  const tokenHash = hashRefreshToken(rawToken)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000)

  await storeRefreshToken({
    userId,
    tenantId,
    tokenHash,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt,
  })

  return rawToken
}

async function buildTokenPair(
  app: FastifyInstance,
  user: { id: string; tenantId: string; role: string },
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<TokenPair> {
  const accessToken  = issueAccessToken(app, {
    sub:  user.id,
    tid:  user.tenantId,
    role: user.role as JwtPayload['role'],
  })
  const refreshToken = await issueRefreshToken(user.id, user.tenantId, meta)

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL }
}

// ─── Auth operations ──────────────────────────────────────────────────────

export async function signup(
  app: FastifyInstance,
  input: SignupInput,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<{ tokens: TokenPair; user: AuthUser }> {
  const existing = await findTenantBySlug(input.workspaceSlug)
  if (existing) {
    throw new DysonError('SLUG_TAKEN', 'This workspace URL is already taken', 409)
  }

  const passwordHash = await hashPassword(input.password)

  const { tenant, user } = await createTenantAndAdmin({
    tenantName:   input.workspaceName,
    tenantSlug:   input.workspaceSlug,
    userName:     input.name,
    email:        input.email,
    passwordHash,
  })

  const tokens = await buildTokenPair(app, user, meta)

  return {
    tokens,
    user: {
      id:        user.id,
      tenantId:  tenant.id,
      email:     user.email,
      name:      user.name,
      role:      user.role,
      avatarUrl: user.avatarUrl ?? null,
    },
  }
}

export async function login(
  app: FastifyInstance,
  input: LoginInput,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<{ tokens: TokenPair; user: AuthUser }> {
  const user = await findUserByEmailGlobal(input.email)

  // Constant-time path even when user doesn't exist — prevents user enumeration via timing
  const dummyHash = '$2b$12$invalidhashfortimingneutrality000000000000000000000'
  const isValid   = user
    ? await verifyPassword(input.password, user.passwordHash)
    : await bcrypt.compare(input.password, dummyHash).then(() => false)

  if (!user || !isValid) {
    throw new DysonError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401)
  }

  if (!user.isActive) {
    throw new DysonError('ACCOUNT_DISABLED', 'This account has been disabled', 403)
  }

  const tokens = await buildTokenPair(app, user, meta)

  void updateUserLastSeen(user.id)

  return {
    tokens,
    user: {
      id:        user.id,
      tenantId:  user.tenantId,
      email:     user.email,
      name:      user.name,
      role:      user.role,
      avatarUrl: user.avatarUrl ?? null,
    },
  }
}

export async function refresh(
  app: FastifyInstance,
  rawToken: string,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<TokenPair> {
  // HMAC the raw token to produce the same hash that was stored on issue
  const tokenHash = hashRefreshToken(rawToken)
  const stored    = await findValidRefreshToken(tokenHash)

  if (!stored) {
    throw new DysonError('INVALID_TOKEN', 'Refresh token is invalid or expired', 401)
  }

  const user = await findUserById(stored.userId, stored.tenantId)
  if (!user) {
    throw new DysonError('INVALID_TOKEN', 'Refresh token is invalid or expired', 401)
  }

  // Rotation: revoke old token, issue new pair
  await revokeRefreshToken(stored.id)
  return buildTokenPair(app, user, meta)
}

export async function logout(userId: string) {
  await revokeAllUserTokens(userId)
}

export async function getMe(userId: string, tenantId: string): Promise<AuthUser> {
  const user = await findUserById(userId, tenantId)
  if (!user) {
    throw new DysonError('NOT_FOUND', 'User not found', 404)
  }
  return {
    id:        user.id,
    tenantId:  user.tenantId,
    email:     user.email,
    name:      user.name,
    role:      user.role,
    avatarUrl: user.avatarUrl ?? null,
  }
}

export async function getInviteInfo(token: string) {
  const invite = await findInvitationByToken(token)

  if (!invite) {
    throw new DysonError('NOT_FOUND', 'Invitation not found or already used', 404)
  }
  if (invite.status !== 'pending') {
    throw new DysonError('INVITE_USED', 'This invitation has already been used or cancelled', 410)
  }
  if (invite.expiresAt < new Date()) {
    throw new DysonError('INVITE_EXPIRED', 'This invitation has expired', 410)
  }

  return {
    email:    invite.email,
    role:     invite.role,
    tenantId: invite.tenantId,
  }
}

export async function acceptInvite(
  app: FastifyInstance,
  input: AcceptInviteInput,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<{ tokens: TokenPair; user: AuthUser }> {
  const invite = await findInvitationByToken(input.token)

  if (!invite) {
    throw new DysonError('NOT_FOUND', 'Invitation not found or already used', 404)
  }
  if (invite.status !== 'pending') {
    throw new DysonError('INVITE_USED', 'This invitation has already been used or cancelled', 410)
  }
  if (invite.expiresAt < new Date()) {
    throw new DysonError('INVITE_EXPIRED', 'This invitation has expired', 410)
  }

  const passwordHash = await hashPassword(input.password)

  const user = await acceptInvitationAndCreateUser({
    inviteId:     invite.id,
    tenantId:     invite.tenantId,
    email:        invite.email,
    name:         input.name,
    role:         invite.role,
    passwordHash,
  })

  const tokens = await buildTokenPair(app, user, meta)

  return {
    tokens,
    user: {
      id:        user.id,
      tenantId:  user.tenantId,
      email:     user.email,
      name:      user.name,
      role:      user.role,
      avatarUrl: user.avatarUrl ?? null,
    },
  }
}

export async function changePassword(
  userId: string,
  tenantId: string,
  input: ChangePasswordInput
): Promise<void> {
  const user = await findUserById(userId, tenantId)
  if (!user) {
    throw new DysonError('NOT_FOUND', 'User not found', 404)
  }

  const isValid = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!isValid) {
    throw new DysonError('INVALID_CREDENTIALS', 'Current password is incorrect', 401)
  }

  const newHash = await hashPassword(input.newPassword)
  await updateUserPassword(userId, tenantId, newHash)

  // Revoke all existing refresh tokens — force re-login on all devices
  await revokeAllUserTokens(userId)
}
