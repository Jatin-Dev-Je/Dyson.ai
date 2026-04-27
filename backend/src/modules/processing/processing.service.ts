import type { FastifyBaseLogger } from 'fastify'
import { extractEntities } from './processors/entity-extractor.js'
import { detectDecision } from './processors/decision-detector.js'
import { generateEmbedding } from './processors/embedding-generator.js'
import {
  upsertContextNode, upsertNodeEmbedding, upsertEdge, findNodeByExternalId,
} from './processing.repository.js'
import { markEventComplete, markEventFailed } from '../ingestion/ingestion.repository.js'
import { enqueue } from '@/infra/queue/queue.client.js'
import { RelationshipType, EntityType, EventSource } from '@/shared/types/entities.js'
import type { NormalizedEvent } from '../ingestion/ingestion.types.js'

// ─── Process a single raw event into a context node ──────────────────────

export async function processRawEvent(
  eventId:  string,
  tenantId: string,
  event:    NormalizedEvent,
  logger:   FastifyBaseLogger
) {
  logger.info({ eventId, tenantId, source: event.source }, 'Processing raw event')

  try {
    // Step 1: Entity extraction (pure, fast)
    const entities = extractEntities(event.content, undefined)

    // Step 2: Decision detection (pure, fast)
    const decision = detectDecision(event.content)

    if (decision.isDecision) {
      logger.info(
        { eventId, confidence: decision.confidence, signals: decision.signals },
        'Decision detected'
      )
    }

    // Step 3: Upsert context node
    const node = await upsertContextNode({
      tenantId,
      rawEventId:         eventId,
      entityType:         event.entityType,
      source:             event.source,
      externalId:         event.externalId,
      title:              entities.title,
      summary:            entities.summary,
      sourceUrl:          event.url,
      metadata:           {
        ...event.metadata,
        mentions:  entities.mentions,
        issueRefs: entities.issueRefs,
        prRefs:    entities.prRefs,
        urls:      entities.urls,
        techTerms: entities.techTerms,
      },
      isDecision:         decision.isDecision,
      decisionConfidence: decision.isDecision ? decision.confidence : null,
      decisionSignals:    decision.isDecision ? decision.signals : null,
      occurredAt:         event.occurredAt,
    })

    // Step 4: Mark raw event complete
    await markEventComplete(eventId)

    // Step 5: Enqueue embedding generation (can fail independently)
    await enqueue(
      'generate-embeddings',
      { nodeId: node.id, tenantId, content: `${entities.title}\n\n${entities.summary}` },
      logger
    )

    // Step 6: Enqueue edge building
    await enqueue(
      'build-edges',
      { nodeId: node.id, tenantId, metadata: event.metadata, issueRefs: entities.issueRefs },
      logger
    )

    logger.info({ nodeId: node.id, tenantId }, 'Raw event processed into context node')
    return node

  } catch (err) {
    logger.error({ err, eventId, tenantId }, 'Failed to process raw event')
    await markEventFailed(eventId).catch(() => undefined)  // Best effort
    throw err
  }
}

// ─── Generate and store embedding for a node ─────────────────────────────

export async function processEmbedding(
  nodeId:  string,
  tenantId:string,
  content: string,
  logger:  FastifyBaseLogger
) {
  const embedding = await generateEmbedding(content, logger)

  if (!embedding) {
    logger.debug({ nodeId }, 'No embedding generated (Cohere not configured or failed)')
    return
  }

  await upsertNodeEmbedding({
    tenantId,
    nodeId,
    embedding,
    model: 'embed-english-v3.0',
  })

  logger.info({ nodeId, dims: embedding.length }, 'Embedding stored')
}

// ─── Build edges from a newly processed node ──────────────────────────────

export async function buildEdgesForNode(
  nodeId:    string,
  tenantId:  string,
  metadata:  Record<string, unknown>,
  issueRefs: string[],
  logger:    FastifyBaseLogger
) {
  const source = metadata['source'] as string | undefined

  // Rule 1: GitHub PR that references an issue → resolves edge
  if (source === EventSource.GitHub && issueRefs.length > 0) {
    for (const issueNum of issueRefs) {
      const issueExternalId = `github_issue_${metadata['repoName'] as string}_${issueNum}`
      const issueNode = await findNodeByExternalId(tenantId, issueExternalId, EventSource.GitHub)

      if (issueNode) {
        await upsertEdge({
          tenantId,
          sourceNodeId:     nodeId,
          targetNodeId:     issueNode.id,
          relationshipType: RelationshipType.Resolves,
          confidence:       0.90,
          metadata:         { rule: 'pr_references_issue', issueRef: issueNum },
        })
        logger.info({ nodeId, issueNodeId: issueNode.id }, 'Edge built: PR resolves issue')
      }
    }
  }

  // Rule 2: Slack message in same channel as a recent decision → discussed_in
  // (Temporal proximity linking — implemented in Week 4 with graph traversal)

  // Rule 3: PR body links to a Notion URL → depends_on
  const urls = (metadata['urls'] as string[] | undefined) ?? []
  for (const url of urls) {
    if (url.includes('notion.so') || url.includes('notion.site')) {
      const notionNode = await findNodeByExternalId(tenantId, url, EventSource.Notion)
      if (notionNode) {
        await upsertEdge({
          tenantId,
          sourceNodeId:     nodeId,
          targetNodeId:     notionNode.id,
          relationshipType: RelationshipType.DependsOn,
          confidence:       0.75,
          metadata:         { rule: 'pr_links_notion_doc', url },
        })
        logger.info({ nodeId, notionNodeId: notionNode.id }, 'Edge built: PR depends on Notion doc')
      }
    }
  }
}
