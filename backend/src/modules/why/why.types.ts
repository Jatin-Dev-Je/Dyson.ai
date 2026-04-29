export type Citation = {
  claim:         string
  sourceNodeId:  string
  sourceUrl:     string | null
  confidence:    number
}

export type WhyEngineResult = {
  queryId:      string
  question:     string
  answer:       string | null
  citations:    Citation[]
  sourceNodes:  SourceNodeSummary[]
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
  metadata?:   Record<string, unknown>
  occurredAt:  Date
  similarity:  number
  isDecision:  boolean
  retrieval?:   'vector' | 'lexical' | 'graph'
}

export type GeminiWhyResponse = {
  answer:       string
  citations:    Array<{
    claim:           string
    sourceNodeIndex: number
    confidence:      number
  }>
  cannotAnswer: boolean
}
