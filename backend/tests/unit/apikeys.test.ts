import { describe, expect, it } from 'vitest'
import { createHash } from 'crypto'
import { hashApiKey, CreateApiKeySchema } from '@/modules/api-keys/apikeys.service.js'

describe('api keys — hashing', () => {
  it('hashApiKey produces a sha256 hex digest', () => {
    const raw  = 'dys_test_key_abc123'
    const got  = hashApiKey(raw)
    const want = createHash('sha256').update(raw).digest('hex')
    expect(got).toBe(want)
  })

  it('hashApiKey is deterministic for the same input', () => {
    expect(hashApiKey('x')).toBe(hashApiKey('x'))
  })

  it('hashApiKey produces different digests for different inputs', () => {
    expect(hashApiKey('a')).not.toBe(hashApiKey('b'))
  })

  it('hashApiKey output length is 64 hex chars (sha256)', () => {
    expect(hashApiKey('any')).toHaveLength(64)
  })
})

describe('api keys — schema validation', () => {
  it('rejects empty name', () => {
    expect(() => CreateApiKeySchema.parse({ name: '', scopes: ['read'] })).toThrow()
  })

  it('rejects oversized name', () => {
    expect(() => CreateApiKeySchema.parse({ name: 'x'.repeat(101), scopes: ['read'] })).toThrow()
  })

  it('defaults scopes to read', () => {
    const parsed = CreateApiKeySchema.parse({ name: 'test' })
    expect(parsed.scopes).toEqual(['read'])
  })

  it('rejects unknown scope', () => {
    expect(() => CreateApiKeySchema.parse({ name: 't', scopes: ['admin'] })).toThrow()
  })

  it('accepts read+write', () => {
    const parsed = CreateApiKeySchema.parse({ name: 't', scopes: ['read', 'write'] })
    expect(parsed.scopes).toEqual(['read', 'write'])
  })
})
