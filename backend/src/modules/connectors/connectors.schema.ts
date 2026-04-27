import { z } from 'zod'
import { EventSource } from '@/shared/types/entities.js'

export const ConnectorIdSchema = z.object({
  id: z.string().uuid(),
})

export const SlackCallbackSchema = z.object({
  code:  z.string().min(1),
  state: z.string().min(1),
})

export const GitHubCallbackSchema = z.object({
  installation_id: z.coerce.number(),
  code:            z.string().optional(),
  state:           z.string().optional(),
})

export const SyncConnectorSchema = z.object({
  source: z.nativeEnum(EventSource),
})
