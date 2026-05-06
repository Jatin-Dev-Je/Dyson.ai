/**
 * Circuit breaker unit tests.
 * These run synchronously — no external dependencies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreaker, CircuitOpenError } from '@/infra/circuit-breaker.js'

describe('CircuitBreaker — state machine', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      recoveryMs:       100,    // short for tests
      callTimeoutMs:    1_000,
    })
  })

  it('starts CLOSED', () => {
    expect(breaker.currentState).toBe('CLOSED')
  })

  it('stays CLOSED on success', async () => {
    await breaker.call(() => Promise.resolve('ok'))
    expect(breaker.currentState).toBe('CLOSED')
  })

  it('opens after failureThreshold consecutive failures', async () => {
    const fail = () => Promise.reject(new Error('service down'))

    for (let i = 0; i < 3; i++) {
      await breaker.call(fail).catch(() => {})
    }

    expect(breaker.currentState).toBe('OPEN')
  })

  it('throws CircuitOpenError when OPEN without calling the function', async () => {
    const fail = () => Promise.reject(new Error('service down'))
    for (let i = 0; i < 3; i++) await breaker.call(fail).catch(() => {})

    const fn = vi.fn().mockResolvedValue('ok')
    await expect(breaker.call(fn)).rejects.toThrow(CircuitOpenError)
    expect(fn).not.toHaveBeenCalled()   // function was never invoked
  })

  it('transitions to HALF_OPEN then CLOSED after recoveryMs', async () => {
    const fail = () => Promise.reject(new Error('down'))
    for (let i = 0; i < 3; i++) await breaker.call(fail).catch(() => {})
    expect(breaker.currentState).toBe('OPEN')

    // Move system time forward past recoveryMs using vi.setSystemTime
    // (Date.now() is what the breaker checks, not setTimeout)
    const now = Date.now()
    vi.setSystemTime(now + 200)   // 200ms > recoveryMs=100

    // Successful probe — should transition OPEN → HALF_OPEN → CLOSED
    await breaker.call(() => Promise.resolve('probe'))
    expect(breaker.currentState).toBe('CLOSED')

    vi.useRealTimers()
  })

  it('resets failure count on success', async () => {
    const fail    = () => Promise.reject(new Error('fail'))
    const succeed = () => Promise.resolve('ok')

    // 2 failures (under threshold)
    await breaker.call(fail).catch(() => {})
    await breaker.call(fail).catch(() => {})
    expect(breaker.currentState).toBe('CLOSED')

    // Success resets counter
    await breaker.call(succeed)
    expect(breaker.metrics.failureCount).toBe(0)
  })

  it('times out slow calls and counts as failure', async () => {
    breaker = new CircuitBreaker('timeout-test', {
      failureThreshold: 1,
      callTimeoutMs:    50,
    })

    const slow = () => new Promise<string>(resolve => setTimeout(() => resolve('late'), 200))
    await expect(breaker.call(slow)).rejects.toThrow(/timed out/)
    expect(breaker.currentState).toBe('OPEN')
  })

  it('reset() brings circuit back to CLOSED', async () => {
    const fail = () => Promise.reject(new Error('down'))
    for (let i = 0; i < 3; i++) await breaker.call(fail).catch(() => {})
    expect(breaker.currentState).toBe('OPEN')

    breaker.reset()
    expect(breaker.currentState).toBe('CLOSED')
    expect(breaker.metrics.failureCount).toBe(0)
  })

  it('metrics returns correct shape', () => {
    const m = breaker.metrics
    expect(m).toHaveProperty('name', 'test')
    expect(m).toHaveProperty('state')
    expect(m).toHaveProperty('failureCount')
    expect(m).toHaveProperty('lastFailureTime')
  })
})

describe('CircuitBreaker — error propagation', () => {
  it('re-throws the original error (not wrapping it)', async () => {
    const breaker  = new CircuitBreaker('err-test', { failureThreshold: 5 })
    const original = new Error('original error message')

    await expect(breaker.call(() => Promise.reject(original))).rejects.toBe(original)
  })

  it('does not count CircuitOpenError as a failure', async () => {
    const b1 = new CircuitBreaker('outer', { failureThreshold: 1 })
    const b2 = new CircuitBreaker('inner', { failureThreshold: 1, recoveryMs: 0 })

    // Open b2
    await b2.call(() => Promise.reject(new Error('fail'))).catch(() => {})
    expect(b2.currentState).toBe('OPEN')

    // Calling through b1 → b2 should not count b2's CircuitOpenError as b1's failure
    await b1.call(() => b2.call(() => Promise.resolve('ok'))).catch(() => {})
    expect(b1.currentState).toBe('CLOSED')   // b1 was not affected
  })
})
