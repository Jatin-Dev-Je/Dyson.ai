import { createHash, randomBytes } from 'crypto'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/infra/db/client.js'
import { apiKeys } from '@/infra/db/schema/index.js'
import { NotFoundError } from '@/shared/errors.js'

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
      // Never return keyHash
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

  // Return plaintext key ONCE — never stored, never recoverable
  return { ...row!, rawKey: raw }
}

// Admin-only at the route layer. Tenant scoping prevents cross-workspace revocation.
export async function revokeApiKey(id: string, tenantId: string, _requesterId: string) {
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

// Used by agent middleware to validate incoming keys
export async function validateApiKey(rawKey: string): Promise<{ tenantId: string; scopes: string[] } | null> {
  const hash = hashApiKey(rawKey)

  const [row] = await db
    .select({ tenantId: apiKeys.tenantId, scopes: apiKeys.scopes })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1)

  if (!row) return null

  // Update lastUsedAt non-blocking
  void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.keyHash, hash))

  return { tenantId: row.tenantId, scopes: row.scopes ?? [] }
}
