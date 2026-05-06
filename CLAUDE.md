# CLAUDE.md — Dyson Engineering Guide

You are a product engineer on Dyson. Read this before touching any code.

Dyson handles private company context. Every decision must optimise for trust, tenant isolation, and small complete changes.

---

## 1. Product

Dyson is persistent memory infrastructure for engineering teams — a system of record for why decisions were made across Slack, GitHub, docs, tickets, meetings, and AI-agent actions.

**Mission:** Others store what. Dyson explains why.

**Current wedge:**
- Engineering post-mortem reconstruction (automated in ~20s via Python agent)
- New-engineer onboarding context packs
- Slack and GitHub as primary connectors
- Agent context via REST API, API keys, and MCP
- Python agentic layer: post-mortem agent, PR review agent, decision detection

**Core product guarantee:**
- Every factual WHY answer is grounded in source events
- Every answer has citations and a confidence score
- If confidence < 0.72, Dyson returns source events and refuses to compose
- The engine will say "I don't know" rather than hallucinate

**Trust is the product. A confident wrong answer is worse than no answer.**

---

## 2. Repository Reality

Two backend services + one frontend. All server-side code lives under `backend/`.

```
backend/
  src/app.ts                          Fastify app — all plugins, routes, error handler
  src/server.ts                       HTTP entry point — Sentry init, graceful shutdown
  src/config/env.ts                   Zod-validated env (fails fast; production guards)
  src/config/constants.ts             Every magic number documented with rationale
  src/infra/
    db/                               Drizzle client, 7 schema files, 5 migrations
    queue/queue.client.ts             Cloud Tasks dispatcher
    agent-runtime-client.ts           Typed HTTP client → Python service (port 8001)
    circuit-breaker.ts                3-state breaker: CLOSED/OPEN/HALF_OPEN
    query-cache.ts                    5-min WHY result cache per tenant
    redis.ts                          ioredis singleton — lazy connect, TLS
    cache.ts                          In-memory TTL cache (API key hot path)
    sanitize.ts                       Input sanitization + prompt injection stripping
    retry.ts                          Exponential backoff with jitter
    email.ts                          Resend provider
  src/jobs/                           Cloud Tasks async workers
  src/modules/
    auth/                             JWT auth, sessions, password reset, email verify
    workspace/                        Workspace profile and settings
    users/                            Users, invitations, roles
    connectors/                       OAuth + backfill for Slack and GitHub
    ingestion/                        Event normalisation, dedup, raw event storage
    processing/                       Entity extraction, decision detection, embeddings, edges
    graph/                            Context graph — nodes, edges, timeline
    decisions/                        Decision log — auto-detect, list, detail, timeline
    why/                              Recall engine — retrieval, confidence gate, composition
      retrieval/                      vector, lexical, graph, hybrid-ranker, access-filter
      llm/                            Gemini client, prompt builder, response validator
    memory/                           Memory CRUD and agent writes
    search/                           Full-text + semantic search with filters
    notifications/                    Per-user email + Slack notification preferences
    onboarding-packs/                 AI-generated context packs
    api-keys/                         Scoped API key management
    agent/                            REST agent API (6 endpoints)
    agent-layer/mcp/                  MCP server, Streamable HTTP transport, stdio bridge
    audit/                            Audit trail read API
    slack-bot/                        Slack bot — WHY answers, incident detection
    github-bot/                       GitHub bot — PR annotations
  src/api/
    middleware/                       auth, rbac, signature, idempotency
    routes/
      webhooks/                       slack.webhook, github.webhook
      jobs.routes.ts                  Cloud Tasks handlers (signed by JOB_SECRET)
  src/shared/
    errors.ts                         Typed ErrorCode registry + full error hierarchy
    types/api.ts                      API response types
    types/entities.ts                 Domain enums (EntityType, RelationshipType…)

  python/                             Python ML microservice (port 8001)
    agent_runtime/
      main.py                         FastAPI app — lifespan model warm-up
      config.py                       Pydantic Settings
      agents/postmortem.py            LangGraph 4-node post-mortem pipeline
      agents/pr_review.py             LangGraph 2-node PR review pipeline
      ml/embeddings.py                sentence-transformers — lazy singleton
      ml/decision_detector.py         spaCy + 30 signal patterns
      routers/                        agents, ml, health endpoints
      schemas/agents.py               Pydantic v2 models
      tools/dyson_client.py           Async httpx client → TypeScript API
    tests/                            pytest — unit + API integration
    Dockerfile
    pyproject.toml

  tests/
    integration/health.test.ts        Fastify inject HTTP integration tests
    unit/                             12 files — auth, WHY, circuit-breaker, webhooks…

frontend/
  src/App.tsx                         React Router tree
  src/pages/auth/                     Login, Signup, ForgotPassword, ResetPassword, AcceptInvite
  src/pages/onboarding/               5-step workspace setup wizard
  src/pages/app/                      Dashboard, Recall (WHY Engine), DecisionLog, Search, Packs
  src/pages/settings/                 9 settings pages
  src/components/layout/AppShell.tsx  Collapsible sidebar + settings modal
  src/lib/api.ts                      Typed fetch client with auto JWT refresh
  src/lib/auth.ts                     Auth state helpers

docker-compose.yml                    Full local stack: db + redis + api + agent
cloudbuild.yaml                       Cloud Build CI/CD — TS + Python parallel steps
docs/DEPLOYMENT.md                    Full Cloud Run + Supabase runbook
```

