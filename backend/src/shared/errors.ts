export class DysonError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message)
    this.name = 'DysonError'
  }
}

export class NotFoundError extends DysonError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

export class ForbiddenError extends DysonError {
  constructor() {
    super('FORBIDDEN', 'Access denied', 403)
  }
}

export class UnauthorizedError extends DysonError {
  constructor() {
    super('UNAUTHORIZED', 'Authentication required', 401)
  }
}

export class ValidationError extends DysonError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400)
  }
}

export class RateLimitError extends DysonError {
  constructor() {
    super('RATE_LIMITED', 'Too many requests', 429)
  }
}

export class ConfidenceTooLowError extends DysonError {
  constructor(public readonly sourceEvents: unknown[]) {
    super('CONFIDENCE_TOO_LOW', 'Not enough confidence to draw a conclusion', 422)
  }
}

export class IngestionError extends DysonError {
  constructor(message: string) {
    super('INGESTION_ERROR', message, 500)
  }
}

export class WebhookSignatureError extends DysonError {
  constructor() {
    super('INVALID_SIGNATURE', 'Webhook signature verification failed', 401)
  }
}
