import Fastify from 'fastify'
import { env } from './config/env.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(env.NODE_ENV !== 'production' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
    },
    trustProxy: true,
  })

  // ── Security & middleware plugins ──────────────────────────────────────────
  await app.register(import('@fastify/helmet'))
  await app.register(import('@fastify/cors'), {
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
  })
  await app.register(import('@fastify/rate-limit'), {
    max: env.RATE_LIMIT_MAX_PER_MINUTE,
    timeWindow: '1 minute',
  })
  await app.register(import('@fastify/formbody'))
  await app.register(import('@fastify/jwt'), {
    secret: env.JWT_SECRET,
  })

  // ── API Documentation ──────────────────────────────────────────────────────
  if (env.SWAGGER_ENABLED) {
    await app.register(import('@fastify/swagger'), {
      openapi: {
        info: {
          title: 'Dyson API',
          description: 'Context infrastructure for modern engineering teams',
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    })
    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
    })
  }

  // ── Health checks ──────────────────────────────────────────────────────────
  app.get('/health', { schema: { tags: ['System'] } }, async () => ({ status: 'ok' }))

  app.get('/health/ready', { schema: { tags: ['System'] } }, async () => {
    // TODO: check DB + Pub/Sub connectivity
    return { status: 'ok' }
  })

  // ── API Routes ─────────────────────────────────────────────────────────────
  await app.register(import('./api/routes/v1/why.routes.js'), { prefix: '/api/v1' })
  await app.register(import('./api/routes/v1/graph.routes.js'), { prefix: '/api/v1' })
  await app.register(import('./api/routes/v1/decisions.routes.js'), { prefix: '/api/v1' })
  await app.register(import('./api/routes/v1/connectors.routes.js'), { prefix: '/api/v1' })
  await app.register(import('./api/routes/webhooks/slack.webhook.js'), { prefix: '/webhooks' })
  await app.register(import('./api/routes/webhooks/github.webhook.js'), { prefix: '/webhooks' })

  // ── Global error handler ───────────────────────────────────────────────────
  app.setErrorHandler((error, _request, reply) => {
    const isDysonError = 'code' in error && 'statusCode' in error

    if (isDysonError) {
      return reply.status((error as { statusCode: number }).statusCode).send({
        error: {
          code: (error as { code: string }).code,
          message: error.message,
        },
      })
    }

    app.log.error(error)
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    })
  })

  return app
}