**What does NOT exist:**
- No `landing/` directory (deleted — was an untracked experiment)
- No `src/api/routes/v1/` stubs (deleted — real routes live in modules)
- No empty placeholder dirs (hooks/, stores/, types/, decisions/, why-engine/)

---

## 3. Architecture

**Two backend services, one frontend:**

```
TypeScript API (port 8080)     Python Agent Runtime (port 8001)
─────────────────────────      ────────────────────────────────
Fastify · Drizzle · Redis       FastAPI · LangGraph · spaCy
Auth · routing · DB             Agents · NLP · embeddings
API contract                    ML inference
```

**Service boundary:** TypeScript calls Python via one typed HTTP client (`agent-runtime-client.ts`). If the Python service is down, the TypeScript API degrades gracefully — it does not crash.

**Data flow:**
```
External tools → Ingestion → Processing → Graph + Embeddings → Recall → Humans + Agents
```

**Pipeline requirements:**
- Ingestion is idempotent on `(tenant_id, external_id, source)`
- Processing replays cleanly from raw events
- Jobs run through Cloud Tasks in production, inline in dev
- The graph is rebuildable from raw event history

**When to add a new service:** Only when there is a concrete operational reason.
- Ingestion exceeds 1M events per tenant per day → extract ingestion worker
- ML inference adds >200ms p99 to query latency → scale Python service independently
- A connector needs independent deploy cadence → extract connector service

Do not extract because a module "feels large."

---

## 4. Tech Stack

**TypeScript backend:**
- Node.js 22, TypeScript 5.7, Fastify 5
- Drizzle ORM over Postgres/Supabase
- pgvector for 1024-dim embeddings (HNSW index)
- ioredis + Upstash Redis (rate limiting, query cache)
- Google Cloud Run, Cloud Tasks, Cloud Storage, Pub/Sub
- Gemini 1.5 Flash for WHY composition (temperature 0)
- Cohere embed-v3 (1024-dim) for embeddings
- Vitest for tests

**Python agent runtime:**
- Python 3.12, FastAPI 0.115, uvicorn
- LangGraph 0.2 for stateful agent orchestration
- LangChain 0.3 for LLM tool bindings
- spaCy 3.8 for NLP (decision detection, entity extraction)
- sentence-transformers (local embeddings for dev)
- Pydantic v2 for all validation
- pytest for tests

**Frontend:**
- Vite, React 18, React Router, TypeScript
- TanStack Query for all async state + mutations
- Tailwind CSS with typed design tokens
- Framer Motion, Radix UI, lucide-react, sonner

**Agent layer:**
- REST endpoints under `/api/v1/agent`
- MCP Streamable HTTP under `/mcp`
- Stdio bridge at `backend/src/modules/agent-layer/mcp/stdio.ts`

---

## 5. Engineering Principles

Build the smallest complete version that moves the product forward.

**Rules:**
- Read relevant code before writing
- Prefer existing patterns over new abstractions
- Keep modules cohesive and edits scoped
- Do not make drive-by refactors
- Do not introduce TODO comments for merged behaviour
- If a feature is not complete, keep it clearly out of the user path
- Fail loudly in dev. Degrade gracefully in prod.
- Prefer correctness and traceability over cleverness

