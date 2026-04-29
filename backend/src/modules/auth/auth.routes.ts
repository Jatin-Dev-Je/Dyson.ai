import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  SignupSchema,
  LoginSchema,
  RefreshSchema,
  AcceptInviteSchema,
  ChangePasswordSchema,
} from './auth.schema.js'
import {
  signup,
  login,
  refresh,
  logout,
  getMe,
  getInviteInfo,
  acceptInvite,
  changePassword,
} from './auth.service.js'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { writeAudit } from '@/modules/audit/audit.service.js'

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

    void writeAudit({
      tenantId:  user.tenantId,
      actorId:   user.id,
      action:    'auth.signup',
      ipAddress: req.ip,
    })

    return reply.status(201).send({ data: { user, ...tokens } })
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

    void writeAudit({
      tenantId:  user.tenantId,
      actorId:   user.id,
      action:    'auth.login',
      ipAddress: req.ip,
    })

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
    const payload = req.user as { sub: string; tid: string }
    await logout(payload.sub)

    void writeAudit({
      tenantId:  payload.tid,
      actorId:   payload.sub,
      action:    'auth.logout',
      ipAddress: req.ip,
    })

    return reply.status(204).send()
  })

  // ── GET /api/v1/auth/me ──────────────────────────────────────────────────
  app.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get the currently authenticated user profile',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const payload = req.user as { sub: string; tid: string }
    const user    = await getMe(payload.sub, payload.tid)
    return reply.send({ data: user })
  })

  // ── GET /api/v1/auth/invite/:token ───────────────────────────────────────
  // Public — validates the invitation token and returns metadata for the
  // accept-invite form (prefills email, shows workspace name)
  app.get('/invite/:token', {
    config: { rateLimit: { max: 30, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Validate an invitation token and return invite metadata',
      params: {
        type: 'object',
        properties: { token: { type: 'string' } },
        required: ['token'],
      },
    },
  }, async (req, reply) => {
    const { token } = req.params as { token: string }
    const info      = await getInviteInfo(token)
    return reply.send({ data: info })
  })

  // ── POST /api/v1/auth/accept-invite ─────────────────────────────────────
  // Public — invited user sets their name + password and receives tokens
  app.post('/accept-invite', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Accept a workspace invitation and create your account',
      body: zodToJsonSchema(AcceptInviteSchema),
    },
  }, async (req, reply) => {
    const input = AcceptInviteSchema.parse(req.body)
    const meta  = {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip,
    }

    const { tokens, user } = await acceptInvite(app, input, meta)

    void writeAudit({
      tenantId:  user.tenantId,
      actorId:   user.id,
      action:    'auth.accept_invite',
      ipAddress: req.ip,
    })

    return reply.status(201).send({ data: { user, ...tokens } })
  })

  // ── POST /api/v1/auth/change-password ───────────────────────────────────
  app.post('/change-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Change the authenticated user\'s password (revokes all sessions)',
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(ChangePasswordSchema),
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const payload = req.user as { sub: string; tid: string }
    const input   = ChangePasswordSchema.parse(req.body)

    await changePassword(payload.sub, payload.tid, input)

    void writeAudit({
      tenantId:  payload.tid,
      actorId:   payload.sub,
      action:    'auth.change_password',
      ipAddress: req.ip,
    })

    return reply.status(204).send()
  })
}
