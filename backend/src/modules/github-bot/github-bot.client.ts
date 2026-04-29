import { createSign } from 'crypto'
import { env } from '@/config/env.js'

const GITHUB_API = 'https://api.github.com'

// ─── GitHub App JWT + installation token (shared with backfill) ───────────
function signAppJwt(): string {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error('GitHub App not configured')
  }
  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 8 * 60, iss: env.GITHUB_APP_ID })).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const signing = `${header}.${payload}`
  const sig     = createSign('RSA-SHA256').update(signing).sign(env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n')).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  return `${signing}.${sig}`
}

async function getInstallationToken(installationId: string | number): Promise<string> {
  const jwt = signAppJwt()
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}/access_tokens`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  if (!res.ok) throw new Error(`GitHub token exchange failed: ${res.status}`)
  const d = await res.json() as { token: string }
  return d.token
}

async function ghApi<T>(token: string, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  if (!res.ok) throw new Error(`GitHub ${method} ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export type PrFile = { filename: string; status: string }

export async function getPrFiles(installationId: string | number, repoFullName: string, prNumber: number): Promise<PrFile[]> {
  const token = await getInstallationToken(installationId)
  return ghApi<PrFile[]>(token, 'GET', `/repos/${repoFullName}/pulls/${prNumber}/files?per_page=50`)
}

export async function postPrComment(installationId: string | number, repoFullName: string, prNumber: number, body: string): Promise<void> {
  const token = await getInstallationToken(installationId)
  await ghApi(token, 'POST', `/repos/${repoFullName}/issues/${prNumber}/comments`, { body })
}
