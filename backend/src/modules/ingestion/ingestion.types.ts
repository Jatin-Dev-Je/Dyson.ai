import type { EntityType, EventSource } from '@/shared/types/entities.js'

export type NormalizedEvent = {
  externalId:  string       // Stable ID from source system (dedupe key)
  source:      EventSource
  entityType:  EntityType
  content:     string       // Primary text content (message body, PR title+body, etc.)
  metadata:    Record<string, unknown>
  occurredAt:  Date
  authorEmail: string | null // For linking to users
  url:         string | null // Deep link back to source
}

// Slack-specific raw event shape (subset we care about)
export type SlackEvent = {
  type:      string
  event_id:  string
  event:     {
    type:    string
    ts:      string
    text?:   string
    user?:   string
    channel?:string
    bot_id?: string
    subtype?:string
  }
  team_id:   string
  api_app_id:string
}

// GitHub webhook payload shape (subset)
export type GitHubEvent = {
  action?:       string
  pull_request?: {
    id:          number
    number:      number
    title:       string
    body?:       string
    state:       string
    html_url:    string
    user:        { login: string; email?: string }
    merged_at?:  string
    created_at:  string
    updated_at:  string
  }
  issue?: {
    id:          number
    number:      number
    title:       string
    body?:       string
    state:       string
    html_url:    string
    user:        { login: string }
    created_at:  string
  }
  comment?: {
    id:          number
    body:        string
    html_url:    string
    user:        { login: string }
    created_at:  string
  }
  repository?: {
    full_name:   string
    html_url:    string
  }
  sender?: {
    login:       string
  }
}
