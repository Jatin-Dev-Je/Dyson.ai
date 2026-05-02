# CLAUDE.md - Dyson Engineering Guide

You are a product engineer on Dyson. Read this before touching code.

Dyson handles private company context. Optimize for trust, tenant isolation, and small complete changes.

---

## 1. Product

Dyson is context infrastructure for engineering teams: a system of record for why decisions were made across Slack, GitHub, docs, tickets, meetings, and AI-agent actions.

Mission: Others store what. Dyson explains why.

Current wedge:
- Engineering post-mortem reconstruction.
- New-engineer onboarding context.
- Slack and GitHub as the first real connectors.
- Agent context via API keys and MCP.

Core product guarantee:
- Every factual WHY answer is grounded in source events.
- Every answer has citations and a confidence score.
- If confidence is too low, Dyson returns source events and refuses to compose a narrative.

Trust is the product. A confident wrong answer is worse than no answer.

---

## 2. Current Repository Reality

This repo is a TypeScript modular monolith with a Vite React frontend.

```
backend/
  src/app.ts                         Fastify app setup and route registration
  src/server.ts                      HTTP server entry point
  src/config/                        env and constants
  src/infra/db/                      Drizzle client, schemas, migrations
  src/infra/queue/                   Cloud Tasks or inline dev jobs
  src/modules/auth/                  signup, login, refresh, logout
  src/modules/workspace/             workspace profile/settings
  src/modules/users/                 current user, team users, invitations
  src/modules/connectors/            Slack/GitHub OAuth and sync triggers
  src/modules/ingestion/             Slack/GitHub event normalization and storage
  src/modules/processing/            entity extraction, decision detection, embeddings, edges
  src/modules/graph/                 nodes, edges, timeline queries
  src/modules/decisions/             detected decision list/detail/timeline
  src/modules/why/                   WHY retrieval, ranking, Gemini composition
  src/modules/search/                context search
  src/modules/onboarding-packs/      generated onboarding packs
  src/modules/api-keys/              scoped API keys for agents
  src/modules/agent/                 REST agent API
  src/modules/agent-layer/mcp/       MCP server and transports
  src/api/routes/webhooks/           Slack and GitHub webhooks
  src/api/routes/jobs.routes.ts      job handlers

frontend/
  src/App.tsx                        React Router tree
  src/pages/Landing.tsx              marketing landing page
  src/pages/auth/                    login/signup UI
  src/pages/app/                     dashboard, WHY, decisions, search, packs
  src/pages/settings/                settings surfaces
  src/components/                    app shell, shared UI, layout
  src/lib/auth.ts                    current localStorage auth shim

landing/
  index.html                         standalone marketing experiment, currently untracked
```

Important mismatch to remember:
- The frontend is Vite + React + React Router, not Next.js.
- Many frontend pages are static or mocked. Backend APIs are more complete than the frontend integration.
- Do not read or print `backend/.env` unless the user explicitly asks and understands it may contain secrets.

---

## 3. Architecture

Pattern: modular monolith.

Do not extract services because a module "feels large." Extract only when there is a concrete operational reason:
- Ingestion exceeds 1M events per tenant per day.
- ML inference adds more than 200ms p99 to query latency.
- A connector needs an independent deploy cadence.

Data flow:

```
External tools -> Ingestion -> Processing -> Graph + Embeddings -> Retrieval -> WHY answer -> Humans and Agents
```

Pipeline requirements:
- Ingestion is idempotent on `(tenant_id, external_id, source)`.
- Processing can be replayed from raw events.
- Jobs run through Cloud Tasks in production and inline in dev.
- The graph is rebuildable from raw event history.

---

## 4. Tech Stack

Backend:
- Node.js, TypeScript, Fastify.
- Drizzle ORM over Postgres/Supabase.
- pgvector for embeddings.
- Google Cloud Run, Cloud Tasks, Cloud Storage.
- Gemini for WHY composition.
- Cohere embed-v3 style 1024-dimensional embeddings.
- Vitest for tests.

Frontend:
- Vite, React 18, React Router.
- TanStack Query available for API integration.
- Tailwind CSS.
- Framer Motion, Radix UI, lucide-react, sonner.

Agent layer:
- REST endpoints under `/api/v1/agent`.
- MCP Streamable HTTP under `/mcp`.
- Stdio bridge in `backend/src/modules/agent-layer/mcp/stdio.ts`.

---

## 5. Engineering Principles

Build the smallest complete version that moves the product forward.

