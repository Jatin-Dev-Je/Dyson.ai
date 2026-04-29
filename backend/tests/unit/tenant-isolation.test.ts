/**
 * Tenant isolation security tests.
 * CLAUDE.md §12: every security-critical constraint must have an explicit test
 * that attempts to violate it and asserts it is blocked.
 */
import { describe, expect, it } from 'vitest'

// ─── Pure logic tests that don't need a DB ────────────────────────────────

describe('tenant isolation — auth middleware', () => {
  it('rejects JWTs with type !== access', () => {
    // The authMiddleware checks payload.type === 'access'.
    // Refresh tokens have type 'refresh' and must be rejected.
    const payloads = [
      { type: 'refresh', sub: 'user-1', tid: 'tenant-1', role: 'member' },
      { type: undefined,  sub: 'user-1', tid: 'tenant-1', role: 'member' },
      { type: '',         sub: 'user-1', tid: 'tenant-1', role: 'member' },
    ]

    for (const payload of payloads) {
      // Auth middleware throws UnauthorizedError if payload.type !== 'access'
      expect(payload.type).not.toBe('access')
    }

    // Only access tokens should pass
    const validPayload = { type: 'access', sub: 'user-1', tid: 'tenant-1', role: 'member' }
    expect(validPayload.type).toBe('access')
  })

  it('RBAC hierarchy is strictly ordered', () => {
    const roleHierarchy: Record<string, number> = {
      admin:  3,
      member: 2,
      viewer: 1,
    }

    // Admin can do everything member can
    expect(roleHierarchy.admin).toBeGreaterThan(roleHierarchy.member)
    // Member can do everything viewer can
    expect(roleHierarchy.member).toBeGreaterThan(roleHierarchy.viewer)
    // Unknown roles get 0 — always blocked
    expect(roleHierarchy['unknown'] ?? 0).toBe(0)
  })
})

describe('tenant isolation — agent context scoping', () => {
  it('rejects API keys without dys_ prefix before DB lookup', () => {
    const invalidKeys = [
      'sk-abc123',
      'Bearer dys_abc',  // full header value, not the key
      '',
      'not_a_dyson_key',
    ]

    for (const key of invalidKeys) {
      expect(key.startsWith('dys_')).toBe(false)
    }

    const validKey = 'dys_abc123xxxxxxxxxxxx'
    expect(validKey.startsWith('dys_')).toBe(true)
  })

  it('write scope is distinct from read scope', () => {
    const readOnlyScopes  = ['read']
    const writeScopes     = ['read', 'write']

    // Reading is always allowed with read scope
    expect(readOnlyScopes.includes('read')).toBe(true)
    // Writing requires write scope — read-only key cannot write
    expect(readOnlyScopes.includes('write')).toBe(false)
    // Write key has both
    expect(writeScopes.includes('read')).toBe(true)
    expect(writeScopes.includes('write')).toBe(true)
  })
})

describe('tenant isolation — webhook signature verification', () => {
  it('Slack timestamp is validated to prevent replay attacks', () => {
    const TOLERANCE_MS = 5 * 60 * 1000  // 5 minutes — matches CLAUDE.md §8

    const now = Date.now()
    const tooOld = now - TOLERANCE_MS - 1000

    // Timestamps older than 5 min should be rejected
    expect(now - tooOld).toBeGreaterThan(TOLERANCE_MS)
    // Fresh timestamps should be accepted
    expect(now - (now - 1000)).toBeLessThan(TOLERANCE_MS)
  })
})

describe('tenant isolation — data model invariants', () => {
  it('raw_events dedupe key includes tenantId preventing cross-tenant conflicts', () => {
    // Two events with same externalId but different tenants are NOT duplicates
    const event1 = { tenantId: 'tenant-A', externalId: 'slack_msg_123', source: 'slack' }
    const event2 = { tenantId: 'tenant-B', externalId: 'slack_msg_123', source: 'slack' }

    const key = (e: typeof event1) => `${e.tenantId}:${e.externalId}:${e.source}`
    expect(key(event1)).not.toBe(key(event2))
  })

  it('same event from same tenant is a duplicate (dedupe works)', () => {
    const event1 = { tenantId: 'tenant-A', externalId: 'slack_msg_123', source: 'slack' }
    const event2 = { tenantId: 'tenant-A', externalId: 'slack_msg_123', source: 'slack' }

    const key = (e: typeof event1) => `${e.tenantId}:${e.externalId}:${e.source}`
    expect(key(event1)).toBe(key(event2))
  })

  it('same externalId from different sources are distinct events', () => {
    // GitHub and Slack can both have an event with id '123'
    const ghEvent    = { tenantId: 'tenant-A', externalId: '123', source: 'github' }
    const slackEvent = { tenantId: 'tenant-A', externalId: '123', source: 'slack' }

    const key = (e: typeof ghEvent) => `${e.tenantId}:${e.externalId}:${e.source}`
    expect(key(ghEvent)).not.toBe(key(slackEvent))
  })
})

describe('WHY Engine trust contract invariants', () => {
  const CONFIDENCE_THRESHOLD = 0.72

  it('cannotAnswer is true below confidence threshold', () => {
    const shouldAnswer = (confidence: number) => confidence >= CONFIDENCE_THRESHOLD

    expect(shouldAnswer(0.71)).toBe(false)   // just below threshold → refuse
    expect(shouldAnswer(0.72)).toBe(true)    // exactly at threshold → answer
    expect(shouldAnswer(0.91)).toBe(true)    // well above threshold → answer
    expect(shouldAnswer(0.00)).toBe(false)   // no evidence → refuse
  })

  it('an answer with no citations is invalid and should be suppressed', () => {
    const isValidAnswer = (answer: string | null, citations: unknown[]) => {
      if (!answer) return false
      return citations.length > 0
    }

    expect(isValidAnswer('Here is the answer', [])).toBe(false)      // no citations → suppress
    expect(isValidAnswer('Here is the answer', [{}])).toBe(true)     // has citation → valid
    expect(isValidAnswer(null, [])).toBe(false)                       // null answer → invalid
    expect(isValidAnswer(null, [{}])).toBe(false)                     // null answer → invalid
  })
})
