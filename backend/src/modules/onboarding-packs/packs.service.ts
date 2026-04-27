import { createHash } from 'crypto'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import { db } from '@/infra/db/client.js'
import { onboardingPacks, contextNodes } from '@/infra/db/schema/index.js'
import { env } from '@/config/env.js'
import { NotFoundError } from '@/shared/errors.js'

export const CreatePackSchema = z.object({
  memberName: z.string().min(1).max(100).trim(),
  team:       z.string().min(1).max(100).trim(),
})

export type CreatePackInput = z.infer<typeof CreatePackSchema>

export type PackSection = {
  title:   string
  content: string
  nodes:   string[]  // node IDs cited
}

// ─── Generate pack content with Gemini ────────────────────────────────────

async function generatePackContent(
  memberName: string,
  team:       string,
  decisions:  Array<{ title: string; summary: string; source: string }>,
  logger:     FastifyBaseLogger
): Promise<PackSection[]> {
  if (!env.GEMINI_API_KEY || decisions.length === 0) {
    return [{
      title:   `Welcome to the ${team} team, ${memberName}`,
      content: 'Connect more sources to generate a full context pack.',
      nodes:   [],
    }]
  }

  const decisionBlock = decisions
    .map((d, i) => `[${i + 1}] (${d.source}) ${d.title}: ${d.summary}`)
    .join('\n')

  const prompt = `Generate an onboarding context pack for ${memberName} joining the ${team} engineering team.

Key decisions that shaped this team's codebase:
${decisionBlock}

Write 4 concise sections:
1. "How ${team} is structured" — what the team owns, key systems
2. "The decisions that shaped it" — synthesise the top 3 from above
3. "What was considered and rejected" — trade-offs from the decisions
4. "Open questions" — what is still being figured out

Keep each section under 150 words. Be concrete. Reference the decisions by number [1], [2] etc.
Return JSON: { "sections": [{ "title": string, "content": string }] }`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:      0.3,
          maxOutputTokens:  2048,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) throw new Error(`Gemini error ${res.status}`)

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = JSON.parse(text) as { sections: Array<{ title: string; content: string }> }

    return (parsed.sections ?? []).map(s => ({ ...s, nodes: [] }))
  } catch (err) {
    logger.error({ err }, 'Pack generation failed — returning stub')
    return [{ title: 'Context pack', content: 'Generation failed — please retry.', nodes: [] }]
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────

export async function listPacks(tenantId: string) {
  return db
    .select()
    .from(onboardingPacks)
    .where(eq(onboardingPacks.tenantId, tenantId))
    .orderBy(desc(onboardingPacks.createdAt))
}

export async function createPack(
  tenantId:  string,
  userId:    string,
  input:     CreatePackInput,
  logger:    FastifyBaseLogger
) {
  // Insert in 'generating' state immediately — return fast
  const [pack] = await db
    .insert(onboardingPacks)
    .values({
      tenantId,
      createdBy:  userId,
      memberName: input.memberName,
      team:       input.team,
      status:     'generating',
    })
    .returning()

  if (!pack) throw new Error('Failed to create pack')

  // Fetch top decisions for this team asynchronously
  void (async () => {
    try {
      const decisions = await db
        .select({
          title:  contextNodes.title,
          summary: contextNodes.summary,
          source: contextNodes.source,
        })
        .from(contextNodes)
        .where(and(
          eq(contextNodes.tenantId, tenantId),
          eq(contextNodes.isDecision, true),
        ))
        .orderBy(desc(contextNodes.occurredAt))
        .limit(10)

      const sections = await generatePackContent(
        input.memberName, input.team, decisions, logger
      )

      await db
        .update(onboardingPacks)
        .set({
          status:      'ready',
          sections,
          generatedAt: new Date(),
        })
        .where(eq(onboardingPacks.id, pack.id))

    } catch (err) {
      logger.error({ err, packId: pack.id }, 'Pack generation failed')
      await db
        .update(onboardingPacks)
        .set({ status: 'failed' })
        .where(eq(onboardingPacks.id, pack.id))
    }
  })()

  return pack
}

export async function getPack(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(onboardingPacks)
    .where(and(eq(onboardingPacks.id, id), eq(onboardingPacks.tenantId, tenantId)))
    .limit(1)
  if (!row) throw new NotFoundError('Pack')
  return row
}

export async function deletePack(id: string, tenantId: string) {
  const result = await db
    .delete(onboardingPacks)
    .where(and(eq(onboardingPacks.id, id), eq(onboardingPacks.tenantId, tenantId)))
  return result
}
