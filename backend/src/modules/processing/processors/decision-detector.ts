// Pure function — detects whether a piece of content represents a decision
// Returns a calibrated confidence score (0–1) and the signals that fired

export type DecisionResult = {
  isDecision: boolean
  confidence: number
  signals:    string[]
}

// High-confidence decision markers (strong explicit language)
const STRONG_SIGNALS: Array<[RegExp, string, number]> = [
  [/\bfinal decision\b/i,              'final_decision',         0.85],
  [/\bdecision\s*:/i,                  'decision_label',         0.80],
  [/\bwe('ve| have)?\s+decided\b/i,    'we_decided',             0.80],
  [/\bagreed\s+to\b/i,                 'agreed_to',              0.75],
  [/\bgoing with\b/i,                  'going_with',             0.70],
  [/\bwe('ll| will)?\s+go with\b/i,   'will_go_with',           0.70],
  [/\badopt(ing|ed)?\b/i,              'adopting',               0.65],
  [/\bapproved\b/i,                    'approved',               0.65],
  [/\bchose\b/i,                       'chose',                  0.65],
  [/\b(we're|we are)\s+using\b/i,     'we_are_using',           0.60],
  [/\bdeprecate\b/i,                   'deprecate',              0.60],
  [/\bship(ping|ped)?\b/i,            'shipping',               0.55],
  [/\bmigrate?\b/i,                    'migrate',                0.50],
]

// Weak signals — increase confidence when combined with others
const WEAK_SIGNALS: Array<[RegExp, string, number]> = [
  [/\busing\b/i,          'using',         0.15],
  [/\bswitch(ing)?\b/i,   'switching',     0.20],
  [/\binstead of\b/i,     'instead_of',    0.25],
  [/\breplac(e|ing)\b/i,  'replacing',     0.25],
  [/\bover\b/i,           'over',          0.10],
  [/\bchoice\b/i,         'choice',        0.20],
  [/\btrade.?off\b/i,     'tradeoff',      0.25],
  [/\bpros and cons\b/i,  'pros_cons',     0.30],
]

// Negative signals — reduce confidence
const NEGATIVE_SIGNALS: Array<[RegExp, number]> = [
  [/\bmaybe\b/i,           0.25],
  [/\bconsider(ing)?\b/i,  0.20],
  [/\bpossibly\b/i,        0.25],
  [/\bnot sure\b/i,        0.30],
  [/\bthinking\b/i,        0.15],
  [/\bshould we\b/i,       0.30],
  [/\bwhat if\b/i,         0.25],
  [/\?$/,                  0.10],  // Ends with question mark = uncertainty
]

const DECISION_THRESHOLD = 0.50

export function detectDecision(content: string): DecisionResult {
  const signals: string[] = []
  let confidence = 0

  // Score strong signals
  for (const [pattern, label, weight] of STRONG_SIGNALS) {
    if (pattern.test(content)) {
      signals.push(label)
      confidence = Math.max(confidence, weight)
    }
  }

  // Add weak signals
  let weakBoost = 0
  for (const [pattern, label, weight] of WEAK_SIGNALS) {
    if (pattern.test(content)) {
      signals.push(label)
      weakBoost += weight
    }
  }
  // Weak signals can contribute up to 0.35 additional confidence
  confidence += Math.min(weakBoost, 0.35)

  // Apply negative signals
  let penalty = 0
  for (const [pattern, weight] of NEGATIVE_SIGNALS) {
    if (pattern.test(content)) {
      penalty += weight
    }
  }
  confidence = Math.max(0, confidence - penalty)

  // Cap at 0.95 — never fully certain from text alone
  confidence = Math.min(confidence, 0.95)

  // Round to 2 decimal places
  confidence = Math.round(confidence * 100) / 100

  return {
    isDecision: confidence >= DECISION_THRESHOLD,
    confidence,
    signals,
  }
}
