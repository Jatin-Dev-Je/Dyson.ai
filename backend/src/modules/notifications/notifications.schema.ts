import { z } from 'zod'

export const NotificationPrefsSchema = z.object({
  new_decision:   z.boolean().default(true),
  weekly_digest:  z.boolean().default(true),
  low_confidence: z.boolean().default(false),
  new_member:     z.boolean().default(true),
  onboarding:     z.boolean().default(true),
  source_error:   z.boolean().default(true),
})

// Use a separate partial schema that explicitly allows undefined values
// (exactOptionalPropertyTypes requires this distinction)
const PartialPrefsSchema = z.object({
  new_decision:   z.boolean().optional(),
  weekly_digest:  z.boolean().optional(),
  low_confidence: z.boolean().optional(),
  new_member:     z.boolean().optional(),
  onboarding:     z.boolean().optional(),
  source_error:   z.boolean().optional(),
})

export const UpdatePrefsSchema = z.object({
  email: PartialPrefsSchema.optional(),
  slack: PartialPrefsSchema.optional(),
})

export type PartialPrefsInput = z.infer<typeof PartialPrefsSchema>

export type NotificationPrefs  = z.infer<typeof NotificationPrefsSchema>
export type UpdatePrefsInput   = z.infer<typeof UpdatePrefsSchema>

export const DEFAULT_EMAIL_PREFS: NotificationPrefs = {
  new_decision:   true,
  weekly_digest:  true,
  low_confidence: false,
  new_member:     true,
  onboarding:     true,
  source_error:   true,
}

export const DEFAULT_SLACK_PREFS: NotificationPrefs = {
  new_decision:   true,
  weekly_digest:  false,
  low_confidence: true,
  new_member:     false,
  onboarding:     true,
  source_error:   true,
}
