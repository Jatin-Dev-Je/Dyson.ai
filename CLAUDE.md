# CLAUDE.md — Dyson Engineering Guide

You are a product engineer on Dyson. Read this fully before touching any code.

---

## 1. What Dyson Is

Dyson is **context infrastructure** — a system of record for *why* decisions were made across a company's work stack (Slack, GitHub, Notion, Linear, meetings).

**The mission in one line:** Others store what. Dyson explains why.

**The core product guarantee:** Every answer Dyson produces carries inline citations, a confidence score, and one-click access to the source event that produced it. A hallucinated answer is worse than no answer. Trust is the entire game.

**The wedge:** Engineering post-mortems and onboarding for 30–200-person technical teams.

**The moat:** A tenant-private context graph that compounds in value the longer it runs. Cross-source causal linking is the hard proprietary problem — identifying which Slack thread caused which PR.

---

## 2. Architecture

### Pattern
Modular monolith today. Extract a module to a service only when a concrete operational problem demands it — not because it "feels big."

**Extraction triggers (specific, not vibes):**
- Ingestion > 1M events/tenant/day → extract ingestion workers to Cloud Run jobs
- ML inference adds > 200ms p99 to query latency → extract Python ML service
- A connector needs independent deploy cadence → extract that connector only

### Data Flow
```
External tools → Ingestion → Processing → Graph + Embeddings → Query Engine → Humans & Agents
```
Each boundary is **asynchronous and idempotent**. Re-ingestion is always safe. The graph is always rebuildable from raw event logs stored in Cloud Storage.

### Module Structure
```
src/
  ingestion/        # Connectors: Slack, GitHub, Notion, Linear, meetings
  processing/       # Entity extraction, decision detection, embedding generation
  graph/            # Context graph: nodes, typed edges, temporal relationships
  embeddings/       # pgvector interface, similarity search
  query-engine/     # Hybrid retrieval, graph-walk planning, Causal RAG
  agent-layer/      # MCP-compatible API, OAuth, per-tool rate limiting
  shared/           # Types, enums, constants ONLY — zero business logic
  api/              # HTTP layer only: routing, auth middleware, input validation
```

### Module Rules
- A module owns its own DB schema namespace. Never query another module's tables directly.
- Cross-module communication uses typed interfaces exported from `shared/`. Never import internal functions across module boundaries.
- No circular dependencies. Ever.
- `shared/` contains types, constants, and enums only. Zero logic. Zero DB calls.

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript (strict) |
| ML service | Python 3.11 + FastAPI |
| Database | Supabase (Postgres 15 + pgvector) |
| Event streaming | Google Cloud Pub/Sub |
| Job queue | Google Cloud Tasks |
| Hosting | Google Cloud Run |
| Frontend | Next.js 14 (App Router) on Vercel |
| LLM | Gemini Flash (Google AI Studio) |
| Embeddings | Cohere embed-v3 |
| Raw event storage | Google Cloud Storage |
| Secrets | Google Secret Manager |
| CI/CD | Cloud Build + GitHub Actions |
| Observability | Cloud Logging + Cloud Monitoring + Sentry |

---

## 4. Engineering Principles

Non-negotiable regardless of deadline pressure.

**YAGNI.** Build exactly what the current task requires. No abstractions for hypothetical future requirements. Three similar lines is better than a premature abstraction.

**No half-finished implementations.** A feature is either complete and tested or it is not merged. No `// TODO: implement later` in merged code. Open a Linear ticket instead.

**Correctness before speed.** The WHY Engine must be right before it is fast. A wrong answer shipped fast destroys trust permanently.

**Idempotency in the pipeline.** Every ingestion event has a stable external ID. Processing the same event twice must produce the same result. This is enforced by design, not by hoping.

**Fail loudly in dev, degrade gracefully in prod.** In development, throw on unexpected state. In production, log the error, return a degraded response, never crash the process.

**No premature optimization.** Profile before you optimize. Measure before you cache. The bottleneck is almost never where you think it is.

---

## 5. TypeScript Standards

### tsconfig (enforced)
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true
}
```

### Hard rules
- **No `any`.** Use `unknown` and narrow it. If you reach for `any`, the type boundary is wrong.
- **No non-null assertions (`!`).** Handle the null case explicitly.
- **Named exports only.** No default exports except Next.js page/layout components.
- **Zod at every external boundary.** All API inputs, webhook payloads, LLM outputs — parse with Zod before touching inside a module. Never trust unvalidated external data.
- **Enums for all domain constants.** No magic strings for entity types, relationship types, confidence levels, event sources.
- **Result types for fallible operations.** Return `{ data, error }` — never throw from business logic. Throw only for programming errors (invariant violations).
- **No nested ternaries.** Two levels maximum. Use an `if` block after that.
- **Function length max 40 lines.** If a function exceeds this, it is doing too much. Extract.
- **No barrel re-exports** (`index.ts` that re-exports everything). Import from the actual file.

### Naming conventions
```typescript
// Types and interfaces: PascalCase
type ContextNode = { ... }
type CausalEdge = { ... }
interface WhyEngineResponse { ... }

