/**
 * Notification preferences service.
 *
 * One row in notification_prefs per user (upsert on first save).
 * Returns defaults when no row exists — no migration needed for existing users.
 */

import { eq, and } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { notificationPrefs } from '@/infra/db/schema/index.js'
import {
  DEFAULT_EMAIL_PREFS, DEFAULT_SLACK_PREFS,
  type NotificationPrefs, type UpdatePrefsInput,
} from './notifications.schema.js'

export type StoredPrefs = {
  email: NotificationPrefs
  slack: NotificationPrefs
}

function mergeWithDefaults(
  stored:   Record<string, boolean | undefined>,
  defaults: NotificationPrefs,
): NotificationPrefs {
  return {
    new_decision:   (stored['new_decision']   as boolean | undefined) ?? defaults.new_decision,
    weekly_digest:  (stored['weekly_digest']  as boolean | undefined) ?? defaults.weekly_digest,
    low_confidence: (stored['low_confidence'] as boolean | undefined) ?? defaults.low_confidence,
    new_member:     (stored['new_member']     as boolean | undefined) ?? defaults.new_member,
    onboarding:     (stored['onboarding']     as boolean | undefined) ?? defaults.onboarding,
    source_error:   (stored['source_error']   as boolean | undefined) ?? defaults.source_error,
  }
}

export async function getNotificationPrefs(
  userId:   string,
  tenantId: string,
): Promise<StoredPrefs> {
  const [row] = await db
    .select({ email: notificationPrefs.email, slack: notificationPrefs.slack })
    .from(notificationPrefs)
    .where(and(
      eq(notificationPrefs.userId,   userId),
      eq(notificationPrefs.tenantId, tenantId),
    ))
    .limit(1)

  return {
    email: mergeWithDefaults((row?.email ?? {}) as Partial<NotificationPrefs>, DEFAULT_EMAIL_PREFS),
    slack: mergeWithDefaults((row?.slack ?? {}) as Partial<NotificationPrefs>, DEFAULT_SLACK_PREFS),
  }
}

export async function updateNotificationPrefs(
  userId:   string,
  tenantId: string,
  input:    UpdatePrefsInput,
): Promise<StoredPrefs> {
  const current = await getNotificationPrefs(userId, tenantId)

  // Merge partial updates — only override keys that are explicitly provided.
  // mergeWithDefaults ensures all required booleans remain defined.
  const updated: StoredPrefs = {
    email: mergeWithDefaults(
      { ...(current.email as Record<string, boolean>), ...(input.email ?? {}) },
      DEFAULT_EMAIL_PREFS,
    ),
    slack: mergeWithDefaults(
      { ...(current.slack as Record<string, boolean>), ...(input.slack ?? {}) },
      DEFAULT_SLACK_PREFS,
    ),
  }

  await db
    .insert(notificationPrefs)
    .values({
      userId,
      tenantId,
      email:     updated.email,
      slack:     updated.slack,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target:    notificationPrefs.userId,
      set: {
        email:     updated.email,
        slack:     updated.slack,
        updatedAt: new Date(),
      },
    })

  return updated
}
