import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'
import { env } from '@/config/env.js'
import { vectorSearch }               from './retrieval/vector-retriever.js'
import { graphExpand }                from './retrieval/graph-retriever.js'
import { rankAndSelect, computeConfidence } from './retrieval/hybrid-ranker.js'
import { callGemini }                 from './llm/gemini.client.js'
import { saveQuery, listQueryHistory, getQueryById, updateFeedback } from './why.repository.js'
import { NotFoundError }              from '@/shared/errors.js'
import { CONFIDENCE_THRESHOLD }       from '@/config/constants.js'
import type { WhyEngineResult, Citation, SourceNodeSummary } from './why.types.js'

// ─── Schemas ──────────────────────────────────────────────────────────────

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

// ─── Core WHY Engine ──────────────────────────────────────────────────────

export async function askWhy(
  question: string,
  tenantId: string,
  userId:   string,
  logger:   FastifyBaseLogger
): Promise<WhyEngineResult> {
  const startMs = Date.now()

  logger.info({ tenantId, questionLen: question.length }, 'WHY query started')

  // ── Step 1: Vector search — find semantically similar nodes ──────────────
  const vectorNodes = await vectorSearch(question, tenantId, logger)

  if (vectorNodes.length === 0) {
    logger.info({ tenantId }, 'No relevant nodes found — cannot answer')
    return buildCannotAnswerResult(question, tenantId, userId, [], Date.now() - startMs, logger)
  }

  // ── Step 2: Graph expansion — pull in connected context ──────────────────
  const seedIds     = vectorNodes.map(n => n.id)
  const existing    = new Set(seedIds)
  const graphNodes  = await graphExpand(seedIds, tenantId, existing)

  const allNodes = [...vectorNodes, ...graphNodes]

  // ── Step 3: Hybrid ranking — score, select, sort chronologically ─────────
  const selected   = rankAndSelect(allNodes)
  const confidence = computeConfidence(selected)

  logger.debug(
    { vectorCount: vectorNodes.length, graphCount: graphNodes.length, selected: selected.length, confidence },
    'Retrieval complete'
  )

  // ── Step 4: Confidence gate — don't compose if we don't have enough ──────
  if (confidence < CONFIDENCE_THRESHOLD || selected.length === 0) {
    logger.info({ tenantId, confidence }, 'Confidence below threshold — returning events without interpretation')
    return buildCannotAnswerResult(question, tenantId, userId, selected, Date.now() - startMs, logger)
  }

  // ── Step 5: LLM composition — Gemini Flash composes the answer ──────────
  const geminiResponse = await callGemini(question, selected, logger)

  // ── Step 6: Parse response, build citations ──────────────────────────────
  let answer:      string | null = null
  let citations:   Citation[]    = []
  let cannotAnswer               = false

  if (!geminiResponse || geminiResponse.cannotAnswer) {
    cannotAnswer = true
  } else {
    answer = geminiResponse.answer

    // Map citation indices back to real node IDs
    citations = geminiResponse.citations
      .filter(c => c.sourceNodeIndex >= 0 && c.sourceNodeIndex < selected.length)
      .map(c => {
        const node = selected[c.sourceNodeIndex]!
        return {
          claim:        c.claim,
          sourceNodeId: node.id,
          sourceUrl:    node.sourceUrl,
          confidence:   c.confidence,
        }
      })

    // Safety: if Gemini returned an answer but no valid citations, refuse
    if (citations.length === 0 && answer) {
      logger.warn({ tenantId }, 'Gemini returned answer with no valid citations — refusing')
      answer       = null
      cannotAnswer = true
    }
  }

  const latencyMs = Date.now() - startMs

  const result: WhyEngineResult = {
    queryId:      '',  // Set after save
    question,
    answer,
    citations,
    sourceNodes:  selected,
    confidence,
    cannotAnswer,
    latencyMs,
  }

  // ── Step 7: Persist the query ────────────────────────────────────────────
  const saved = await saveQuery({
    tenantId,
    userId,
    question,
    result,
    model:      env.GEMINI_MODEL ?? 'unknown',
    latencyMs,
  })

  logger.info(
    {
      tenantId,
      queryId:     saved.id,
      confidence,
      cannotAnswer,
      citationCount: citations.length,
      latencyMs,
    },
    'WHY query complete'
  )

  return { ...result, queryId: saved.id }
}

// ── History ───────────────────────────────────────────────────────────────

export async function getHistory(
  tenantId: string,
  userId:   string,
  query:    z.infer<typeof HistoryQuerySchema>
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
  id:       string,
  tenantId: string,
  score:    1 | -1
) {
  const updated = await updateFeedback(id, tenantId, score)
  if (!updated) throw new NotFoundError('Query')
  return updated
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function buildCannotAnswerResult(
  question:  string,
  tenantId:  string,
  userId:    string,
  nodes:     SourceNodeSummary[],
  latencyMs: number,
  logger:    FastifyBaseLogger
): Promise<WhyEngineResult> {
  const result: WhyEngineResult = {
    queryId:     '',
    question,
    answer:      null,
    citations:   [],
    sourceNodes: nodes,
    confidence:  computeConfidence(nodes),
    cannotAnswer: true,
    latencyMs,
  }

  const saved = await saveQuery({
    tenantId,
    userId,
    question,
    result,
    model:     'none',
    latencyMs,
  }).catch(err => {
    logger.error({ err }, 'Failed to save cannot-answer query')
    return { id: 'unsaved' }
  })

  return { ...result, queryId: saved.id }
}

