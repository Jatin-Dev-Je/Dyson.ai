/**
 * Retry an async operation with exponential backoff + full jitter.
 * Use for all external API calls: Slack, GitHub, Gemini, Cohere.
 *
 * Jitter prevents thundering herds when multiple jobs retry simultaneously
 * after a transient failure (e.g. rate limit window expiry).
 */
export interface RetryOptions {
  attempts?:    number   // total attempts (default 3)
  baseDelayMs?: number   // base backoff ms (default 300)
  maxDelayMs?:  number   // cap on backoff ms (default 10_000)
  shouldRetry?: (err: unknown) => boolean  // return false to abort early
}

export async function withRetry<T>(
  fn:   () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    attempts   = 3,
    baseDelayMs = 300,
    maxDelayMs  = 10_000,
    shouldRetry = () => true,
  } = opts

  let lastErr: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === attempts || !shouldRetry(err)) throw err

      const exponential = baseDelayMs * 2 ** (attempt - 1)
      const jitter      = Math.random() * exponential
      const delay       = Math.min(exponential + jitter, maxDelayMs)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastErr
}

/** Returns true for errors that are likely transient (5xx, network, timeout). */
export function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('socket hang up') ||
      msg.includes('http 429') ||
      msg.includes('http 500') ||
      msg.includes('http 502') ||
      msg.includes('http 503') ||
      msg.includes('http 504')
    )
  }
  return false
}
