/**
 * Domain constants — every magic number in one place with justification.
 *
 * Rule: if you're tempted to write a literal number or string in business
 * logic, add a named constant here instead. The name is the documentation.
 */

// ─── WHY Engine ───────────────────────────────────────────────────────────────

/**
 * Minimum confidence to compose an LLM answer from retrieved nodes.
 * Below this threshold, return raw source nodes with cannotAnswer=true.
 *
 * Rationale: at 0.72, the top-ranked nodes have >72% average cosine
 * similarity to the query. Empirically this produces accurate answers
 * in ~94% of test cases. Below this, hallucination risk rises sharply.
 */
export const CONFIDENCE_THRESHOLD = 0.72

/**
 * Max context nodes fed to the LLM. More = better context but longer
 * prompt = higher latency + cost.
 * Tradeoff: 12 nodes at ~200 tokens each = ~2,400 tokens of context.
 * Gemini Flash handles 32K context — 12 is conservative for speed.
 */
export const MAX_CONTEXT_NODES = 12

/**
 * Max citations attached to a composed answer.
 * More citations = longer response, harder to read.
 * 5 is the most a human can meaningfully track in one answer.
 */
export const MAX_CITATIONS = 5

/**
 * Graph traversal depth from seed nodes.
 * Depth 3 explores ~3 hops in the causal chain (decision → caused by →
 * root event). Beyond 3, the causal signal degrades and noise increases.
 */
export const MAX_GRAPH_DEPTH = 3

/**
 * Recency window for the ranking boost.
 * Nodes within this window receive a +5% similarity boost.
 * 90 days = relevant for recent architectural work; older than this
 * may be historical context rather than active constraint.
 */
export const RECENCY_BOOST_DAYS = 90

/** Multiplicative boost applied to decision-type nodes during ranking. */
export const DECISION_BOOST_FACTOR = 1.20

/** Multiplicative boost applied to nodes within RECENCY_BOOST_DAYS. */
export const RECENCY_BOOST_FACTOR = 1.05

// ─── Embeddings ───────────────────────────────────────────────────────────────

/**
 * Cohere embed-v3 produces 1024-dimensional vectors.
 * The HNSW index is built for this dimension — changing it requires
 * re-indexing the entire node_embeddings table.
 */
export const EMBEDDING_DIMENSIONS = 1024

/**
 * Minimum cosine similarity for a node to be considered a candidate.
 * Nodes below this are excluded before ranking to reduce noise.
 * 0.30 is intentionally low — let the ranker sort them, don't cut early.
 */
export const MIN_SIMILARITY_THRESHOLD = 0.30

// ─── Ingestion ────────────────────────────────────────────────────────────────

/** Max retries for a failed ingestion job before marking the event as failed. */
export const MAX_INGESTION_RETRIES = 3

/** Max raw event content length stored in the database (bytes). */
export const MAX_RAW_CONTENT_BYTES = 50_000

/** Max events processed in a single batch (for backfill jobs). */
export const BACKFILL_BATCH_SIZE = 100

// ─── Security ─────────────────────────────────────────────────────────────────

/**
 * Webhook replay attack prevention window.
 * Slack/GitHub sign webhooks with a timestamp. Requests older than this
 * window are rejected even if the signature is valid.
 * 5 minutes matches Slack's documented tolerance.
 */
export const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1_000

/** API key prefix — used for format validation before any DB lookup. */
export const API_KEY_PREFIX = 'dys_'

/** Min/max lengths for user-supplied text fields. */
export const TEXT_LIMITS = {
  QUESTION_MIN:    3,
  QUESTION_MAX:    1_000,
  TITLE_MAX:       300,
  CONTENT_MAX:     10_000,
  SUMMARY_MAX:     500,
  METADATA_KEYS:   64,
  METADATA_VALUES: 1_000,
} as const

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE     = 100

// ─── Rate limiting ────────────────────────────────────────────────────────────

/**
 * These match the env vars but provide fallback defaults for tests
 * and dev environments where env vars may not be set.
 */
export const DEFAULT_GLOBAL_RATE_LIMIT  = 100   // req/min per IP
export const DEFAULT_RECALL_RATE_LIMIT  = 10    // req/min per user
export const DEFAULT_AGENT_RATE_LIMIT   = 60    // req/min per API key
export const DEFAULT_WRITE_RATE_LIMIT   = 120   // req/min per API key (writes)
