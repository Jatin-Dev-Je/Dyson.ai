import {
  findUserById, listTenantUsers, updateUser,
  deactivateUser, createInvitation,
} from './users.repository.js'
import { NotFoundError, ForbiddenError, DysonError } from '@/shared/errors.js'
import type { UpdateMeInput, InviteUserInput, ListUsersQuery } from './users.schema.js'

export async function getMe(userId: string, tenantId: string) {
  const user = await findUserById(userId, tenantId)
  if (!user) throw new NotFoundError('User')
  return user
}

export async function updateMe(userId: string, tenantId: string, input: UpdateMeInput) {
  const data: { name?: string; avatarUrl?: string | null } = {}
  if (input.name !== undefined)      data.name      = input.name
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl
  const updated = await updateUser(userId, tenantId, data)
  if (!updated) throw new NotFoundError('User')
  return updated
}

export async function listUsers(tenantId: string, query: ListUsersQuery) {
  const opts: { cursor?: string; limit: number } = { limit: query.limit }
  if (query.cursor) opts.cursor = query.cursor
  return listTenantUsers(tenantId, opts)
}

export async function inviteUser(
  tenantId: string,
  invitedBy: string,
  inviterRole: string,
  input: InviteUserInput
) {
  // Only admins can invite; only admins can grant admin role
  if (inviterRole !== 'admin') throw new ForbiddenError()
  if (input.role === 'admin' && inviterRole !== 'admin') throw new ForbiddenError()

  const invite = await createInvitation({
    tenantId,
    invitedBy,
    email: input.email,
    role:  input.role,
  })

  // TODO Week 6: send invite email via Resend/SendGrid
  // For now, return the invite token so it can be used in dev
  return invite
}

export async function removeUser(
  actorId: string,
  actorRole: string,
  targetId: string,
  tenantId: string
) {
  if (actorRole !== 'admin') throw new ForbiddenError()

  // Cannot remove yourself
  if (actorId === targetId) {
    throw new DysonError('CANNOT_SELF_REMOVE', 'You cannot remove yourself from the workspace', 400)
  }

  const target = await findUserById(targetId, tenantId)
  if (!target) throw new NotFoundError('User')

  await deactivateUser(targetId, tenantId)
}