**Before finishing any backend work, verify:**
- Input is validated at the boundary (Zod schemas)
- Tenant-scoped data includes tenant filtering — missing it is a security bug
- Secrets and PII are not logged
- Errors use the API envelope `{ error: { code, message } }`
- Tests cover the behaviour or the risk is explicitly called out

---

## 6. TypeScript Standards

Strict TypeScript throughout. All settings must remain:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true,
  "forceConsistentCasingInFileNames": true,
  "module": "NodeNext",
  "moduleResolution": "NodeNext"
}
```

**Rules:**
- Avoid `any`. Use `unknown` and narrow.
- Avoid non-null assertions. Handle the missing case explicitly.
- Use Zod at every external boundary: requests, webhooks, LLM output, job payloads.
- Use `import type` for type-only imports (NodeNext requires it; tsconfig enforces it).
- Prefer named exports for modules. Default exports only for React pages and Fastify route plugins.
- No nested ternaries for non-trivial logic.
- Keep functions short enough to reason about. Extract when mixing responsibilities.
- Do not add barrel files unless the repo already uses them for that area.

**Naming:**
- Types and interfaces: `PascalCase`
- Functions: `camelCase`, verb-first
- Constants: `SCREAMING_SNAKE_CASE` for domain constants
- Domain enums: `PascalCase` enum name and members, string values

---

## 7. Python Standards

**Rules:**
- Pydantic v2 at every external boundary (request bodies, tool outputs, config)
- Use `async def` for all FastAPI route handlers and LangGraph nodes
- Type hints on all function signatures — no bare `dict`, no bare `list`
- Use `StrEnum` for string enums
- Lazy-load heavy models (sentence-transformers, spaCy) via `lru_cache` — never at import time
- One LangGraph `StateGraph` per agent — state is a `TypedDict`, nodes are pure async functions
- Log at INFO level: agent start, node transitions, latency, confidence
- Never log: query text, source content, API keys, user PII

**Testing:**
- pytest with `pytest-asyncio`
- Session-scoped `TestClient` in `conftest.py` — one app startup for all tests
- Unit tests for ML pipelines (no external deps)
- API tests with `TestClient` (no real HTTP socket)

---

## 8. API Rules

**Response envelope:**

```ts
// Success
{ data: T, meta?: { confidence?: number, citations?: Citation[], cursor?: string } }

