import { z } from 'zod'

export const UpdateMeSchema = z.object({
  name:      z.string().min(2).max(100).trim().optional(),
  avatarUrl: z.string().url().optional().nullable(),
})

export const InviteUserSchema = z.object({
  email:         z.string().email().toLowerCase().trim(),
  role:          z.enum(['admin', 'member', 'viewer']).default('member'),
  workspaceName: z.string().optional(), // passed through to email template
})

export const ListUsersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().min(1).max(100).default(50),
})

export type UpdateMeInput     = z.infer<typeof UpdateMeSchema>
export type InviteUserInput   = z.infer<typeof InviteUserSchema>
export type ListUsersQuery    = z.infer<typeof ListUsersQuerySchema>
