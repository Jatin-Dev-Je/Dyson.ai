/**
 * Memory module schema validation tests.
 */
import { describe, expect, it } from 'vitest'
import { CreateMemorySchema, ListMemoriesSchema, MemoryTypeEnum } from '@/modules/memory/memory.routes.js'

describe('MemoryTypeEnum', () => {
  const valid = ['decision', 'incident', 'standard', 'context', 'constraint', 'outcome'] as const
  for (const t of valid) {
    it(`accepts type "${t}"`, () => {
      expect(() => MemoryTypeEnum.parse(t)).not.toThrow()
    })
  }
  it('rejects unknown type', () => {
    expect(() => MemoryTypeEnum.parse('unknown')).toThrow()
  })
})

describe('CreateMemorySchema', () => {
  const valid = { title: 'We moved to JWT auth', content: 'The reason was session flooding under load during the Q3 incident.' }

  it('accepts minimal valid payload', () => {
    expect(() => CreateMemorySchema.parse(valid)).not.toThrow()
  })

  it('defaults type to context', () => {
    const r = CreateMemorySchema.parse(valid)
    expect(r.type).toBe('context')
  })

  it('accepts a URL', () => {
    const r = CreateMemorySchema.parse({ ...valid, url: 'https://github.com/org/repo/pull/42' })
    expect(r.url).toBe('https://github.com/org/repo/pull/42')
  })

  it('rejects title shorter than 3 chars', () => {
    expect(() => CreateMemorySchema.parse({ ...valid, title: 'ab' })).toThrow()
  })

  it('rejects content shorter than 10 chars', () => {
    expect(() => CreateMemorySchema.parse({ ...valid, content: 'too short' })).toThrow()
  })

  it('rejects invalid URL', () => {
    expect(() => CreateMemorySchema.parse({ ...valid, url: 'not-a-url' })).toThrow()
  })
})

describe('ListMemoriesSchema', () => {
  it('defaults limit to 50', () => {
    const r = ListMemoriesSchema.parse({})
    expect(r.limit).toBe(50)
  })

  it('accepts type filter', () => {
    const r = ListMemoriesSchema.parse({ type: 'incident' })
    expect(r.type).toBe('incident')
  })

  it('coerces limit from string', () => {
    const r = ListMemoriesSchema.parse({ limit: '25' })
    expect(r.limit).toBe(25)
  })

  it('clamps limit to 100 max', () => {
    expect(() => ListMemoriesSchema.parse({ limit: 200 })).toThrow()
  })
})
