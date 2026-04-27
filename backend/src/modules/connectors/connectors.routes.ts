import type { FastifyInstance } from 'fastify'
import {
  getConnectors, getSlackOAuthUrl, handleSlackCallback,
  getGitHubOAuthUrl, handleGitHubCallback, removeConnector,
} from './connectors.service.js'
import { SlackCallbackSchema, GitHubCallbackSchema } from './connectors.schema.js'
import { authMiddleware } from '@/api/middleware/auth.middleware.js'
import { requireRole } from '@/api/middleware/rbac.middleware.js'

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
    const { teamName, tenantId } = await handleSlackCallback(code, state)
    // Redirect to frontend success page
    return reply.redirect(
      `${(req.headers.origin as string | undefined) ?? 'http://localhost:3000'}/app/settings/sources?connected=slack&team=${encodeURIComponent(teamName)}`
    )
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
    await handleGitHubCallback(installation_id, state)
    return reply.redirect(
      `${(req.headers.origin as string | undefined) ?? 'http://localhost:3000'}/app/settings/sources?connected=github`
    )
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
    const { tid, role } = req.user as { tid: string; role: string }
    const { id } = req.params as { id: string }
    await removeConnector(id, tid, role)
    return reply.status(204).send()
  })
}
