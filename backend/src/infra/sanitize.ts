/**
 * Input sanitization — applied to all user-supplied text before it
 * enters the database or is sent to an LLM.
 *
 * Goals:
 *   1. Prevent prompt injection via stored memories sent to Gemini
 *   2. Strip control characters that break JSON serialization
 *   3. Normalize whitespace for consistent hashing / deduplication
 *   4. Enforce hard limits on field lengths
 *
 * What this is NOT:
 *   - XSS protection (that's the frontend's responsibility + CSP headers)
 *   - SQL injection protection (Drizzle ORM parameterizes all queries)
 *   - Authentication (handled by auth middleware)
 *
 * Engineering tradeoff:
 *   We sanitize on write (ingest), not on read (serve). This means stored
 *   data is always clean — no need to sanitize on every render/LLM call.
 *   Downside: original input is permanently altered. Acceptable for
 *   institutional memory (we want the content, not the formatting artifacts).
 */

// Control characters except tab, newline, carriage return
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

// Prompt injection attempts — patterns that try to override LLM instructions
// These are normalised, not blocked — the text is stored but markers removed
const INJECTION_PATTERNS = [
  /\bignore\s+(previous|above|prior|all)\s+(instructions?|context|prompt)/gi,
  /\bsystem\s*:\s*/gi,
  /\bassistant\s*:\s*/gi,
  /\bDAN\s+mode/gi,
  /<\|?(im_start|im_end|system|user|assistant)\|?>/gi,
]

export function sanitizeText(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''

  let sanitized = raw
    // Remove null bytes and control characters
    .replace(CONTROL_CHARS, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }

  return sanitized
    // Collapse 3+ consecutive newlines to 2 (preserve paragraph breaks)
    .replace(/\n{3,}/g, '\n\n')
    // Trim leading/trailing whitespace
    .trim()
}

export function sanitizeTitle(raw: string, maxLen = 300): string {
  return sanitizeText(raw)
    // Titles should be single-line
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, maxLen)
}

export function sanitizeMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    // Reject keys with suspicious patterns
    if (typeof key !== 'string' || key.length > 64) continue
    if (/[<>{}$]/.test(key)) continue

    // Recurse into nested objects (1 level deep max)
    if (typeof value === 'string') {
      result[key] = sanitizeText(value).slice(0, 1000)
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value
    } else if (Array.isArray(value)) {
      result[key] = value
        .filter(v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        .slice(0, 50)
    }
    // Drop nested objects — too complex to sanitize safely
  }

  return result
}

/** Truncate a string to a safe length without splitting a UTF-16 surrogate pair. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  // Step back from the limit to avoid cutting a surrogate pair
  let end = maxLen
  while (end > 0 && (str.charCodeAt(end) & 0xfc00) === 0xdc00) end--
  return str.slice(0, end) + '…'
}
