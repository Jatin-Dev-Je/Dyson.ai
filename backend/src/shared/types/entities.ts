export enum EntityType {
  User = 'user',
  Message = 'message',
  Document = 'document',
  CodeChange = 'code_change',
  Decision = 'decision',
  Task = 'task',
  MeetingMoment = 'meeting_moment',
}

export enum RelationshipType {
  LeadsTo = 'leads_to',
  DependsOn = 'depends_on',
  DiscussedIn = 'discussed_in',
  DecidedBy = 'decided_by',
  Resolves = 'resolves',
  Supersedes = 'supersedes',
}

export enum EventSource {
  Slack = 'slack',
  GitHub = 'github',
  Notion = 'notion',
  Linear = 'linear',
  Meeting = 'meeting',
}

export enum IngestionStatus {
  Pending = 'pending',
  Processing = 'processing',
  Complete = 'complete',
  Failed = 'failed',
}

export enum ConfidenceLevel {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}
