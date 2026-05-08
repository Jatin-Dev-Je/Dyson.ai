import { db } from '../../infra/db/client.js'
import { agentRuns, agentAlerts } from '../../infra/db/schema/beliefs.schema.js'
import { eq, and, desc } from 'drizzle-orm'

type CreateAlertInput = {
  alertType: string
  severity:  'info' | 'warning' | 'critical'
  message:   string
  metadata:  Record<string, unknown>
}

type LogRunInput = {
  agentType:   string
  triggerType: string
  triggerData: Record<string, unknown>
  success:     boolean
  output:      Record<string, unknown>
  error:       string | undefined
  latencyMs:   number | undefined
}

type FeedItem = {
  id:        string
  type:      'run' | 'alert'
  agentType: string
  title:     string
  summary:   string
  severity:  string
  createdAt: Date
  metadata:  Record<string, unknown>
}

export const agentFeedService = {

  async getFeed(
    tenantId: string,
    opts: { limit?: number; agentType?: string; cursor?: string } = {},
  ) {
    const limit = opts.limit ?? 50

    const [runs, alerts] = await Promise.all([
      db.select().from(agentRuns)
        .where(eq(agentRuns.tenantId, tenantId))
        .orderBy(desc(agentRuns.createdAt))
        .limit(limit),
      db.select().from(agentAlerts)
        .where(eq(agentAlerts.tenantId, tenantId))
        .orderBy(desc(agentAlerts.createdAt))
        .limit(limit),
    ])

    const items: FeedItem[] = [
      ...runs.map(r => ({
        id:        r.id,
        type:      'run' as const,
        agentType: r.agentType,
        title:     formatRunTitle(r.agentType, r.triggerType),
        summary:   r.error ?? formatRunSummary(r.agentType, r.output as Record<string, unknown>),
        severity:  r.success === 'true' ? 'info' : 'warning',
        createdAt: r.createdAt,
        metadata:  { triggerType: r.triggerType, latencyMs: r.latencyMs, success: r.success },
      })),
      ...alerts.map(a => ({
        id:        a.id,
        type:      'alert' as const,
        agentType: a.alertType,
        title:     formatAlertTitle(a.alertType),
        summary:   a.message,
        severity:  a.severity,
        createdAt: a.createdAt,
        metadata:  a.metadata as Record<string, unknown>,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)

    return {
      data: items,
      meta: { total: items.length },
    }
  },

  async createAlert(tenantId: string, input: CreateAlertInput) {
    const [row] = await db.insert(agentAlerts).values({
      tenantId,
      alertType: input.alertType,
      severity:  input.severity,
      message:   input.message,
      metadata:  input.metadata,
    }).returning()
    return row
  },

  async markRead(tenantId: string, userId: string, alertIds: string[]) {
    for (const alertId of alertIds) {
      const [existing] = await db
        .select()
        .from(agentAlerts)
        .where(and(eq(agentAlerts.tenantId, tenantId), eq(agentAlerts.id, alertId)))
        .limit(1)

      if (!existing) continue
      const readBy = (existing.readBy as string[]) ?? []
      if (!readBy.includes(userId)) {
        await db
          .update(agentAlerts)
          .set({ readBy: [...readBy, userId] })
          .where(and(eq(agentAlerts.tenantId, tenantId), eq(agentAlerts.id, alertId)))
      }
    }
  },

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const alerts = await db
      .select({ readBy: agentAlerts.readBy })
      .from(agentAlerts)
      .where(eq(agentAlerts.tenantId, tenantId))
      .orderBy(desc(agentAlerts.createdAt))
      .limit(200)

    return alerts.filter(a => {
      const readBy = (a.readBy as string[]) ?? []
      return !readBy.includes(userId)
    }).length
  },

  async logRun(tenantId: string, input: LogRunInput) {
    const [row] = await db.insert(agentRuns).values({
      tenantId,
      agentType:   input.agentType,
      triggerType: input.triggerType,
      triggerData: input.triggerData,
      status:      'completed',
      success:     String(input.success),
      output:      input.output,
      error:       input.error,
      latencyMs:   input.latencyMs !== undefined ? String(input.latencyMs) : undefined,
      completedAt: new Date(),
    }).returning()
    return row
  },

  async listRuns(
    tenantId: string,
    opts: { limit?: number; agentType?: string } = {},
  ) {
    const conditions = [eq(agentRuns.tenantId, tenantId)]
    if (opts.agentType !== undefined) conditions.push(eq(agentRuns.agentType, opts.agentType))

    return db
      .select()
      .from(agentRuns)
      .where(and(...conditions))
      .orderBy(desc(agentRuns.createdAt))
      .limit(opts.limit ?? 30)
  },
}

function formatRunTitle(agentType: string, triggerType: string): string {
  const titles: Record<string, string> = {
    relationship_inference: 'Inferred new knowledge relationships',
    'conflict_detection+relationship_inference': 'Decision analyzed for conflicts',
    conflict_detection:    'Conflict check completed',
    pre_meeting_brief:     'Pre-meeting brief sent',
    digest:                'Team digest delivered',
    knowledge_health:      'Knowledge health scan completed',
    postmortem:            'Post-mortem generated',
    pr_review:             'PR reviewed against company memory',
  }
  return titles[agentType] ?? `${agentType} completed`
}

function formatRunSummary(agentType: string, output: Record<string, unknown> | null): string {
  if (!output) return 'Agent run completed'

  if (agentType === 'relationship_inference') {
    const edges = Number(output['edges_created'] ?? 0)
    return `${edges} new relationship${edges !== 1 ? 's' : ''} inferred`
  }
  if (agentType.includes('conflict')) {
    const conflict = output['conflict'] as Record<string, unknown> | undefined
    const hasConflicts = conflict?.['has_conflicts'] as boolean | undefined
    const severity = conflict?.['severity'] as string | undefined
    return hasConflicts === true ? `Conflict detected: ${severity ?? 'unknown'} severity` : 'No conflicts found'
  }
  if (agentType === 'pre_meeting_brief') {
    const sent = (output['sent_to'] as string[] | undefined)?.length ?? 0
    return `Brief sent to ${sent} attendee${sent !== 1 ? 's' : ''}`
  }
  if (agentType === 'digest') {
    const count = Number(output['decision_count'] ?? 0)
    return `${count} decisions included`
  }
  if (agentType === 'knowledge_health') {
    const score = Number(output['overall_score'] ?? 0)
    return `Health score: ${score.toFixed(0)}/100`
  }
  return 'Completed'
}

function formatAlertTitle(alertType: string): string {
  const titles: Record<string, string> = {
    conflict_detected:  '⚠️ Decision conflict detected',
    pre_meeting_brief:  '📋 Pre-meeting brief ready',
    weekly_digest:      '📊 Weekly digest',
    health_report:      '📈 Knowledge health report',
    knowledge_at_risk:  '🔴 Knowledge at risk',
    stale_decision:     '🕐 Decision needs review',
  }
  return titles[alertType] ?? alertType
}
