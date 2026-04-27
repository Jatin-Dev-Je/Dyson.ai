import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'
import { processRawEvent } from '@/modules/processing/processing.service.js'
import type { NormalizedEvent } from '@/modules/ingestion/ingestion.types.js'
import { EntityType, EventSource } from '@/shared/types/entities.js'

const Schema = z.object({
  eventId:  z.string().uuid(),
  tenantId: z.string().uuid(),
  event:    z.object({
    externalId:  z.string(),
    source:      z.nativeEnum(EventSource),
    entityType:  z.nativeEnum(EntityType),
    content:     z.string(),
    metadata:    z.record(z.unknown()),
    occurredAt:  z.string().transform(s => new Date(s)),
    authorEmail: z.string().nullable(),
    url:         z.string().nullable(),
  }),
})

export async function handleProcessEvent(
  payload: unknown,
  logger:  FastifyBaseLogger
) {
  const { eventId, tenantId, event } = Schema.parse(payload)
  await processRawEvent(eventId, tenantId, event as NormalizedEvent, logger)
}
