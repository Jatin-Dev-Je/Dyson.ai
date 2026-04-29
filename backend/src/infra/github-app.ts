/**
 * GitHub App authentication — signs JWTs and exchanges them for installation
 * access tokens. Used by both the GitHub backfill and the GitHub bot.
 */
import { createSign } from 'crypto'
import { env } from '@/config/env.js'
import { withRetry } from './retry.js'

const GITHUB_API = 'https://api.github.com'

function base64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function signGitHubAppJwt(): string {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error('GitHub App not configured (GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY missing)')
  }

  const now     = Math.floor(Date.now() / 1000)
  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iat: now - 60,       // backdate 60s for clock skew
    exp: now + 8 * 60,   // GitHub max: 10 minutes
    iss: env.GITHUB_APP_ID,
  }))

  const signing    = `${header}.${payload}`
  const privateKey = env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n')
  const signature  = base64url(createSign('RSA-SHA256').update(signing).sign(privateKey))

  return `${signing}.${signature}`
}

export async function getInstallationToken(installationId: string | number): Promise<string> {
  return withRetry(async () => {
    const jwt = signGitHubAppJwt()
    const res = await fetch(
      `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
      {
        method:  'POST',
        headers: {
          Authorization:          `Bearer ${jwt}`,
          Accept:                 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )
    if (!res.ok) {
      throw new Error(`GitHub installation token exchange failed: ${res.status}`)
    }
    const data = await res.json() as { token: string }
    return data.token
  })
}

export async function ghApiGet<T>(token: string, path: string): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Authorization:          `token ${token}`,
        Accept:                 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`)
    return res.json() as Promise<T>
  })
}

export async function ghApiPost<T>(token: string, path: string, body: unknown): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(`${GITHUB_API}${path}`, {
      method:  'POST',
      headers: {
        Authorization:          `token ${token}`,
        Accept:                 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type':         'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`GitHub POST ${path} failed: ${res.status}`)
    return res.json() as Promise<T>
  })
}
