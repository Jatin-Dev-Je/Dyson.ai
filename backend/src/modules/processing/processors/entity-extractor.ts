// Pure function — no side effects, fully deterministic
// Takes raw text and returns structured entity data for a context node

export type ExtractedEntities = {
  title:       string
  summary:     string
  mentions:    string[]   // @user references
  issueRefs:   string[]   // #123 references
  prRefs:      string[]   // PR #123 references
  urls:        string[]   // URLs found in text
  techTerms:   string[]   // Detected service/tech names
}

// Patterns
const MENTION_RE  = /@([A-Za-z0-9_.-]+)/g
const ISSUE_RE    = /(?:^|\s)#(\d+)/g
const PR_REF_RE   = /(?:PR|pull request)\s*#(\d+)/gi
const URL_RE      = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g
const TECH_TERMS  = new Set([
  'postgres', 'postgresql', 'redis', 'kafka', 'rabbitmq', 'elasticsearch',
  'kubernetes', 'docker', 'terraform', 'aws', 'gcp', 'azure',
  'react', 'vue', 'angular', 'nextjs', 'fastify', 'express', 'fastapi',
  'typescript', 'python', 'golang', 'rust', 'java',
  'supabase', 'prisma', 'drizzle', 'mongodb', 'mysql',
  'jwt', 'oauth', 'graphql', 'grpc', 'rest', 'websocket',
  'stripe', 'twilio', 'sendgrid', 'resend', 'cohere', 'openai',
])

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

export function extractEntities(content: string, sourceTitle?: string): ExtractedEntities {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)

  // Title: first non-empty line, capped at 120 chars
  const rawTitle = sourceTitle ?? lines[0] ?? 'Untitled'
  const title = rawTitle.length > 120 ? rawTitle.slice(0, 117) + '…' : rawTitle

  // Summary: first 500 chars of content, cleaned up
  const summary = content.replace(/\s+/g, ' ').trim().slice(0, 500)

  // Extract structured entities
  const mentions  = dedupe([...content.matchAll(MENTION_RE)].map(m => m[1] ?? '').filter(Boolean))
  const issueRefs = dedupe([...content.matchAll(ISSUE_RE)].map(m => m[1] ?? '').filter(Boolean))
  const prRefs    = dedupe([...content.matchAll(PR_REF_RE)].map(m => m[1] ?? '').filter(Boolean))
  const urls      = dedupe([...content.matchAll(URL_RE)].map(m => m[0] ?? '').filter(Boolean))

  // Tech term detection — case-insensitive word boundary match
  const lowerContent = content.toLowerCase()
  const techTerms = [...TECH_TERMS].filter(term => {
    const re = new RegExp(`\\b${term}\\b`)
    return re.test(lowerContent)
  })

  return { title, summary, mentions, issueRefs, prRefs, urls, techTerms }
}
