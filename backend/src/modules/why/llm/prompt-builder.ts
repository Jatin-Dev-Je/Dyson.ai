import type { SourceNodeSummary } from '../why.types.js'

// Format a node for inclusion in the LLM context
function formatNode(node: SourceNodeSummary, index: number): string {
  const date   = new Date(node.occurredAt).toISOString().split('T')[0]
  const type   = node.isDecision ? `[DECISION · ${node.source}]` : `[${node.source}]`
  return `[${index + 1}] ${date} ${type}\nTitle: ${node.title}\nContent: ${node.summary}`
}

export const SYSTEM_PROMPT = `You are Dyson's WHY Engine — a reasoning system that explains why engineering decisions were made.

RULES (non-negotiable):
1. Every factual claim in your answer MUST cite a source event using its index number [1], [2], etc.
2. Do NOT generate facts, dates, names, or decisions that are not in the provided events.
3. If the events do not contain enough information to answer the question, set cannotAnswer to true.
4. Write in clear, direct prose. No bullet points. No headers. Max 3 sentences per paragraph.
5. The citations array must reference only event indices that actually appear in the context.

OUTPUT: Respond with valid JSON only, no markdown, no explanation outside the JSON.`

export type ContextNode = SourceNodeSummary

export function buildPrompt(question: string, nodes: SourceNodeSummary[]): string {
  const eventsBlock = nodes.map(formatNode).join('\n\n')

  return `Question: "${question}"

Context Events (${nodes.length} events, sorted chronologically):
${eventsBlock}

Respond with this exact JSON schema:
{
  "answer": "Your answer here, with inline citations like [1] or [2].",
  "citations": [
    {
      "claim": "The specific sentence in your answer this supports",
      "sourceNodeIndex": 0,
      "confidence": 0.9
    }
  ],
  "cannotAnswer": false,
  "reasoning": "Brief internal reasoning about what the events tell you (not shown to user)"
}`
}
