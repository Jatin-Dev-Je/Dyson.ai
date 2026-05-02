import type { z } from 'zod'
import type { CreateMemorySchema, ListMemoriesSchema } from './memory.routes.js'

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>
export type ListMemoriesQuery = z.infer<typeof ListMemoriesSchema>
