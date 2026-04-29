/**
 * Minimal in-process TTL cache — no external dependency.
 * Use only for hot read paths where stale data for ≤60s is acceptable:
 *   • API key validation (validateApiKey) — prevents a DB round-trip on every
 *     agent request. Keys can only be revoked server-side; 60s staleness is fine.
 *   • Workspace overview / recent decisions — dashboard widgets, agent context.
 *
 * Not suitable for: auth tokens, security-sensitive data, anything needing
 * cross-instance consistency (use Redis in production multi-replica setups).
 */

interface CacheEntry<T> {
  value:     T
  expiresAt: number
}

export class TtlCache<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>()

  constructor(private readonly defaultTtlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: K, value: V, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  invalidate(key: K): void {
    this.store.delete(key)
  }

  // Purge expired entries — call periodically if the cache is long-lived.
  purgeExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }
}

// ─── Singletons used across the app ──────────────────────────────────────

/** API key → { tenantId, scopes }. 60s TTL. */
export const apiKeyCache = new TtlCache<string, { tenantId: string; scopes: string[] }>(60_000)

/** Tenant recent-decisions cache (per-tenant key). 30s TTL. */
export const recentDecisionsCache = new TtlCache<string, unknown>(30_000)
