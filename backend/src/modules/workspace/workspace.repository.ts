import { eq, and, ne } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { tenants } from '@/infra/db/schema/index.js'

export async function findTenantById(id: string) {
  const [row] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, id), eq(tenants.isActive, true)))
    .limit(1)
  return row ?? null
}

export async function isSlugTaken(slug: string, excludeTenantId: string) {
  const [row] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.slug, slug), ne(tenants.id, excludeTenantId)))
    .limit(1)
  return !!row
}

export async function updateTenant(
  id: string,
  data: { name?: string; slug?: string }
) {
  const [updated] = await db
    .update(tenants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning()
  return updated ?? null
}

export async function softDeleteTenant(id: string) {
  await db
    .update(tenants)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(tenants.id, id))
}
