/**
 * Redis client singleton — used for distributed rate limiting across
 * multiple Cloud Run instances.
 *
 * Optional: if REDIS_URL is not set the app starts normally and
 * @fastify/rate-limit falls back to in-memory storage (fine for a
 * single-instance dev environment, not for multi-replica production).
 *
 * Recommended providers:
 *   - Upstash Redis (serverless, pay-per-request, works with Cloud Run
 *     without a VPC connector): rediss://default:<token>@<host>.upstash.io:6380
 *   - Google Cloud Memorystore (requires VPC connector):
 *     redis://<ip>:6379
 */
import { Redis } from 'ioredis'
import type { Redis as RedisClient } from 'ioredis'

let _client: RedisClient | null = null

export function getRedisClient(): RedisClient | null {
  const url = process.env['REDIS_URL']
  if (!url) return null

  if (!_client) {
    _client = new Redis(url, {
      // Keep the connection pool small — Cloud Run instances are ephemeral
      maxRetriesPerRequest: 3,
      enableReadyCheck:     false,   // don't block app startup on Redis readiness
      lazyConnect:          true,    // don't connect until first command
      // TLS is required for Upstash (rediss://) and optional for others
      tls: url.startsWith('rediss://') ? {} : undefined,
    })

    _client.on('error', (err: Error) => {
      // Log but don't crash — if Redis goes down, rate limiting degrades to
      // in-memory (per-instance) rather than taking the whole app offline.
      console.error('[redis] connection error:', err.message)
    })

    _client.on('connect', () => {
      console.info('[redis] connected')
    })
  }

  return _client
}

export async function closeRedisClient(): Promise<void> {
  if (_client) {
    await _client.quit()
    _client = null
  }
}

export type { RedisClient }
