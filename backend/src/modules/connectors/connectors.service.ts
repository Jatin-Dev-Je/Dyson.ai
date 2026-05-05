import { createHmac, timingSafeEqual } from 'node:crypto'
import type { FastifyBaseLogger } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { env } from '@/config/env.js'
import { EventSource } from '@/shared/types/entities.js'
import { DysonError, NotFoundError, ForbiddenError } from '@/shared/errors.js'
import { db } from '@/infra/db/client.js'
import { connectedSources } from '@/infra/db/schema/index.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import {
  listConnectors, upsertConnector,
  disconnectConnector,
} from './connectors.repository.js'

// ─── List ─────────────────────────────────────────────────────────────────

export async function getConnectors(tenantId: string) {
  return listConnectors(tenantId)
}

// ─── Slack OAuth ──────────────────────────────────────────────────────────

// ─── OAuth state helpers ──────────────────────────────────────────────────
// State is HMAC-signed so an attacker can't craft a valid state to redirect
// OAuth callbacks to their own tenant. Both expiry and signature are checked.

function buildOAuthState(tenantId: string): string {
  const payload = JSON.stringify({ tenantId, ts: Date.now() })
  const sig     = createHmac('sha256', env.JWT_SECRET + 'oauth-state').update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

function parseOAuthState(state: string): { tenantId: string } {
  let payload: string
  let sig: string
  try {
    const decoded = Buffer.from(state, 'base64url').toString()
    const idx = decoded.lastIndexOf('|')
    payload = decoded.slice(0, idx)
    sig     = decoded.slice(idx + 1)
  } catch {
    throw new DysonError('INVALID_STATE', 'OAuth state is invalid', 400)
  }

  const expected = createHmac('sha256', env.JWT_SECRET + 'oauth-state').update(payload).digest('hex')
  const sigBuf   = Buffer.from(sig,      'hex')
  const expBuf   = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new DysonError('INVALID_STATE', 'OAuth state signature is invalid', 400)
  }

  let parsed: { tenantId: string; ts: number }
  try {
    parsed = JSON.parse(payload) as { tenantId: string; ts: number }
  } catch {
    throw new DysonError('INVALID_STATE', 'OAuth state payload is malformed', 400)
  }

  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    throw new DysonError('INVALID_STATE', 'OAuth state has expired', 400)
  }

  return { tenantId: parsed.tenantId }
}

export function getSlackOAuthUrl(tenantId: string): string {
  if (!env.SLACK_CLIENT_ID) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'Slack connector is not configured', 503)
  }

  const state    = buildOAuthState(tenantId)
  const scopes   = 'channels:history,channels:read,groups:history,im:history,users:read,reactions:read,chat:write'
  const redirect = `${env.CLOUD_TASKS_HANDLER_URL.replace('/jobs', '')}/api/v1/connectors/slack/callback`

  return (
    `https://slack.com/oauth/v2/authorize` +
    `?client_id=${env.SLACK_CLIENT_ID}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&state=${state}`
  )
}

export async function handleSlackCallback(code: string, state: string) {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'Slack connector is not configured', 503)
  }

  const { tenantId } = parseOAuthState(state)

  const redirect = `${env.CLOUD_TASKS_HANDLER_URL.replace('/jobs', '')}/api/v1/connectors/slack/callback`

  // Exchange code for access token
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri:  redirect,
    }),
  })

  const data = await res.json() as Record<string, unknown>

  if (!data.ok) {
    throw new DysonError('SLACK_OAUTH_FAILED', `Slack OAuth failed: ${String(data.error)}`, 400)
  }

  const accessToken = data.access_token as string
  const teamId      = (data.team as Record<string, string>).id
  const teamName    = (data.team as Record<string, string>).name
  const botUserId   = (data.authed_user as Record<string, string>).id

  await upsertConnector({
    tenantId,
    source:      EventSource.Slack,
    accessToken,
    metadata:    JSON.stringify({ teamId, teamName, botUserId }),
  })

  return { teamName, tenantId }
}

// ─── GitHub OAuth ─────────────────────────────────────────────────────────

export function getGitHubOAuthUrl(tenantId: string): string {
  if (!env.GITHUB_APP_ID) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'GitHub connector is not configured', 503)
  }
  const state = buildOAuthState(tenantId)
  return `https://github.com/apps/dyson-context/installations/new?state=${state}`
}

export async function handleGitHubCallback(installationId: number, state?: string) {
  if (!env.GITHUB_APP_ID) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'GitHub connector is not configured', 503)
  }

  if (!state) throw new DysonError('INVALID_STATE', 'OAuth state is missing', 400)
  const { tenantId } = parseOAuthState(state)

  await upsertConnector({
    tenantId,
    source:      EventSource.GitHub,
    accessToken: String(installationId),  // We use installationId as the credential
    metadata:    JSON.stringify({ installationId }),
  })

  return { installationId, tenantId }
}

// ─── Disconnect ───────────────────────────────────────────────────────────

// Look up a connector by primary id within a tenant — used by sync/delete routes
async function findConnectorById(connectorId: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(connectedSources)
    .where(and(
      eq(connectedSources.id, connectorId),
      eq(connectedSources.tenantId, tenantId),
    ))
    .limit(1)
  return row ?? null
}

export async function removeConnector(
  id: string,
  tenantId: string,
  role: string
): Promise<{ source: string }> {
  if (role !== 'admin') throw new ForbiddenError()
  const conn = await findConnectorById(id, tenantId)
  if (!conn) throw new NotFoundError('Connector')
  await disconnectConnector(id, tenantId)
  return { source: conn.source }
}

// ─── Sync (manual backfill trigger) ───────────────────────────────────────

export async function triggerConnectorSync(
  connectorId: string,
  tenantId:    string,
  logger:      FastifyBaseLogger
): Promise<{ source: string; connectorId: string }> {
  const conn = await findConnectorById(connectorId, tenantId)
  if (!conn)            throw new NotFoundError('Connector')
  if (!conn.isActive)   throw new DysonError('CONNECTOR_INACTIVE', 'Connector is not active', 409)

  // Enqueue backfill job. The worker fetches a recent page of events from the
  // source API, normalizes them, and pushes through the standard ingest path.
  // Idempotent: existing events dedupe via externalId.
  await enqueue('backfill-source', {
    connectorId,
    tenantId,
    source: conn.source,
  }, logger)

  return { source: conn.source, connectorId }
}
