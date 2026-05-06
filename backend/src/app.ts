import Fastify from 'fastify'
import { env } from './config/env.js'
import { db } from './infra/db/client.js'
import { getRedisClient } from './infra/redis.js'
import { geminiBreaker, cohereBreaker } from './infra/circuit-breaker.js'
import { agentRuntimeClient } from './infra/agent-runtime-client.js'
import { sql } from 'drizzle-orm'

export async function buildApp() {
  const app = Fastify({
    // Every request gets a UUID that appears in every log line as `reqId`.
    // This makes it trivial to grep all logs for a single failed request.
    genReqId: () => crypto.randomUUID(),
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(env.NODE_ENV !== 'production' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
      // Redact sensitive fields from all log output
      redact: ['req.headers.authorization', 'req.body.password', 'req.body.refreshToken'],
    },
    trustProxy: true,
    // Reject payloads larger than 1MB
    bodyLimit: 1_048_576,
  })

  // ── Security plugins ───────────────────────────────────────────────────────
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  })

  await app.register(import('@fastify/cors'), {
    origin:      env.CORS_ORIGINS.split(',').map(o => o.trim()),
    credentials: true,
    methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Global rate limit — per authenticated tenant, falling back to IP for
  // unauthenticated requests. Uses Redis when REDIS_URL is set (required
  // in production for correct limiting across multiple Cloud Run replicas).
  const redis = getRedisClient()
  await app.register(import('@fastify/rate-limit'), {
    max:        env.RATE_LIMIT_MAX_PER_MINUTE,
    timeWindow: '1 minute',
    ...(redis ? { redis } : {}),
    // Key by tenant when authenticated — fairer than per-IP in multi-tenant SaaS.
    // A tenant behind a shared office IP won't be rate-limited by their colleagues.
    keyGenerator: (req) => {
      const user = req.user as { tid?: string } | undefined
      return user?.tid ? `tenant:${user.tid}` : `ip:${req.ip}`
    },
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Too many requests — slow down' },
    }),
  })
  if (redis) {
    app.log.info('rate limiting: Redis store active (distributed, per-tenant keying)')
  } else {
    app.log.warn('rate limiting: in-memory store (set REDIS_URL for distributed limiting in production)')
  }

  await app.register(import('@fastify/formbody'))

  await app.register(import('@fastify/jwt'), {
    secret: env.JWT_SECRET,
    sign:   { algorithm: 'HS256' },
  })

  // ── API Documentation (dev only) ───────────────────────────────────────────
  if (env.SWAGGER_ENABLED) {
    await app.register(import('@fastify/swagger'), {
      openapi: {
        info: {
          title:       'Dyson API',
          description: 'Context infrastructure for modern engineering teams',
          version:     '1.0.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    })
    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig:    { persistAuthorization: true },
    })
  }

  // ── Health checks ──────────────────────────────────────────────────────────
  // /health — liveness (always fast, no DB)
  app.get('/health', { schema: { hide: true } }, async () => ({
    status:  'ok',
    ts:      new Date().toISOString(),
    version: process.env['npm_package_version'] ?? 'unknown',
    env:     env.NODE_ENV,
  }))

  // /health/ready — readiness: checks DB + optional agent runtime
  app.get('/health/ready', { schema: { hide: true } }, async (_req, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
    } catch {
      return reply.status(503).send({ status: 'unavailable', reason: 'database' })
    }
    return {
      status: 'ok',
      agentRuntime: env.AGENT_RUNTIME_URL
        ? await agentRuntimeClient.isHealthy() ? 'ok' : 'unavailable'
        : 'not_configured',
    }
  })

  // /metrics — lightweight operational metrics for Cloud Monitoring / alerting.
  // Protected by JOB_SECRET so only internal callers (Cloud Scheduler, Cloud
  // Tasks) can reach it. Pass the secret as: X-Metrics-Secret: <JOB_SECRET>
  app.get('/metrics', { schema: { hide: true } }, async (req, reply) => {
    if (req.headers['x-metrics-secret'] !== env.JOB_SECRET) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid metrics secret' } })
    }
    const [whyStats] = await db.execute<{
      total: string; cannot_answer: string; avg_confidence: string; avg_latency_ms: string
    }>(sql`
      SELECT
        COUNT(*)::text                                                      AS total,
        COUNT(*) FILTER (WHERE cannot_answer = true)::text                 AS cannot_answer,
        ROUND(AVG(confidence)::numeric, 4)::text                           AS avg_confidence,
        ROUND(AVG(latency_ms)::numeric, 0)::text                           AS avg_latency_ms
      FROM why_queries
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `).catch(() => [null])

    const [ingestionStats] = await db.execute<{
      pending: string; failed: string
    }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::text   AS pending,
        COUNT(*) FILTER (WHERE status = 'failed')::text    AS failed
      FROM raw_events
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `).catch(() => [null])

    return {
      ts: new Date().toISOString(),
      why: {
        total_24h:          Number(whyStats?.total ?? 0),
        cannot_answer_24h:  Number(whyStats?.cannot_answer ?? 0),
        avg_confidence_24h: Number(whyStats?.avg_confidence ?? 0),
        avg_latency_ms_24h: Number(whyStats?.avg_latency_ms ?? 0),
      },
      ingestion: {
        pending_1h: Number(ingestionStats?.pending ?? 0),
        failed_1h:  Number(ingestionStats?.failed ?? 0),
      },
      // Circuit breaker states — OPEN means that service is currently down
      circuit_breakers: {
        gemini: geminiBreaker.metrics,
        cohere: cohereBreaker.metrics,
      },
    }
  })

  // ── Module routes ──────────────────────────────────────────────────────────
  await app.register(import('./modules/auth/auth.routes.js'),          { prefix: '/api/v1/auth' })
  await app.register(import('./modules/workspace/workspace.routes.js'), { prefix: '/api/v1/workspaces' })
  await app.register(import('./modules/users/users.routes.js'),         { prefix: '/api/v1/users' })
  await app.register(import('./modules/connectors/connectors.routes.js'), { prefix: '/api/v1/connectors' })
  await app.register(import('./modules/graph/graph.routes.js'),          { prefix: '/api/v1/graph' })
  await app.register(import('./modules/decisions/decisions.routes.js'),  { prefix: '/api/v1/decisions' })

  await app.register(import('./modules/memory/memory.routes.js'),           { prefix: '/api/v1/memory' })
  await app.register(import('./modules/why/why.routes.js'),                 { prefix: '/api/v1/recall' })
  await app.register(import('./modules/search/search.routes.js'),           { prefix: '/api/v1/search' })
  await app.register(import('./modules/onboarding-packs/packs.routes.js'),  { prefix: '/api/v1/onboarding-packs' })
  await app.register(import('./modules/api-keys/apikeys.routes.js'),        { prefix: '/api/v1/api-keys' })
  await app.register(import('./modules/audit/audit.routes.js'),             { prefix: '/api/v1/audit-log' })
  await app.register(import('./modules/notifications/notifications.routes.js'), { prefix: '/api/v1/notifications' })
  await app.register(import('./modules/agent/agent.routes.js'),             { prefix: '/api/v1/agent' })

  // ── Model Context Protocol (MCP) ──────────────────────────────────────────
  // Mounted at /mcp so Claude Desktop / Cursor / Continue / custom agents can
  // connect via Streamable HTTP using their Dyson API key.
  await app.register(import('./modules/agent-layer/mcp/transport.http.js'),  { prefix: '/mcp' })

  // Webhooks
  await app.register(import('./api/routes/webhooks/slack.webhook.js'), { prefix: '/webhooks' })
  await app.register(import('./api/routes/webhooks/github.webhook.js'),{ prefix: '/webhooks' })

  // Job handlers — called by Cloud Tasks (or inline in dev)
  await app.register(import('./api/routes/jobs.routes.js'),            { prefix: '/jobs' })

  // ── Global error handler ───────────────────────────────────────────────────
  app.setErrorHandler((error: unknown, request, reply) => {
    const err = error as Record<string, unknown>
    const isDysonError = typeof err.code === 'string' && typeof err.statusCode === 'number'

    if (isDysonError) {
      const code       = err.code as string
      const statusCode = err.statusCode as number
      const message    = typeof err.message === 'string' ? err.message : 'An error occurred'
      if (statusCode >= 500) request.log.error({ code }, message)
      return reply.status(statusCode).send({ error: { code, message } })
    }

    if (err.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
      })
    }

    request.log.error(error)
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    })
  })

  return app
}
