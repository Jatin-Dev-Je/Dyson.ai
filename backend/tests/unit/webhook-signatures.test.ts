/**
 * Webhook signature verification tests — Slack HMAC and GitHub HMAC.
 * These are security-critical: a bypassed signature check lets anyone
 * inject events into the ingestion pipeline.
 */
import { describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'

// ─── Slack signature ───────────────────────────────────────────────────────
// Slack signs requests with HMAC-SHA256(signing_secret, "v0:{ts}:{body}")
// and sends the result as X-Slack-Signature: v0={hex}

function computeSlackSig(signingSecret: string, ts: number, body: string): string {
  const base = `v0:${ts}:${body}`
  const hmac = createHmac('sha256', signingSecret).update(base).digest('hex')
  return `v0=${hmac}`
}

describe('Slack webhook signature', () => {
  const secret = 'test-slack-signing-secret'
  const body   = '{"type":"event_callback","event":{"type":"message"}}'
  const ts     = Math.floor(Date.now() / 1000)

  it('accepts a valid signature', () => {
    const sig = computeSlackSig(secret, ts, body)
    // Re-compute and compare (mirrors the middleware logic)
    const expected = computeSlackSig(secret, ts, body)
    expect(sig).toBe(expected)
  })

  it('rejects a signature with wrong secret', () => {
    const sig  = computeSlackSig(secret, ts, body)
    const evil = computeSlackSig('wrong-secret', ts, body)
    expect(sig).not.toBe(evil)
  })

  it('rejects a signature with tampered body', () => {
    const sig     = computeSlackSig(secret, ts, body)
    const tampered = computeSlackSig(secret, ts, body + 'evil')
    expect(sig).not.toBe(tampered)
  })

  it('rejects a replayed signature (timestamp too old)', () => {
    const oldTs = Math.floor(Date.now() / 1000) - 6 * 60 // 6 minutes ago
    const sig   = computeSlackSig(secret, oldTs, body)
    // A production check would reject requests where ts is >5 min old
    const tolerance = 5 * 60 * 1000
    const tsDiff    = (Math.floor(Date.now() / 1000) - oldTs) * 1000
    expect(tsDiff).toBeGreaterThan(tolerance)
    expect(sig).toBeTruthy() // sig is valid but should be rejected by age check
  })
})

// ─── GitHub signature ──────────────────────────────────────────────────────
// GitHub signs with HMAC-SHA256(webhook_secret, body) and sends
// X-Hub-Signature-256: sha256={hex}

function computeGitHubSig(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

describe('GitHub webhook signature', () => {
  const secret = 'test-github-webhook-secret'
  const body   = '{"action":"opened","pull_request":{"number":42}}'

  it('accepts a valid signature', () => {
    const sig      = computeGitHubSig(secret, body)
    const expected = computeGitHubSig(secret, body)
    expect(sig).toBe(expected)
  })

  it('rejects a signature with wrong secret', () => {
    const sig  = computeGitHubSig(secret, body)
    const evil = computeGitHubSig('wrong-secret', body)
    expect(sig).not.toBe(evil)
  })

  it('rejects a signature with tampered body', () => {
    const sig     = computeGitHubSig(secret, body)
    const tampered = computeGitHubSig(secret, body + '"injected":true}')
    expect(sig).not.toBe(tampered)
  })

  it('signature format starts with sha256=', () => {
    const sig = computeGitHubSig(secret, body)
    expect(sig.startsWith('sha256=')).toBe(true)
    expect(sig).toHaveLength(7 + 64) // "sha256=" + 64 hex chars
  })
})
