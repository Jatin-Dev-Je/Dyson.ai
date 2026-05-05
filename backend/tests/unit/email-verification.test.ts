/**
 * Email verification token unit tests — stateless HMAC token signing.
 * Mirrors the logic in auth.service.ts without importing it directly
 * (to keep tests fast and dependency-free).
 */
import { describe, expect, it } from 'vitest'
import { createHmac, timingSafeEqual } from 'node:crypto'

const JWT_SECRET = process.env['JWT_SECRET']!
const SUFFIX = 'email-verify'

function issueToken(userId: string, email: string, ttlMs = 24 * 60 * 60 * 1000): string {
  const expiresAt = Date.now() + ttlMs
  const payload   = `${userId}:${email}:${expiresAt}`
  const sig       = createHmac('sha256', JWT_SECRET + SUFFIX).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const lastColon = decoded.lastIndexOf(':')
    const payload   = decoded.slice(0, lastColon)
    const sig       = decoded.slice(lastColon + 1)
    const parts     = payload.split(':')
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null
    const [userId, email, expiresAtStr] = parts as [string, string, string]
    const expected = createHmac('sha256', JWT_SECRET + SUFFIX).update(payload).digest('hex')
    const sigBuf   = Buffer.from(sig,      'hex')
    const expBuf   = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
    if (Date.now() > parseInt(expiresAtStr, 10)) return null
    return { userId, email }
  } catch {
    return null
  }
}

describe('email verification token', () => {
  it('round-trips userId and email', () => {
    const token = issueToken('user-abc', 'alex@acme.com')
    const result = verifyToken(token)
    expect(result?.userId).toBe('user-abc')
    expect(result?.email).toBe('alex@acme.com')
  })

  it('rejects an expired token', () => {
    const expired = issueToken('user-abc', 'alex@acme.com', -1000) // already expired
    expect(verifyToken(expired)).toBeNull()
  })

  it('rejects a tampered token', () => {
    const token   = issueToken('user-abc', 'alex@acme.com')
    const tampered = token.slice(0, -4) + 'xxxx'
    expect(verifyToken(tampered)).toBeNull()
  })

  it('rejects a token with different email (invalidates after email change)', () => {
    const token = issueToken('user-abc', 'old@acme.com')
    // Decode and swap email
    const decoded = Buffer.from(token, 'base64url').toString()
    const lastColon = decoded.lastIndexOf(':')
    const payload   = decoded.slice(0, lastColon)
    const parts     = payload.split(':')
    // Rebuild with different email but same sig
    const tampered  = Buffer.from(`${parts[0]}:new@acme.com:${parts[2]}:${decoded.slice(lastColon + 1)}`).toString('base64url')
    expect(verifyToken(tampered)).toBeNull()
  })

  it('different userIds produce different tokens', () => {
    const t1 = issueToken('user-1', 'same@acme.com')
    const t2 = issueToken('user-2', 'same@acme.com')
    expect(t1).not.toBe(t2)
  })
})