Rules:
- Read relevant code before writing.
- Prefer existing patterns over new abstractions.
- Keep modules cohesive and edits scoped.
- Do not make drive-by refactors.
- Do not introduce TODO comments for merged behavior.
- If a feature is not complete, keep it clearly out of the user path.
- Fail loudly in dev. Degrade gracefully in prod.
- Prefer correctness and traceability over cleverness.

Before finishing backend work, verify:
- Input is validated at the boundary.
- Tenant-scoped data includes tenant filtering.
- Secrets and PII are not logged.
- Errors use the API envelope.
- Tests cover the behavior or the risk is explicitly called out.

---

## 6. TypeScript Standards

The repo uses strict TypeScript. Respect:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true
}
```

Rules:
- Avoid `any`. Use `unknown` and narrow.
- Avoid non-null assertions. Handle the missing case.
- Use Zod at external boundaries: requests, webhooks, LLM output, job payloads.
- Prefer named exports for modules.
- Default exports are acceptable where the current framework pattern uses them, such as React pages and Fastify route plugins.
- No nested ternaries for non-trivial logic.
- Keep functions short enough to understand. Extract when a function mixes responsibilities.
- Do not add barrel files unless the repo already depends on them for that area.

Naming:
- Types and interfaces: `PascalCase`.
- Functions: `camelCase`, verb-first.
- Constants: `SCREAMING_SNAKE_CASE` for domain constants.
- Domain enums: `PascalCase` enum name and member names, string values.

---

## 7. API Rules

External API style:

```ts
// Success
{ data: T, meta?: { confidence?: number, citations?: Citation[], cursor?: string } }

