import { createHmac, timingSafeEqual } from 'node:crypto'
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
  listActiveRefreshTokens,
  acceptInvitationAndCreateUser,
  updateUserPassword,
} from './auth.repository.js'
import { sendPasswordResetEmail } from '@/infra/email.js'
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

// ─── Password reset ───────────────────────────────────────────────────────

// Stateless reset token: base64url( userId:tenantId:expiresAt:HMAC )
// HMAC secret includes current passwordHash so the token auto-invalidates
// once the password is changed — no extra DB table required.

function issuePasswordResetToken(userId: string, tenantId: string, passwordHash: string): string {
  const expiresAt = Date.now() + 30 * 60 * 1000 // 30 minutes
  const payload   = `${userId}:${tenantId}:${expiresAt}`
  const sig       = createHmac('sha256', env.JWT_SECRET + passwordHash).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

function verifyPasswordResetToken(
  token: string,
  passwordHash: string
): { userId: string; tenantId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const lastColon = decoded.lastIndexOf(':')
    const payload   = decoded.slice(0, lastColon)
    const sig       = decoded.slice(lastColon + 1)
    const parts     = payload.split(':')
    if (parts.length !== 3) return null
    const [userId, tenantId, expiresAtStr] = parts
    if (!userId || !tenantId || !expiresAtStr) return null

    const expected = createHmac('sha256', env.JWT_SECRET + passwordHash).update(payload).digest('hex')
    const sigBuf   = Buffer.from(sig,      'hex')
    const expBuf   = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
    if (Date.now() > parseInt(expiresAtStr, 10)) return null

    return { userId, tenantId }
  } catch {
    return null
  }
}

export async function forgotPassword(email: string, appUrl: string): Promise<void> {
  const user = await findUserByEmailGlobal(email)

  // Always return success — don't leak whether the email exists
  if (!user) return

  const resetToken = issuePasswordResetToken(user.id, user.tenantId, user.passwordHash)

  // Non-blocking — fire and forget; don't delay the HTTP response
  void sendPasswordResetEmail({
    to:         user.email,
    name:       user.name,
    resetToken,
    appUrl,
  }).catch(err => {
    console.error('[auth] Failed to send password reset email:', err)
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // We need the user's current passwordHash to verify the token,
  // but we don't know who the user is yet — so we decode the payload first
  // (without verifying the signature) to get the userId, then load the user,
  // then verify the signature with the real passwordHash.
  let userId: string
  let tenantId: string
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const lastColon = decoded.lastIndexOf(':')
    const payload   = decoded.slice(0, lastColon)
    const parts     = payload.split(':')
    if (parts.length !== 3 || !parts[0] || !parts[1]) {
      throw new DysonError('INVALID_TOKEN', 'Password reset link is invalid or expired', 400)
    }
    userId   = parts[0]
    tenantId = parts[1]
  } catch (err) {
    if (err instanceof DysonError) throw err
    throw new DysonError('INVALID_TOKEN', 'Password reset link is invalid or expired', 400)
  }

  const user = await findUserById(userId, tenantId)
  if (!user) {
    throw new DysonError('INVALID_TOKEN', 'Password reset link is invalid or expired', 400)
  }

  // Now verify the full token (including signature) with the real passwordHash
  const verified = verifyPasswordResetToken(token, user.passwordHash)
  if (!verified) {
    throw new DysonError('INVALID_TOKEN', 'Password reset link is invalid or expired', 400)
  }

  const newHash = await hashPassword(newPassword)
  await updateUserPassword(userId, tenantId, newHash)
  await revokeAllUserTokens(userId)
}

// ─── Active sessions ──────────────────────────────────────────────────────

export async function listSessions(userId: string, tenantId: string) {
  return listActiveRefreshTokens(userId, tenantId)
}

export async function revokeSession(sessionId: string, userId: string, tenantId: string): Promise<void> {
  // Load active tokens so we can verify ownership before revoking
  const sessions = await listActiveRefreshTokens(userId, tenantId)
  const session  = sessions.find(s => s.id === sessionId)
  if (!session) {
    throw new DysonError('NOT_FOUND', 'Session not found', 404)
  }
  await revokeRefreshToken(sessionId)
}
