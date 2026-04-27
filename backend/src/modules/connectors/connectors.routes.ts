import type { FastifyInstance } from 'fastify'
import {
  getConnectors, getSlackOAuthUrl, handleSlackCallback,
  getGitHubOAuthUrl, handleGitHubCallback, removeConnector,
  triggerConnectorSync,
} from './connectors.service.js'
import { SlackCallbackSchema, GitHubCallbackSchema } from './connectors.schema.js'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { requireRole } from '@/api/middleware/rbac.middleware.js'
import { writeAudit } from '@/modules/audit/audit.service.js'

export default async function connectorsRoutes(app: FastifyInstance) {

  // ── GET /api/v1/connectors ───────────────────────────────────────────────
  app.get('/', {
    schema: { tags: ['Connectors'], summary: 'List all connected sources', security: [{ bearerAuth: [] }] },
    preHandler: [authMiddleware],
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const connectors = await getConnectors(tid)
    return reply.send({ data: connectors })
  })

  // ── POST /api/v1/connectors/slack/connect ────────────────────────────────
  app.post('/slack/connect', {
    schema: { tags: ['Connectors'], summary: 'Get Slack OAuth URL (admin only)', security: [{ bearerAuth: [] }] },
    preHandler: [authMiddleware, requireRole('admin')],
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const url = getSlackOAuthUrl(tid)
    return reply.send({ data: { url } })
  })

  // ── GET /api/v1/connectors/slack/callback ────────────────────────────────
  // Public — called by Slack after OAuth, redirects to frontend
  app.get('/slack/callback', {
    schema: { tags: ['Connectors'], summary: 'Slack OAuth callback' },
  }, async (req, reply) => {
    const { code, state } = SlackCallbackSchema.parse(req.query)
    const result = await handleSlackCallback(code, state)

    void writeAudit({
      tenantId:  result.tenantId,
      actorId:   null,
      action:    'connector.connected',
      resourceType: 'connector',
      metadata:  { source: 'slack', teamName: result.teamName },
      ipAddress: req.ip,
    })

    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : 'http://localhost:3000'
    const team   = result.teamName ?? ''
    return reply.redirect(`${origin}/app/settings/sources?connected=slack&team=${encodeURIComponent(team)}`)
  })

  // ── POST /api/v1/connectors/github/connect ───────────────────────────────
  app.post('/github/connect', {
    schema: { tags: ['Connectors'], summary: 'Get GitHub App installation URL (admin only)', security: [{ bearerAuth: [] }] },
    preHandler: [authMiddleware, requireRole('admin')],
  }, async (req, reply) => {
    const { tid } = req.user as { tid: string }
    const url = getGitHubOAuthUrl(tid)
    return reply.send({ data: { url } })
  })

  // ── GET /api/v1/connectors/github/callback ───────────────────────────────
  app.get('/github/callback', {
    schema: { tags: ['Connectors'], summary: 'GitHub App installation callback' },
  }, async (req, reply) => {
    const { installation_id, state } = GitHubCallbackSchema.parse(req.query)
    const result = await handleGitHubCallback(installation_id, state)

    void writeAudit({
      tenantId:  result.tenantId,
      actorId:   null,
      action:    'connector.connected',
      resourceType: 'connector',
      metadata:  { source: 'github', installationId: result.installationId },
      ipAddress: req.ip,
    })

    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : 'http://localhost:3000'
    return reply.redirect(`${origin}/app/settings/sources?connected=github`)
  })

  // ── POST /api/v1/connectors/:id/sync ────────────────────────────────────
  app.post('/:id/sync', {
    config: { rateLimit: { max: 6, timeWindow: '1 minute' } },
    schema: {
      tags: ['Connectors'],
      summary: 'Trigger a manual sync for a connected source (admin only)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
    preHandler: [authMiddleware, requireRole('admin')],
  }, async (req, reply) => {
    const { tid, sub } = req.user as { tid: string; sub: string }
    const { id }       = req.params as { id: string }

    const result = await triggerConnectorSync(id, tid, req.log)

    void writeAudit({
      tenantId:  tid,
      actorId:   sub,
      action:    'connector.synced',
      resourceType: 'connector',
      resourceId: id,
      metadata:  { source: result.source },
      ipAddress: req.ip,
    })

    return reply.status(202).send({ data: { message: 'Sync queued', source: result.source } })
  })

  // ── DELETE /api/v1/connectors/:id ────────────────────────────────────────
  app.delete('/:id', {
    schema: {
      tags: ['Connectors'],
      summary: 'Disconnect a source (admin only)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    preHandler: [authMiddleware, requireRole('admin')],
  }, async (req, reply) => {
    const { tid, role, sub } = req.user as { tid: string; role: string; sub: string }
    const { id } = req.params as { id: string }
    const removed = await removeConnector(id, tid, role)

    void writeAudit({
      tenantId:  tid,
      actorId:   sub,
      action:    'connector.disconnected',
      resourceType: 'connector',
      resourceId: id,
      metadata:  { source: removed.source },
      ipAddress: req.ip,
    })

    return reply.status(204).send()
  })
}
