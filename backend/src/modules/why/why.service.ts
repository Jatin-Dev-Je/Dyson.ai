import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'
import { env } from '@/config/env.js'
import { CONFIDENCE_THRESHOLD } from '@/config/constants.js'
import { NotFoundError } from '@/shared/errors.js'
import { vectorSearch } from './retrieval/vector-retriever.js'
import { lexicalSearch } from './retrieval/lexical-retriever.js'
import { graphExpand } from './retrieval/graph-retriever.js'
import { filterAccessibleNodes } from './retrieval/access-filter.js'
import { rankAndSelect, computeConfidence } from './retrieval/hybrid-ranker.js'
import { callGemini } from './llm/gemini.client.js'
import { buildVerifiedAnswer } from './llm/response-validator.js'
import { saveQuery, listQueryHistory, getQueryById, updateFeedback } from './why.repository.js'
import type { WhyEngineResult, Citation, SourceNodeSummary } from './why.types.js'

export const AskWhySchema = z.object({
  question: z.string().min(3).max(1000).trim(),
})

export const HistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().min(1).max(50).default(20),
})

export const FeedbackSchema = z.object({
  score: z.enum(['helpful', 'not_helpful']).transform(v => (v === 'helpful' ? 1 : -1) as 1 | -1),
})

export async function askWhy(
  question: string,
  tenantId: string,
  userId: string,
  logger: FastifyBaseLogger
): Promise<WhyEngineResult> {
  const startMs = Date.now()

  logger.info({ tenantId, questionLen: question.length }, 'WHY query started')

  const [vectorNodes, lexicalNodes] = await Promise.all([
    vectorSearch(question, tenantId, logger),
    lexicalSearch(question, tenantId).catch(err => {
      logger.warn({ err, tenantId }, 'Lexical search failed')
      return [] as SourceNodeSummary[]
    }),
  ])

  const retrievedNodes = mergeNodes([...vectorNodes, ...lexicalNodes])
  if (retrievedNodes.length === 0) {
    logger.info({ tenantId }, 'No relevant nodes found')
    return buildCannotAnswerResult(question, tenantId, userId, [], Date.now() - startMs, logger)
  }

  const seedIds = retrievedNodes.map(node => node.id)
  const graphNodes = await graphExpand(seedIds, tenantId, new Set(seedIds))
  const allNodes = mergeNodes([...retrievedNodes, ...graphNodes])

  const access = filterAccessibleNodes(allNodes, userId)
  if (access.deniedCount > 0) {
    logger.info({ tenantId, deniedCount: access.deniedCount }, 'Filtered inaccessible source nodes')
  }

  const selected = rankAndSelect(access.allowed)
  const confidence = computeConfidence(selected)

  logger.debug(
    {
      vectorCount: vectorNodes.length,
      lexicalCount: lexicalNodes.length,
      graphCount: graphNodes.length,
      deniedCount: access.deniedCount,
      selected: selected.length,
      confidence,
    },
    'Retrieval complete'
  )

  if (confidence < CONFIDENCE_THRESHOLD || selected.length === 0) {
    logger.info({ tenantId, confidence }, 'Confidence below threshold')
    return buildCannotAnswerResult(question, tenantId, userId, selected, Date.now() - startMs, logger)
  }

  const geminiResponse = await callGemini(question, selected, logger)
  const verified = geminiResponse ? buildVerifiedAnswer(geminiResponse, selected) : null

  if (!verified) {
    logger.warn({ tenantId, confidence }, 'LLM answer failed verification')
  }

  const answer = verified?.answer ?? null
  const citations: Citation[] = verified?.citations ?? []
  const cannotAnswer = !verified
  const latencyMs = Date.now() - startMs

  const result: WhyEngineResult = {
    queryId: '',
    question,
    answer,
    citations,
    sourceNodes: selected,
    confidence,
    cannotAnswer,
    latencyMs,
  }

  const saved = await saveQuery({
    tenantId,
    userId,
    question,
    result,
    model: cannotAnswer ? 'none' : (env.GEMINI_MODEL ?? 'unknown'),
    latencyMs,
  })

  logger.info(
    {
      tenantId,
      queryId: saved.id,
      confidence,
      cannotAnswer,
      citationCount: citations.length,
      latencyMs,
    },
    'WHY query complete'
  )

  return { ...result, queryId: saved.id }
}

export async function getHistory(
  tenantId: string,
  userId: string,
  query: z.infer<typeof HistoryQuerySchema>
) {
  const opts: { limit: number; cursor?: string } = { limit: query.limit }
  if (query.cursor) opts.cursor = query.cursor
  return listQueryHistory(tenantId, userId, opts)
}

export async function getQuery(id: string, tenantId: string) {
  const q = await getQueryById(id, tenantId)
  if (!q) throw new NotFoundError('Query')
  return q
}

export async function submitFeedback(
  id: string,
  tenantId: string,
  score: 1 | -1
) {
  const updated = await updateFeedback(id, tenantId, score)
  if (!updated) throw new NotFoundError('Query')
  return updated
}

function mergeNodes(nodes: SourceNodeSummary[]): SourceNodeSummary[] {
  const byId = new Map<string, SourceNodeSummary>()

  for (const node of nodes) {
    const existing = byId.get(node.id)
    if (!existing || node.similarity > existing.similarity) {
      byId.set(node.id, {
        ...existing,
        ...node,
        similarity: Math.max(existing?.similarity ?? 0, node.similarity),
      })
    }
  }

  return [...byId.values()]
}

async function buildCannotAnswerResult(
  question: string,
  tenantId: string,
  userId: string,
  nodes: SourceNodeSummary[],
  latencyMs: number,
  logger: FastifyBaseLogger
): Promise<WhyEngineResult> {
  const result: WhyEngineResult = {
    queryId: '',
    question,
    answer: null,
    citations: [],
    sourceNodes: nodes,
    confidence: computeConfidence(nodes),
    cannotAnswer: true,
    latencyMs,
  }

  const saved = await saveQuery({
    tenantId,
    userId,
    question,
    result,
    model: 'none',
    latencyMs,
  }).catch(err => {
    logger.error({ err }, 'Failed to save cannot-answer query')
    return { id: 'unsaved' }
  })

  return { ...result, queryId: saved.id }
}