// Constants: SCREAMING_SNAKE_CASE
const MAX_GRAPH_DEPTH = 5
const CONFIDENCE_THRESHOLD = 0.72
const MAX_CITATIONS_PER_CLAIM = 3

// Enums: PascalCase enum name, PascalCase members, string values
enum RelationshipType {
  LeadsTo = 'leads_to',
  DependsOn = 'depends_on',
  DiscussedIn = 'discussed_in',
  DecidedBy = 'decided_by',
  Resolves = 'resolves',
  Supersedes = 'supersedes',
}

enum EntityType {
  User = 'user',
  Message = 'message',
  Document = 'document',
  CodeChange = 'code_change',
  Decision = 'decision',
  Task = 'task',
  MeetingMoment = 'meeting_moment',
}

// Functions: camelCase, verb-first
function extractDecisions() {}
function buildCausalTimeline() {}
function scoreEdgeProbability() {}
function assertTenantAccess() {}
```

### Error handling pattern
```typescript
// At system boundaries (API routes, webhooks): catch and convert to response
// Inside modules: propagate errors via Result types, never swallow

// Good
const result = await parseSlackEvent(payload)
if (result.error) {
  logger.warn('Failed to parse Slack event', { error: result.error })
  return { success: false }
}

// Bad — silently swallowed
try {
  await parseSlackEvent(payload)
} catch (_) {}

// Bad — throws from business logic
function scoreEdge(a: Event, b: Event): number {
  if (!a.timestamp) throw new Error('Missing timestamp') // use Result instead
}
```

---

## 6. Python Standards (ML Service)

- Python 3.11+, typed annotations on all functions
- `mypy --strict` enforced in CI
- Pydantic v2 for all request/response models — no raw dicts at API boundaries
- FastAPI dependency injection for DB sessions, auth context, and config
- `structlog` for structured logging — no `print()`
- `ruff` for linting, `black` for formatting — both run in CI, block merge on failure
- One responsibility per file. If a file exceeds 200 lines, split it.
- No mutable global state. Configuration via Pydantic `BaseSettings`.

---

## 7. Database Rules

### Schema conventions
```sql
-- Every table
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz NOT NULL DEFAULT now()

-- Every tenant-scoped table
tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE

-- Enums enforced at DB level
status      text NOT NULL CHECK (status IN ('pending', 'processing', 'complete', 'failed'))
```

- All table and column names: `snake_case`
- Every foreign key has an index
- Updated_at maintained by a trigger, not application code

### Query rules
- **No raw SQL strings.** Parameterized queries or a typed query builder only. No exceptions.
- **Every query on a tenant-scoped table must include `tenant_id` in WHERE.** A query missing `tenant_id` is a security bug, not a style issue. This is enforced in code review.
- **Migrations are additive only.** Never drop a column or table in the same migration that removes it from code. Deprecate first, remove in a follow-up migration after deployment.
- **No N+1 queries.** If you are querying inside a loop, stop. Use joins or batch queries.

### pgvector
- Distance metric: `cosine` for semantic similarity
- Index type: `ivfflat` for < 1M vectors, `hnsw` for > 1M
- All vector searches scoped to `tenant_id` — never a global scan
- Embedding dimensions: 1024 (Cohere embed-v3)

---

## 8. Security — Critical

Dyson ingests private company data. A security failure is an existential company event.

### Tenant isolation (enforced everywhere)
- Every DB query on tenant-scoped data includes `tenant_id`.
- The `tenant_id` comes from the authenticated session token. Never from user-supplied input.
- Embeddings and vector indexes are scoped per tenant. A vector search never crosses tenant boundaries.
- Graph traversal is bounded by tenant context before it begins.

### Permission-aware retrieval (the trust contract)
- Before returning any answer, verify the requesting user has read access to every source event cited.
- If a user cannot access a source (e.g., a private Slack channel they are not a member of), Dyson returns **no claim derived from that source** — not a summary, not a paraphrase, nothing. Full stop.
- This check runs at the Query Engine layer before the LLM call. It is never skipped.

### API security
- All endpoints require authentication except `/health` and OAuth callbacks.
- OAuth tokens stored in Secret Manager. Never in DB columns or env vars in plaintext.
- Rate limiting: 100 req/min per tenant on API, 10 req/min per user on the WHY Engine.
- All incoming webhooks verified by signature before processing (Slack signing secret, GitHub webhook secret). Reject unverified payloads with 401.
- All user-supplied strings are untrusted. Validate shape with Zod, sanitize before DB operations.
- JWT: 15-minute access tokens, refresh tokens in `httpOnly` `Secure` cookies only.

### OWASP Top 10 — enforced
| Risk | Mitigation |
|------|-----------|
| Injection | Parameterized queries only. Zod at all boundaries. |
| Broken Auth | JWT verified on every request. Short-lived tokens. |
| Sensitive Data Exposure | No secrets in logs or error messages. No PII in logs. |
| Security Misconfiguration | No debug endpoints in production. No stack traces in API responses. |
| XSS | React renders escape by default. No `dangerouslySetInnerHTML`. |
| SSRF | Webhook and integration URLs are allowlisted. No user-controlled URL fetching. |
| Insecure Deserialization | Zod parses all external data — no `JSON.parse` without schema validation. |

---

## 9. Trust Guarantees — Non-Negotiable

These are product constraints enforced at the code level, not guidelines.

```typescript
// Every WHY Engine response MUST conform to this shape.
// The response pipeline enforces this — the LLM does not decide this.
type WhyEngineResponse = {
  answer: string
  citations: Citation[]    // minimum one citation per factual claim in answer
  confidence: number       // 0–1, calibrated. Below CONFIDENCE_THRESHOLD: no answer.
  sourceEvents: Event[]    // the exact events used to compose the answer
  cannotAnswer?: true      // set when confidence < CONFIDENCE_THRESHOLD
}

