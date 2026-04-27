import { describe, expect, it, vi } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { agentAuthMiddleware, requireScope } from '@/modules/agent/agent.middleware.js'
import { UnauthorizedError, ForbiddenError } from '@/shared/errors.js'

const mockReply = {} as FastifyReply

function reqWith(headers: Record<string, string> = {}, agentContext?: { tenantId: string; scopes: string[] }) {
  return { headers, agentContext } as unknown as FastifyRequest
}

describe('agent.middleware — agentAuthMiddleware', () => {
  it('rejects when Authorization header is missing', async () => {
    await expect(agentAuthMiddleware(reqWith({}), mockReply)).rejects.toThrow(UnauthorizedError)
  })

  it('rejects when Authorization scheme is not Bearer', async () => {
    const req = reqWith({ authorization: 'Basic dXNlcjpwYXNz' })
    await expect(agentAuthMiddleware(req, mockReply)).rejects.toThrow(UnauthorizedError)
  })

  it('rejects when token does not have the dys_ prefix', async () => {
    const req = reqWith({ authorization: 'Bearer not_a_dyson_key' })
    await expect(agentAuthMiddleware(req, mockReply)).rejects.toThrow(UnauthorizedError)
  })
})

describe('agent.middleware — requireScope', () => {
  it('rejects when no agentContext is set on the request', async () => {
    const handler = requireScope('read')
    await expect(handler(reqWith({}), mockReply)).rejects.toThrow(ForbiddenError)
  })

  it('rejects when the requested scope is not present', async () => {
    const handler = requireScope('write')
    const req     = reqWith({}, { tenantId: 't1', scopes: ['read'] })
    await expect(handler(req, mockReply)).rejects.toThrow(ForbiddenError)
  })

  it('passes when the scope is present', async () => {
    const handler = requireScope('read')
    const req     = reqWith({}, { tenantId: 't1', scopes: ['read', 'write'] })
    await expect(handler(req, mockReply)).resolves.toBeUndefined()
  })
})

// Suppress unused import warning — vi is exported for future mock work
void vi
