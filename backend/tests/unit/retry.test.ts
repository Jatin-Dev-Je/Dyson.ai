import { describe, expect, it, vi } from 'vitest'
import { withRetry, isTransientError } from '@/infra/retry.js'

describe('withRetry — happy path', () => {
  it('returns the result of a successful call immediately', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds on the second attempt', async () => {
    let calls = 0
    const fn = vi.fn().mockImplementation(async () => {
      calls++
      if (calls < 2) throw new Error('transient failure')
      return 'recovered'
    })
    const result = await withRetry(fn, { baseDelayMs: 0 })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('exhausts all attempts and rethrows the last error', async () => {
    const err = new Error('always fails')
    const fn  = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('stops retrying immediately when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent'))
    await expect(
      withRetry(fn, { attempts: 3, baseDelayMs: 0, shouldRetry: () => false })
    ).rejects.toThrow('permanent')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('isTransientError', () => {
  const transient = [
    new Error('connect ECONNRESET 1.2.3.4:443'),
    new Error('request timeout ETIMEDOUT'),
    new Error('socket hang up'),
    new Error('Slack API chat.postMessage HTTP 429'),
    new Error('GitHub GET /repos failed: 500'),
    new Error('upstream connect error HTTP 503'),
  ]

  const permanent = [
    new Error('invalid input syntax'),
    new Error('duplicate key value violates unique constraint'),
    new Error('404 not found'),
    new Error('unauthorized 401'),
    'just a string',
    null,
    42,
  ]

  for (const err of transient) {
    it(`marks "${(err as Error).message.slice(0, 50)}" as transient`, () => {
      expect(isTransientError(err)).toBe(true)
    })
  }

  for (const err of permanent) {
    it(`marks "${String(err).slice(0, 50)}" as non-transient`, () => {
      expect(isTransientError(err)).toBe(false)
    })
  }
})
