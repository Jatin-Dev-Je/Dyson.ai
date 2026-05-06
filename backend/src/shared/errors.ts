/**
 * Dyson error hierarchy.
 *
 * All errors thrown by service/repository code must extend DysonError.
 * The global Fastify error handler in app.ts serialises DysonErrors to the
 * standard API envelope:  { error: { code, message } }
 *
 * Engineering principles:
 *   - Every error has a machine-readable CODE (for clients to branch on)
 *   - Status codes are set at the error class level, not at the route level
 *   - Error context (field name, resource ID) is passed as typed metadata,
 *     never interpolated into user-facing messages (no information leakage)
 *   - Retriable errors are flagged so the global handler can set Retry-After
 */

// ─── Error code registry ──────────────────────────────────────────────────────
// Single source of truth for all error codes used across the application.
// Add new codes here before using them — prevents typos and documents the contract.

export const ErrorCode = {
  // 400 Bad Request
  VALIDATION_ERROR:         'VALIDATION_ERROR',
  INVALID_CURSOR:           'INVALID_CURSOR',
  INVALID_IDEMPOTENCY_KEY:  'INVALID_IDEMPOTENCY_KEY',
  MALFORMED_WEBHOOK:        'MALFORMED_WEBHOOK',

  // 401 Unauthorized
  UNAUTHORIZED:             'UNAUTHORIZED',
  INVALID_CREDENTIALS:      'INVALID_CREDENTIALS',
  TOKEN_EXPIRED:            'TOKEN_EXPIRED',
  TOKEN_MALFORMED:          'TOKEN_MALFORMED',
  INVALID_SIGNATURE:        'INVALID_SIGNATURE',
  INVALID_API_KEY:          'INVALID_API_KEY',

  // 403 Forbidden
  FORBIDDEN:                'FORBIDDEN',
  INSUFFICIENT_SCOPE:       'INSUFFICIENT_SCOPE',
  TENANT_MISMATCH:          'TENANT_MISMATCH',

  // 404 Not Found
  NOT_FOUND:                'NOT_FOUND',

  // 409 Conflict
  SLUG_TAKEN:               'SLUG_TAKEN',
  EMAIL_TAKEN:              'EMAIL_TAKEN',
  INVITE_ALREADY_ACCEPTED:  'INVITE_ALREADY_ACCEPTED',
  INVITE_USED:              'INVITE_USED',
  ALREADY_VERIFIED:         'ALREADY_VERIFIED',

  // Auth tokens
  INVALID_TOKEN:            'INVALID_TOKEN',
  TOKEN_USED:               'TOKEN_USED',

  // Account
  ACCOUNT_DISABLED:         'ACCOUNT_DISABLED',
  INVITE_EXPIRED:           'INVITE_EXPIRED',
  CANNOT_SELF_REMOVE:       'CANNOT_SELF_REMOVE',

  // Connectors / OAuth
  CONNECTOR_NOT_CONFIGURED: 'CONNECTOR_NOT_CONFIGURED',
  CONNECTOR_INACTIVE:       'CONNECTOR_INACTIVE',
  INVALID_STATE:            'INVALID_STATE',
  SLACK_OAUTH_FAILED:       'SLACK_OAUTH_FAILED',
  GITHUB_OAUTH_FAILED:      'GITHUB_OAUTH_FAILED',

  // 422 Unprocessable
  CONFIDENCE_TOO_LOW:       'CONFIDENCE_TOO_LOW',
  CANNOT_ANSWER:            'CANNOT_ANSWER',

  // 429 Rate Limited
  RATE_LIMITED:             'RATE_LIMITED',

  // 500 Internal
  INTERNAL_ERROR:           'INTERNAL_ERROR',
  QUERY_SAVE_FAILED:        'QUERY_SAVE_FAILED',
  INGESTION_ERROR:          'INGESTION_ERROR',
  EMBEDDING_FAILED:         'EMBEDDING_FAILED',
  LLM_UNAVAILABLE:          'LLM_UNAVAILABLE',
  CIRCUIT_OPEN:             'CIRCUIT_OPEN',
} as const

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode]

// ─── Base ─────────────────────────────────────────────────────────────────────