type Citation = {
  claim: string            // the specific claim this citation supports
  sourceEventId: string    // the event that supports it
  sourceUrl: string        // one-click link to original artifact
  confidence: number       // confidence that this event supports this claim
}
```

**Rules:**
- If `confidence < CONFIDENCE_THRESHOLD (0.72)`: do not compose an explanation. Return `cannotAnswer: true` with the raw `sourceEvents`. Let the user draw their own conclusion.
- The LLM composes text only over retrieved events. No free generation of facts about the company.
- Uncited claims are suppressed by the system prompt. The system prompt is never relaxed to make the model "more helpful."
- "I don't know" is a correct and valuable output. It is better than a confident wrong answer.
- User link corrections are logged with full context (tenant, query, corrected edge). This is training data.

---

## 10. LLM Usage

- **Temperature:** `0` for WHY Engine and timeline reconstruction. `0.3` max for narrative generation (onboarding packs).
- **Structured output:** Gemini JSON mode for all WHY Engine responses. Never parse free-form LLM text for structured data.
- **Context window discipline:** Send only the top-K retrieved events to the LLM — not the full graph. The Query Engine selects; the LLM composes.
- **System prompt is the contract.** It enforces citation policy, confidence policy, and output schema. Changes to the system prompt require explicit review.
- **PII minimization.** Strip user emails and personal details from LLM context unless directly necessary for the answer.
- **Log every LLM call:** input tokens, output tokens, latency ms, confidence score, tenant_id. No PII in logs. This powers trust metrics.
- **Cost awareness:** Gemini Flash is chosen for cost. Before adding LLM calls to a hot path, estimate monthly cost at 100 active tenants.

---

## 11. API Design

- REST for all external-facing APIs (connectors, Agent API, webhooks)
- Internal module calls are direct TypeScript function calls — this is a monolith
- All routes versioned from day one: `/api/v1/...`

### Response envelope
```typescript
// Success
{ data: T, meta?: { confidence?: number, citations?: Citation[], cursor?: string } }

// Error — never expose internal details or stack traces
{ error: { code: string, message: string } }
```

### HTTP status codes
`200` success, `201` created, `400` bad request (validation), `401` unauthenticated, `403` forbidden (no permission), `404` not found, `422` unprocessable (business logic failure), `429` rate limited, `500` internal error. No `200` with `{ success: false }`.

### Pagination
Cursor-based only. Never offset pagination — it breaks on insertion.

---

## 12. Testing

### What to test
- **Unit tests:** Pure functions — scoring functions, extraction logic, graph algorithms, Zod schema parsing.
- **Integration tests:** DB queries and graph operations against a real local Supabase instance. No mocking the database.
- **E2E tests:** Critical paths — WHY Engine query flow, permission check enforcement, tenant isolation.

### What not to test
- Framework internals (Next.js routing, Fastify lifecycle)
- Simple getters/setters with no logic
- The LLM's output content — test the pipeline that wraps it

### Rules
- A test that mocks the DB is not testing the query. Use real DB.
- Every security-critical constraint (tenant isolation, permission-aware retrieval) has an explicit test that verifies the constraint is enforced — including tests that attempt to violate it and assert it is blocked.
- Tests colocated with source: `graph/timeline.ts` → `graph/timeline.test.ts`
- CI fails if coverage on `query-engine/` or `graph/` drops below 80%.
- Tests run in under 30 seconds locally. Slow tests get fixed, not skipped.

---

## 13. Comments

Write no comments by default. A well-named function and typed parameters explain what. Comments explain why — only when the why is non-obvious.

```typescript
// Write a comment only when:
// - There is a hidden constraint from an external system
// - There is a non-obvious invariant the reader would violate by changing the code
// - There is a workaround for a specific external API bug

