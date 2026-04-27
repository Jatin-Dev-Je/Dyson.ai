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
} from './auth.repository.js'
import { DysonError } from '@/shared/errors.js'
import type { SignupInput, LoginInput } from './auth.schema.js'
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

async function issueRefreshToken(
  app: FastifyInstance,
  userId: string,
  tenantId: string,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<string> {
  // Raw token — sent to client once, never stored plaintext
  const rawToken = `${createId()}.${createId()}.${Date.now()}`

  // Only the hash is stored — same principle as password hashing
  const tokenHash = await bcrypt.hash(rawToken, 10)

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
  const refreshToken = await issueRefreshToken(app, user.id, user.tenantId, meta)

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL }
}

// ─── Auth operations ──────────────────────────────────────────────────────

export async function signup(
  app: FastifyInstance,
  input: SignupInput,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<{ tokens: TokenPair; user: AuthUser }> {
  // Slug must be unique
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
      avatarUrl: user.avatarUrl,
    },
  }
}

export async function login(
  app: FastifyInstance,
  input: LoginInput,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<{ tokens: TokenPair; user: AuthUser }> {
  const user = await findUserByEmailGlobal(input.email)

  // Use constant-time comparison even when user doesn't exist
  // to prevent user enumeration via timing
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

  // Non-blocking — don't await, don't fail the request if it errors
  void updateUserLastSeen(user.id)

  return {
    tokens,
    user: {
      id:        user.id,
      tenantId:  user.tenantId,
      email:     user.email,
      name:      user.name,
      role:      user.role,
      avatarUrl: user.avatarUrl,
    },
  }
}

export async function refresh(
  app: FastifyInstance,
  rawToken: string,
  meta: { userAgent: string | null; ipAddress: string | null }
): Promise<TokenPair> {
  // Find all active tokens for potential match (can't query by hash directly)
  // We store a hash so we do a lookup + bcrypt compare
  // For performance at scale, switch to HMAC instead of bcrypt for refresh tokens
  const stored = await findValidRefreshToken(rawToken)

  if (!stored) {
    throw new DysonError('INVALID_TOKEN', 'Refresh token is invalid or expired', 401)
  }

  const isValid = await bcrypt.compare(rawToken, stored.tokenHash)
  if (!isValid) {
    // Token hash mismatch — potential token theft. Revoke everything.
    await revokeAllUserTokens(stored.userId)
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