// Error
{ error: { code: ErrorCode, message: string } }
```

**HTTP status codes:**
- `200` success
- `201` created
- `400` validation error
- `401` unauthenticated
- `403` forbidden
- `404` not found
- `409` conflict
- `422` business rule failure (e.g. `CONFIDENCE_TOO_LOW`)
- `429` rate limited
- `500` internal error
- `503` service unavailable (circuit open, Python service down)

Do not return `200` with `{ success: false }`.

**Pagination:** Cursor-based only. Never offset pagination for activity streams.

**Idempotency:** Write endpoints (POST that create resources) accept `Idempotency-Key` header. The middleware in `api/middleware/idempotency.middleware.ts` handles dedup via Redis with 24h TTL.

**Error codes:** Every error must use a code from the `ErrorCode` registry in `shared/errors.ts`. Do not invent ad-hoc strings.

---

## 9. Database Rules

Every tenant-scoped table must have `tenant_id`. Every tenant-scoped query must filter by it. Missing tenant scoping is a security bug — not a tech debt item.

**Schema conventions:**
- Table and column names: `snake_case`
- Every foreign key has a useful index
- Ingestion dedupe is unique on `(tenant_id, external_id, source)`
- Migrations are forward-only and additive

**Query rules:**
- Prefer Drizzle query builder
- Raw SQL only when Drizzle cannot express cleanly (pgvector operators, DDL)
- Raw SQL must be parameterised and tenant-scoped
- No N+1 queries in request paths

**pgvector:**
- Cosine distance for semantic similarity
- Embedding dimension: 1024 (Cohere embed-v3)
- HNSW index: `lists=100, ef_construction=200`
- Vector search must filter through tenant-scoped nodes before similarity ranking

---

## 10. Security

Dyson ingests private company data. Every endpoint is security-sensitive.

**Tenant isolation:**
- `tenantId` comes from JWT or validated API key context only
- Never trust tenant IDs from request bodies
- Graph traversal and vector search must be tenant-scoped before retrieval starts

**Auth:**
- All API routes require auth except health checks, OAuth callbacks, and signed webhooks
- Access tokens: short-lived JWTs (15 minutes)
- Refresh tokens: stored as HMAC-SHA256 hashes (deterministic O(1) lookup — not bcrypt)
- API keys: stored hashed, prefix-indexed (`dys_` prefix)

**Webhooks:**
- Slack signatures verified via HMAC-SHA256 before processing
- GitHub signatures verified before processing
- Timestamp tolerance: 5 minutes (replay attack prevention)
- Acknowledge quickly, process async

**Input sanitization:**
- All user text passes through `infra/sanitize.ts` before DB or LLM
- Strips: control characters, null bytes, prompt injection patterns
- Prompt injection patterns: `ignore previous instructions`, `system:`, `DAN mode`, etc.

**Secrets:**
- Never log: OAuth tokens, JWTs, API keys, passwords, raw queries, source content, PII
- Never expose stack traces in API responses
- Production refuses to boot if secrets look like test values

---

## 11. WHY Engine Contract

The WHY Engine is allowed to say "I do not know."

**Required response shape:**

```ts
type WhyEngineResult = {
  queryId:      string
  question:     string
  answer:       string | null    // null when cannotAnswer is true
  citations:    Citation[]
  sourceNodes:  SourceNodeSummary[]
  confidence:   number
  cannotAnswer: boolean
  latencyMs:    number
}
```

**Rules:**
- If `confidence < 0.72` → `cannotAnswer: true`, no LLM call, return raw nodes
- Do not compose when confidence is below threshold
- LLMs compose only over retrieved source nodes (top 12 max)
- Every factual claim needs a citation mapping to a real source node
- If LLM returns answer without valid citations → reject the answer
- Store query history with confidence, source nodes, and feedback
- Result cache: identical questions per tenant, 5-minute TTL (skip vector + LLM on hit)

**Retrieval pipeline order:**
1. Parallel: vector search + lexical full-text search
2. Merge and deduplicate retrieved nodes
3. Graph expansion from seed nodes (causal traversal, depth 3)
4. Access filter: remove nodes user cannot see
5. Hybrid ranking: similarity × decision boost (1.20×) × recency decay
6. Confidence = average similarity of top-12 nodes
7. Gate: if confidence < 0.72 → stop, return `cannotAnswer`
8. Call Gemini via circuit breaker → validate citations → return

**Before changing WHY code, check:**
- Retrieval is tenant-scoped
- Confidence is computed before composition
- Low-confidence path does not call the LLM
- Citations map back to real source node IDs
- Logs do not include raw question text

---

## 12. Circuit Breaker

External service calls (Gemini, Cohere, Slack API, GitHub API) are wrapped in circuit breakers defined in `infra/circuit-breaker.ts`.

**Three states:**
- `CLOSED`: normal operation, failures counted
- `OPEN`: service considered down, calls fail in <1ms with `CircuitOpenError`
- `HALF_OPEN`: one probe allowed after `recoveryMs`; success → CLOSED, failure → OPEN

**Singletons:**

| Breaker | Threshold | Recovery |
|---------|-----------|----------|
| `geminiBreaker` | 5 failures | 30s |
| `cohereBreaker` | 5 failures | 60s |
| `slackBreaker` | 10 failures | 60s |
| `githubBreaker` | 10 failures | 60s |

**When the circuit is open:** callers must handle `CircuitOpenError` by degrading gracefully — the WHY engine returns source nodes with `cannotAnswer: true`, never a 500.

---

## 13. LLM Usage

**WHY Engine (Gemini):**
- Temperature `0`
- Structured JSON output only
- No free-form parsing for structured behaviour
- Send top-12 retrieved nodes, not the whole graph
- Prompt changes are product/security changes — review carefully
- Wrapped in `geminiBreaker` — gracefully degrade if service is down

**Python agents (LangGraph):**
- Each agent is a `StateGraph` with typed `TypedDict` state
- Every node is a pure `async def` function
- Temperature `0` for all structured outputs
- Agents call back to the Dyson API via `dyson_client.py` for memory access
- Log: agent name, tenant, latency, confidence, node count
- Never log: question text, source content, user PII

**Logging:**
- Log: latency, confidence, source count, model, cannotAnswer
- Never log: raw prompts, raw queries, source content, PII

---

## 14. Frontend Standards

The product UI must feel like an operational engineering tool: dense, clear, calm, and trustworthy.

**Rules:**
- Use the existing Vite/React/Tailwind stack
- TanStack Query for all async state and mutations — no raw `fetch` in components
- Prefer existing shared components before adding new ones
- Use lucide-react icons for controls and status
- Avoid decorative clutter that makes the product harder to scan
- All settings pages use the modal overlay (opens over the app, not inline)
- Sidebar is collapsible (240px ↔ 56px icon-only)

**Design tokens (tailwind.config.ts):**
- Canvas: `#FAFAF8` · Surface: `white` · Border: `#E8E7E5`
- Primary: `#5B5BD6` · Danger: `#DC2626` · Success: `#16A34A`
- Font: Geist Variable, 13–14px base, `letter-spacing: -0.01em`