// Good: explains a non-obvious external constraint
// Slack's Events API delivers duplicate events during reconnect windows.
// Deduplication on event_id prevents double-ingestion into the graph.
const existing = await db.events.findByExternalId(event.event_id)

// Bad: restates the code
// Find the event by its external ID
const existing = await db.events.findByExternalId(event.event_id)
```

Never write:
- Multi-paragraph docstrings on internal functions
- `// TODO` in merged code — open a Linear ticket
- Comments that reference the PR, task, or caller ("added for WHY Engine", "used by onboarding flow")

---

## 14. Git & Pull Requests

### Commit format (Conventional Commits — enforced)
```
feat(query-engine): add confidence gating to WHY Engine responses
fix(ingestion): handle Slack 429 rate limit with exponential backoff
chore(deps): upgrade pgvector to 0.7.0
test(graph): add tenant isolation enforcement tests
refactor(processing): extract decision detector into standalone module
```

Types: `feat`, `fix`, `chore`, `test`, `refactor`, `docs`, `perf`
Scope: the module name — `ingestion`, `processing`, `graph`, `embeddings`, `query-engine`, `agent-layer`, `api`, `frontend`

### Rules
- One logical change per commit. If you cannot describe it in one line, split it.
- No `feat` PR merged without tests for the new behavior.
- No force push to `main`.
- CI (type check + lint + tests) must pass before merge.
- All PRs require one review.
- PR descriptions state: what changed, why, and how to test it.

---

## 15. Observability

Every meaningful operation emits a structured log entry:
```typescript
logger.info('why_engine.query.complete', {
  tenant_id,
  query_hash,          // hash of the query, not the query itself (PII risk)
  source_event_count,
  confidence,
  latency_ms,
  cited_answer: boolean,
  cannot_answer: boolean,
})
```

**Never log:** user query text (PII risk), source event content, OAuth tokens, PII of any kind.

Alerts are set on:
- WHY Engine p99 latency > 5s
- `cannot_answer` rate > 30% (signals linking quality degradation)
- Ingestion pipeline lag > 10 minutes
- Any 500 error rate > 1%

---

## 16. What Not to Build

### Phase 1 scope (current — build only this)
- Slack connector (ingestion)
- GitHub connector (ingestion)
- WHY Engine (query-engine + Causal RAG)
- Post-mortem reconstruction workflow
- Onboarding context pack workflow
- Slack bot (primary user-facing surface)
- GitHub PR context panel

### Explicitly out of scope until Phase 2+
- Notion, Linear, meeting connectors
- Decision Log UI
- Agent Context API / MCP server
- Admin dashboard, analytics dashboards
- Self-serve billing
- Settings and configuration UI
- Any feature not directly tied to post-mortem reconstruction or engineer onboarding

**The test before building anything:** Does this make the WHY Engine more trustworthy, or does it help an engineer understand their codebase faster? If neither, do not build it.

---

## 17. How Claude Should Work Here

**Read before writing.** Read the relevant module's existing code before adding to it. Verify structure — do not assume it.

**Smallest possible change.** Fix the bug. Add the feature. Do not refactor surrounding code unless it directly blocks the task. Open a ticket for cleanup.

**No exploratory refactors.** Do not clean up unrelated code. Scope creep is the enemy of shipping.

**Complete one task fully before starting the next.** No partial implementations.

**Security checks are not optional.** Before completing any data retrieval task, verify: (1) `tenant_id` is scoped, (2) permission check is present, (3) no raw SQL strings, (4) input is Zod-validated.

**Trust guarantees are not optional.** Before completing any query-engine or LLM task, verify: (1) citations are attached to every claim, (2) confidence is computed and gated, (3) low-confidence path returns events without interpretation.

**Token efficiency.** Grep and glob to find relevant files before reading them. Read only what the task requires. Do not load the entire codebase to answer a focused question. State what you found and what you changed — not every step you took to get there.
