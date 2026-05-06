# Dyson

> **Persistent memory infrastructure for engineering teams.**

Dyson ingests your Slack messages, GitHub pull requests, incidents, and decisions — builds a causal knowledge graph from all of it — and lets your team and your AI agents ask *why* in plain English and get back a grounded, cited answer.

> ⚠️ **Status: Active development.** Core infrastructure is production-ready. Frontend wiring is in progress.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Postgres](https://img.shields.io/badge/Postgres-pgvector-4169E1?logo=postgresql&logoColor=white)](https://supabase.com/)

---

## Table of Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Backend Modules](#backend-modules)
- [API Reference](#api-reference)
- [MCP Server](#mcp-server)
- [Python Agent Runtime](#python-agent-runtime)
- [Frontend](#frontend)
- [Testing](#testing)
- [Deployment](#deployment)
- [Engineering Decisions](#engineering-decisions)

---

## What it does

**The problem:** Institutional knowledge gets lost. Why was this architecture decision made? What broke in that incident? What constraints exist on this service? Today that knowledge is scattered across Slack threads, GitHub PRs, and Notion docs — and when engineers leave, it leaves with them.

**The solution:** Dyson connects all of it into a queryable knowledge graph. Every decision, incident, PR discussion, and architectural choice becomes a node. Edges represent causal relationships. When you ask *why*, the engine retrieves the most relevant nodes, scores confidence, and — only if confidence is high enough — composes a cited answer using an LLM.

**The trust model:** The engine will say "I don't know" rather than hallucinate. Below 0.72 confidence, it returns raw source nodes and refuses to compose. Every factual claim in an answer maps back to a real source event with a URL.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         External Sources                              │
│          Slack ──── GitHub ──── Notion ──── Linear ──── Meetings     │
└───────────────────────────┬──────────────────────────────────────────┘
                            │  webhooks + OAuth backfill
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Ingestion Layer                                 │
│  Normalise → dedupe (tenant_id, external_id, source) → enqueue job  │
└───────────────────────────┬──────────────────────────────────────────┘
                            │  Cloud Tasks (async)
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Processing Pipeline                               │
│  Entity extraction → Decision detection → Cohere embeddings          │
│  → context_nodes + causal_edges + node_embeddings (pgvector HNSW)   │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
            ┌───────────────┴──────────────┐
            ▼                              ▼
  ┌──────────────────┐          ┌─────────────────────┐
  │  Context Graph    │          │  Vector Index (HNSW) │
  │  (nodes + edges)  │          │  1024-dim cosine ANN │
  └────────┬─────────┘          └──────────┬──────────┘
           └──────────────┬─────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Recall / WHY Engine                               │
│                                                                       │
│  1. Parallel retrieval: vector search + lexical FTS                  │
│  2. Graph expansion from seed nodes (causal traversal)               │
│  3. Access filter: scoped by workspace + permission                  │
│  4. Hybrid ranking: similarity × decision boost × recency decay      │
│  5. Confidence gate: avg similarity of top-12 nodes                  │
│                                                                       │
│  confidence ≥ 0.72  →  Gemini Flash composes cited answer            │
│  confidence < 0.72  →  return raw nodes, refuse to compose           │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
  REST API           MCP Server         Slack / GitHub bots
  /api/v1/recall     /mcp               answer in-thread

┌──────────────────────────────────────────────────────────────────────┐
│                   Python Agent Runtime (port 8001)                    │
│                                                                       │
│  LangGraph agents: Post-mortem · PR Review · Onboarding              │
│  NLP: spaCy decision detection · entity extraction                   │
│  Embeddings: sentence-transformers (local, free)                     │
│                                                                       │
│  Called by TypeScript API via typed HTTP client                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Service boundary:** TypeScript owns API routing, auth, database, and the API contract. Python owns all ML workloads — agents, NLP, embeddings. One typed HTTP client bridges them. If the Python service is unavailable, the TypeScript API degrades gracefully without crashing.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API server** | Node.js 22, TypeScript 5.7, Fastify 5 |
| **Agent runtime** | Python 3.12, FastAPI 0.115, uvicorn |
| **Agent orchestration** | LangGraph 0.2, LangChain 0.3 |
| **NLP** | spaCy 3.8 (decision detection, entity extraction) |
| **Embeddings** | Cohere embed-v3 (1024-dim, production) · sentence-transformers (local dev) |
| **LLM** | Google Gemini 1.5 Flash — temperature 0, structured JSON output |
| **Database** | PostgreSQL via Supabase, Drizzle ORM |
| **Vector search** | pgvector — 1024-dim HNSW index, cosine distance |
| **Cache** | Redis (rate limiting + query result cache) via Upstash |
| **Job queue** | Google Cloud Tasks |
| **Event bus** | Google Cloud Pub/Sub |
| **Auth** | JWT HS256 (15m access / 30d refresh) + HMAC-SHA256 token lookup |
| **Validation** | Zod (TypeScript) · Pydantic v2 (Python) — at every external boundary |
| **Logging** | Pino (structured JSON) + UUID request correlation ID + Sentry |
| **MCP** | `@modelcontextprotocol/sdk` — Streamable HTTP + stdio bridge |
| **Email** | Resend |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query |
| **CI/CD** | Google Cloud Build — typecheck → lint → test → Docker → Cloud Run |

---

## Project Structure

```
dyson/
├── backend/
│   ├── src/
│   │   ├── app.ts                  Fastify setup — all routes, plugins, error handler
│   │   ├── server.ts               Entry point — Sentry init, graceful SIGTERM shutdown
│   │   ├── config/
│   │   │   ├── env.ts              Zod-validated env (fails fast; production guards)
│   │   │   └── constants.ts        Every magic number documented with rationale
│   │   ├── infra/
│   │   │   ├── db/                 Drizzle client, 7 schema files, 5 migrations
│   │   │   ├── queue/              Cloud Tasks dispatcher
│   │   │   ├── agent-runtime-client.ts  Typed HTTP client → Python service
│   │   │   ├── circuit-breaker.ts  3-state breaker for Gemini, Cohere, Slack, GitHub
│   │   │   ├── query-cache.ts      5-min WHY result cache per tenant
│   │   │   ├── redis.ts            ioredis singleton — lazy connect, TLS, graceful degrade
│   │   │   ├── cache.ts            In-memory TTL cache (API key hot path)
│   │   │   ├── sanitize.ts         Input sanitization + prompt injection stripping
│   │   │   ├── retry.ts            Exponential backoff with jitter
│   │   │   └── email.ts            Resend provider
│   │   ├── jobs/                   Cloud Tasks async workers
│   │   │   ├── process-event.job.ts
│   │   │   ├── generate-embeddings.job.ts
│   │   │   ├── build-edges.job.ts
│   │   │   └── backfill-source.job.ts
│   │   ├── modules/                20 feature modules (routes + service + repository)
│   │   │   ├── auth/               JWT auth, sessions, password reset, email verify
│   │   │   ├── workspace/          Workspace profile and settings
│   │   │   ├── users/              Users, invitations, roles
│   │   │   ├── connectors/         OAuth + backfill for Slack and GitHub
│   │   │   ├── ingestion/          Event normalisation, dedup, raw storage
│   │   │   ├── processing/         Entity extraction, decision detection, embeddings
│   │   │   ├── graph/              Context graph — nodes, edges, timeline
│   │   │   ├── decisions/          Decision log — auto-detect, list, detail
│   │   │   ├── why/                Recall engine — retrieval, ranking, LLM composition
│   │   │   │   ├── retrieval/      vector, lexical, graph, hybrid-ranker, access-filter
│   │   │   │   └── llm/            Gemini client, prompt builder, response validator
│   │   │   ├── memory/             Memory CRUD + agent writes
│   │   │   ├── search/             Full-text + semantic search with filters
│   │   │   ├── notifications/      Per-user notification preferences
│   │   │   ├── onboarding-packs/   AI-generated context packs for new engineers
│   │   │   ├── api-keys/           Scoped API key management
│   │   │   ├── agent/              REST agent API (6 endpoints)
│   │   │   ├── agent-layer/mcp/    MCP server, Streamable HTTP, stdio bridge
│   │   │   ├── audit/              Audit trail read API
│   │   │   ├── slack-bot/          Slack bot — WHY answers, incident detection
│   │   │   └── github-bot/         GitHub bot — PR decision annotations
│   │   ├── api/
│   │   │   ├── middleware/         auth, rbac, signature, idempotency
│   │   │   └── routes/
│   │   │       ├── webhooks/       slack.webhook, github.webhook
│   │   │       └── jobs.routes.ts  Cloud Tasks handlers
│   │   └── shared/
│   │       ├── errors.ts           Typed ErrorCode registry + error hierarchy
│   │       └── types/              api.ts, entities.ts
│   ├── python/                     Python ML microservice (port 8001)
│   │   ├── agent_runtime/
│   │   │   ├── main.py             FastAPI app — lifespan model warm-up
│   │   │   ├── config.py           Pydantic Settings
│   │   │   ├── agents/             LangGraph state machines
│   │   │   │   ├── postmortem.py   Incident → post-mortem in ~20s
│   │   │   │   └── pr_review.py    PR → memory-grounded review comments
│   │   │   ├── ml/
│   │   │   │   ├── embeddings.py   sentence-transformers, L2-norm, top-k
│   │   │   │   └── decision_detector.py  spaCy + 30 signal patterns
│   │   │   ├── routers/            agents, ml, health endpoints
│   │   │   ├── schemas/            Pydantic v2 request/response models
│   │   │   └── tools/              dyson_client.py — async httpx client
│   │   ├── tests/                  pytest — 3 files, unit + API integration
│   │   ├── Dockerfile              Multi-stage, non-root, HEALTHCHECK
│   │   └── pyproject.toml
│   ├── tests/
│   │   ├── integration/            Fastify inject HTTP tests
│   │   └── unit/                   12 files — auth, WHY guards, circuit breaker…
│   ├── Dockerfile                  Multi-stage, non-root, HEALTHCHECK
│   ├── .env.example                All 30+ variables documented
│   ├── vitest.config.ts
│   └── tsconfig.json               NodeNext, strict, no unused options
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 React Router tree
│   │   ├── pages/
│   │   │   ├── auth/               Login, Signup, ForgotPassword, ResetPassword, AcceptInvite
│   │   │   ├── onboarding/         5-step workspace setup wizard
│   │   │   ├── app/                Dashboard, Recall, DecisionLog, Search, Packs
│   │   │   └── settings/           9 pages — Profile, Workspace, Sources, Members,
│   │   │                           Billing, Notifications, ApiKeys, AuditLog, Security
│   │   ├── components/
│   │   │   ├── layout/             AppShell (collapsible sidebar), ProtectedRoute
│   │   │   └── shared/             SourcePill, ConfidenceBadge, DysonMark
│   │   └── lib/
│   │       ├── api.ts              Typed fetch client — auto JWT refresh on 401
│   │       └── auth.ts             Auth state helpers
│   └── tailwind.config.ts          Design tokens: canvas, ink-1…4, primary, line
│
├── docs/
│   └── DEPLOYMENT.md               Full Cloud Run + Supabase runbook
├── docker-compose.yml              Full local stack — one command
├── cloudbuild.yaml                 Cloud Build CI/CD pipeline
└── CLAUDE.md                       Engineering guide for contributors
```

---

## Quick Start

### 1. Prerequisites

- Node.js 22+
- Python 3.12+
- A [Supabase](https://supabase.com) project (free tier works)
- `pgvector` enabled in the database

Enable pgvector in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Clone and install

```bash
git clone https://github.com/Jatin-Dev-Je/Dyson.ai.git
cd Dyson.ai

# TypeScript backend
cd backend && npm install

# Python agent runtime
cd python && pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Frontend
cd ../../frontend && npm install
```

### 3. Configure

```bash
cd backend
cp .env.example .env
```

Minimum for local dev:
```env
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
DATABASE_URL_POOLED=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
JWT_SECRET=[32+ random chars — openssl rand -base64 32]
```

For the WHY Engine (free tiers available):
```env
GEMINI_API_KEY=[from aistudio.google.com/app/apikey]
COHERE_API_KEY=[from dashboard.cohere.com]
```

### 4. Run migrations

```bash
cd backend && npm run db:migrate
```

### 5. Start all services

```bash
# Option A — Docker Compose (recommended, runs everything)
docker compose up

# Option B — manually
cd backend && npm run dev          # :8080
cd backend/python && uvicorn agent_runtime.main:app --reload --port 8001  # :8001
cd frontend && npm run dev         # :3000
```

---

## Environment Variables

### Required — app refuses to start without these

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres direct connection (port 5432) |
| `DATABASE_URL_POOLED` | Pooled connection via Supabase (port 6543) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | ≥32 chars dev · ≥48 chars prod — `openssl rand -base64 64` |

### Required in production

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini — WHY Engine composition |
| `COHERE_API_KEY` | Cohere embed-v3 — 1024-dim vector embeddings |
| `GCP_PROJECT_ID` | Google Cloud — Tasks, Pub/Sub, Storage |
| `REDIS_URL` | Distributed rate limiting — `rediss://default:<token>@<host>.upstash.io:6380` |
| `CONNECTOR_TOKEN_ENCRYPTION_KEY` | OAuth token encryption — `openssl rand -base64 32` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_RUNTIME_URL` | — | Python agent service — `http://localhost:8001` in dev |
| `REDIS_URL` | — | Falls back to in-memory rate limiting in dev |
| `SLACK_BOT_TOKEN` | — | `xoxb-…` — Slack connector |
| `SLACK_SIGNING_SECRET` | — | Webhook HMAC |
| `SLACK_CLIENT_ID / SECRET` | — | OAuth |
| `GITHUB_APP_ID` | — | GitHub connector |
| `GITHUB_APP_PRIVATE_KEY` | — | PEM format |
| `GITHUB_WEBHOOK_SECRET` | — | Webhook HMAC |
| `GITHUB_CLIENT_ID / SECRET` | — | OAuth |
| `RESEND_API_KEY` | — | Email — logs to console if missing in dev |
| `SENTRY_DSN` | — | Error tracking |
| `GCS_BUCKET_NAME` | `dyson-raw-events` | Raw event archive |
| `CLOUD_TASKS_QUEUE_NAME` | `dyson-ingestion` | Job queue |
| `RATE_LIMIT_MAX_PER_MINUTE` | `100` | Global per-tenant rate limit |
| `WHY_ENGINE_RATE_LIMIT_MAX_PER_MINUTE` | `10` | Per-user recall limit |
| `SWAGGER_ENABLED` | `true` | Set `false` in production |
| `LOG_LEVEL` | `info` | Pino log level |

---

## Database Schema

13 tables across 5 schema files. All tenant-scoped tables include `tenant_id` — missing it on a query is treated as a security bug.

```
tenants              workspaces (one per company)
users                team members, roles, email verification
refresh_tokens       HMAC-SHA256 hashed sessions (O(1) lookup)
invitations          invite tokens with expiry and RBAC role
connected_sources    OAuth integrations per workspace

raw_events           ingested events — unique on (tenant_id, external_id, source)
context_nodes        extracted entities: decisions, incidents, PRs, messages
causal_edges         causal relationships between nodes
node_embeddings      1024-dim vectors — HNSW index (lists=100, ef_construction=200)

why_queries          query history — confidence, citations, feedback
onboarding_packs     generated context packs
api_keys             scoped agent keys — hashed, prefix-indexed
notification_prefs   per-user email + Slack notification preferences
audit_log            immutable action trail
```

---

## Backend Modules

| Module | Prefix | Responsibility |
|--------|--------|----------------|
| **auth** | `/api/v1/auth` | 15 endpoints — signup, login, refresh, logout, password reset, email verification, sessions |
| **workspace** | `/api/v1/workspaces` | Workspace profile, settings |
| **users** | `/api/v1/users` | Team list, invitations, roles |
| **connectors** | `/api/v1/connectors` | OAuth setup + callback + backfill for Slack and GitHub |
| **ingestion** | internal | Normalise events, dedup, enqueue processing |
| **processing** | job handler | Entity extraction, decision detection, embeddings, causal edges |
| **graph** | `/api/v1/graph` | Nodes, edges, timeline |
| **decisions** | `/api/v1/decisions` | Auto-detected decision list and detail |
| **why** | `/api/v1/recall` | Recall engine — hybrid retrieval, confidence gate, Gemini composition |
| **memory** | `/api/v1/memory` | Memory CRUD and agent writes |
| **search** | `/api/v1/search` | Full-text + semantic search with source and date filters |
| **notifications** | `/api/v1/notifications` | Per-user email + Slack notification preferences |
| **onboarding-packs** | `/api/v1/onboarding-packs` | AI-generated context packs |
| **api-keys** | `/api/v1/api-keys` | Create, list, revoke scoped API keys |
| **agent** | `/api/v1/agent` | 6-endpoint REST API for AI agents |
| **agent-layer/mcp** | `/mcp` | MCP Streamable HTTP + stdio bridge |
| **audit** | `/api/v1/audit-log` | Workspace audit trail |
| **slack-bot** | internal | In-thread WHY answers, incident detection |
| **github-bot** | internal | PR annotations with related decisions |

---

## API Reference

All responses follow the envelope:
```jsonc
{ "data": <T>, "meta"?: { "cursor"?: string, "confidence"?: number } }  // success
{ "error": { "code": "SNAKE_CASE_CODE", "message": "Human readable" } } // error
```

### Auth — `/api/v1/auth`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/signup` | Create account + workspace |
| `POST` | `/login` | Returns JWT access + refresh pair |
| `POST` | `/refresh` | Rotate access token |
| `POST` | `/logout` | Revoke refresh token |
| `GET` | `/me` | Current user + workspace |
| `POST` | `/forgot-password` | Send reset email |
| `POST` | `/reset-password` | Set new password |
| `GET` | `/verify-email` | Confirm email |
| `POST` | `/resend-verification` | Re-send verification |
| `POST` | `/change-password` | Change password, revoke other sessions |
| `GET` | `/invite/:token` | Preview invite |
| `POST` | `/accept-invite` | Accept invite, create account |
| `GET` | `/sessions` | List active sessions |
| `DELETE` | `/sessions/:id` | Revoke a session |
| `DELETE` | `/sessions` | Sign out everywhere |

### Recall — `/api/v1/recall`

Rate limit: **10 req/min per user** (`recall:{tenantId}:{userId}` Redis key)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Ask a question — cited answer or raw nodes if confidence < 0.72 |
| `GET` | `/history` | Paginated query history |
| `GET` | `/:id` | Retrieve a result |
| `PATCH` | `/:id/feedback` | Submit score: `-1` or `1` |

### Agent REST API — `/api/v1/agent`

Authenticated with scoped API keys (`dys_…`). Create keys in Settings → API keys.

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `POST` | `/query` | read | Recall — same engine as `/recall` |
| `GET` | `/context` | read | Search by topic |
| `GET` | `/decisions` | read | Recent decisions |
| `POST` | `/memory` | write | Write a typed memory |
| `POST` | `/events` | write | Write a raw event |
| `GET` | `/workspace-overview` | read | Full workspace snapshot |

### Other endpoints

| Prefix | Description |
|--------|-------------|
| `/api/v1/memory` | `POST /`, `GET /`, `GET /:id`, `POST /:id/link` |
| `/api/v1/graph` | Nodes, edges, timeline |
| `/api/v1/decisions` | List, detail, timeline, flag |
| `/api/v1/search` | Full-text + vector, filterable by source and date |
| `/api/v1/connectors` | OAuth flows + backfill |
| `/api/v1/notifications` | `GET /` fetch prefs, `PATCH /` update prefs |
| `/api/v1/api-keys` | Create, list, revoke |
| `/api/v1/onboarding-packs` | Generate and retrieve |
| `/api/v1/users` | Profile, team, invitations |
| `/api/v1/audit-log` | Audit trail |
| `/webhooks/slack` | Slack Events API |
| `/webhooks/github` | GitHub webhook |
| `/jobs/:job` | Cloud Tasks handlers (signed by `JOB_SECRET`) |
| `/health` | Liveness — always 200 |
| `/health/ready` | Readiness — DB ping + agent runtime check |
| `/metrics` | WHY stats + ingestion lag + circuit breaker states (requires `X-Metrics-Secret`) |
| `/mcp` | MCP Streamable HTTP |

---

## MCP Server

Dyson ships a native [Model Context Protocol](https://modelcontextprotocol.io/) server for AI agent integrations.

### Tools

| Tool | Description |
|------|-------------|
| **`recall(question)`** | Ask anything. Returns cited answer + confidence. Below 0.72 confidence returns raw source nodes — never hallucinates. |
| **`remember(title, content, type?, url?)`** | Write a memory. Types: `decision` · `incident` · `standard` · `context` · `constraint` · `outcome`. |
| **`search_memory(query, type?, limit?)`** | Full-text + semantic search across all memories. |
| **`recent_memories(limit?, type?, minConfidence?)`** | Browse recent memories — useful at agent session start. |
| **`getMemory(id)`** | Full memory node with all linked memories. |
| **`workspace_context()`** | Workspace snapshot — recent memories, recalls, graph stats. |

### Connect via stdio (Claude Desktop / Cursor)

```json
{
  "mcpServers": {
    "dyson": {
      "command": "node",
      "args": ["/path/to/backend/dist/modules/agent-layer/mcp/stdio.js"],
      "env": {
        "DYSON_API_URL": "https://your-api.run.app",
        "DYSON_API_KEY": "dys_xxxxxxxx"
      }
    }
  }
}
```

### Connect via Streamable HTTP

```
POST https://<api-url>/mcp
Authorization: Bearer dys_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Python Agent Runtime

Located at `backend/python/`. FastAPI microservice on port 8001.

### Agents

**Post-mortem agent** — 4-node LangGraph pipeline:
```
gather_context → analyse_timeline → identify_root_cause → generate_output
```
Incident description → structured post-mortem with sections, action items, and related past incidents. Typical latency: 20–30 seconds.

**PR Review agent** — 2-node pipeline:
```
gather_context → generate_comments
```
PR metadata → typed review comments (warning / info / decision / constraint) grounded in company memory.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness |
| `GET` | `/health/ready` | Checks Dyson API reachability |
| `POST` | `/agents/postmortem` | Run post-mortem agent |
| `POST` | `/agents/pr-review` | Run PR review agent |
| `POST` | `/agents/detect-decision` | spaCy decision detection |
| `POST` | `/ml/embed` | sentence-transformers embeddings |

### Start locally

```bash
cd backend/python
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn agent_runtime.main:app --reload --port 8001
```

---

## Frontend

### Routes and wiring status

| Path | API wired | Description |
|------|-----------|-------------|
| `/login` | ✅ | Sign in |
| `/signup` | ✅ | Create account + workspace |
| `/forgot-password` | ✅ | Password reset request |
| `/reset-password` | ✅ | Confirm new password |
| `/app` | ✅ | Dashboard |
| `/app/recall` | ✅ | Recall — ask questions, view confidence + citations |
| `/app/decisions` | ✅ | Decision log |
| `/app/search` | ✅ | Global search |
| `/app/onboarding-packs` | ✅ | Team briefings |
| `/app/settings/profile` | ✅ | User profile |
| `/app/settings/sources` | ✅ | Connected sources — real OAuth flows |
| `/app/settings/members` | ✅ | Team members — real invite + remove |
| `/app/settings/api-keys` | ✅ | API key management — real create/revoke |
| `/app/settings/notifications` | ✅ | Notification preferences |
| `/app/settings/security` | ✅ | Sessions + password |
| `/app/settings/billing` | UI only | Stripe not yet integrated |

---

## Testing

```
backend/tests/
├── integration/
│   └── health.test.ts       19 tests — Fastify inject, auth guard, route coverage
└── unit/
    ├── circuit-breaker.test.ts  11 tests — 3-state machine, timeout, error propagation
    ├── agent-middleware.test.ts  API key validation, scope enforcement
    ├── auth-service.test.ts      Signup/login/refresh, HMAC token round-trips
    ├── why-rag-guards.test.ts    Confidence gate, citation validation
    ├── tenant-isolation.test.ts  RBAC hierarchy, dedupe keys, WHY threshold
    ├── webhook-signatures.test.ts  Slack + GitHub HMAC
    ├── cache.test.ts             TTL expiry, purge
    ├── retry.test.ts             Exponential backoff, jitter
    └── ...
```

**151 tests passing. Zero TypeScript errors.**

```bash
cd backend && npm test                    # all tests
cd backend && npm run typecheck           # TypeScript check
cd backend/python && pytest               # Python tests
```

---

## Deployment

Full runbook: **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**

| Service | Platform |
|---------|----------|
| TypeScript API | Google Cloud Run |
| Python agent runtime | Google Cloud Run |
| Database | Supabase (Postgres + pgvector) |
| Redis | Upstash (serverless) |
| Job queue | Google Cloud Tasks |
| Event bus | Google Cloud Pub/Sub |
| Raw event archive | Google Cloud Storage |
| Secrets | Google Secret Manager |
| Frontend | Vercel |
| CI/CD | Google Cloud Build |

CI/CD pipeline: install → typecheck → lint → test (TS + Python in parallel) → Docker build (both images) → push → deploy to Cloud Run (main branch only).

```bash
# Health checks
curl https://<api-url>/health         # liveness — always 200
curl https://<api-url>/health/ready   # readiness — DB + agent runtime
```

---

## Engineering Decisions

### Circuit breaker on external services

The WHY Engine calls Gemini on every query. Without protection, if Gemini goes down every request hangs 30 seconds then crashes. The circuit breaker opens after 5 consecutive failures — requests fail in under 1ms, the engine degrades to returning source nodes with `cannotAnswer: true`. Same pattern applied to Cohere, Slack API, and GitHub API. Singletons are shared across all requests in the process.

### Confidence gate — refuse to hallucinate

Below 0.72 average cosine similarity across top-12 retrieved nodes, the engine returns raw source nodes and refuses to call the LLM. A confident wrong answer is worse than an honest "I don't know." This threshold was chosen empirically — at 0.72, empirical accuracy is ~94%.

### Continuous recency decay

The hybrid ranker previously used a binary threshold — nodes under 90 days old got a 5% boost, older nodes got nothing. This created a cliff exactly at day 90. Replaced with exponential decay (`e^(-λ × ageDays)`, λ = 0.002, half-life ~347 days) — smooth, no artificial cliffs.

### Per-tenant rate limiting

Global rate limiting keys by `tenant:{tenantId}` for authenticated requests, not by IP. In a multi-tenant SaaS, keying by IP means an entire office behind one NAT would share one bucket. Per-tenant is the correct unit of fairness.

### TypeScript + Python boundary

Python owns all ML workloads because the Python ecosystem — LangGraph, spaCy, sentence-transformers — has no real TypeScript equivalent. Rather than compromise on either API quality or ML quality, a clean HTTP boundary separates them. One typed client in TypeScript calls the Python service. If Python is down, TypeScript degrades gracefully.

### Idempotency on writes

Write endpoints accept `Idempotency-Key` headers. Within 24 hours, the same key returns the same response from Redis without re-executing the handler. Prevents duplicate memories from network retries.

### Input sanitization at write boundaries

Before any user text enters the database or is sent to an LLM, it passes through a sanitization pipeline — control characters removed, prompt injection patterns stripped (`ignore previous instructions`, `system:` prefixes, etc.). Storing unsafe content in a memory system that feeds an LLM is a serious security vulnerability.

---

## Contributing

Read [`CLAUDE.md`](./CLAUDE.md) — engineering principles, module conventions, security requirements.

```bash
cd backend && npm run typecheck   # zero errors required
cd backend && npm test            # 151 tests must pass
cd backend && npm run lint
cd backend/python && pytest
```

**Hard rules:**
- Every tenant-scoped query must filter by `tenant_id` — missing it is a security bug
- All external boundaries use Zod (TypeScript) or Pydantic (Python)
- Never log: query text, source content, tokens, passwords, emails
- Confidence gate must run before any LLM call

---

*TypeScript · Python · React · pgvector · Gemini · LangGraph · MCP*
