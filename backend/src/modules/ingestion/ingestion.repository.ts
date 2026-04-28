import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@/infra/db/client.js'
import { rawEvents } from '@/infra/db/schema/index.js'
import type { NormalizedEvent } from './ingestion.types.js'
import { IngestionStatus } from '@/shared/types/entities.js'

// Insert a single event — idempotent via ON CONFLICT DO NOTHING on the unique dedupe index.
// Returns null if the event was already ingested (duplicate webhook delivery, replay, backfill overlap).
export async function insertRawEvent(tenantId: string, event: NormalizedEvent) {
  const [row] = await db
    .insert(rawEvents)
    .values({
      tenantId,
      externalId:  event.externalId,
      source:      event.source,
      entityType:  event.entityType,
      content:     event.content,
      metadata:    event.metadata,
      status:      IngestionStatus.Pending,
      occurredAt:  event.occurredAt,
    })
    .onConflictDoNothing({
      target: [rawEvents.tenantId, rawEvents.externalId, rawEvents.source],
    })
    .returning({ id: rawEvents.id })

  return row ?? null
}

// Batch insert for historical backfill — same dedupe target as the single-row variant
export async function batchInsertRawEvents(tenantId: string, events: NormalizedEvent[]) {
  if (events.length === 0) return []

  const rows = await db
    .insert(rawEvents)
    .values(
      events.map(e => ({
        tenantId,
        externalId:  e.externalId,
        source:      e.source,
        entityType:  e.entityType,
        content:     e.content,
        metadata:    e.metadata,
        status:      IngestionStatus.Pending,
        occurredAt:  e.occurredAt,
      }))
    )
    .onConflictDoNothing({
      target: [rawEvents.tenantId, rawEvents.externalId, rawEvents.source],
    })
    .returning({ id: rawEvents.id })

  return rows
}

// Mark events as processing (claim a batch)
export async function claimPendingEvents(tenantId: string, limit = 50) {
  const pending = await db
    .select({ id: rawEvents.id })
    .from(rawEvents)
    .where(and(
      eq(rawEvents.tenantId, tenantId),
      eq(rawEvents.status, IngestionStatus.Pending),
    ))
    .limit(limit)

  if (pending.length === 0) return []

  const ids = pending.map(r => r.id)

  const claimed = await db
    .update(rawEvents)
    .set({ status: IngestionStatus.Processing })
    .where(inArray(rawEvents.id, ids))
    .returning()

  return claimed
}

export async function markEventComplete(id: string) {
  await db
    .update(rawEvents)
    .set({ status: IngestionStatus.Complete, processedAt: new Date() })
    .where(eq(rawEvents.id, id))
}

export async function markEventFailed(id: string) {
  await db
    .update(rawEvents)
    .set({ status: IngestionStatus.Failed })
    .where(eq(rawEvents.id, id))
}
