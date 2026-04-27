import { EntityType, EventSource } from '@/shared/types/entities.js'
import type { NormalizedEvent, GitHubEvent } from '../../ingestion.types.js'

type GitHubEventType =
  | 'pull_request'
  | 'issues'
  | 'issue_comment'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'push'

export function normalizeGitHubEvent(
  eventType: string,
  payload: GitHubEvent,
  deliveryId: string
): NormalizedEvent | null {
  const repoName = payload.repository?.full_name ?? 'unknown'

  switch (eventType as GitHubEventType) {

    case 'pull_request': {
      const pr = payload.pull_request
      if (!pr) return null

      // Only care about opened, closed, merged — skip review_requested, labeled, etc.
      const relevantActions = new Set(['opened', 'closed', 'reopened', 'ready_for_review'])
      if (payload.action && !relevantActions.has(payload.action)) return null

      const content = [pr.title, pr.body].filter(Boolean).join('\n\n')
      if (!content.trim()) return null

      return {
        externalId:  `github_pr_${pr.id}`,
        source:      EventSource.GitHub,
        entityType:  EntityType.CodeChange,
        content,
        metadata: {
          repoName,
          prNumber:  pr.number,
          prState:   pr.state,
          action:    payload.action,
          mergedAt:  pr.merged_at ?? null,
          author:    pr.user.login,
        },
        occurredAt:  new Date(pr.merged_at ?? pr.updated_at ?? pr.created_at),
        authorEmail: pr.user.email ?? null,
        url:         pr.html_url,
      }
    }

    case 'issues': {
      const issue = payload.issue
      if (!issue) return null

      const relevantActions = new Set(['opened', 'closed', 'reopened'])
      if (payload.action && !relevantActions.has(payload.action)) return null

      const content = [issue.title, issue.body].filter(Boolean).join('\n\n')
      if (!content.trim()) return null

      return {
        externalId:  `github_issue_${issue.id}`,
        source:      EventSource.GitHub,
        entityType:  EntityType.Task,
        content,
        metadata: {
          repoName,
          issueNumber: issue.number,
          state:       issue.state,
          action:      payload.action,
          author:      issue.user.login,
        },
        occurredAt:  new Date(issue.created_at),
        authorEmail: null,
        url:         issue.html_url,
      }
    }

    case 'issue_comment':
    case 'pull_request_review_comment': {
      const comment = payload.comment
      if (!comment || !comment.body?.trim()) return null
      if (payload.action !== 'created') return null

      return {
        externalId:  `github_comment_${comment.id}`,
        source:      EventSource.GitHub,
        entityType:  EntityType.Message,
        content:     comment.body,
        metadata: {
          repoName,
          type:   eventType,
          author: comment.user.login,
        },
        occurredAt:  new Date(comment.created_at),
        authorEmail: null,
        url:         comment.html_url,
      }
    }

    case 'pull_request_review': {
      const pr      = payload.pull_request
      const comment = payload.comment
      const body    = (comment as Record<string, string> | undefined)?.['body']?.trim()
      if (!pr || !body) return null

      return {
        externalId:  `github_review_${deliveryId}`,
        source:      EventSource.GitHub,
        entityType:  EntityType.Message,
        content:     body,
        metadata: {
          repoName,
          prNumber: pr.number,
          type:     'review',
          author:   payload.sender?.login ?? 'unknown',
        },
        occurredAt:  new Date(),
        authorEmail: null,
        url:         pr.html_url,
      }
    }

    default:
      return null
  }
}
