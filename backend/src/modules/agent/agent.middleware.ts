import type { FastifyRequest, FastifyReply } from 'fastify'
import { validateApiKey } from '@/modules/api-keys/apikeys.service.js'
import { UnauthorizedError, ForbiddenError } from '@/shared/errors.js'

// Attach agent context to request
declare module 'fastify' {
  interface FastifyRequest {
    agentContext?: { tenantId: string; scopes: string[] }
  }
}

export async function agentAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError()
  }

  const rawKey = authHeader.slice(7)
  if (!rawKey.startsWith('dys_')) {
    throw new UnauthorizedError()
  }

  const context = await validateApiKey(rawKey)
  if (!context) throw new UnauthorizedError()

  request.agentContext = context
}

export function requireScope(scope: string) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    if (!request.agentContext?.scopes.includes(scope)) {
      throw new ForbiddenError()
    }
  }
}
