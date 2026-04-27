import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { WebhookSignatureError, DysonError } from '@/shared/errors.js'
import { env } from '@/config/env.js'
import { WEBHOOK_TIMESTAMP_TOLERANCE_MS } from '@/config/constants.js'

export async function verifySlackSignature(request: FastifyRequest, _reply: FastifyReply) {
  if (!env.SLACK_SIGNING_SECRET) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'Slack connector is not configured', 503)
  }

  const timestamp = request.headers['x-slack-request-timestamp']
  const signature = request.headers['x-slack-signature']

  if (!timestamp || !signature || Array.isArray(timestamp) || Array.isArray(signature)) {
    throw new WebhookSignatureError()
  }

  const age = Date.now() - Number(timestamp) * 1000
  if (age > WEBHOOK_TIMESTAMP_TOLERANCE_MS) throw new WebhookSignatureError()

  const body     = JSON.stringify(request.body)
  const sigBase  = `v0:${timestamp}:${body}`
  const expected = `v0=${createHmac('sha256', env.SLACK_SIGNING_SECRET).update(sigBase).digest('hex')}`

  const eBuf = Buffer.from(expected)
  const rBuf = Buffer.from(signature)

  if (eBuf.length !== rBuf.length || !timingSafeEqual(eBuf, rBuf)) {
    throw new WebhookSignatureError()
  }
}

export async function verifyGitHubSignature(request: FastifyRequest, _reply: FastifyReply) {
  if (!env.GITHUB_WEBHOOK_SECRET) {
    throw new DysonError('CONNECTOR_NOT_CONFIGURED', 'GitHub connector is not configured', 503)
  }

  const signature = request.headers['x-hub-signature-256']

  if (!signature || Array.isArray(signature)) throw new WebhookSignatureError()

  const body     = JSON.stringify(request.body)
  const expected = `sha256=${createHmac('sha256', env.GITHUB_WEBHOOK_SECRET).update(body).digest('hex')}`

  const eBuf = Buffer.from(expected)
  const rBuf = Buffer.from(signature)

  if (eBuf.length !== rBuf.length || !timingSafeEqual(eBuf, rBuf)) {
    throw new WebhookSignatureError()
  }
}
