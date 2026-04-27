import { createSign } from 'crypto'
import type { FastifyBaseLogger } from 'fastify'
import { EntityType, EventSource } from '@/shared/types/entities.js'
import { env } from '@/config/env.js'
import { insertRawEvent } from '@/modules/ingestion/ingestion.repository.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import { DysonError } from '@/shared/errors.js'
import type { NormalizedEvent } from '@/modules/ingestion/ingestion.types.js'

const GITHUB_API = 'https://api.github.com'
const REPOS_PER_SYNC   = 30
const PRS_PER_REPO     = 30
const ISSUES_PER_REPO  = 30

type Installation = { token: string; expires_at: string }
type Repo = { full_name: string; private: boolean }
type GhPr = {
  id: number; number: number; title: string; body: string | null
  state: string; html_url: string; user: { login: string }
  merged_at: string | null; created_at: string; updated_at: string
}
type GhIssue = {
  id: number; number: number; title: string; body: string | null
  state: string; html_url: string; user: { login: string }
  pull_request?: unknown   // Issues API returns PRs too — filter them out
  created_at: string
}

// ─── GitHub App auth — sign JWT with private key, exchange for install token ──

function base64url(s: string | Buffer): string {
  return Buffer.from(s).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function signAppJwt(): string {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'GitHub App is not configured', 503)
  }

  const now    = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iat: now - 60,           // backdate for clock skew
    exp: now + 8 * 60,       // GitHub max is 10 minutes
    iss: env.GITHUB_APP_ID,
  }))

  const signingInput = `${header}.${payload}`
  const signer = createSign('RSA-SHA256').update(signingInput)
  // GitHub stores the private key with literal \n; restore real newlines
  const privateKey = env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n')
  const signature  = base64url(signer.sign(privateKey))

  return `${signingInput}.${signature}`
}

async function getInstallationToken(installationId: string): Promise<string> {
  const jwt = signAppJwt()
  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept:        'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub installation token exchange failed: ${res.status} ${body.slice(0, 200)}`)
  }

  const data = await res.json() as Installation
  return data.token
}

async function ghApi<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept:        'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`GitHub API ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

// ─── Normalizers (subset of github.handler.ts logic, for REST shape) ──────

function normalizePr(pr: GhPr, repoName: string): NormalizedEvent | null {
  const content = [pr.title, pr.body ?? ''].filter(Boolean).join('\n\n').trim()
  if (!content) return null

  return {
    externalId: `github_pr_${pr.id}`,
    source:     EventSource.GitHub,
    entityType: EntityType.CodeChange,
    content,
    metadata: {
      repoName,
      prNumber: pr.number,
      prState:  pr.state,
      action:   pr.merged_at ? 'merged' : pr.state,
      mergedAt: pr.merged_at,
      author:   pr.user.login,
    },
    occurredAt:  new Date(pr.merged_at ?? pr.updated_at ?? pr.created_at),
    authorEmail: null,
    url:         pr.html_url,
  }
}

function normalizeIssue(issue: GhIssue, repoName: string): NormalizedEvent | null {
  if (issue.pull_request) return null   // GitHub list-issues returns PRs too

  const content = [issue.title, issue.body ?? ''].filter(Boolean).join('\n\n').trim()
  if (!content) return null

  return {
    externalId: `github_issue_${issue.id}`,
    source:     EventSource.GitHub,
    entityType: EntityType.Task,
    content,
    metadata: {
      repoName,
      issueNumber: issue.number,
      state:       issue.state,
      author:      issue.user.login,
    },
    occurredAt:  new Date(issue.created_at),
    authorEmail: null,
    url:         issue.html_url,
  }
}

// ─── Backfill entry point ─────────────────────────────────────────────────

export async function backfillGitHub(
  tenantId:        string,
  installationId:  string,
  logger:          FastifyBaseLogger
): Promise<{ inserted: number; repos: number }> {
  const token = await getInstallationToken(installationId)

  // 1. List the install's repositories (paginated via per_page)
  const reposRes = await ghApi<{ repositories: Repo[] }>(
    token,
    `/installation/repositories?per_page=${REPOS_PER_SYNC}`
  )

  let totalInserted = 0

  for (const repo of reposRes.repositories) {
    try {
      // PRs (state=all to catch closed/merged history)
      const prs = await ghApi<GhPr[]>(
        token,
        `/repos/${repo.full_name}/pulls?state=all&per_page=${PRS_PER_REPO}&sort=updated&direction=desc`
      )

      for (const pr of prs) {
        const normalized = normalizePr(pr, repo.full_name)
        if (!normalized) continue

        const stored = await insertRawEvent(tenantId, normalized)
        if (!stored) continue

        await enqueue('process-event', {
          eventId:  stored.id,
          tenantId,
          event: { ...normalized, occurredAt: normalized.occurredAt.toISOString() },
        }, logger)

        totalInserted++
      }

      // Issues (excluding PRs — filtered in normalizer)
      const issues = await ghApi<GhIssue[]>(
        token,
        `/repos/${repo.full_name}/issues?state=all&per_page=${ISSUES_PER_REPO}&sort=updated&direction=desc`
      )

      for (const issue of issues) {
        const normalized = normalizeIssue(issue, repo.full_name)
        if (!normalized) continue

        const stored = await insertRawEvent(tenantId, normalized)
        if (!stored) continue

        await enqueue('process-event', {
          eventId:  stored.id,
          tenantId,
          event: { ...normalized, occurredAt: normalized.occurredAt.toISOString() },
        }, logger)

        totalInserted++
      }
    } catch (err) {
      logger.warn({ err, repo: repo.full_name }, 'GitHub repo backfill failed')
    }
  }

  return { inserted: totalInserted, repos: reposRes.repositories.length }
}
