import { findTenantById, isSlugTaken, updateTenant } from './workspace.repository.js'
import { DysonError, NotFoundError } from '@/shared/errors.js'
import type { UpdateWorkspaceInput } from './workspace.schema.js'

export async function getWorkspace(tenantId: string) {
  const tenant = await findTenantById(tenantId)
  if (!tenant) throw new NotFoundError('Workspace')
  return tenant
}

export async function updateWorkspace(tenantId: string, input: UpdateWorkspaceInput) {
  if (input.slug) {
    const taken = await isSlugTaken(input.slug, tenantId)
    if (taken) throw new DysonError('SLUG_TAKEN', 'This workspace URL is already taken', 409)
  }

  const data: { name?: string; slug?: string } = {}
  if (input.name) data.name = input.name
  if (input.slug) data.slug = input.slug
  const updated = await updateTenant(tenantId, data)
  if (!updated) throw new NotFoundError('Workspace')
  return updated
}
