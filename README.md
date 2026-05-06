# Dyson

> **The persistent memory layer for engineering teams.**

Dyson ingests every decision, incident, and architectural choice from Slack, GitHub, Notion, and Linear — builds a causal knowledge graph from them — and lets your team and your AI agents ask *why* with a grounded, cited answer in seconds.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Postgres](https://img.shields.io/badge/Postgres-pgvector-4169E1?logo=postgresql&logoColor=white)](https://supabase.com/)
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
- [Deployment](#deployment)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         External Sources                             │
│          Slack ──── GitHub ──── Notion ──── Linear ──── Meetings    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  webhooks + OAuth backfill
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Ingestion Layer                                 │
│   Raw event normalization → dedup (tenant_id, external_id, source)  │
│   Idempotent writes to raw_events → enqueue processing job          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  Cloud Tasks (async)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Processing Pipeline                              │
│   Entity extraction → Decision detection → Cohere embeddings        │
│   → context_nodes + causal_edges + node_embeddings (pgvector)       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐       ┌────────────────────────┐
│   Context Graph      │       │   Semantic Search       │
│   (nodes + edges)    │       │   (pgvector cosine)     │
└──────────┬──────────┘       └───────────┬────────────┘
           │                              │
           └──────────────┬───────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Recall / WHY Engine                             │
│   Hybrid retrieval → graph walk → confidence scoring                 │
│   If confidence ≥ 0.72 → Gemini Flash composition + citations       │
│   If confidence < 0.72 → return raw source nodes (no hallucination) │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    REST API (humans)   MCP Server    Slack / GitHub bots
    /api/v1/recall      /mcp          answer in-thread
```

**Data flow in one sentence:** external events → normalized raw events → processed graph + embeddings → hybrid retrieval → cited WHY answers for humans and agents.

---

## Features

| Feature | Description |
|---------|-------------|
| **Memory Recall** | Ask anything about your codebase history; get a cited answer grounded in real source events |
| **Context Graph** | Causal knowledge graph of decisions, incidents, and architectural choices |
| **Decision Log** | Auto-detected decisions with confidence scores and source citations |
| **Team Briefings** | AI-generated onboarding context packs for new engineers |
| **MCP Server** | Native integration with Claude Desktop, Cursor, Continue, and any MCP-compatible agent |
| **Agent API** | REST API for AI agents to read and write company memory |
| **Multi-source Ingestion** | Slack, GitHub (PRs, issues, reviews), Notion, Linear — all normalized |
| **Semantic Search** | Full-text + vector search across all company memories |
| **Workspace Isolation** | Complete tenant isolation — every query scoped to your workspace |
| **Audit Log** | Full trace of every recall, memory write, and agent action |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | Node.js 22, TypeScript 5.7, Fastify 5 |
| **ORM / DB** | Drizzle ORM, PostgreSQL (Supabase), pgvector (1024-dim HNSW) |
| **Embeddings** | Cohere embed-v3 (1024-dimensional) |
| **LLM composition** | Google Gemini 1.5 Flash (temperature 0, structured JSON output) |
| **Job queue** | Google Cloud Tasks (async ingestion + processing) |
| **Event bus** | Google Cloud Pub/Sub |
| **Raw event store** | Google Cloud Storage |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query |
| **Auth** | JWT (HS256, 15m access / 30d refresh) + HMAC refresh token lookup |
| **Validation** | Zod at every external boundary |
| **Logging** | Pino (structured JSON) + Sentry |
| **MCP** | `@modelcontextprotocol/sdk` — Streamable HTTP + stdio bridge |
| **Email** | Resend |
| **Deployment** | Google Cloud Run (backend), Vercel (frontend) |
| **CI/CD** | Google Cloud Build (`cloudbuild.yaml`) |
| **Tests** | Vitest (unit + integration), 118+ passing |

---

## Project Structure

```
dyson/
├── backend/                       Node.js API server + MCP
│   ├── src/
│   │   ├── app.ts                 Fastify app factory, all route registration
│   │   ├── server.ts              HTTP entry point
│   │   ├── config/
│   │   │   ├── env.ts             Zod-validated env (fails fast on bad config)
│   │   │   └── constants.ts       Domain constants
│   │   ├── infra/
│   │   │   ├── db/
│   │   │   │   ├── client.ts      Drizzle + Postgres (pooled connection)
│   │   │   │   ├── schema/        Table definitions (7 schema files)
│   │   │   │   └── migrations/    Forward-only SQL migrations
│   │   │   ├── queue/
│   │   │   │   └── queue.client.ts  Cloud Tasks dispatcher
│   │   │   ├── cache.ts           In-memory TTL cache (API key caching)
│   │   │   ├── retry.ts           Exponential backoff with jitter
│   │   │   ├── email.ts           Resend email provider
│   │   │   └── github-app.ts      GitHub App authentication
│   │   ├── jobs/                  Async job workers (Cloud Tasks)
│   │   │   ├── process-event.job.ts
│   │   │   ├── generate-embeddings.job.ts
│   │   │   ├── build-edges.job.ts
│   │   │   └── backfill-source.job.ts
│   │   ├── modules/               Feature modules (cohesive: routes+service+repo)
│   │   │   ├── auth/              JWT auth, sessions, password reset, email verify
│   │   │   ├── workspace/         Workspace profile and settings
│   │   │   ├── users/             Users, invitations, role management
│   │   │   ├── connectors/        OAuth + backfill for Slack and GitHub
│   │   │   ├── ingestion/         Event normalization, dedup, raw event storage
│   │   │   │   └── connectors/    Per-source handlers (slack/, github/)
│   │   │   ├── processing/        Entity extraction, decision detection, embeddings
│   │   │   │   └── processors/    decision-detector, embedding-generator, entity-extractor
│   │   │   ├── graph/             Context graph — nodes, edges, timeline
│   │   │   ├── decisions/         Decision log: detect, list, detail
│   │   │   ├── why/               Recall / WHY Engine — retrieval + Gemini composition
│   │   │   │   ├── retrieval/     vector, lexical, graph, hybrid ranker, access filter
│   │   │   │   └── llm/           Gemini client, prompt builder, response validator
│   │   │   ├── memory/            Memory CRUD + agent writes
│   │   │   ├── search/            Full-text + semantic search
│   │   │   ├── onboarding-packs/  AI-generated context packs for new engineers
│   │   │   ├── api-keys/          Scoped agent API key management
│   │   │   ├── agent/             REST agent API (6 endpoints)
│   │   │   ├── agent-layer/mcp/   MCP server, Streamable HTTP transport, stdio bridge
│   │   │   ├── audit/             Audit log read API
│   │   │   ├── slack-bot/         Slack bot: WHY answers, incident detection
│   │   │   └── github-bot/        GitHub bot: PR decision annotations
│   │   ├── api/
│   │   │   ├── middleware/        auth.middleware, rbac.middleware, signature.middleware
│   │   │   └── routes/
│   │   │       ├── webhooks/      slack.webhook.ts, github.webhook.ts
│   │   │       └── jobs.routes.ts Cloud Tasks job handler (signed with JOB_SECRET)
│   │   └── shared/
│   │       ├── errors.ts          Custom error hierarchy (DysonError, NotFoundError…)
│   │       └── types/             api.ts, entities.ts — shared TypeScript types
│   ├── tests/                     Vitest — 12 test files, 118+ passing
│   ├── tsconfig.json              NodeNext/NodeNext module resolution
│   └── package.json
│
├── frontend/                      React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx                React Router tree (all routes)
│   │   ├── main.tsx               Vite entry point
│   │   ├── pages/
│   │   │   ├── auth/              Login, Signup, ForgotPassword, ResetPassword, AcceptInvite
│   │   │   ├── onboarding/        5-step workspace setup wizard
│   │   │   ├── app/               Dashboard, WhyEngine, DecisionLog, GlobalSearch
│   │   │   │   └── onboarding-packs/  OnboardingPacks, PackDetail
│   │   │   └── settings/          Profile, Workspace, ConnectedSources, TeamMembers,
│   │   │                          Billing, Notifications, ApiKeys, AuditLog, Security
│   │   ├── components/
│   │   │   ├── layout/            AppShell (collapsible sidebar + settings modal),
│   │   │   │                      ProtectedRoute, CommandPalette, NotificationPanel
│   │   │   ├── shared/            SourcePill, ConfidenceBadge, DysonMark, OAuthButton
│   │   │   └── ui/                Button, Card, Badge, Input (Radix + Tailwind primitives)
│   │   ├── lib/
│   │   │   ├── api.ts             Typed fetch client with auto JWT refresh
│   │   │   ├── auth.ts            Auth state (localStorage + token helpers)
│   │   │   └── utils.ts           cn(), getConfidenceLevel(), misc helpers
│   │   └── styles/
│   │       └── globals.css        Tailwind directives + CSS custom properties
│   ├── tailwind.config.ts         Design tokens: canvas, ink, primary, line…
│   └── package.json
│
├── docs/
│   └── DEPLOYMENT.md              Full Cloud Run + Supabase runbook
├── CLAUDE.md                      Engineering guide for contributors
├── cloudbuild.yaml                Google Cloud Build CI/CD pipeline
└── README.md                      This file
```

---

## Quick Start

### Prerequisites

- Node.js 22+
- A [Supabase](https://supabase.com) project (free tier works)
- `pgvector` enabled on your Supabase DB

### 1. Clone and install

```bash
git clone https://github.com/Jatin-Dev-Je/Dyson.ai.git
cd Dyson.ai

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Enable pgvector

Run in the Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
# Fill in the required values (see Environment Variables below)
```

Minimum required for local dev:

```env
DATABASE_URL=postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres
DATABASE_URL_POOLED=postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
JWT_SECRET=<at-least-32-random-characters>
```

### 4. Run migrations

```bash
cd backend
npm run db:migrate
```

### 5. Start dev servers

```bash
# Backend (port 8080)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm run dev
```

Open `http://localhost:3000` — sign up, create a workspace, connect Slack or GitHub.

---

## Environment Variables

All variables are Zod-validated at startup. The server refuses to boot on missing required values or insecure defaults in production.

### Required (all environments)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres direct connection (port 5432) — used for migrations |
| `DATABASE_URL_POOLED` | Pooled connection (port 6543 via Supabase) — used for all queries |
| `JWT_SECRET` | ≥32 chars in dev, ≥48 chars in prod. Must not be a known test value |

### Database (Supabase)

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | — | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_ANON_KEY` | — | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Supabase service role key (admin operations) |

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | — | `development` · `test` · `production` |
| `PORT` | `8080` | HTTP server port |
| `APP_URL` | `http://localhost:3000` | Frontend base URL (used in email links) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `LOG_LEVEL` | `info` | Pino log level |
| `SWAGGER_ENABLED` | `true` | Disable in production |

### Auth

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token lifetime |

### AI / ML (required in production)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key — used for WHY Engine composition |
| `GEMINI_MODEL` | `gemini-1.5-flash-latest` — LLM model |
| `COHERE_API_KEY` | Cohere API key — used for 1024-dim embed-v3 embeddings |

### Slack (required for Slack connector)

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Bot token (`xoxb-...`) |
| `SLACK_SIGNING_SECRET` | Webhook signature verification |
| `SLACK_APP_TOKEN` | Socket mode token (`xapp-...`) |
| `SLACK_CLIENT_ID` | OAuth client ID |
| `SLACK_CLIENT_SECRET` | OAuth client secret |

### GitHub (required for GitHub connector)

| Variable | Description |
|----------|-------------|
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key (PEM) |
| `GITHUB_WEBHOOK_SECRET` | Webhook HMAC signing secret |
| `GITHUB_CLIENT_ID` | OAuth client ID |
| `GITHUB_CLIENT_SECRET` | OAuth client secret |

### Google Cloud (required in production)

| Variable | Default | Description |
|----------|---------|-------------|
| `GCP_PROJECT_ID` | — | Google Cloud project ID |
| `GCP_REGION` | `us-central1` | Cloud region |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to service account JSON |
| `GCS_BUCKET_NAME` | `dyson-raw-events` | Raw event archive bucket |
| `CLOUD_TASKS_QUEUE_NAME` | `dyson-ingestion` | Cloud Tasks queue |
| `CLOUD_TASKS_LOCATION` | `us-central1` | Queue location |
| `CLOUD_TASKS_HANDLER_URL` | `http://localhost:8080/jobs` | Job handler endpoint |
| `PUBSUB_TOPIC_INGESTION` | `dyson-ingestion-events` | Ingestion Pub/Sub topic |
| `PUBSUB_TOPIC_PROCESSING` | `dyson-processing-events` | Processing topic |

### Redis (required in production)

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection URL — `rediss://default:<token>@<host>.upstash.io:6380` for Upstash. Required in production for distributed rate limiting across Cloud Run replicas. Falls back to per-instance in-memory limiting in dev. |

Recommended provider: **[Upstash Redis](https://upstash.com)** (serverless, pay-per-request, works without a VPC connector on Cloud Run).

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_MAX_PER_MINUTE` | `100` | Global per-IP rate limit |
| `WHY_ENGINE_RATE_LIMIT_MAX_PER_MINUTE` | `10` | Recall/WHY per-user rate limit (per-user key: `recall:{tenantId}:{userId}`) |

### Jobs & Email

| Variable | Default | Description |
|----------|---------|-------------|
| `JOB_SECRET` | (dev default) | Cloud Tasks auth secret for `/jobs` endpoint — ≥16 chars |
| `RESEND_API_KEY` | — | Resend API key (required for email in prod) |
| `RESEND_FROM_EMAIL` | `Dyson <noreply@dyson.ai>` | From address |

### Observability

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry DSN for error tracking |

---

## Database Schema

9 core tables across 5 schema files. All tenant-scoped tables include `tenant_id` and filter by it on every query — missing tenant scope is treated as a security bug.

```
tenants              workspaces (one per company)
users                team members, roles, email verification
refresh_tokens       hashed session tokens (HMAC-SHA256, O(1) lookup)
invitations          team invite tokens with expiry + RBAC role
connected_sources    OAuth integrations (Slack, GitHub…) per workspace

raw_events           normalized ingested events (idempotent on tenant+external_id+source)
context_nodes        extracted entities: decisions, incidents, PRs, messages
causal_edges         relationships between nodes (depends-on, causes, resolves…)
node_embeddings      1024-dim Cohere vectors; HNSW index for ANN search

why_queries          WHY Engine query history with confidence, citations, feedback
onboarding_packs     generated context packs (sections JSON, linked node IDs)
api_keys             scoped agent API keys (hashed, prefix-indexed)
audit_log            immutable action trail (actor, action, resource, IP, timestamp)
```

### Key constraints

- `raw_events` → unique on `(tenant_id, external_id, source)` — ingestion is idempotent
- `context_nodes` → unique on `(tenant_id, external_id, source)` — no duplicate nodes
- `causal_edges` → unique on `(source_node_id, target_node_id, relationship_type)`
- `node_embeddings` → HNSW index (`lists=100, ef_construction=200`) for sub-10ms ANN
- Vector search always joins through tenant-scoped nodes before similarity ranking

---

## Backend Modules

| Module | Route prefix | Responsibility |
|--------|-------------|----------------|
| **auth** | `/api/v1/auth` | Signup, login, refresh, logout, password reset, email verification, session management |
| **workspace** | `/api/v1/workspaces` | Workspace profile, plan, settings |
| **users** | `/api/v1/users` | Current user, team list, invitations, role management |
| **connectors** | `/api/v1/connectors` | OAuth setup + callback for Slack and GitHub; trigger backfill |
| **ingestion** | (internal) | Normalise Slack messages and GitHub events; write to `raw_events` |
| **processing** | (job handler) | Entity extraction, decision detection, Cohere embeddings, causal edge building |
| **graph** | `/api/v1/graph` | Read context nodes, edges, timeline queries |
| **decisions** | `/api/v1/decisions` | List and detail auto-detected decisions |
| **why** | `/api/v1/recall` | WHY Engine: hybrid retrieval → confidence gate → Gemini composition |
| **memory** | `/api/v1/memory` | Direct memory CRUD + agent writes |
| **search** | `/api/v1/search` | Full-text + semantic context search |
| **onboarding-packs** | `/api/v1/onboarding-packs` | Generate and retrieve team context packs |
| **api-keys** | `/api/v1/api-keys` | Create, list, revoke scoped API keys |
| **agent** | `/api/v1/agent` | REST API surface for external AI agents |
| **agent-layer/mcp** | `/mcp` | MCP Streamable HTTP transport + stdio bridge |
| **audit** | `/api/v1/audit-log` | Read workspace audit trail |
| **slack-bot** | (internal) | Answer queries in Slack, link threads to memory nodes |
| **github-bot** | (internal) | Annotate PRs with related decisions, comment on incidents |
| **webhooks** | `/webhooks` | Receive and verify Slack + GitHub push events |
| **jobs** | `/jobs` | Cloud Tasks job handlers (signed with `JOB_SECRET`) |

---

## API Reference

All endpoints return:

```jsonc
// Success
{ "data": <T>, "meta": { "cursor"?: string, "confidence"?: number } }

// Error
{ "error": { "code": "SNAKE_CASE_CODE", "message": "Human readable" } }
```

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/signup` | — | Create account + workspace |
| `POST` | `/login` | — | Email + password login, returns JWT pair |
| `POST` | `/refresh` | — | Rotate access token using refresh token |
| `POST` | `/logout` | JWT | Revoke current refresh token |
| `GET` | `/me` | JWT | Current user + workspace |
| `POST` | `/forgot-password` | — | Send reset email (stateless HMAC token) |
| `POST` | `/reset-password` | — | Consume reset token, set new password |
| `GET` | `/verify-email` | — | Confirm email with HMAC token |
| `POST` | `/resend-verification` | JWT | Re-send verification email |
| `POST` | `/change-password` | JWT | Change password (invalidates other sessions) |
| `GET` | `/invite/:token` | — | Preview invite details |
| `POST` | `/accept-invite` | — | Accept invite, create account |
| `GET` | `/sessions` | JWT | List active sessions |
| `DELETE` | `/sessions/:id` | JWT | Revoke a session |
| `DELETE` | `/sessions` | JWT | Revoke all sessions (sign out everywhere) |

### Recall / WHY Engine (`/api/v1/recall`)

Rate limited: **10 requests / minute / user**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Ask a question. Returns answer + citations + confidence. `cannotAnswer: true` when confidence < 0.72 |
| `GET` | `/history` | Paginated query history (cursor-based) |
| `GET` | `/:id` | Retrieve a specific query result |
| `PATCH` | `/:id/feedback` | Submit helpfulness score (`-1` or `1`) |

**Response shape:**

```jsonc
{
  "data": {
    "queryId": "rec_01j...",
    "question": "Why did we choose pgvector?",
    "answer": "The team chose pgvector in April 2025 because...",  // null if cannotAnswer
    "confidence": 0.91,
    "cannotAnswer": false,
    "citations": [
      {
        "claim": "pgvector was chosen for cost reasons",
        "sourceNodeId": "node_01j...",
        "sourceUrl": "https://slack.com/archives/...",
        "confidence": 0.88
      }
    ],
    "sourceNodes": [...]
  },
  "meta": { "confidence": 0.91, "cannotAnswer": false, "citationsCount": 3 }
}
```

### Memory (`/api/v1/memory`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Create a memory node (with immediate embedding) |
| `GET` | `/` | List memories (paginated, filterable by type) |
| `GET` | `/:id` | Get a single memory with linked nodes |
| `POST` | `/:id/link` | Create a causal edge between two memory nodes |
| `POST` | `/agent` | Agent-authenticated write (API key scope: `write`) |

### Graph (`/api/v1/graph`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/nodes` | List context nodes (filterable by type, source, date) |
| `GET` | `/nodes/:id` | Node detail with incoming + outgoing edges |
| `GET` | `/edges` | List causal edges |
| `GET` | `/timeline` | Chronological event timeline |

### Connectors (`/api/v1/connectors`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List connected sources for workspace |
| `GET` | `/slack/oauth` | Initiate Slack OAuth (signed state) |
| `GET` | `/slack/callback` | Slack OAuth callback |
| `POST` | `/slack/sync` | Trigger Slack backfill |
| `GET` | `/github/oauth` | Initiate GitHub OAuth |
| `GET` | `/github/callback` | GitHub OAuth callback |
| `POST` | `/github/sync` | Trigger GitHub backfill |

### Other endpoints

| Prefix | Description |
|--------|-------------|
| `/api/v1/decisions` | Decision log (list, detail, timeline) |
| `/api/v1/search` | Full-text + semantic search |
| `/api/v1/onboarding-packs` | Generate and retrieve onboarding packs |
| `/api/v1/api-keys` | API key CRUD (admin only) |
| `/api/v1/users` | Users + invitations |
| `/api/v1/workspaces` | Workspace settings |
| `/api/v1/audit-log` | Audit trail |
| `/api/v1/agent` | Agent REST API |
| `/webhooks/slack` | Slack Events API |
| `/webhooks/github` | GitHub webhook |
| `/jobs` | Cloud Tasks job handlers (signed) |
| `/health` | Liveness probe |
| `/health/ready` | Readiness probe (SELECT 1) |
| `/metrics` | 24h WHY stats + ingestion lag |
| `/mcp` | MCP Streamable HTTP |

---

## MCP Server

Dyson ships a native [Model Context Protocol](https://modelcontextprotocol.io/) server. Any MCP-compatible agent (Claude Desktop, Cursor, Continue, custom) can connect and read or write company memory.

### Tools

| Tool | Description |
|------|-------------|
| **`recall(question)`** | Ask anything about company history. Returns grounded answer + citations. If confidence < 0.72, returns raw source nodes instead of composing a narrative. |
| **`remember(title, content, type?, url?, metadata?)`** | Write a new memory (decision, incident, standard, context, constraint, outcome). Immediately searchable. |
| **`search_memory(query, type?, limit?)`** | Full-text + semantic search. Returns id, type, title, summary, source, confidence. |
| **`recent_memories(limit?, type?, minConfidence?)`** | Browse recent company memories. Useful at session start for situational awareness. |
| **`getMemory(id)`** | Read a full memory node with all linked memories and their relationship types. |
| **`workspace_context()`** | Full workspace snapshot: recent memories, recent recalls, graph stats. Call once at session start. |

### Agent prompts

Three role-specific system prompt templates are available via MCP:

| Prompt | Use case |
|--------|----------|
| `coding-agent` | Look up decisions before changing architecture; record new decisions after |
| `sre-agent` | Incident response, pattern matching against past incidents, post-mortem creation |
| `onboarding-agent` | New engineer ramp-up — pull relevant decisions, standards, and constraints |

### Connect (Streamable HTTP)

```
POST https://<your-api-url>/mcp
Authorization: Bearer dys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

### Connect (stdio — Claude Desktop / Cursor)

Add to `claude_desktop_config.json` or `~/.cursor/mcp.json`:

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

### Routes

| Path | Description |
|------|-------------|
| `/login` | Sign in |
| `/signup` | Create account + workspace (2-step) |
| `/forgot-password` | Request password reset |
| `/reset-password` | Confirm new password |
| `/accept-invite` | Accept team invitation |
| `/app` | Dashboard — greeting, recall box, stats, recent memories, activity feed |
| `/app/recall` | WHY Engine interface — ask questions, view confidence + citations |
| `/app/decisions` | Memory Graph — decision log with causal edges |
| `/app/onboarding-packs` | Team briefings — generated context packs |
| `/app/search` | Global search across all memories |
| `/app/settings/*` | Settings modal — Profile, Workspace, Sources, Members, Billing, API Keys, Audit, Security |

### Design system

- **Canvas:** `#FAFAF8` / **Surface:** `white` / **Border:** `#E8E7E5`
- **Primary:** `#5B5BD6` (indigo) / **Danger:** `#DC2626`
- **Font:** Geist Variable, 13–14px base, `letter-spacing: -0.01em`
- Collapsible sidebar (240px ↔ 56px), settings open as full-screen modal overlay
- Components: Radix UI primitives, Framer Motion, Lucide icons, Sonner toasts

---

## Deployment

Full runbook: **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**

### Summary

| Service | Platform |
|---------|----------|
| Backend API + MCP | Google Cloud Run |
| Job queue | Google Cloud Tasks |
| Event bus | Google Cloud Pub/Sub |
| Raw event archive | Google Cloud Storage |
| Database | Supabase (Postgres + pgvector) |
| Secrets | Google Secret Manager |
| Frontend | Vercel |
| CI/CD | Google Cloud Build |

### Health checks

```bash
curl https://<api-url>/health        # liveness
curl https://<api-url>/health/ready  # readiness (DB ping)
```

### Key operational notes

- `--min-instances=1` on Cloud Run to avoid cold starts on the API
- Migrations are forward-only and additive — never drop columns in the same migration that removes the code reference
- Audit log writes are fire-and-forget; they never block the request path
- Estimated cost at 100 active tenants: ~$400/month (Cloud Run + Supabase Pro + Gemini + Cohere)

---

## WHY Engine Contract

The WHY Engine will say **"I don't know"** rather than hallucinate.

```typescript
type WhyEngineResult = {
  queryId:      string
  question:     string
  answer:       string | null    // null when cannotAnswer is true
  citations:    Citation[]       // every factual claim cites a source node
  sourceNodes:  SourceNode[]     // raw evidence always returned
  confidence:   number           // 0–1
  cannotAnswer: boolean          // true when confidence < 0.72
  latencyMs:    number
}
```

- If `confidence < 0.72` → `cannotAnswer: true`, no LLM composition, raw nodes returned
- If LLM returns claims without valid citations → answer is rejected
- Every citation maps back to a real `context_node` with a `sourceUrl`
- All queries are logged with confidence score for observability

---

## Contributing

1. Read [`CLAUDE.md`](./CLAUDE.md) — engineering principles, module conventions, security rules
2. One logical change per PR; keep diffs small
3. Tenant isolation is mandatory — every query must include `tenant_id` filtering
4. External boundaries (request bodies, webhooks, LLM output) must use Zod
5. Do not log: query text, source content, tokens, passwords, emails

```bash
# Type check
cd backend && npm run typecheck
cd frontend && npm run typecheck     # or: npx tsc --noEmit

# Tests
cd backend && npm test

# Lint + format
cd backend && npm run lint && npm run format
```

---

*Built with TypeScript, Fastify, React, pgvector, Gemini, and the MCP protocol.*
