import type { SourceNodeSummary } from '../why.types.js'

const MAX_CONTEXT_NODES = 12   // Max nodes sent to LLM — balance between context and cost

// Hybrid scoring: vector similarity + decision boost + recency decay
function score(node: SourceNodeSummary): number {
  let s = node.similarity

  // Decision nodes get a 20% boost — they're more likely to be the actual answer
  if (node.isDecision) s *= 1.20

  // Recency: events from the last 90 days get a slight boost
  const ageMs      = Date.now() - new Date(node.occurredAt).getTime()
  const ageDays    = ageMs / (1000 * 60 * 60 * 24)
  const recencyMod = ageDays < 90 ? 1.05 : 1.0
  s *= recencyMod

  return Math.min(s, 1.0)
}

export function rankAndSelect(nodes: SourceNodeSummary[]): SourceNodeSummary[] {
  if (nodes.length === 0) return []

  // Sort by hybrid score descending
  const ranked = [...nodes].sort((a, b) => score(b) - score(a))

  // Take top-K
  const selected = ranked.slice(0, MAX_CONTEXT_NODES)

  // Return sorted chronologically — LLM needs temporal context to reason causally
  return selected.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  )
}

// Compute overall confidence from the selected nodes
export function computeConfidence(nodes: SourceNodeSummary[]): number {
  if (nodes.length === 0) return 0

  const avgSimilarity = nodes.reduce((sum, n) => sum + n.similarity, 0) / nodes.length
  const hasDecision   = nodes.some(n => n.isDecision)

  // Base confidence from similarity
  let confidence = avgSimilarity

  // Boost if we found decision nodes (they're the strongest signal)
  if (hasDecision) confidence = Math.min(confidence * 1.15, 0.95)

  // More sources = slightly more confident (diminishing returns)
  const sourceDiversity = new Set(nodes.map(n => n.source)).size
  if (sourceDiversity >= 2) confidence = Math.min(confidence * 1.05, 0.95)
  if (sourceDiversity >= 3) confidence = Math.min(confidence * 1.05, 0.95)

  return Math.round(confidence * 100) / 100
}
