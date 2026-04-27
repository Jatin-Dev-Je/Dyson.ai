import Fastify from 'fastify'
import { env } from './config/env.js'
import { db } from './infra/db/client.js'
import { sql } from 'drizzle-orm'

export async function buildApp() {
  const app = Fastify({
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

  // Global rate limit — individual routes override for stricter limits
  await app.register(import('@fastify/rate-limit'), {
    max:        env.RATE_LIMIT_MAX_PER_MINUTE,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Too many requests — slow down' },
    }),
  })

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
    status: 'ok',
    ts:     new Date().toISOString(),
  }))

  // /health/ready — readiness (checks DB connection)
  app.get('/health/ready', { schema: { hide: true } }, async (_req, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
      return { status: 'ok' }
    } catch {
      return reply.status(503).send({ status: 'unavailable', reason: 'database' })
    }
  })

  // ── Module routes ──────────────────────────────────────────────────────────
  await app.register(import('./modules/auth/auth.routes.js'),          { prefix: '/api/v1/auth' })
  await app.register(import('./modules/workspace/workspace.routes.js'), { prefix: '/api/v1/workspaces' })
  await app.register(import('./modules/users/users.routes.js'),         { prefix: '/api/v1/users' })
  await app.register(import('./modules/connectors/connectors.routes.js'), { prefix: '/api/v1/connectors' })
  await app.register(import('./modules/graph/graph.routes.js'),          { prefix: '/api/v1/graph' })
  await app.register(import('./modules/decisions/decisions.routes.js'),  { prefix: '/api/v1/decisions' })

  await app.register(import('./modules/why/why.routes.js'),                 { prefix: '/api/v1/why' })
  await app.register(import('./modules/search/search.routes.js'),           { prefix: '/api/v1/search' })
  await app.register(import('./modules/onboarding-packs/packs.routes.js'),  { prefix: '/api/v1/onboarding-packs' })
  await app.register(import('./modules/api-keys/apikeys.routes.js'),        { prefix: '/api/v1/api-keys' })
  await app.register(import('./modules/audit/audit.routes.js'),             { prefix: '/api/v1/audit-log' })
  await app.register(import('./modules/agent/agent.routes.js'),             { prefix: '/api/v1/agent' })

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
