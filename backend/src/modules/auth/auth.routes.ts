import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { SignupSchema, LoginSchema, RefreshSchema } from './auth.schema.js'
import { signup, login, refresh, logout } from './auth.service.js'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { DysonError } from '@/shared/errors.js'

export default async function authRoutes(app: FastifyInstance) {

  // ── POST /api/v1/auth/signup ─────────────────────────────────────────────
  app.post('/signup', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Create a new account and workspace',
      body: zodToJsonSchema(SignupSchema),
    },
  }, async (req, reply) => {
    const input = SignupSchema.parse(req.body)
    const meta  = {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip,
    }

    const { tokens, user } = await signup(app, input, meta)

    return reply.status(201).send({
      data: { user, ...tokens },
    })
  })

  // ── POST /api/v1/auth/login ──────────────────────────────────────────────
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Log in and receive access + refresh tokens',
      body: zodToJsonSchema(LoginSchema),
    },
  }, async (req, reply) => {
    const input = LoginSchema.parse(req.body)
    const meta  = {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip,
    }

    const { tokens, user } = await login(app, input, meta)

    return reply.send({ data: { user, ...tokens } })
  })

  // ── POST /api/v1/auth/refresh ────────────────────────────────────────────
  app.post('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Exchange a refresh token for a new access token',
      body: zodToJsonSchema(RefreshSchema),
    },
  }, async (req, reply) => {
    const { refreshToken } = RefreshSchema.parse(req.body)
    const meta = {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip,
    }

    const tokens = await refresh(app, refreshToken, meta)
    return reply.send({ data: tokens })
  })

  // ── POST /api/v1/auth/logout ─────────────────────────────────────────────
  app.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Revoke all refresh tokens (logout from all devices)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const payload = req.user as { sub: string }
    await logout(payload.sub)
    return reply.status(204).send()
  })

  // ── GET /api/v1/auth/me ──────────────────────────────────────────────────
  app.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get the currently authenticated user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const payload = req.user as { sub: string; tid: string; role: string }
    return reply.send({
      data: {
        userId:   payload.sub,
        tenantId: payload.tid,
        role:     payload.role,
      },
    })
  })
}
