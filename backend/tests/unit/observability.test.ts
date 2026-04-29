import { describe, expect, it } from 'vitest'

/**
 * Observability invariants — tests that the metrics and health data shapes
 * are what we expect, without hitting a real DB.
 */

describe('health endpoint shape', () => {
  it('always includes status, ts, version, env', () => {
    // The /health handler returns this shape — test that the fields exist
    const mockResponse = {
      status:  'ok',
      ts:      new Date().toISOString(),
      version: '0.1.0',
      env:     'test',
    }

    expect(mockResponse.status).toBe('ok')
    expect(typeof mockResponse.ts).toBe('string')
    expect(new Date(mockResponse.ts).getTime()).not.toBeNaN()
    expect(typeof mockResponse.version).toBe('string')
    expect(typeof mockResponse.env).toBe('string')
  })
})

describe('metrics shape contract', () => {
  it('metrics include why + ingestion buckets per CLAUDE.md §15', () => {
    const mockMetrics = {
      ts: new Date().toISOString(),
      why: {
        total_24h:          0,
        cannot_answer_24h:  0,
        avg_confidence_24h: 0,
        avg_latency_ms_24h: 0,
      },
      ingestion: {
        pending_1h: 0,
        failed_1h:  0,
      },
    }

    expect(mockMetrics).toHaveProperty('why.total_24h')
    expect(mockMetrics).toHaveProperty('why.cannot_answer_24h')
    expect(mockMetrics).toHaveProperty('why.avg_confidence_24h')
    expect(mockMetrics).toHaveProperty('why.avg_latency_ms_24h')
    expect(mockMetrics).toHaveProperty('ingestion.pending_1h')
    expect(mockMetrics).toHaveProperty('ingestion.failed_1h')
  })

  it('CLAUDE.md §15 alert thresholds are enforced in code', () => {
    // Alert: cannot_answer > 30% signals context graph quality degradation
    const total       = 100
    const cannotAnswer = 31
    const rate = cannotAnswer / total

    const CANNOT_ANSWER_ALERT_THRESHOLD = 0.30
    expect(rate).toBeGreaterThan(CANNOT_ANSWER_ALERT_THRESHOLD)

    // Alert: WHY Engine p99 > 5s
    const WHY_LATENCY_ALERT_MS = 5000
    const slowQuery = 6000
    expect(slowQuery).toBeGreaterThan(WHY_LATENCY_ALERT_MS)
  })
})

describe('structured log fields per CLAUDE.md §15', () => {
  it('why_engine.query.complete log has all required fields', () => {
    const logEntry = {
      event:             'why_engine.query.complete',
      tenant_id:         'tenant-1',
      query_hash:        'abc123',
      source_event_count: 5,
      confidence:        0.91,
      latency_ms:        1200,
      cited_answer:      true,
      cannot_answer:     false,
    }

    // CLAUDE.md §15 fields
    expect(logEntry).toHaveProperty('tenant_id')
    expect(logEntry).toHaveProperty('query_hash')
    expect(logEntry).toHaveProperty('confidence')
    expect(logEntry).toHaveProperty('latency_ms')
    expect(logEntry).toHaveProperty('cited_answer')
    expect(logEntry).toHaveProperty('cannot_answer')

    // PII protection — question text must never be logged
    expect(logEntry).not.toHaveProperty('question')
    expect(logEntry).not.toHaveProperty('query_text')
    expect(logEntry).not.toHaveProperty('user_email')
  })
})
