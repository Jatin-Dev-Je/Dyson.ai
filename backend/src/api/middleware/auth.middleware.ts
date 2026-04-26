import type { FastifyRequest, FastifyReply } from 'fastify'
import { UnauthorizedError } from '@/shared/errors.js'

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    throw new UnauthorizedError()
  }
}
