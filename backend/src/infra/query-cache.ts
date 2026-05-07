/**
 * WHY Engine query result cache.
 *
 * Caches full recall results per (tenantId, questionHash) so identical
 * questions from the same workspace don't re-execute the full retrieval
 * + LLM pipeline on every call.
 *
 * TTL: 5 minutes — short enough that stale answers don't mislead,
 * long enough to absorb repeated queries (e.g. 10 engineers asking the
 * same onboarding question on the same morning).
 *
 * Engineering tradeoff:
 *   Cache hits skip vector search + graph traversal + Gemini call.
 *   Typical recall latency is 2–8s — cache hits are <1ms.
 *   Risk: stale answer if a new memory is ingested in the TTL window.
 *   Accept: 5-minute staleness is acceptable for institutional memory
 *   (decisions don't change minute-to-minute).
 *
 * Key structure: `recall:{tenantId}:{sha256(question.toLowerCase().trim())}`
 * Scoped to tenant — cross-tenant cache poisoning is impossible.
 */

import { createHash } from 'crypto'
import { TtlCache } from './cache.js'
import type { WhyEngineResult } from '@/modules/why/why.types.js'

const RECALL_TTL_MS = 5 * 60 * 1_000   // 5 minutes

// In-memory cache — acceptable for a single-instance deployment.
// For multi-replica Cloud Run: replace with Redis (same interface, swap backing store).
const _cache = new TtlCache<string, WhyEngineResult>(RECALL_TTL_MS)

function questionKey(tenantId: string, question: string): string {
  const hash = createHash('sha256')
    .update(question.toLowerCase().trim())
    .digest('hex')
    .slice(0, 16)   // 64-bit prefix — collision probability negligible at our scale
  return `recall:${tenantId}:${hash}`
}

export const queryResultCache = {
  get(tenantId: string, question: string): WhyEngineResult | undefined {
    return _cache.get(questionKey(tenantId, question))
  },

  set(tenantId: string, question: string, result: WhyEngineResult): void {
    // Don't cache failed or low-confidence results — they may improve
    // as new memories are ingested.
    if (result.cannotAnswer) return
    _cache.set(questionKey(tenantId, question), result)
  },

  /** Invalidate when new memories are written to this tenant's graph. */
  invalidateTenant(_tenantId: string): void {
    // TtlCache doesn't support prefix deletion — purge expired entries
    // and accept that new memories may briefly return stale answers.
    // At 5-minute TTL this is acceptable; at 30s TTL it's not.
    _cache.purgeExpired()
  },
}