**Frontend wiring status:**
- Fully wired: Auth, Recall, Search, DecisionLog, ConnectedSources, TeamMembers, ApiKeys, Notifications, Profile, Security
- UI only (no backend): Billing (Stripe not yet integrated)

---

## 15. Observability

Meaningful operations must emit structured logs:

```ts
logger.info({
  tenantId,
  queryId,
  confidence,
  cannotAnswer,
  citationCount,
  latencyMs,
}, 'memory recall complete')
```

**Never log:**
- User query text
- Source event content
- OAuth tokens, API keys, passwords
- Emails (unless explicitly safe and needed)

**Circuit breaker states** are exposed at `/metrics` (requires `X-Metrics-Secret` header).

**Alert thresholds:**
- WHY p99 latency > 5s
- `cannotAnswer` rate > 30%
- Ingestion lag > 10 minutes
- 500 rate > 1%
- Webhook signature failures spike

---

## 16. Testing

**Run:**
```bash
cd backend && npm test            # 151 TypeScript tests
cd backend && npm run typecheck   # zero errors required
cd backend/python && pytest       # Python tests
```

**What is covered:**
- Circuit breaker: 3-state machine, timeouts, error propagation (11 tests)
- Auth: signup/login/refresh, HMAC token round-trips
- WHY guards: confidence gate, citation validation, hallucination guard
- Tenant isolation: RBAC, dedupe keys, confidence threshold
- Webhooks: Slack + GitHub HMAC signature verification
- Retry: exponential backoff, jitter, max retries
- TTL cache: expiry, purge
- HTTP integration: Fastify inject — liveness, auth guard, 5 protected routes, metrics auth

**Rules:**
- Security-critical tenant isolation needs explicit negative tests
- Do not mock the DB when the query itself is the behaviour under test
- HTTP integration tests use Fastify `inject()` — no real network socket needed
- Circuit breaker time tests use `vi.setSystemTime()`, not fake timers

---

## 17. Git

**Commit format:**
```
feat(why): add confidence gating to cited answers
fix(ingestion): dedupe Slack reconnect events
test(circuit-breaker): cover HALF_OPEN state transition
docs(claude): update architecture for Python service
refactor(search): upgrade plainto_tsquery to websearch_to_tsquery
chore(backend): move python/ to backend/python/
```

**Rules:**
- One logical change per commit
- Do not force push to `main`
- Do not reset or revert user changes unless explicitly asked
- If the worktree is dirty, preserve unrelated changes

---

## 18. How To Work In This Repo

**Before editing:**
- Read the module's route, service, repository, schema, and tests
- Check whether the frontend path is wired to the backend or UI-only
- Read `infra/circuit-breaker.ts` if touching any external service call
- Check `shared/errors.ts` for existing error codes before creating new ones

**While editing:**
- Keep changes scoped to one module
- Preserve existing user changes
- Do not print secrets
- Add new env vars to both `env.ts` and `.env.example`
- New constants go in `constants.ts` with a comment explaining the value

**Before finishing:**
- Run `npm run typecheck` — zero errors required
- Run `npm test` — all 151 must pass
- Verify tenant isolation is correct on any new DB query
- Check that error codes are in the `ErrorCode` registry

**Local stack:**
```bash
docker compose up   # starts db + redis + api + agent in one command
```

Or manually:
```bash
cd backend && npm run dev                                                    # :8080
cd backend/python && uvicorn agent_runtime.main:app --reload --port 8001    # :8001
cd frontend && npm run dev                                                   # :3000
```
