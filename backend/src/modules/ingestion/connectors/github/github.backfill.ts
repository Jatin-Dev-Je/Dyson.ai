import type { FastifyBaseLogger } from 'fastify'
import { EntityType, EventSource } from '@/shared/types/entities.js'
import { getInstallationToken, ghApiGet } from '@/infra/github-app.js'
import { insertRawEvent } from '@/modules/ingestion/ingestion.repository.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import type { NormalizedEvent } from '@/modules/ingestion/ingestion.types.js'

const REPOS_PER_SYNC  = 30
const PRS_PER_REPO    = 30
const ISSUES_PER_REPO = 30

type Repo = { full_name: string; private: boolean }
type GhPr = {
  id: number; number: number; title: string; body: string | null
  state: string; html_url: string; user: { login: string }
  merged_at: string | null; created_at: string; updated_at: string
}
type GhIssue = {
  id: number; number: number; title: string; body: string | null
  state: string; html_url: string; user: { login: string }
  pull_request?: unknown
  created_at: string
}

// ─── Normalizers ─────────────────────────────────────────────────────────

function normalizePr(pr: GhPr, repoName: string): NormalizedEvent | null {
  const content = [pr.title, pr.body ?? ''].filter(Boolean).join('\n\n').trim()
  if (!content) return null
  return {
    externalId:  `github_pr_${pr.id}`,
    source:      EventSource.GitHub,
    entityType:  EntityType.CodeChange,
    content,
    metadata: {
      repoName, prNumber: pr.number, prState: pr.state,
      action: pr.merged_at ? 'merged' : pr.state, mergedAt: pr.merged_at, author: pr.user.login,
    },
    occurredAt:  new Date(pr.merged_at ?? pr.updated_at ?? pr.created_at),
    authorEmail: null,
    url:         pr.html_url,
  }
}

function normalizeIssue(issue: GhIssue, repoName: string): NormalizedEvent | null {
  if (issue.pull_request) return null
  const content = [issue.title, issue.body ?? ''].filter(Boolean).join('\n\n').trim()
  if (!content) return null
  return {
    externalId:  `github_issue_${issue.id}`,
    source:      EventSource.GitHub,
    entityType:  EntityType.Task,
    content,
    metadata:    { repoName, issueNumber: issue.number, state: issue.state, author: issue.user.login },
    occurredAt:  new Date(issue.created_at),
    authorEmail: null,
    url:         issue.html_url,
  }
}

// ─── Backfill entry point ─────────────────────────────────────────────────

export async function backfillGitHub(
  tenantId:       string,
  installationId: string,
  logger:         FastifyBaseLogger
): Promise<{ inserted: number; repos: number }> {
  const token     = await getInstallationToken(installationId)
  const reposRes  = await ghApiGet<{ repositories: Repo[] }>(
    token, `/installation/repositories?per_page=${REPOS_PER_SYNC}`
  )

  let totalInserted = 0

  for (const repo of reposRes.repositories) {
    try {
      const [prs, issues] = await Promise.all([
        ghApiGet<GhPr[]>(token, `/repos/${repo.full_name}/pulls?state=all&per_page=${PRS_PER_REPO}&sort=updated&direction=desc`),
        ghApiGet<GhIssue[]>(token, `/repos/${repo.full_name}/issues?state=all&per_page=${ISSUES_PER_REPO}&sort=updated&direction=desc`),
      ])

      for (const pr of prs) {
        const normalized = normalizePr(pr, repo.full_name)
        if (!normalized) continue
        const stored = await insertRawEvent(tenantId, normalized)
        if (!stored) continue
        await enqueue('process-event', { eventId: stored.id, tenantId, event: { ...normalized, occurredAt: normalized.occurredAt.toISOString() } }, logger)
        totalInserted++
      }

      for (const issue of issues) {
        const normalized = normalizeIssue(issue, repo.full_name)
        if (!normalized) continue
        const stored = await insertRawEvent(tenantId, normalized)
        if (!stored) continue
        await enqueue('process-event', { eventId: stored.id, tenantId, event: { ...normalized, occurredAt: normalized.occurredAt.toISOString() } }, logger)
        totalInserted++
      }
    } catch (err) {
      logger.warn({ err, repo: repo.full_name }, 'GitHub repo backfill failed — continuing')
    }
  }

  return { inserted: totalInserted, repos: reposRes.repositories.length }
}
