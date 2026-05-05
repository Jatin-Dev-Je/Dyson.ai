import type { FastifyInstance } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  SignupSchema,
  LoginSchema,
  RefreshSchema,
  AcceptInviteSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
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
  forgotPassword,
  resetPassword,
  listSessions,
  revokeSession,
  verifyEmail,
  resendVerificationEmail,
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

  // ── POST /api/v1/auth/forgot-password ────────────────────────────────────
  // Public — always responds 204 (never reveals whether the email exists)
  app.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Send a password reset link (always returns 204)',
      body: zodToJsonSchema(ForgotPasswordSchema),
    },
  }, async (req, reply) => {
    const { email } = ForgotPasswordSchema.parse(req.body)
    const appUrl    = req.headers.origin as string ?? 'https://app.dyson.ai'
    await forgotPassword(email, appUrl)
    return reply.status(204).send()
  })

  // ── POST /api/v1/auth/reset-password ─────────────────────────────────────
  // Public — validates the reset token and sets a new password
  app.post('/reset-password', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Reset password using a valid reset token',
      body: zodToJsonSchema(ResetPasswordSchema),
    },
  }, async (req, reply) => {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body)
    await resetPassword(token, newPassword)
    return reply.status(204).send()
  })

  // ── GET /api/v1/auth/sessions ────────────────────────────────────────────
  app.get('/sessions', {
    schema: {
      tags: ['Auth'],
      summary: 'List active sessions for the authenticated user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const sessions     = await listSessions(sub, tid)
    return reply.send({ data: sessions })
  })

  // ── GET /api/v1/auth/verify-email ───────────────────────────────────────
  // Public — called when user clicks the verification link in their email
  app.get('/verify-email', {
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Verify email address using token from verification email',
      querystring: {
        type: 'object',
        properties: { token: { type: 'string' } },
        required: ['token'],
      },
    },
  }, async (req, reply) => {
    const { token } = req.query as { token: string }
    await verifyEmail(token)
    // Redirect to app with success indicator
    return reply.redirect(`${req.headers.origin ?? 'http://localhost:3000'}/app?verified=1`)
  })

  // ── POST /api/v1/auth/resend-verification ────────────────────────────────
  app.post('/resend-verification', {
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Resend email verification link',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    await resendVerificationEmail(sub, tid)
    return reply.status(204).send()
  })

  // ── DELETE /api/v1/auth/sessions/:id ─────────────────────────────────────
  app.delete('/sessions/:id', {
    schema: {
      tags: ['Auth'],
      summary: 'Revoke a specific session',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const { sub, tid } = req.user as { sub: string; tid: string }
    const { id }       = req.params as { id: string }
    await revokeSession(id, sub, tid)
    return reply.status(204).send()
  })
}
