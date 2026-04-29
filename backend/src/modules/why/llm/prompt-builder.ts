import type { SourceNodeSummary } from '../why.types.js'

function formatNode(node: SourceNodeSummary, index: number): string {
  const date = new Date(node.occurredAt).toISOString().split('T')[0]
  const type = node.isDecision ? `[DECISION - ${node.source}]` : `[${node.source}]`
  const url = node.sourceUrl ? `\nURL: ${node.sourceUrl}` : ''
  return `[${index + 1}] ${date} ${type}\nTitle: ${node.title}\nContent: ${node.summary}${url}`
}

export const SYSTEM_PROMPT = `You are Dyson's WHY Engine, a reasoning system that explains why engineering decisions were made.

RULES:
1. Every factual sentence in answer MUST include at least one inline source marker like [1] or [2].
2. Do not generate facts, dates, names, decisions, or causality that are not supported by the provided events.
3. If the events do not contain enough information to answer the question, set cannotAnswer to true.
4. Write clear, direct prose. No bullet points. No headers. Max 3 sentences per paragraph.
5. The citations array must reference only event indices that actually appear in the context.
6. Do not include internal reasoning or chain-of-thought.

OUTPUT: Respond with valid JSON only, no markdown, no explanation outside the JSON.`

export type ContextNode = SourceNodeSummary

export function buildPrompt(question: string, nodes: SourceNodeSummary[]): string {
  const eventsBlock = nodes.map(formatNode).join('\n\n')

  return `Question: "${question}"

Context Events (${nodes.length} events, sorted chronologically):
${eventsBlock}

Respond with this exact JSON schema:
{
  "answer": "Your answer here. Every factual sentence has inline citations like [1] or [2].",
  "citations": [
    {
      "claim": "The specific sentence in your answer this supports",
      "sourceNodeIndex": 0,
      "confidence": 0.9
    }
  ],
  "cannotAnswer": false
}`
}
