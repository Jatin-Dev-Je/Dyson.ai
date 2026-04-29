import { createHash, randomBytes } from 'crypto'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/infra/db/client.js'
import { apiKeys } from '@/infra/db/schema/index.js'
import { NotFoundError } from '@/shared/errors.js'
import { apiKeyCache } from '@/infra/cache.js'

export const CreateApiKeySchema = z.object({
  name:   z.string().min(1).max(100).trim(),
  scopes: z.array(z.enum(['read', 'write'])).default(['read']),
})

function generateKey(): { raw: string; prefix: string; hash: string } {
  const raw    = `dys_${randomBytes(24).toString('hex')}`
  const prefix = raw.slice(0, 12)
  const hash   = createHash('sha256').update(raw).digest('hex')
  return { raw, prefix, hash }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function listApiKeys(tenantId: string) {
  return db
    .select({
      id:         apiKeys.id,
      name:       apiKeys.name,
      keyPrefix:  apiKeys.keyPrefix,
      scopes:     apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt:  apiKeys.revokedAt,
      createdAt:  apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.tenantId, tenantId), isNull(apiKeys.revokedAt)))
}

export async function createApiKey(
  tenantId:  string,
  userId:    string,
  input:     z.infer<typeof CreateApiKeySchema>
) {
  const { raw, prefix, hash } = generateKey()

  const [row] = await db
    .insert(apiKeys)
    .values({
      tenantId,
      createdBy: userId,
      name:      input.name,
      keyPrefix: prefix,
      keyHash:   hash,
      scopes:    input.scopes,
    })
    .returning({
      id:        apiKeys.id,
      name:      apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes:    apiKeys.scopes,
      createdAt: apiKeys.createdAt,
    })

  if (!row) throw new Error('createApiKey insert returned no row')
  return { ...row, rawKey: raw }
}

export async function revokeApiKey(id: string, tenantId: string, _requesterId: string) {
  // Invalidate cache immediately so the key stops working within milliseconds
  const [existing] = await db
    .select({ keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)))
    .limit(1)

  if (existing) apiKeyCache.invalidate(existing.keyHash)

  const result = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(apiKeys.id, id),
      eq(apiKeys.tenantId, tenantId),
      isNull(apiKeys.revokedAt),
    ))
    .returning({ id: apiKeys.id })

  if (result.length === 0) throw new NotFoundError('API key')
}

// Used by agent middleware — cached for 60s to avoid a DB round-trip on every
// agent request. Revocation invalidates the cache entry immediately (above).
export async function validateApiKey(rawKey: string): Promise<{ tenantId: string; scopes: string[] } | null> {
  const hash   = hashApiKey(rawKey)
  const cached = apiKeyCache.get(hash)
  if (cached) return cached

  const [row] = await db
    .select({ tenantId: apiKeys.tenantId, scopes: apiKeys.scopes })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1)

  if (!row) return null

  const result = { tenantId: row.tenantId, scopes: row.scopes ?? [] }
  apiKeyCache.set(hash, result)

  // Update lastUsedAt non-blocking — don't wait, don't fail the request
  void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.keyHash, hash))

  return result
}
