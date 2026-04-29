import { EventSource } from '@/shared/types/entities.js'
import type { SourceNodeSummary } from '../why.types.js'

export type AccessFilterResult = {
  allowed: SourceNodeSummary[]
  deniedCount: number
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function hasExplicitAccess(metadata: Record<string, unknown>, userId: string): boolean {
  const accessibleUserIds = stringArray(metadata['accessibleUserIds'])
  if (accessibleUserIds.includes(userId)) return true

  const memberIds = stringArray(metadata['memberIds'])
  if (memberIds.includes(userId)) return true

  return metadata['userId'] === userId || metadata['authorUserId'] === userId
}

function isRestricted(metadata: Record<string, unknown>): boolean {
  return (
    metadata['isPrivate'] === true ||
    metadata['private'] === true ||
    metadata['channelIsPrivate'] === true ||
    metadata['visibility'] === 'private' ||
    metadata['restricted'] === true
  )
}

function canAccessNode(node: SourceNodeSummary, userId: string): boolean {
  const metadata = node.metadata ?? {}

  if (node.source === EventSource.Agent) return true

  if (isRestricted(metadata)) {
    return hasExplicitAccess(metadata, userId)
  }

  return true
}

export function filterAccessibleNodes(
  nodes: SourceNodeSummary[],
  userId: string
): AccessFilterResult {
  const allowed = nodes.filter(node => canAccessNode(node, userId))
  return {
    allowed,
    deniedCount: nodes.length - allowed.length,
  }
}
