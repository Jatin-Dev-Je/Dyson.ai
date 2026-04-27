import { eq, and } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { connectedSources } from '@/infra/db/schema/index.js'

export async function listConnectors(tenantId: string) {
  return db
    .select({
      id:           connectedSources.id,
      source:       connectedSources.source,
      isActive:     connectedSources.isActive,
      lastSyncedAt: connectedSources.lastSyncedAt,
      syncError:    connectedSources.syncError,
      createdAt:    connectedSources.createdAt,
      // Never return access token to API consumers
    })
    .from(connectedSources)
    .where(eq(connectedSources.tenantId, tenantId))
}

export async function findConnector(tenantId: string, source: string) {
  const [row] = await db
    .select()
    .from(connectedSources)
    .where(and(
      eq(connectedSources.tenantId, tenantId),
      eq(connectedSources.source, source),
    ))
    .limit(1)
  return row ?? null
}

export async function upsertConnector(opts: {
  tenantId:    string
  source:      string
  accessToken: string
  metadata:    string
}) {
  const [row] = await db
    .insert(connectedSources)
    .values({
      ...opts,
      isActive: true,
      syncError: null,
    })
    .onConflictDoUpdate({
      target: [connectedSources.tenantId, connectedSources.source],
      set: {
        accessToken: opts.accessToken,
        metadata:    opts.metadata,
        isActive:    true,
        syncError:   null,
        updatedAt:   new Date(),
      },
    })
    .returning()
  return row!
}

export async function markSyncComplete(id: string) {
  await db
    .update(connectedSources)
    .set({ lastSyncedAt: new Date(), syncError: null, updatedAt: new Date() })
    .where(eq(connectedSources.id, id))
}

export async function markSyncError(id: string, error: string) {
  await db
    .update(connectedSources)
    .set({ syncError: error, updatedAt: new Date() })
    .where(eq(connectedSources.id, id))
}

export async function disconnectConnector(id: string, tenantId: string) {
  await db
    .update(connectedSources)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(connectedSources.id, id), eq(connectedSources.tenantId, tenantId)))
}
