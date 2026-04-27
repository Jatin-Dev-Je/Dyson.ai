import { env } from '@/config/env.js'
import type { FastifyBaseLogger } from 'fastify'

export type JobName =
  | 'process-event'
  | 'generate-embeddings'
  | 'build-edges'
  | 'backfill-source'

type JobPayload = Record<string, unknown>

// Lazy import of Cloud Tasks client to avoid startup errors when GCP is not configured
async function getCloudTasksClient() {
  const { CloudTasksClient } = await import('@google-cloud/tasks')
  return new CloudTasksClient()
}

async function enqueueCloudTask(job: JobName, payload: JobPayload) {
  if (!env.GCP_PROJECT_ID) return  // Guard — should not happen since we check first

  const client   = await getCloudTasksClient()
  const parent   = client.queuePath(env.GCP_PROJECT_ID, env.GCP_REGION, env.CLOUD_TASKS_QUEUE_NAME)
  const url      = `${env.CLOUD_TASKS_HANDLER_URL}/${job}`
  const body     = Buffer.from(JSON.stringify(payload)).toString('base64')

  await client.createTask({
    parent,
    task: {
      httpRequest: {
        httpMethod: 'POST' as const,
        url,
        headers:    { 'Content-Type': 'application/json' },
        body,
      },
    },
  })
}

// Inline execution for dev (no Cloud Tasks needed)
// The job handler is imported and called directly
async function executeInline(job: JobName, payload: JobPayload, logger: FastifyBaseLogger) {
  try {
    switch (job) {
      case 'process-event': {
        const { handleProcessEvent } = await import('@/jobs/process-event.job.js')
        await handleProcessEvent(payload, logger)
        break
      }
      case 'generate-embeddings': {
        const { handleGenerateEmbeddings } = await import('@/jobs/generate-embeddings.job.js')
        await handleGenerateEmbeddings(payload, logger)
        break
      }
      case 'build-edges': {
        const { handleBuildEdges } = await import('@/jobs/build-edges.job.js')
        await handleBuildEdges(payload, logger)
        break
      }
      case 'backfill-source': {
        const { handleBackfillSource } = await import('@/jobs/backfill-source.job.js')
        await handleBackfillSource(payload, logger)
        break
      }
    }
  } catch (err) {
    logger.error({ err, job, payload }, 'Inline job execution failed')
    throw err
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function enqueue(
  job: JobName,
  payload: JobPayload,
  logger: FastifyBaseLogger
) {
  if (env.GCP_PROJECT_ID) {
    logger.debug({ job }, 'Enqueueing job to Cloud Tasks')
    await enqueueCloudTask(job, payload)
  } else {
    logger.debug({ job }, 'Dev mode — executing job inline')
    await executeInline(job, payload, logger)
  }
}
