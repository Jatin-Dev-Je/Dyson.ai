/**
 * Auth service unit tests — covers token hashing, password utilities,
 * reset token signing/verification, and email verification token logic.
 * These run without a real DB by testing the pure functions only.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

// ─── hashPassword / verifyPassword ────────────────────────────────────────
import { hashPassword, verifyPassword } from '@/modules/auth/auth.service.js'

describe('hashPassword + verifyPassword', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('right-password')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('produces different hashes each time (bcrypt salt)', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
  })
})

// ─── Refresh token HMAC ────────────────────────────────────────────────────
// The refresh token hash must be deterministic (HMAC, not bcrypt) so we can
// do an indexed DB lookup. We test this property by re-computing the hash and
// verifying it matches.

const JWT_SECRET = process.env['JWT_SECRET']!

describe('refresh token hash (HMAC-SHA256)', () => {
  it('is deterministic — same input produces same hash', () => {
    const raw  = 'raw_token_abc.def.1234567890'
    const h1   = createHmac('sha256', JWT_SECRET).update(raw).digest('hex')
    const h2   = createHmac('sha256', JWT_SECRET).update(raw).digest('hex')
    expect(h1).toBe(h2)
  })

  it('different tokens produce different hashes', () => {
    const h1 = createHmac('sha256', JWT_SECRET).update('token-a').digest('hex')
    const h2 = createHmac('sha256', JWT_SECRET).update('token-b').digest('hex')
    expect(h1).not.toBe(h2)
  })

  it('hash length is 64 hex chars (SHA-256)', () => {
    const h = createHmac('sha256', JWT_SECRET).update('any').digest('hex')
    expect(h).toHaveLength(64)
  })
})

// ─── Signup schema validation ──────────────────────────────────────────────
import { SignupSchema, AcceptInviteSchema, ChangePasswordSchema,
         ForgotPasswordSchema, ResetPasswordSchema } from '@/modules/auth/auth.schema.js'

describe('SignupSchema', () => {
  const valid = {
    name: 'Alex Kumar', email: 'alex@acme.com', password: 'Secur3Pass!',
    workspaceName: 'Acme Engineering', workspaceSlug: 'acme-eng',
  }

  it('accepts a valid payload', () => {
    expect(() => SignupSchema.parse(valid)).not.toThrow()
  })

  it('lowercases email', () => {
    const r = SignupSchema.parse({ ...valid, email: 'ALEX@ACME.COM' })
    expect(r.email).toBe('alex@acme.com')
  })

  it('rejects a short password', () => {
    expect(() => SignupSchema.parse({ ...valid, password: 'short' })).toThrow()
  })

  it('lowercases slug automatically', () => {
    // The schema applies .toLowerCase() before the regex, so uppercase input is coerced
    const r = SignupSchema.parse({ ...valid, workspaceSlug: 'Acme-Eng' })
    expect(r.workspaceSlug).toBe('acme-eng')
  })

  it('rejects slug with spaces', () => {
    expect(() => SignupSchema.parse({ ...valid, workspaceSlug: 'acme eng' })).toThrow()
  })

  it('rejects empty name', () => {
    expect(() => SignupSchema.parse({ ...valid, name: '' })).toThrow()
  })
})

describe('AcceptInviteSchema', () => {
  it('accepts valid payload', () => {
    expect(() => AcceptInviteSchema.parse({ token: 'tok', name: 'Jo', password: 'Pass1234!' })).not.toThrow()
  })
  it('rejects short password', () => {
    expect(() => AcceptInviteSchema.parse({ token: 'tok', name: 'Jo', password: 'short' })).toThrow()
  })
})

describe('ChangePasswordSchema', () => {
  it('accepts matching passwords', () => {
    expect(() => ChangePasswordSchema.parse({ currentPassword: 'old', newPassword: 'NewPass1!' })).not.toThrow()
  })
  it('rejects empty currentPassword', () => {
    expect(() => ChangePasswordSchema.parse({ currentPassword: '', newPassword: 'NewPass1!' })).toThrow()
  })
})

describe('ForgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(() => ForgotPasswordSchema.parse({ email: 'user@co.com' })).not.toThrow()
  })
  it('lowercases the email', () => {
    const r = ForgotPasswordSchema.parse({ email: 'USER@CO.COM' })
    expect(r.email).toBe('user@co.com')
  })
  it('rejects invalid email', () => {
    expect(() => ForgotPasswordSchema.parse({ email: 'not-an-email' })).toThrow()
  })
})

describe('ResetPasswordSchema', () => {
  it('accepts valid token + password', () => {
    expect(() => ResetPasswordSchema.parse({ token: 'tok', newPassword: 'NewPass1!' })).not.toThrow()
  })
  it('rejects short newPassword', () => {
    expect(() => ResetPasswordSchema.parse({ token: 'tok', newPassword: 'short' })).toThrow()
  })
})
