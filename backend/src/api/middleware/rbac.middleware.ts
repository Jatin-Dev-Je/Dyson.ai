import type { FastifyRequest, FastifyReply } from 'fastify'
import { ForbiddenError } from '@/shared/errors.js'

const roleHierarchy: Record<string, number> = {
  admin:  3,
  member: 2,
  viewer: 1,
}

export function requireRole(minRole: 'admin' | 'member' | 'viewer') {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const payload = request.user as { role?: string } | undefined
    const userLevel = roleHierarchy[payload?.role ?? ''] ?? 0
    const required  = roleHierarchy[minRole] ?? 99

    if (userLevel < required) throw new ForbiddenError()
  }
}
