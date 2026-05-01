import { z } from 'zod'

export const SignupSchema = z.object({
  name:            z.string().min(2).max(100).trim(),
  email:           z.string().email().toLowerCase().trim(),
  password:        z.string().min(8).max(128),
  workspaceName:   z.string().min(2).max(100).trim(),
  workspaceSlug:   z
    .string()
    .min(2)
    .max(50)
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .trim(),
})

export const LoginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
})

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const AcceptInviteSchema = z.object({
  token:    z.string().min(1),
  name:     z.string().min(2).max(100).trim(),
  password: z.string().min(8).max(128),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword:     z.string().min(8).max(128),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

export const ResetPasswordSchema = z.object({
  token:       z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export type SignupInput           = z.infer<typeof SignupSchema>
export type LoginInput            = z.infer<typeof LoginSchema>
export type RefreshInput          = z.infer<typeof RefreshSchema>
export type AcceptInviteInput     = z.infer<typeof AcceptInviteSchema>
export type ChangePasswordInput   = z.infer<typeof ChangePasswordSchema>
export type ForgotPasswordInput   = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput    = z.infer<typeof ResetPasswordSchema>
