import type { FastifyInstance } from 'fastify'
import { handleProcessEvent }      from '@/jobs/process-event.job.js'
import { handleGenerateEmbeddings } from '@/jobs/generate-embeddings.job.js'
import { handleBuildEdges }         from '@/jobs/build-edges.job.js'
import { handleBackfillSource }     from '@/jobs/backfill-source.job.js'
import { DysonError }               from '@/shared/errors.js'
import { env }                      from '@/config/env.js'

// Jobs are called by Cloud Tasks. In production, Cloud Tasks sends an OIDC token
// (recommended). As a simpler alternative we verify a shared JOB_SECRET header.
// This is a dedicated secret — never the same as JWT_SECRET.
function verifyJobSecret(request: { headers: Record<string, string | string[] | undefined> }) {
  if (env.NODE_ENV !== 'production') return // unreachable from public internet in dev
  const secret = request.headers['x-dyson-job-secret']
  if (secret !== env.JOB_SECRET) {
    throw new DysonError('FORBIDDEN', 'Invalid job secret', 403)
  }
}

export default async function jobRoutes(app: FastifyInstance) {

  // POST /jobs/process-event
  app.post('/process-event', {
    schema: { tags: ['Jobs'], summary: 'Process a raw event into a context node' },
  }, async (req, reply) => {
    verifyJobSecret(req)
    await handleProcessEvent(req.body, req.log)
    return reply.status(204).send()
  })

  // POST /jobs/generate-embeddings
  app.post('/generate-embeddings', {
    schema: { tags: ['Jobs'], summary: 'Generate and store embedding for a context node' },
  }, async (req, reply) => {
    verifyJobSecret(req)
    await handleGenerateEmbeddings(req.body, req.log)
    return reply.status(204).send()
  })

  // POST /jobs/build-edges
  app.post('/build-edges', {
    schema: { tags: ['Jobs'], summary: 'Build causal edges from a context node' },
  }, async (req, reply) => {
    verifyJobSecret(req)
    await handleBuildEdges(req.body, req.log)
    return reply.status(204).send()
  })

  // POST /jobs/backfill-source
  app.post('/backfill-source', {
    schema: { tags: ['Jobs'], summary: 'Backfill historical events from a connected source' },
  }, async (req, reply) => {
    verifyJobSecret(req)
    await handleBackfillSource(req.body, req.log)
    return reply.status(204).send()
  })
}
