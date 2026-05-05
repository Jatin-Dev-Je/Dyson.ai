/**
 * Connector service unit tests — OAuth state signing + validation.
 * Tests the HMAC-signed state that protects against CSRF in OAuth flows.
 */
import { describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'

const JWT_SECRET = process.env['JWT_SECRET']!
const OAUTH_SUFFIX = 'oauth-state'

// Mirror the state helpers from connectors.service.ts (tested in isolation)
function buildOAuthState(tenantId: string): string {
  const payload = JSON.stringify({ tenantId, ts: Date.now() })
  const sig     = createHmac('sha256', JWT_SECRET + OAUTH_SUFFIX).update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

function parseOAuthState(state: string): { tenantId: string } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString()
    const idx     = decoded.lastIndexOf('|')
    const payload = decoded.slice(0, idx)
    const sig     = decoded.slice(idx + 1)
    const expected = createHmac('sha256', JWT_SECRET + OAUTH_SUFFIX).update(payload).digest('hex')
    const sigBuf   = Buffer.from(sig,      'hex')
    const expBuf   = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return null
    // Constant-time compare
    let diff = 0
    for (let i = 0; i < sigBuf.length; i++) diff |= (sigBuf[i] ?? 0) ^ (expBuf[i] ?? 0)
    if (diff !== 0) return null
    const parsed = JSON.parse(payload) as { tenantId: string; ts: number }
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return null
    return { tenantId: parsed.tenantId }
  } catch {
    return null
  }
}

describe('OAuth state — HMAC signing', () => {
  it('round-trips a tenantId correctly', () => {
    const state  = buildOAuthState('tenant-uuid-123')
    const result = parseOAuthState(state)
    expect(result?.tenantId).toBe('tenant-uuid-123')
  })

  it('rejects a tampered state', () => {
    const state   = buildOAuthState('tenant-uuid-123')
    const tampered = state.slice(0, -4) + 'xxxx'
    expect(parseOAuthState(tampered)).toBeNull()
  })

  it('rejects a base64-encoded plain JSON without HMAC', () => {
    const plain   = Buffer.from(JSON.stringify({ tenantId: 'attacker', ts: Date.now() })).toString('base64url')
    expect(parseOAuthState(plain)).toBeNull()
  })

  it('rejects an expired state', () => {
    const old     = JSON.stringify({ tenantId: 'tenant', ts: Date.now() - 11 * 60 * 1000 })
    const sig     = createHmac('sha256', JWT_SECRET + OAUTH_SUFFIX).update(old).digest('hex')
    const expired = Buffer.from(`${old}|${sig}`).toString('base64url')
    expect(parseOAuthState(expired)).toBeNull()
  })

  it('different tenantIds produce different state tokens', () => {
    const s1 = buildOAuthState('tenant-a')
    const s2 = buildOAuthState('tenant-b')
    expect(s1).not.toBe(s2)
  })
})
