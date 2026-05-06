/**
 * Hybrid ranker for WHY Engine retrieval results.
 *
 * Scoring model:
 *   score(node) = similarity × decisionBoost × recencyFactor × retrievalBoost
 *
 * Engineering decisions documented here because ranking is business-critical:
 *
 * 1. DECISION_BOOST (1.20×)
 *    Decision nodes are explicitly tagged by the processing pipeline.
 *    They represent high-information-density events — prioritise them.
 *
 * 2. RECENCY_FACTOR (continuous exponential decay, not binary threshold)
 *    Old: ageDays < 90 ? 1.05 : 1.0  ← binary cliff at exactly 90 days
 *    New: exp(-λ × ageDays)           ← smooth decay, no cliff
 *    λ = 0.002 → half-life ≈ 347 days (institutional memory stays relevant)
 *    A 90-day-old node gets 0.84 vs a fresh node; a 1-year-old gets 0.48.
 *
 * 3. RETRIEVAL_BOOST
 *    Nodes found by both vector AND lexical search get a +10% boost.
 *    Agreement between two independent retrieval methods is a strong signal.
 *
 * 4. Source diversity in confidence
 *    Multi-source corroboration increases confidence. A decision cited in
 *    Slack AND a GitHub PR is more reliable than one cited in Slack alone.
 */

import type { SourceNodeSummary } from '../why.types.js'
import {
  MAX_CONTEXT_NODES,
  DECISION_BOOST_FACTOR,
  RECENCY_BOOST_FACTOR,
  RECENCY_BOOST_DAYS,
} from '@/config/constants.js'

// Exponential decay lambda — controls how fast recency boost fades.
// λ = ln(2) / half_life_days. Half-life: ~347 days.
const RECENCY_DECAY_LAMBDA = 0.002

function recencyFactor(occurredAt: Date | string | null): number {
  if (!occurredAt) return 1.0
  const ageMs   = Date.now() - new Date(occurredAt).getTime()
  const ageDays = ageMs / 86_400_000
  // Continuous exponential decay from 1.0 → 0 over time
  // At 0 days: 1.0. At 90 days: ~0.84. At 347 days: ~0.5
  return Math.exp(-RECENCY_DECAY_LAMBDA * ageDays)
}

function hybridScore(node: SourceNodeSummary): number {
  let s = node.similarity

  // Decision boost — decisions are the primary evidence for WHY answers
  if (node.isDecision) s *= DECISION_BOOST_FACTOR

  // Recency — smooth exponential decay, not a binary threshold
  s *= recencyFactor(node.occurredAt)

  // Retrieval method boost — node found by multiple methods is more reliable
  if (node.retrieval === 'hybrid') s *= 1.10

  return Math.min(s, 1.0)
}

export function rankAndSelect(nodes: SourceNodeSummary[]): SourceNodeSummary[] {
  if (nodes.length === 0) return []

  const ranked  = [...nodes].sort((a, b) => hybridScore(b) - hybridScore(a))
  const selected = ranked.slice(0, MAX_CONTEXT_NODES)

  // Return chronologically — LLM reasons better over temporal sequences
  return selected.sort(
    (a, b) =>
      new Date(a.occurredAt ?? 0).getTime() -
      new Date(b.occurredAt ?? 0).getTime(),
  )
}

export function computeConfidence(nodes: SourceNodeSummary[]): number {
  if (nodes.length === 0) return 0

  // Base: average similarity of selected nodes
  const avgSimilarity = nodes.reduce((sum, n) => sum + n.similarity, 0) / nodes.length
  let confidence = avgSimilarity

  // Decision nodes are the strongest signal — boost if any present
  const decisionCount = nodes.filter(n => n.isDecision).length
  if (decisionCount > 0) {
    confidence = Math.min(confidence * (1 + 0.05 * Math.min(decisionCount, 3)), 0.95)
  }

  // Source diversity: corroboration across tools increases trust
  const sourceDiversity = new Set(nodes.map(n => n.source)).size
  if (sourceDiversity >= 2) confidence = Math.min(confidence * 1.05, 0.95)
  if (sourceDiversity >= 3) confidence = Math.min(confidence * 1.05, 0.95)

  // Penalise if only 1–2 nodes were found (low evidence base)
  if (nodes.length < 3) confidence *= 0.85

  return Math.round(confidence * 1000) / 1000   // 3 decimal precision
}
