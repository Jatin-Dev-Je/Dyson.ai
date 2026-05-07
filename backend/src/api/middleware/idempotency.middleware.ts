/**
 * Idempotency middleware for write operations (POST endpoints).
 *
 * Clients send `Idempotency-Key: <uuid>` with write requests. If the same
 * key is seen again within 24 hours, the original response is returned
 * without re-executing the handler.
 *
 * Engineering tradeoff:
 *   Network retries from clients are safe — no duplicate memories, no
 *   duplicate invitations. The cost is a Redis read on every POST that
 *   opts in. We store the full response body (~1-5 KB) in Redis with a
 *   24h TTL — negligible storage cost.
 *
 *   We don't enforce idempotency on ALL routes (GET is inherently
 *   idempotent; DELETE is idempotent by HTTP spec). Only mount this on
 *   POSTs that create resources.
 *
 * Usage in route files:
 *   app.post('/memory', { preHandler: [authMiddleware, idempotency()] }, handler)
 *
 * Client usage:
 *   POST /api/v1/memory
 *   Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
 *   Content-Type: application/json
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import { getRedisClient } from '@/infra/redis.js'

const KEY_TTL_SECONDS = 86_400   // 24 hours
const KEY_PREFIX      = 'idem:'

function isValidKey(key: string): boolean {
  // Accept UUID v4 or any alphanumeric + hyphen string 8-128 chars
  return /^[a-zA-Z0-9\-_]{8,128}$/.test(key)
}

/**
 * Returns a Fastify preHandler hook that enforces idempotency.
 * Only applies when the client sends an Idempotency-Key header.
 */
export function idempotency() {
  return async function idempotencyHook(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const rawKey = request.headers['idempotency-key']
    if (!rawKey || typeof rawKey !== 'string') return   // key is optional

    if (!isValidKey(rawKey)) {
      return reply.status(400).send({
        error: {
          code:    'INVALID_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key must be 8–128 alphanumeric characters',
        },
      })
    }

    const redis = getRedisClient()
    if (!redis) return   // Redis not configured — skip idempotency (graceful degrade)

    const tenantId  = (request.user as { tid?: string } | undefined)?.tid ?? 'anon'
    const storeKey  = `${KEY_PREFIX}${tenantId}:${rawKey}`

    const cached = await redis.get(storeKey).catch(() => null)
    if (cached) {
      try {
        const { statusCode, body } = JSON.parse(cached) as { statusCode: number; body: unknown }
        reply.header('Idempotent-Replayed', 'true')
        return reply.status(statusCode).send(body)
      } catch {
        // Corrupted cache entry — proceed as normal, will be overwritten
      }
    }

    // After the handler runs, intercept the response to cache it
    const originalSend = reply.send.bind(reply)

    reply.send = function (payload?: unknown) {
      const statusCode = reply.statusCode

      // Only cache successful 2xx responses — don't cache errors
      if (statusCode >= 200 && statusCode < 300 && redis) {
        const serialised = JSON.stringify({ statusCode, body: payload })
        void redis.setex(storeKey, KEY_TTL_SECONDS, serialised).catch(() => {
          // Cache write failure is non-fatal — idempotency just won't work for this key
        })
      }

      return originalSend(payload)
    }
  }
}
