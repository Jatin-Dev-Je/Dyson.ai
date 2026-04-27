export type Citation = {
  claim:         string   // The specific claim this citation supports
  sourceNodeId:  string   // The node that supports the claim
  sourceUrl:     string | null
  confidence:    number   // How confident we are this node supports this claim
}

export type WhyEngineResult = {
  queryId:      string
  question:     string
  answer:       string | null         // null when cannotAnswer = true
  citations:    Citation[]
  sourceNodes:  SourceNodeSummary[]   // All nodes used (shown as timeline)
  confidence:   number
  cannotAnswer: boolean
  latencyMs:    number
}

export type SourceNodeSummary = {
  id:          string
  entityType:  string
  source:      string
  title:       string
  summary:     string
  sourceUrl:   string | null
  occurredAt:  Date
  similarity:  number   // Vector similarity score (0-1)
  isDecision:  boolean
}

// Shape returned by Gemini in structured mode
export type GeminiWhyResponse = {
  answer:       string
  citations:    Array<{
    claim:           string
    sourceNodeIndex: number   // Index into the sourceNodes array we sent
    confidence:      number
  }>
  cannotAnswer: boolean
  reasoning:    string  // Internal CoT — not shown to user
}
