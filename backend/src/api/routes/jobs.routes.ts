import type { FastifyInstance } from 'fastify'
import { handleProcessEvent }      from '@/jobs/process-event.job.js'
import { handleGenerateEmbeddings } from '@/jobs/generate-embeddings.job.js'
import { handleBuildEdges }         from '@/jobs/build-edges.job.js'
import { DysonError }               from '@/shared/errors.js'
import { env }                      from '@/config/env.js'

// Jobs are called by Cloud Tasks using an internal shared secret
// In production this should be a Cloud Tasks OIDC token instead
function verifyJobSecret(request: { headers: Record<string, string | string[] | undefined> }) {
  const secret = request.headers['x-dyson-job-secret']
  if (env.NODE_ENV === 'production' && secret !== env.JWT_SECRET) {
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
}
