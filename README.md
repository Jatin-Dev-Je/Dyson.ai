# Dyson

> **The persistent memory layer for engineering teams.**

Dyson ingests every decision, incident, and architectural choice from Slack, GitHub, Notion, and Linear — builds a causal knowledge graph — and lets your team and your AI agents ask *why* with a grounded, cited answer in seconds.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Postgres](https://img.shields.io/badge/Postgres-pgvector-4169E1?logo=postgresql&logoColor=white)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis&logoColor=white)](https://upstash.com/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-5B5BD6)](https://modelcontextprotocol.io/)

---

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Backend Modules](#backend-modules)
- [API Reference](#api-reference)
- [MCP Server](#mcp-server)
- [Frontend](#frontend)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          External Sources                             │
│         Slack ──── GitHub ──── Notion ──── Linear ──── Meetings      │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  webhooks + OAuth backfill
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Ingestion Layer                                │
│  Normalise → dedupe on (tenant_id, external_id, source) → enqueue   │
│  Idempotent writes to raw_events → Cloud Tasks async processing      │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  Cloud Tasks job
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Processing Pipeline                              │
│  Entity extraction → Decision detection → Cohere 1024-dim embeddings │
│  → context_nodes + causal_edges + node_embeddings (pgvector HNSW)   │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
             ┌───────────────┴──────────────┐
             ▼                              ▼
  ┌──────────────────┐           ┌────────────────────┐
  │  Context Graph    │           │  Vector Index       │
  │  (nodes + edges)  │           │  (HNSW cosine ANN)  │
  └────────┬─────────┘           └──────────┬─────────┘
           └─────────────┬────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Recall / WHY Engine                                │
│                                                                       │
│  1. Parallel retrieval (vector + lexical)                            │
│  2. Graph expansion from seed nodes                                  │
│  3. Access filter (private channel / repo scoping)                   │
│  4. Hybrid ranking (similarity + decision boost + recency)           │
│  5. Confidence scoring (avg similarity of top-12 nodes)             │
│                                                                       │
│  confidence ≥ 0.72 → Gemini Flash composition + cited answer         │
│  confidence < 0.72 → return raw source nodes, refuse to compose     │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
          ┌────────────────┼──────────────────┐
          ▼                ▼                  ▼
  REST API           MCP Server        Slack / GitHub bots
  /api/v1/recall     /mcp              answer in-thread
```

**Data flow:** external events → normalised raw events → graph + embeddings → hybrid retrieval + confidence gate → cited WHY answers for humans and agents.

---

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Memory Recall** | ✅ Live | Ask anything; get a cited, confidence-scored answer grounded in real source events |
| **Confidence Gate** | ✅ Live | Refuses to compose below 0.72 — returns raw source nodes instead of hallucinating |
| **Context Graph** | ✅ Live | Causal knowledge graph of decisions, incidents, and architectural choices |
| **Decision Log** | ✅ Live | Auto-detected decisions with confidence and citations |
| **Semantic Search** | ✅ Live | Full-text + vector search across all company memories |
| **MCP Server** | ✅ Live | Native integration with Claude Desktop, Cursor, Continue, any MCP-compatible agent |
| **Agent REST API** | ✅ Live | 6 endpoints for AI agents to read and write company memory |
| **Multi-source Ingestion** | ✅ Live | Slack, GitHub (PRs/issues/reviews), Notion, Linear — all normalised |
| **Team Briefings** | ✅ Live | AI-generated onboarding context packs for new engineers |
| **Distributed Rate Limiting** | ✅ Live | Redis-backed — correct across all Cloud Run replicas |
| **Workspace Isolation** | ✅ Live | Every query, every vector search, every graph walk scoped to tenant |
| **Audit Log** | ✅ Live | Immutable trail of every recall, write, and agent action |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API server** | Node.js 22, TypeScript 5.7, Fastify 5 |
| **Database** | PostgreSQL via Supabase, Drizzle ORM |
| **Vector search** | pgvector — 1024-dim Cohere embeddings, HNSW index |
| **Embeddings** | Cohere `embed-v3` (1024-dimensional, cosine distance) |
| **LLM** | Google Gemini 1.5 Flash — temperature 0, structured JSON output |
| **Rate limiting** | `@fastify/rate-limit` + ioredis (Upstash Redis) — distributed |
| **Job queue** | Google Cloud Tasks (async ingestion + processing) |
| **Event bus** | Google Cloud Pub/Sub |
| **Raw event archive** | Google Cloud Storage |
| **Auth** | JWT HS256 — 15m access / 30d refresh (HMAC-SHA256 refresh token lookup) |
| **Validation** | Zod at every external boundary (requests, webhooks, LLM output) |
| **Logging** | Pino (structured JSON) + UUID correlation ID per request + Sentry |
| **MCP** | `@modelcontextprotocol/sdk` — Streamable HTTP + stdio bridge |
| **Email** | Resend |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query |
| **Deployment** | Google Cloud Run (backend) + Vercel (frontend) |
| **CI/CD** | Google Cloud Build — typecheck → lint → test → docker → deploy |
| **Tests** | Vitest — 13 files, 137 passing (unit + HTTP integration) |

---

## Project Structure

```
dyson/
├── backend/
│   ├── src/
│   │   ├── app.ts                  Fastify factory — plugins, routes, error handler
│   │   ├── server.ts               HTTP entry — Sentry init, graceful SIGTERM shutdown
│   │   ├── config/
│   │   │   ├── env.ts              Zod-validated env (fails fast; refuses bad prod config)
│   │   │   └── constants.ts        Domain constants
│   │   ├── infra/
│   │   │   ├── db/
│   │   │   │   ├── client.ts       Drizzle + Postgres (pool: 10 prod / 5 dev, 15s timeout)
│   │   │   │   ├── schema/         7 schema files → 13 tables
│   │   │   │   └── migrations/     Forward-only SQL (0000→0003)
│   │   │   ├── queue/
│   │   │   │   └── queue.client.ts Cloud Tasks dispatcher (inline in dev)
│   │   │   ├── redis.ts            ioredis singleton — lazy connect, TLS, graceful degrade
│   │   │   ├── cache.ts            In-memory TTL cache (API key hot path, 60s TTL)
│   │   │   ├── retry.ts            Exponential backoff with jitter
│   │   │   ├── email.ts            Resend provider (logs to console if key missing in dev)
│   │   │   └── github-app.ts       GitHub App authentication
│   │   ├── jobs/                   Async workers (invoked by Cloud Tasks)
│   │   │   ├── process-event.job.ts
│   │   │   ├── generate-embeddings.job.ts
│   │   │   ├── build-edges.job.ts
│   │   │   └── backfill-source.job.ts
│   │   ├── modules/
│   │   │   ├── auth/               JWT auth, sessions, password reset, email verify
│   │   │   ├── workspace/          Workspace profile, settings
│   │   │   ├── users/              Users, invitations, roles
│   │   │   ├── connectors/         OAuth + backfill — Slack and GitHub
│   │   │   ├── ingestion/          Event normalisation, dedup, raw storage
│   │   │   │   └── connectors/     slack/, github/ per-source handlers
│   │   │   ├── processing/         Entity extraction, decision detection, embeddings, edges
│   │   │   │   └── processors/     decision-detector, embedding-generator, entity-extractor
│   │   │   ├── graph/              Context graph — nodes, edges, timeline
│   │   │   ├── decisions/          Decision log — detect, list, detail, timeline
│   │   │   ├── why/                Recall / WHY Engine
│   │   │   │   ├── retrieval/      vector, lexical, graph, hybrid-ranker, access-filter
│   │   │   │   └── llm/            Gemini client, prompt builder, response validator
│   │   │   ├── memory/             Memory CRUD + agent writes
│   │   │   ├── search/             Full-text + semantic search
│   │   │   ├── onboarding-packs/   AI-generated context packs
│   │   │   ├── api-keys/           Scoped API key management (hashed, prefix-indexed)
│   │   │   ├── agent/              REST agent API (6 endpoints)
│   │   │   ├── agent-layer/mcp/    MCP server, Streamable HTTP transport, stdio bridge
│   │   │   ├── audit/              Audit log read API
│   │   │   ├── slack-bot/          Slack bot — WHY answers, incident detection
│   │   │   └── github-bot/         GitHub bot — PR decision annotations
│   │   ├── api/
│   │   │   ├── middleware/         auth, rbac, signature verification
│   │   │   └── routes/
│   │   │       ├── webhooks/       slack.webhook.ts, github.webhook.ts
│   │   │       └── jobs.routes.ts  Cloud Tasks handlers (signed by JOB_SECRET)
│   │   └── shared/
│   │       ├── errors.ts           Error hierarchy (DysonError, NotFoundError…)
│   │       └── types/              api.ts, entities.ts
│   ├── tests/
│   │   ├── integration/            health.test.ts — Fastify inject HTTP tests
│   │   └── unit/                   12 files — auth, tenancy, webhooks, WHY guards…
│   ├── Dockerfile                  Multi-stage, non-root user, HEALTHCHECK
│   ├── .dockerignore
│   ├── .env.example                All variables documented with sources
│   ├── vitest.config.ts
│   ├── tsconfig.json               NodeNext/NodeNext, strict
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 React Router tree
│   │   ├── pages/
│   │   │   ├── auth/               Login, Signup (2-step), ForgotPassword,
│   │   │   │                       ResetPassword, AcceptInvite
│   │   │   ├── onboarding/         5-step workspace setup wizard
│   │   │   ├── app/
│   │   │   │   ├── Dashboard.tsx   Stats + recall box + activity (UI mocked)
│   │   │   │   ├── WhyEngine.tsx   Recall — wired to POST /api/v1/recall ✅
│   │   │   │   ├── DecisionLog.tsx Memory graph UI (hardcoded preview data)
│   │   │   │   ├── GlobalSearch.tsx Search — wired to GET /api/v1/search ✅
│   │   │   │   └── onboarding-packs/
│   │   │   └── settings/           9 settings pages — Profile, Workspace,
│   │   │                           ConnectedSources, TeamMembers, Billing,
│   │   │                           Notifications, ApiKeys, AuditLog, Security
│   │   ├── components/
│   │   │   ├── layout/             AppShell (collapsible sidebar, settings modal),
│   │   │   │                       ProtectedRoute, CommandPalette, NotificationPanel
│   │   │   ├── shared/             SourcePill, ConfidenceBadge, DysonMark, OAuthButton
│   │   │   └── ui/                 Button, Card, Badge, Input
│   │   └── lib/
│   │       ├── api.ts              Typed fetch client — auto JWT refresh on 401
│   │       ├── auth.ts             Auth state (localStorage + token helpers)
│   │       └── utils.ts            cn(), getConfidenceLevel(), helpers
│   ├── tailwind.config.ts          Design tokens: canvas, ink-1…4, primary, line…
│   └── package.json
│
├── docs/
│   └── DEPLOYMENT.md               Full Cloud Run + Supabase runbook
├── CLAUDE.md                       Engineering guide for contributors
├── cloudbuild.yaml                 Cloud Build CI/CD pipeline
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 22+
- A [Supabase](https://supabase.com) project (free tier works)
- `pgvector` enabled on the database

### 1. Enable pgvector

In Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Clone + install

```bash
git clone https://github.com/Jatin-Dev-Je/Dyson.ai.git
cd Dyson.ai

cd backend  && npm install
cd ../frontend && npm install
```

### 3. Configure environment

```bash
cd backend
cp .env.example .env
```

**Minimum for local dev:**

```env
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
DATABASE_URL_POOLED=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
JWT_SECRET=[32+ random characters — openssl rand -base64 32]
```

**For the WHY Engine to work** (free tiers available):
```env
GEMINI_API_KEY=[from aistudio.google.com/app/apikey]
COHERE_API_KEY=[from dashboard.cohere.com]
```

### 4. Run migrations

```bash
cd backend
npm run db:migrate
```

### 5. Start

```bash
# Terminal 1 — backend on :8080
cd backend && npm run dev

# Terminal 2 — frontend on :3000
cd frontend && npm run dev
```

Open `http://localhost:3000`, sign up, create a workspace.

---

## Environment Variables

### Required — app refuses to start without these

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres direct connection (port 5432) |
| `DATABASE_URL_POOLED` | Pooled connection (port 6543 via Supabase) — used for all queries |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | ≥32 chars in dev, ≥48 chars in prod — generate: `openssl rand -base64 64` |

### Required in production — build guard refuses to boot without these

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini — WHY Engine LLM composition |
| `COHERE_API_KEY` | Cohere embed-v3 — vector embeddings |
| `GCP_PROJECT_ID` | Google Cloud — Tasks, Pub/Sub, Storage |
| `REDIS_URL` | Distributed rate limiting across Cloud Run replicas |

### Redis (Upstash recommended)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | — | `rediss://default:<token>@<host>.upstash.io:6380` — get from [upstash.com](https://upstash.com). Falls back to in-memory (single-instance only) if not set in dev. |

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | — | `development` · `test` · `production` |
| `PORT` | `8080` | HTTP server port |
| `APP_URL` | `http://localhost:3000` | Frontend URL (used in email links) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` | Pino log level |
| `SWAGGER_ENABLED` | `true` | Must be `false` in production |

### Auth

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token lifetime |

### AI

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | — | WHY Engine LLM (required in production) |
| `GEMINI_MODEL` | `gemini-1.5-flash-latest` | Model ID |
| `COHERE_API_KEY` | — | 1024-dim embeddings (required in production) |

### Slack

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Bot token (`xoxb-…`) |
| `SLACK_SIGNING_SECRET` | Webhook HMAC verification |
| `SLACK_APP_TOKEN` | Socket mode (`xapp-…`) |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | OAuth |

### GitHub

| Variable | Description |
|----------|-------------|
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | PEM private key |
| `GITHUB_WEBHOOK_SECRET` | Webhook HMAC secret |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth |

### Google Cloud

| Variable | Default | Description |
|----------|---------|-------------|
| `GCP_PROJECT_ID` | — | GCP project (required in production) |
| `GCP_REGION` | `us-central1` | Cloud region |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Service account JSON path (dev only) |
| `GCS_BUCKET_NAME` | `dyson-raw-events` | Raw event archive |
| `CLOUD_TASKS_QUEUE_NAME` | `dyson-ingestion` | Ingestion queue |
| `CLOUD_TASKS_HANDLER_URL` | `http://localhost:8080/jobs` | Job handler URL |
| `PUBSUB_TOPIC_INGESTION` | `dyson-ingestion-events` | Ingestion topic |
| `PUBSUB_TOPIC_PROCESSING` | `dyson-processing-events` | Processing topic |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_MAX_PER_MINUTE` | `100` | Global per-IP — backed by Redis in production |
| `WHY_ENGINE_RATE_LIMIT_MAX_PER_MINUTE` | `10` | Per-user recall limit (key: `recall:{tenantId}:{userId}`) |

### Jobs + Email + Observability

| Variable | Default | Description |
|----------|---------|-------------|
| `JOB_SECRET` | (dev default) | Cloud Tasks auth — ≥16 chars, also used for `/metrics` |
| `RESEND_API_KEY` | — | Email (logs to console if missing in dev) |
| `RESEND_FROM_EMAIL` | `Dyson <noreply@dyson.ai>` | From address |
| `SENTRY_DSN` | — | Error tracking |

---

## Database Schema

13 tables across 5 schema groups. Every tenant-scoped table includes `tenant_id` — missing it on a query is a security bug.

```
tenants              workspace records
users                team members, roles, email verification
refresh_tokens       HMAC-SHA256 hashed sessions (O(1) lookup, no bcrypt)
invitations          team invite tokens with expiry + role
connected_sources    OAuth integrations per workspace

raw_events           ingested events — unique on (tenant_id, external_id, source)
context_nodes        extracted entities — decisions, incidents, messages, PRs
causal_edges         relationships between nodes (depends-on, causes, resolves…)
node_embeddings      1024-dim Cohere vectors — HNSW index (lists=100, ef=200)

why_queries          query history — confidence, citations JSON, feedback score
onboarding_packs     generated context packs — sections JSON, linked node IDs
api_keys             scoped agent keys — hashed, prefix-indexed, scopes array
audit_log            immutable action trail — actor, action, resource, IP, ts
```

---

## Backend Modules

| Module | Route prefix | Responsibility |
|--------|-------------|----------------|
| **auth** | `/api/v1/auth` | 15 endpoints — signup, login, refresh, logout, password reset, email verification, sessions |
| **workspace** | `/api/v1/workspaces` | Workspace profile, plan, settings |
| **users** | `/api/v1/users` | Current user, team list, invitations, roles |
| **connectors** | `/api/v1/connectors` | OAuth setup + callback for Slack and GitHub; trigger backfill |
| **ingestion** | internal | Normalise Slack/GitHub events; write idempotent raw_events |
| **processing** | job handler | Entity extraction, decision detection, Cohere embeddings, causal edges |
| **graph** | `/api/v1/graph` | Nodes, edges, timeline queries |
| **decisions** | `/api/v1/decisions` | Auto-detected decision list and detail |
| **why** | `/api/v1/recall` | WHY Engine — hybrid retrieval, graph expansion, confidence gate, Gemini composition |
| **memory** | `/api/v1/memory` | Memory CRUD and agent writes |
| **search** | `/api/v1/search` | Full-text + semantic context search |
| **onboarding-packs** | `/api/v1/onboarding-packs` | Generate and retrieve team context packs |
| **api-keys** | `/api/v1/api-keys` | Create, list, revoke scoped API keys |
| **agent** | `/api/v1/agent` | 6-endpoint REST API for AI agents |
| **agent-layer/mcp** | `/mcp` | MCP Streamable HTTP transport + stdio bridge |
| **audit** | `/api/v1/audit-log` | Workspace audit trail |
| **slack-bot** | internal | Answer WHY queries in Slack threads, detect incidents |
| **github-bot** | internal | Annotate PRs with related decisions |

---

## API Reference

All responses follow the envelope:

```jsonc
{ "data": <T>, "meta"?: { "cursor"?: string, "confidence"?: number } }  // success
{ "error": { "code": "SNAKE_CASE", "message": "Human readable" } }      // error
```

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/signup` | — | Create account + workspace (2-step flow) |
| `POST` | `/login` | — | Returns JWT access + refresh token pair |
| `POST` | `/refresh` | — | Rotate access token using refresh token |
| `POST` | `/logout` | JWT | Revoke current refresh token |
| `GET` | `/me` | JWT | Current user + workspace |
| `POST` | `/forgot-password` | — | Send reset email (no enumeration) |
| `POST` | `/reset-password` | — | Consume HMAC token, set new password |
| `GET` | `/verify-email` | — | Confirm email address |
| `POST` | `/resend-verification` | JWT | Re-send verification email |
| `POST` | `/change-password` | JWT | Change password, revoke other sessions |
| `GET` | `/invite/:token` | — | Preview invite details |
| `POST` | `/accept-invite` | — | Accept invite, create account |
| `GET` | `/sessions` | JWT | List active sessions |
| `DELETE` | `/sessions/:id` | JWT | Revoke a session |
| `DELETE` | `/sessions` | JWT | Sign out everywhere |

### Recall / WHY Engine — `/api/v1/recall`

> Rate limited: **10 req/min per user** (`recall:{tenantId}:{userId}` key in Redis)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Ask a question — returns cited answer or raw nodes if confidence < 0.72 |
| `GET` | `/history` | Paginated query history (cursor-based) |
| `GET` | `/:id` | Retrieve a specific query result |
| `PATCH` | `/:id/feedback` | Submit score: `-1` (unhelpful) or `1` (helpful) |

**Response:**
```jsonc
{
  "data": {
    "queryId":     "rec_01j...",
    "question":    "Why did we choose pgvector?",
    "answer":      "The team chose pgvector in April 2025 because…",  // null when cannotAnswer
    "confidence":  0.91,
    "cannotAnswer": false,
    "citations": [
      { "claim": "Cost was the primary driver", "sourceNodeId": "node_…", "sourceUrl": "https://…", "confidence": 0.88 }
    ],
    "sourceNodes": [{ "id": "…", "title": "…", "summary": "…", "source": "slack", "similarity": 0.91 }]
  }
}
```

### Agent REST API — `/api/v1/agent`

> Authenticated with scoped API keys (`dys_…` prefix). Create keys in Settings → API keys.

| Method | Path | Scope | Rate | Description |
|--------|------|-------|------|-------------|
| `POST` | `/query` | `read` | 60/min | Recall — same engine as `/api/v1/recall` |
| `GET` | `/context` | `read` | 60/min | Search by `topic`, up to `limit` results |
| `GET` | `/decisions` | `read` | 60/min | Recent decisions, up to `limit` |
| `POST` | `/memory` | `write` | 120/min | Write a memory (type: decision/incident/standard/context/constraint/outcome) |
| `POST` | `/events` | `write` | 120/min | Write a raw event (legacy, less structured) |
| `GET` | `/workspace-overview` | `read` | 60/min | Full snapshot — recent memories, recalls, graph stats |

### Memory — `/api/v1/memory`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Create memory (generates embedding immediately) |
| `GET` | `/` | List memories (paginated, filterable by type) |
| `GET` | `/:id` | Memory detail with linked nodes |
| `POST` | `/:id/link` | Create a causal edge between two memory nodes |

### Other Endpoints

| Prefix | Key endpoints |
|--------|--------------|
| `/api/v1/graph` | `GET /nodes`, `GET /nodes/:id`, `GET /edges`, `GET /timeline` |
| `/api/v1/decisions` | `GET /`, `GET /:id`, `GET /:id/timeline` |
| `/api/v1/search` | Search with full-text + vector |
| `/api/v1/connectors` | OAuth flows + backfill for Slack, GitHub |
| `/api/v1/onboarding-packs` | Generate + retrieve context packs |
| `/api/v1/api-keys` | Create, list, revoke keys |
| `/api/v1/users` | Profile, team, invitations |
| `/api/v1/workspaces` | Workspace settings |
| `/api/v1/audit-log` | Audit trail (admin only) |
| `/webhooks/slack` | Slack Events API |
| `/webhooks/github` | GitHub webhook |
| `/jobs/:job` | Cloud Tasks handlers (signed by `JOB_SECRET`) |
| `/health` | Liveness — always 200 |
| `/health/ready` | Readiness — `SELECT 1` on DB |
| `/metrics` | WHY stats + ingestion lag (requires `X-Metrics-Secret`) |
| `/mcp` | MCP Streamable HTTP |

---

## MCP Server

Dyson ships a native [Model Context Protocol](https://modelcontextprotocol.io/) server. Connect any MCP-compatible agent (Claude Desktop, Cursor, Continue, custom) and it can read and write your company's memory.

### Tools

| Tool | Description |
|------|-------------|
| **`recall(question)`** | Ask anything. Returns cited answer + confidence. If confidence < 0.72 returns raw source nodes instead of composing — never hallucinates. |
| **`remember(title, content, type?, url?, metadata?)`** | Write a memory. Types: `decision` · `incident` · `standard` · `context` · `constraint` · `outcome`. Immediately searchable. |
| **`search_memory(query, type?, limit?)`** | Full-text + semantic search. Returns id, type, title, summary, source, confidence. |
| **`recent_memories(limit?, type?, minConfidence?)`** | Browse recent memories. Call at session start for situational awareness. |
| **`getMemory(id)`** | Full memory node with all linked memories and relationship types. |
| **`workspace_context()`** | Workspace snapshot — recent memories, recent recalls, graph stats. |

### Agent system prompts

| Prompt | Use case |
|--------|----------|
| `coding-agent` | Look up decisions before changing architecture; record new ones after |
| `sre-agent` | Incident response, pattern matching against past incidents, post-mortem capture |
| `onboarding-agent` | New engineer ramp-up — pull relevant decisions, standards, constraints |

### Connect via Streamable HTTP

```
POST https://<your-api-url>/mcp
Authorization: Bearer dys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

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

---

## Frontend

### Route map

| Path | Wired to API | Description |
|------|-------------|-------------|
| `/login` | ✅ | Sign in |
| `/signup` | ✅ | Create account + workspace (2-step) |
| `/forgot-password` | ✅ | Request password reset |
| `/reset-password` | ✅ | Set new password |
| `/accept-invite` | ✅ | Accept team invitation |
| `/app` | UI only | Dashboard — recall box, stats, activity (mocked data) |
| `/app/recall` | ✅ | WHY Engine — ask questions, view confidence + citations |
| `/app/decisions` | UI only | Memory Graph — UI preview with hardcoded data |
| `/app/onboarding-packs` | partial | Team briefings |
| `/app/search` | ✅ | Global search across all memories |
| `/app/settings/*` | ✅ | Settings modal — 9 pages |

**Pages wired to live API:** Login, Signup, Recall, Search, all Settings pages.
**Pages with UI preview data:** Dashboard stats, Decision Log, Onboarding Packs list.

### Design system

- **Canvas:** `#FAFAF8` · **Surface:** `white` · **Border:** `#E8E7E5`
- **Primary:** `#5B5BD6` · **Danger:** `#DC2626` · **Success:** `#16A34A`
- **Font:** Geist Variable, 13–14px base, `letter-spacing: -0.01em`
- Collapsible sidebar (240px ↔ 56px icon-only with smooth transition)
- Settings open as full-screen modal overlay over the app

---

## Testing

```
backend/tests/
├── integration/
│   └── health.test.ts       19 tests — Fastify inject: /health, auth guard,
│                            unknown routes, metrics auth, error shapes
└── unit/
    ├── agent-middleware.test.ts    API key validation, scope enforcement
    ├── apikeys.test.ts             Key hashing, prefix lookup, revocation
    ├── auth-service.test.ts        Signup/login/refresh, HMAC token round-trips
    ├── cache.test.ts               TTL expiry, purgeExpired
    ├── connectors.test.ts          OAuth state sign/verify/tamper/expiry
    ├── email-verification.test.ts  Token generation, expiry, tampering
    ├── memory-schema.test.ts       Zod schema validation
    ├── observability.test.ts       Metrics shape, alert thresholds, log fields
    ├── retry.test.ts               Exponential backoff, jitter, max retries
    ├── tenant-isolation.test.ts    JWT type check, RBAC hierarchy, dedupe keys, WHY gate
    ├── webhook-signatures.test.ts  Slack + GitHub HMAC verification
    └── why-rag-guards.test.ts      Access filter, citation validation, hallucination guard
```

**137 tests passing.** Run with:
```bash
cd backend && npm test
```

---

## WHY Engine Contract

The WHY Engine will say **"I don't know"** rather than hallucinate.

```typescript
type WhyEngineResult = {
  queryId:      string
  question:     string
  answer:       string | null    // null when cannotAnswer
  citations:    Citation[]       // every factual claim backed by a source node
  sourceNodes:  SourceNode[]     // raw evidence always returned
  confidence:   number           // 0–1 (avg similarity of top-12 retrieved nodes)
  cannotAnswer: boolean          // true when confidence < 0.72
  latencyMs:    number
}
```

**Retrieval pipeline** (executes on every recall):

1. Parallel vector search (pgvector HNSW) + lexical search (Postgres FTS)
2. Merge and deduplicate retrieved nodes
3. Graph expansion from seed nodes (causal edge traversal)
4. Access filter — private channels/repos scoped to user membership
5. Hybrid ranking: similarity score + decision boost (+20%) + recency boost (<90 days: +5%) → top 12
6. Confidence = average similarity of top-12 nodes
7. If confidence ≥ 0.72 → Gemini Flash composes cited answer at temperature 0
8. If confidence < 0.72 → `cannotAnswer: true`, no LLM call, raw nodes returned
9. LLM response validated — uncited factual sentences cause answer rejection

---

## Deployment

Full runbook: **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**

| Service | Platform |
|---------|----------|
| Backend API + MCP | Google Cloud Run |
| Job queue | Google Cloud Tasks |
| Event streaming | Google Cloud Pub/Sub |
| Raw event archive | Google Cloud Storage |
| Database | Supabase (Postgres + pgvector) |
| Redis | Upstash (serverless) |
| Secrets | Google Secret Manager |
| Frontend | Vercel |
| CI/CD | Google Cloud Build |

**CI/CD pipeline** (`cloudbuild.yaml`): install → typecheck → lint → test → docker build → push to GCR → deploy to Cloud Run. Every push to `main` auto-deploys.

**Health checks:**
```bash
curl https://<api>/health        # liveness — always 200
curl https://<api>/health/ready  # readiness — 200 means DB reachable
```

**Estimated cost at 100 active tenants:** ~$420/month
- Cloud Run: ~$80 · Supabase Pro: $25 · Gemini Flash (WHY queries): ~$200 · Cohere embeddings: ~$50 · Upstash Redis: ~$10 · Cloud Tasks/Storage: ~$10 · Sentry: $26

---

## Contributing

Read [`CLAUDE.md`](./CLAUDE.md) first — engineering principles, module conventions, security requirements.

```bash
cd backend

npm run typecheck   # tsc --noEmit
npm test            # 137 unit + integration tests
npm run lint        # ESLint
npm run format      # Prettier
```

**Hard rules:**
- Every tenant-scoped query must filter by `tenantId` — missing it is a security bug
- All external boundaries (requests, webhooks, LLM output) must use Zod
- Never log: query text, source content, tokens, passwords, emails
- Confidence gate must be checked before calling the LLM
- Migrations are additive and forward-only

---

*TypeScript · Fastify · React · pgvector · Gemini · Cohere · Redis · MCP*
