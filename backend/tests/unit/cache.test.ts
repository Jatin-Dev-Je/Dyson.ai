import { describe, expect, it, vi, afterEach } from 'vitest'
import { TtlCache } from '@/infra/cache.js'

afterEach(() => vi.useRealTimers())

describe('TtlCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = new TtlCache<string, string>(1000)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('returns a value within TTL', () => {
    vi.useFakeTimers()
    const cache = new TtlCache<string, string>(1000)
    cache.set('k', 'v')
    vi.advanceTimersByTime(500)
    expect(cache.get('k')).toBe('v')
  })

  it('returns undefined after TTL expires', () => {
    vi.useFakeTimers()
    const cache = new TtlCache<string, string>(1000)
    cache.set('k', 'v')
    vi.advanceTimersByTime(1001)
    expect(cache.get('k')).toBeUndefined()
  })

  it('per-entry TTL overrides default TTL', () => {
    vi.useFakeTimers()
    const cache = new TtlCache<string, string>(10_000)
    cache.set('short', 'v', 500)
    vi.advanceTimersByTime(600)
    expect(cache.get('short')).toBeUndefined()
  })

  it('invalidate removes a key immediately', () => {
    vi.useFakeTimers()
    const cache = new TtlCache<string, number>(60_000)
    cache.set('k', 1)
    cache.invalidate('k')
    expect(cache.get('k')).toBeUndefined()
  })

  it('overwriting a key resets its TTL', () => {
    vi.useFakeTimers()
    const cache = new TtlCache<string, number>(1000)
    cache.set('k', 1)
    vi.advanceTimersByTime(800)
    cache.set('k', 2)                  // reset TTL
    vi.advanceTimersByTime(800)        // now 1600ms from first set
    expect(cache.get('k')).toBe(2)     // still alive — TTL restarted at 800ms mark
  })

  it('purgeExpired cleans up without evicting live entries', () => {
    vi.useFakeTimers()
    const cache = new TtlCache<string, number>(1000)
    cache.set('live', 1)
    cache.set('dead', 2, 100)
    vi.advanceTimersByTime(200)
    cache.purgeExpired()
    expect(cache.get('live')).toBe(1)   // live — still valid
    expect(cache.get('dead')).toBeUndefined()
  })
})

describe('API key cache contract', () => {
  it('invalidation is immediate — revoked key stops returning a value', () => {
    vi.useFakeTimers()
    const cache = new TtlCache<string, { tenantId: string; scopes: string[] }>(60_000)
    const key   = 'sha256hash_of_raw_key'

    cache.set(key, { tenantId: 'tenant-1', scopes: ['read'] })
    expect(cache.get(key)).toBeDefined()

    cache.invalidate(key)
    // Even within the 60s TTL, the key is gone
    expect(cache.get(key)).toBeUndefined()
  })
})