// Error
{ error: { code: string, message: string } }
```

HTTP status:
- `200` success.
- `201` created.
- `400` validation error.
- `401` unauthenticated.
- `403` forbidden.
- `404` not found.
- `409` conflict.
- `422` business rule failure.
- `429` rate limited.
- `500` internal error.

Do not return `200` with `{ success: false }`.

Pagination:
- Cursor-based only.
- Do not add offset pagination for tenant activity streams.

---

## 8. Database Rules

Every tenant-scoped table must include `tenant_id`.

Every tenant-scoped query must filter by tenant. Missing tenant scoping is a security bug.

Schema conventions:
- Table and column names are `snake_case`.
- Every foreign key should have a useful index.
- Ingestion dedupe must remain unique on tenant, external ID, and source.
- Migrations are forward-only and additive unless the user explicitly asks for destructive cleanup.

Query rules:
- Prefer Drizzle query builder.
- Raw SQL is allowed only when Drizzle cannot express the operation cleanly, such as pgvector operators or migration DDL.
- Raw SQL must still be parameterized and tenant-scoped.
- No N+1 queries in request paths.

pgvector:
- Cosine distance for semantic similarity.
- Embedding dimension is 1024.
- Vector search must join or filter through tenant-scoped nodes.

---

## 9. Security

Dyson ingests private company data. Treat every endpoint as security-sensitive.

Tenant isolation:
- `tenantId` comes from JWT or validated API key context.
- Never trust tenant IDs from request bodies.
- Graph traversal and vector search must be tenant-scoped before retrieval starts.

Auth:
- All API routes require auth except health checks, OAuth callbacks, and signed webhooks.
- Access tokens are short-lived JWTs.
- Refresh tokens are stored hashed.
- API keys are stored hashed and scoped.

Webhooks:
- Slack signatures must be verified before processing.
- GitHub signatures must be verified before processing.
- Acknowledge provider webhooks quickly, then process async.

Secrets:
- Do not log OAuth tokens, JWTs, API keys, passwords, raw user queries, source event content, or PII.
- Do not expose stack traces in API responses.
- Production must refuse default-looking secrets.

---

## 10. WHY Engine Contract

The WHY Engine is allowed to say "I do not know."

Required response shape:

```ts
type WhyEngineResult = {
  queryId: string
  question: string
  answer: string | null
  citations: Citation[]
  sourceNodes: SourceNodeSummary[]
  confidence: number
  cannotAnswer: boolean
  latencyMs: number
}
```

Rules:
- If `confidence < 0.72`, return `cannotAnswer: true`.
- Do not compose an explanation when confidence is below threshold.
- LLMs compose only over retrieved source nodes.
- Every factual claim needs a citation.
- If the LLM returns an answer without valid citations, refuse the answer.
- Store query history with confidence, source nodes, and feedback.

Before changing WHY code, check:
- Retrieval is tenant-scoped.
- Confidence is computed before composition.
- Low-confidence path does not call the LLM.
- Citations map back to real source nodes.
- Logs do not include raw question text.

---

## 11. Frontend Standards

The product UI should feel like an operational engineering tool: dense, clear, calm, and trustworthy.

Rules:
- Use the existing Vite/React/Tailwind stack.
- Prefer existing shared components before adding new ones.
- Use lucide-react icons for controls and status.
- Keep cards for actual repeated items, panels, and product surfaces.
- Avoid decorative clutter that makes the product harder to scan.
- Do not add marketing-only pages when the user asked for a usable product surface.
- Text must fit on mobile and desktop.
- Favor product screenshots/simulations that show real workflows over abstract illustrations.
- Landing page copy should sell the wedge: post-mortems, onboarding, Slack/GitHub, citations, confidence, agents.

Current auth note:
- `frontend/src/lib/auth.ts` is a localStorage shim.
- Do not treat frontend auth as production security until it is wired to backend JWT flows.

---

## 12. LLM Usage

WHY Engine:
- Temperature `0`.
- Structured JSON output.
- No free-form parsing for structured behavior.
- Send top retrieved nodes, not the whole graph.
- Prompt changes are product/security changes and require careful review.

Onboarding packs:
- Narrative generation may use slightly more flexible wording.
- Keep citations and source-node lineage when possible.

Logging:
- Log latency, confidence, source count, model, token counts when available.
- Do not log raw prompts, raw queries, source content, or PII.

---

## 13. Testing

Use tests where risk justifies them.

Unit tests:
- Pure functions.
- Zod schema parsing.
- Decision detection.
- API-key hashing and validation.
- Retrieval scoring and confidence logic.

Integration tests:
- DB queries that enforce tenant isolation.
- Graph traversal.
- Auth and role behavior.
- Webhook signature handling.

E2E tests:
- Signup/login flow.
- WHY query flow.
- Connector setup happy paths.
- Agent API key and MCP flows.

Rules:
- Security-critical tenant isolation needs explicit negative tests.
- Do not mock the DB when the query itself is the behavior under test.
- If tests cannot be run because dependencies or env are missing, say so.

---

## 14. Observability

Meaningful operations should emit structured logs:

```ts
logger.info({
  tenantId,
  sourceEventCount,
  confidence,
  latencyMs,
  cannotAnswer,
}, 'why query complete')
```

Never log:
- User query text.
- Source event content.
- OAuth tokens.
- API keys.
- Passwords.
- Emails unless explicitly needed and safe.

Important alerts:
- WHY p99 latency above 5s.
- `cannotAnswer` rate above 30%.
- Ingestion lag above 10 minutes.
- 500 rate above 1%.
- Webhook signature failures spike.

---

## 15. Current Phase Scope

Build now:
- Slack connector and backfill.
- GitHub connector and backfill.
- Raw event ingestion.
- Processing pipeline.
- Context graph.
- WHY Engine.
- Slack bot answers.
- GitHub PR context comments.
- Onboarding packs.
- Agent API and MCP where it supports context-aware coding agents.

Be careful with:
- Full billing.
- Broad admin analytics.
- Notion, Linear, and meetings as production connectors.
- Enterprise controls beyond the current auth/audit/API-key needs.
- Large frontend rewrites that do not connect to the core workflow.

The test before building:

Does this make the WHY Engine more trustworthy, or help an engineer understand the codebase faster?

---

## 16. Git

Commit format:

```text
feat(why): add confidence gating to cited answers
fix(ingestion): dedupe Slack reconnect events
test(agent): cover write-scope enforcement
docs(guide): update repo architecture notes
refactor(frontend): extract source badge component
```

Rules:
- One logical change per commit.
- Do not force push to `main`.
- Do not reset or revert user changes unless explicitly asked.
- If the worktree is dirty, preserve unrelated changes.
- PR descriptions should state what changed, why, and how it was tested.

---

## 17. How To Work In This Repo

Before editing:
- Use `rg` or `rg --files` to find the relevant code.
- Read the module's route, service, repository, schema, and tests as needed.
- Check whether the frontend path is static/mock or wired to backend APIs.

While editing:
- Keep changes scoped.
- Use `apply_patch` for manual edits.
- Preserve existing user changes.
- Do not print secrets.
- Avoid new dependencies unless the repo clearly needs them.

Before final response:
- Run the most relevant typecheck, lint, or tests.
- If verification cannot run, explain why.
- Summarize changed files and concrete behavior.
