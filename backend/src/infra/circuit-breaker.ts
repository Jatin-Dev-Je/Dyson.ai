/**
 * Circuit breaker — prevents cascade failures from downed external services.
 *
 * Three states:
 *   CLOSED   → normal operation. Failures increment a counter.
 *   OPEN     → service is considered down. Calls fail fast (no network call).
 *              Transitions to HALF_OPEN after recoveryMs.
 *   HALF_OPEN → one probe call allowed. Success → CLOSED. Failure → OPEN.
 *
 * Engineering tradeoff:
 *   Without this, if Gemini goes down every /recall request waits 30s and
 *   then 500s. With this, after 5 failures requests fail in <1ms and the
 *   WHY engine degrades gracefully (returns source nodes, cannotAnswer=true).
 *
 * Usage:
 *   const breaker = new CircuitBreaker('gemini', { failureThreshold: 5 })
 *   const result  = await breaker.call(() => callGemini(prompt))
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit. Default: 5 */
  failureThreshold?: number
  /** Milliseconds to wait before trying a probe request. Default: 30_000 */
  recoveryMs?: number
  /** Milliseconds before a single call is considered failed. Default: 30_000 */
  callTimeoutMs?: number
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker OPEN for '${name}' — service unavailable, skipping call`)
    this.name = 'CircuitOpenError'
  }
}

export class CircuitBreaker {
  private state:           CircuitState = 'CLOSED'
  private failureCount:    number       = 0
  private lastFailureTime: number       = 0
  private probeInFlight:   boolean      = false

  private readonly failureThreshold: number
  private readonly recoveryMs:       number
  private readonly callTimeoutMs:    number

  constructor(
    private readonly name: string,
    opts: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = opts.failureThreshold ?? 5
    this.recoveryMs       = opts.recoveryMs       ?? 30_000
    this.callTimeoutMs    = opts.callTimeoutMs     ?? 30_000
  }

  get currentState(): CircuitState {
    return this.state
  }

  get metrics() {
    return {
      name:            this.name,
      state:           this.state,
      failureCount:    this.failureCount,
      lastFailureTime: this.lastFailureTime,
    }
  }

  /**
   * Wrap an async call with circuit breaker protection.
   * Throws CircuitOpenError if the circuit is open — callers should handle
   * this as a degraded-mode signal, not a hard error.
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    this.transitionIfRecovered()

    if (this.state === 'OPEN') {
      throw new CircuitOpenError(this.name)
    }

    if (this.state === 'HALF_OPEN') {
      if (this.probeInFlight) {
        // Another probe is already in flight — fail fast rather than pile up
        throw new CircuitOpenError(this.name)
      }
      this.probeInFlight = true
    }

    try {
      const result = await this.withTimeout(fn)
      this.onSuccess()
      return result
    } catch (err) {
      if (err instanceof CircuitOpenError) throw err
      this.onFailure()
      throw err
    } finally {
      this.probeInFlight = false
    }
  }

  private async withTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Circuit breaker '${this.name}': call timed out after ${this.callTimeoutMs}ms`)),
        this.callTimeoutMs,
      )

      fn()
        .then(v => { clearTimeout(timer); resolve(v) })
        .catch(e => { clearTimeout(timer); reject(e) })
    })
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state        = 'CLOSED'
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  private transitionIfRecovered(): void {
    if (
      this.state === 'OPEN' &&
      Date.now() - this.lastFailureTime >= this.recoveryMs
    ) {
      this.state = 'HALF_OPEN'
    }
  }

  /** Force-reset — useful in tests or after a manual intervention. */
  reset(): void {
    this.state        = 'CLOSED'
    this.failureCount = 0
    this.probeInFlight = false
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────
// One breaker per external service. Shared across all requests in the process.

export const geminiBreaker = new CircuitBreaker('gemini', {
  failureThreshold: 5,
  recoveryMs:       30_000,
  callTimeoutMs:    28_000,   // slightly under Fastify's global timeout
})

export const cohereBreaker = new CircuitBreaker('cohere', {
  failureThreshold: 5,
  recoveryMs:       60_000,   // embeddings can wait longer to recover
  callTimeoutMs:    20_000,
})

export const slackBreaker = new CircuitBreaker('slack-api', {
  failureThreshold: 10,
  recoveryMs:       60_000,
  callTimeoutMs:    15_000,
})

export const githubBreaker = new CircuitBreaker('github-api', {
  failureThreshold: 10,
  recoveryMs:       60_000,
  callTimeoutMs:    15_000,
})