export class DysonError extends Error {
  /** Whether this error should trigger a retry (e.g. 503 vs 400). */
  readonly retriable: boolean

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly statusCode: number = 500,
    retriable = false,
  ) {
    super(message)
    this.name     = this.constructor.name
    this.retriable = retriable
    // Preserve original stack trace when wrapping another error
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// ─── 400 ─────────────────────────────────────────────────────────────────────

export class ValidationError extends DysonError {
  constructor(message: string, readonly field?: string) {
    super(ErrorCode.VALIDATION_ERROR, message, 400)
  }
}

export class InvalidCursorError extends DysonError {
  constructor() {
    super(ErrorCode.INVALID_CURSOR, 'Pagination cursor is invalid or expired', 400)
  }
}

// ─── 401 ─────────────────────────────────────────────────────────────────────

export class UnauthorizedError extends DysonError {
  constructor(reason: 'missing' | 'expired' | 'malformed' | 'wrong_type' = 'missing') {
    const messages: Record<typeof reason, string> = {
      missing:    'Authentication required',
      expired:    'Session expired — please sign in again',
      malformed:  'Invalid authentication token',
      wrong_type: 'Refresh tokens cannot be used for API access',
    }
    const codes: Record<typeof reason, ErrorCode> = {
      missing:    ErrorCode.UNAUTHORIZED,
      expired:    ErrorCode.TOKEN_EXPIRED,
      malformed:  ErrorCode.TOKEN_MALFORMED,
      wrong_type: ErrorCode.UNAUTHORIZED,
    }
    super(codes[reason], messages[reason], 401)
  }
}

export class InvalidCredentialsError extends DysonError {
  constructor() {
    // Intentionally vague — don't reveal whether email or password was wrong
    super(ErrorCode.INVALID_CREDENTIALS, 'Incorrect email or password', 401)
  }
}

export class WebhookSignatureError extends DysonError {
  constructor() {
    super(ErrorCode.INVALID_SIGNATURE, 'Webhook signature verification failed', 401)
  }
}

export class InvalidApiKeyError extends DysonError {
  constructor() {
    super(ErrorCode.INVALID_API_KEY, 'API key is invalid, revoked, or has insufficient scope', 401)
  }
}

// ─── 403 ─────────────────────────────────────────────────────────────────────

export class ForbiddenError extends DysonError {
  constructor(reason = 'Access denied') {
    super(ErrorCode.FORBIDDEN, reason, 403)
  }
}

export class InsufficientScopeError extends DysonError {
  constructor(required: string) {
    super(ErrorCode.INSUFFICIENT_SCOPE, `API key requires '${required}' scope`, 403)
  }
}

// ─── 404 ─────────────────────────────────────────────────────────────────────

export class NotFoundError extends DysonError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} '${id}' not found` : `${resource} not found`
    super(ErrorCode.NOT_FOUND, msg, 404)
  }
}

// ─── 409 ─────────────────────────────────────────────────────────────────────

export class SlugTakenError extends DysonError {
  constructor() {
    super(ErrorCode.SLUG_TAKEN, 'This workspace URL is already taken', 409)
  }
}

export class EmailTakenError extends DysonError {
  constructor() {
    super(ErrorCode.EMAIL_TAKEN, 'An account with this email already exists', 409)
  }
}

// ─── 422 ─────────────────────────────────────────────────────────────────────

export class ConfidenceTooLowError extends DysonError {
  constructor(
    readonly confidence: number,
    readonly sourceNodes: unknown[],
  ) {
    super(
      ErrorCode.CONFIDENCE_TOO_LOW,
      `Confidence too low to compose an answer (${(confidence * 100).toFixed(0)}% < 72%)`,
      422,
    )
  }
}

// ─── 429 ─────────────────────────────────────────────────────────────────────

export class RateLimitError extends DysonError {
  constructor(readonly retryAfterMs?: number) {
    super(ErrorCode.RATE_LIMITED, 'Too many requests — slow down', 429, true)
  }
}

// ─── 500 ─────────────────────────────────────────────────────────────────────

export class IngestionError extends DysonError {
  constructor(message: string, retriable = true) {
    super(ErrorCode.INGESTION_ERROR, message, 500, retriable)
  }
}

export class EmbeddingError extends DysonError {
  constructor(message: string) {
    super(ErrorCode.EMBEDDING_FAILED, message, 500, true)
  }
}

export class LLMUnavailableError extends DysonError {
  constructor(service: string) {
    super(ErrorCode.LLM_UNAVAILABLE, `${service} is currently unavailable`, 503, true)
  }
}

export class CircuitOpenError extends DysonError {
  constructor(service: string) {
    super(ErrorCode.CIRCUIT_OPEN, `${service} is temporarily unavailable — try again shortly`, 503, true)
  }
}
