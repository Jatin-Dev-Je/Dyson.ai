import type { FastifyRequest, FastifyReply } from 'fastify'
import { UnauthorizedError } from '@/shared/errors.js'

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as { type?: string }
    // Reject refresh tokens being used as access tokens
    if (payload.type !== 'access') throw new UnauthorizedError()
  } catch {
    throw new UnauthorizedError()
  }
}
