import { z } from 'zod'

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .trim()
    .optional(),
})

export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>
