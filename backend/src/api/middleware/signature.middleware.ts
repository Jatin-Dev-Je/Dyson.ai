import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { WebhookSignatureError } from '@/shared/errors.js'
import { env } from '@/config/env.js'
import { WEBHOOK_TIMESTAMP_TOLERANCE_MS } from '@/config/constants.js'

export async function verifySlackSignature(request: FastifyRequest, _reply: FastifyReply) {
  const timestamp = request.headers['x-slack-request-timestamp']
  const signature = request.headers['x-slack-signature']

  if (!timestamp || !signature || Array.isArray(timestamp) || Array.isArray(signature)) {
    throw new WebhookSignatureError()
  }

  // Reject replayed requests older than 5 minutes
  const age = Date.now() - Number(timestamp) * 1000
  if (age > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
    throw new WebhookSignatureError()
  }

  const body = JSON.stringify(request.body)
  const sigBase = `v0:${timestamp}:${body}`
  const expected = `v0=${createHmac('sha256', env.SLACK_SIGNING_SECRET).update(sigBase).digest('hex')}`

  const expectedBuf = Buffer.from(expected)
  const receivedBuf = Buffer.from(signature)

  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    throw new WebhookSignatureError()
  }
}

export async function verifyGitHubSignature(request: FastifyRequest, _reply: FastifyReply) {
  const signature = request.headers['x-hub-signature-256']

  if (!signature || Array.isArray(signature)) {
    throw new WebhookSignatureError()
  }

  const body = JSON.stringify(request.body)
  const expected = `sha256=${createHmac('sha256', env.GITHUB_WEBHOOK_SECRET).update(body).digest('hex')}`

  const expectedBuf = Buffer.from(expected)
  const receivedBuf = Buffer.from(signature)

  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    throw new WebhookSignatureError()
  }
}
