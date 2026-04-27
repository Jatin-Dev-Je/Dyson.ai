import { env } from '@/config/env.js'
import { EventSource } from '@/shared/types/entities.js'
import { DysonError, NotFoundError, ForbiddenError } from '@/shared/errors.js'
import {
  listConnectors, findConnector, upsertConnector,
  disconnectConnector, markSyncComplete, markSyncError,
} from './connectors.repository.js'

// ─── List ─────────────────────────────────────────────────────────────────

export async function getConnectors(tenantId: string) {
  return listConnectors(tenantId)
}

// ─── Slack OAuth ──────────────────────────────────────────────────────────

export function getSlackOAuthUrl(tenantId: string): string {
  if (!env.SLACK_CLIENT_ID) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'Slack connector is not configured', 503)
  }

  const state    = Buffer.from(JSON.stringify({ tenantId, ts: Date.now() })).toString('base64')
  const scopes   = 'channels:history,channels:read,groups:history,im:history,users:read,reactions:read'
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

  let tenantId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    tenantId = decoded.tenantId as string
    // Validate state is not older than 10 minutes
    if (Date.now() - (decoded.ts as number) > 10 * 60 * 1000) {
      throw new Error('State expired')
    }
  } catch {
    throw new DysonError('INVALID_STATE', 'OAuth state is invalid or expired', 400)
  }

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
  const state = Buffer.from(JSON.stringify({ tenantId, ts: Date.now() })).toString('base64')
  return `https://github.com/apps/dyson-context/installations/new?state=${state}`
}

export async function handleGitHubCallback(installationId: number, state?: string) {
  if (!env.GITHUB_APP_ID) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'GitHub connector is not configured', 503)
  }

  let tenantId: string
  try {
    const decoded = JSON.parse(Buffer.from(state ?? '', 'base64').toString())
    tenantId = decoded.tenantId as string
  } catch {
    throw new DysonError('INVALID_STATE', 'OAuth state is invalid', 400)
  }

  await upsertConnector({
    tenantId,
    source:      EventSource.GitHub,
    accessToken: String(installationId),  // We use installationId as the credential
    metadata:    JSON.stringify({ installationId }),
  })

  return { installationId, tenantId }
}

// ─── Disconnect ───────────────────────────────────────────────────────────

export async function removeConnector(
  id: string,
  tenantId: string,
  role: string
) {
  if (role !== 'admin') throw new ForbiddenError()
  const conn = await findConnector(tenantId, id)
  if (!conn) throw new NotFoundError('Connector')
  await disconnectConnector(id, tenantId)
}
