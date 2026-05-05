import { db } from '@/infra/db/client.js'
import { auditLog } from '@/infra/db/schema/index.js'
import { eq, and, desc, gt } from 'drizzle-orm'

export type AuditAction =
  | 'auth.signup' | 'auth.login' | 'auth.logout' | 'auth.refresh'
  | 'auth.accept_invite' | 'auth.change_password' | 'auth.email_verified' | 'auth.resend_verification'
  | 'connector.connected' | 'connector.disconnected' | 'connector.synced'
  | 'memory.recall' | 'memory.feedback' | 'memory.created' | 'memory.linked'
  | 'why.query' | 'why.feedback'  // legacy — kept for existing audit rows
  | 'decision.flagged'
  | 'pack.generated'
  | 'apikey.created' | 'apikey.revoked'
  | 'member.invited' | 'member.removed'

export async function writeAudit(opts: {
  tenantId:     string
  actorId:      string | null
  action:       AuditAction
  resourceType?: string
  resourceId?:  string
  metadata?:    Record<string, unknown>
  ipAddress?:   string
}) {
  // Fire-and-forget — audit writes must never block the request
  void db.insert(auditLog).values({
    tenantId:     opts.tenantId,
    actorId:      opts.actorId,
    action:       opts.action,
    resourceType: opts.resourceType,
    resourceId:   opts.resourceId,
    metadata:     opts.metadata,
    ipAddress:    opts.ipAddress,
  }).catch(() => undefined)  // Never throw — audit is best-effort
}

export async function listAuditLog(tenantId: string, opts: {
  cursor?: string
  limit:   number
}) {
  const conditions = [eq(auditLog.tenantId, tenantId)]
  if (opts.cursor) conditions.push(gt(auditLog.id, opts.cursor))

  const rows = await db
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt))
    .limit(opts.limit + 1)

  const hasMore = rows.length > opts.limit
  return {
    logs:       hasMore ? rows.slice(0, opts.limit) : rows,
    nextCursor: hasMore ? (rows[opts.limit - 1]?.id ?? null) : null,
    hasMore,
  }
}
