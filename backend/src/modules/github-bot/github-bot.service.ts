import type { FastifyBaseLogger } from 'fastify'
import { getPrFiles, postPrComment } from './github-bot.client.js'
import { search } from '@/modules/search/search.service.js'
import { getDecisions } from '@/modules/decisions/decisions.service.js'
import { CONFIDENCE_THRESHOLD } from '@/config/constants.js'

// ─── Derive a search query from the PR context ────────────────────────────
function buildQueryFromPr(title: string, files: Array<{ filename: string }>): string {
  // Focus on the most semantically meaningful parts
  const moduleNames = [...new Set(
    files
      .map(f => f.filename.split('/').slice(0, 2).join('/'))
      .filter(p => !p.startsWith('.') && !p.endsWith('.lock'))
      .slice(0, 5)
  )]
  return [title, ...moduleNames].join(' ')
}

// ─── Format the comment in GitHub-flavoured Markdown ─────────────────────
function buildComment(opts: {
  prTitle:   string
  repoName:  string
  decisions: Array<{ id: string; title: string; summary: string; source: string; sourceUrl: string | null; decisionConfidence?: number | null }>
  queryId:   string
}): string {
  const { prTitle, decisions } = opts

  if (decisions.length === 0) {
    return [
      '## 🔍 Dyson Context',
      '',
      '_No relevant past decisions found for this PR. If context accumulates, Dyson will surface it automatically on future PRs._',
      '',
      `> Powered by [Dyson](https://dyson.ai) · context infrastructure for engineering teams`,
    ].join('\n')
  }

  const decisionLines = decisions
    .slice(0, 4)
    .map(d => {
      const conf = d.decisionConfidence != null ? ` · conf ${(d.decisionConfidence * 100).toFixed(0)}%` : ''
      const link = d.sourceUrl ? `[↗](${d.sourceUrl})` : ''
      return `**${d.title}**${conf} ${link}\n> ${d.summary.slice(0, 180)}${d.summary.length > 180 ? '…' : ''}`
    })
    .join('\n\n')

  return [
    '## 🔍 Dyson Context',
    '',
    `Relevant decisions for **${prTitle}**:`,
    '',
    decisionLines,
    '',
    '---',
    '',
    `> Powered by [Dyson](https://dyson.ai) · [View full context →](https://app.dyson.ai/app/decisions)`,
  ].join('\n')
}

// ─── Main entry ───────────────────────────────────────────────────────────

export async function handlePrOpened(opts: {
  tenantId:       string
  installationId: string
  repoFullName:   string
  prNumber:       number
  prTitle:        string
  prBody:         string | null
  logger:         FastifyBaseLogger
}) {
  const { tenantId, installationId, repoFullName, prNumber, prTitle, logger } = opts

  logger.info({ tenantId, repoFullName, prNumber }, 'GitHub bot: PR opened — fetching context')

  // 1. Get the changed files (to know which modules are touched)
  const files = await getPrFiles(installationId, repoFullName, prNumber).catch(() => [])

  // 2. Build a context query from title + file paths
  const query = buildQueryFromPr(prTitle, files)

  // 3. Search for relevant decisions
  const searchResult = await search(tenantId, { q: query, type: 'decision', limit: 6 }).catch(() => ({ results: [] }))

  // 4. Also get recent high-confidence decisions
  const decisionsResult = await getDecisions(tenantId, { limit: 4, minConfidence: CONFIDENCE_THRESHOLD + 0.1 })
    .catch(() => ({ decisions: [] }))

  // Merge, dedupe, take top 4 most relevant
  type DecisionItem = { id: string; title: string; summary: string; source: string; sourceUrl: string | null; decisionConfidence?: number | null | undefined }
  const seen = new Set<string>()
  const topDecisions: DecisionItem[] = []

  const fromSearch: DecisionItem[] = searchResult.results.map(r => {
    const item: DecisionItem = { id: r.id, title: r.title, summary: r.summary, source: r.source ?? 'unknown', sourceUrl: r.sourceUrl ?? null }
    if (r.confidence !== undefined) item.decisionConfidence = r.confidence
    return item
  })
  const fromDecisions: DecisionItem[] = decisionsResult.decisions.map(d => ({
    id: d.id, title: d.title, summary: d.summary,
    source: d.source, sourceUrl: d.sourceUrl,
    decisionConfidence: d.decisionConfidence,
  }))

  for (const d of [...fromSearch, ...fromDecisions]) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    topDecisions.push(d)
    if (topDecisions.length >= 4) break
  }

  // 5. Post the comment
  const comment = buildComment({
    prTitle,
    repoName:  repoFullName,
    decisions: topDecisions.map(d => ({
      ...d,
      decisionConfidence: d.decisionConfidence ?? null,
    })),
    queryId:   '',
  })

  await postPrComment(installationId, repoFullName, prNumber, comment)

  logger.info({ tenantId, repoFullName, prNumber, decisionsFound: topDecisions.length }, 'GitHub bot: PR comment posted')
}
