# Dyson

> **The system of record for why.**

Dyson is context infrastructure for modern companies. It connects the fragments of work scattered across Slack, GitHub, Notion, Linear, and meetings into a single, queryable graph — and explains the reasoning behind every decision, change, and outcome.

---

## Table of Contents

- [The Thesis](#the-thesis)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Data Model](#data-model)
- [AI / ML System](#ai--ml-system)
- [Tech Stack](#tech-stack)
- [Wedge: Engineering WHY](#wedge-engineering-why)
- [Competitive Landscape](#competitive-landscape)
- [Trust, Explainability & Safety](#trust-explainability--safety)
- [Go-to-Market & Pricing](#go-to-market--pricing)
- [Roadmap](#roadmap)
- [Risks & Mitigations](#risks--mitigations)
- [Long-Term Vision](#long-term-vision)

---

## The Thesis

By 2026, every team has an AI copilot — but copilots are only as smart as the context they can reach. The companies that win the next decade will be the ones whose institutional memory is structured, queryable, and trusted. Dyson is that layer.

| Metric | Value |
|--------|-------|
| Time engineers spend reconstructing context per week | 28% (McKinsey, 2024) |
| Annual cost of context loss per 100-person company | ~$1.3M (Dyson estimate) |
| Median time to find rationale behind a 6-month-old decision | 1 day |

**AI agents are about to become coworkers. A coworker without context is useless. Dyson is the substrate that gives every human and every agent in your company the same grounded, citable understanding of why things are the way they are.**

---

## The Problem

Modern companies generate enormous amounts of structured signal — and almost none of it is connected. The cost is invisible until you measure it.

### Where context lives today

Work is fragmented across at least five surfaces, each owning only a slice of the story:

| Surface | What it stores |
|---------|---------------|
| Slack / Teams | Real-time conversation, decisions made in threads |
| GitHub / GitLab | Code, PRs, issues, the literal change |
| Notion / Confluence | Long-form documentation and ADRs |
| Linear / Jira / Asana | Task state and prioritization |
| Zoom / Google Meet | Meetings where most decisions actually happen |

### The four costs of fragmentation

**Context loss** — Decisions made in Slack threads vanish from institutional memory within weeks. By the time the next engineer asks why, the people who knew have moved on.

**No "why" layer** — Tools store outcomes (a merged PR, a closed ticket) but not reasoning. The chain — issue → discussion → decision → code → outcome — is never assembled.

**Slow onboarding** — New hires take 3–6 months to become productive, with most of that time spent re-deriving knowledge that already exists in someone's DMs.

**Agents fly blind** — AI copilots can read any single source — but no copilot can yet answer "what conversations led to this code being written?" without hallucinating.

### Why this problem is now acute

Three forces collided between 2024 and 2026 to make context the bottleneck:

1. **Distributed-first work** moved decisions from whiteboards into chat, where they decay invisibly.
2. **AI agents entered every workflow** — and revealed that retrieval without grounding produces confident nonsense.
3. **The cost of code dropped sharply**, making the cost of *understanding* code the dominant constraint on engineering throughput.

---

## The Solution

Existing tools are systems of record for *what* happened. Slack records messages; GitHub records commits; Linear records tickets. None of them record the relationships between these events, and none of them record the reasoning that connects them.

**Dyson is a system of record for context.**

> **The core insight:** Causality is not a property of a single tool — it is a property of the graph between tools. Until that graph is built explicitly, no amount of better search or smarter LLMs solves the WHY problem.

### What Dyson is

- An **ingestion layer** that pulls events from Slack, GitHub, Notion, Linear, and meeting transcripts in real time.
- A **processing pipeline** that extracts entities, decisions, and intents, and embeds every artifact for semantic retrieval.
- A **context graph** that links People → Messages → Issues → PRs → Decisions → Outcomes with typed, time-stamped edges.
- A **query engine** that combines structured graph traversal with semantic search and grounded LLM reasoning to answer WHY questions.
- An **agent API** that exposes the same graph to AI agents, so any agent in your stack can act with full company context.

### What Dyson is not

- **Not enterprise search.** Search returns documents. Dyson returns explanations grounded in linked events.
- **Not a chatbot.** Chatbots answer in isolation. Dyson answers from a structured graph it can show you.
- **Not a replacement for Slack, GitHub, or Notion.** Dyson is the layer between them — it makes the existing stack legible.

---

## Core Features

### 1. Time-Travel WHY Engine
Ask any "why" question in natural language. Dyson reconstructs a timeline of source events (messages, issues, PRs, meeting moments) and explains the causal chain. Every claim is cited; every citation is one click from the original artifact.

**Example query:** *"Why did the auth refactor ship the way it did?"*

```
Mar 12 — #incidents thread: rate-limit bug reported
Mar 13 — GitHub issue #4421 opened, linked to thread
Mar 14 — RFC drafted in Notion (3 contributors)
Mar 17 — design review meeting, decision: "swap to JWT, deprecate sessions"
Mar 19 — PR #4502 merged (cites RFC and meeting)
Mar 22 — deployment, no further incidents
```
*Every line is a clickable citation back to the source event.*

### 2. Context Graph
A typed, temporal graph of People, Messages, Documents, Code Changes, Decisions, and Tasks — connected by relationships such as `leads_to`, `depends_on`, `discussed_in`, and `decided_by`. The graph is the durable asset — it compounds in value over time.

### 3. Universal Context Search
Hybrid retrieval: structured graph traversal combined with dense vector search and BM25 ranking. Results carry provenance and confidence scores.

### 4. Agent Context API
An MCP-compatible endpoint that lets any AI agent — your code copilot, your support bot, your internal automation — query the same grounded context graph that humans use.

### 5. Decision Tracking
Decisions are first-class entities. Dyson detects them in conversation and meetings, links them to the artifacts that triggered them and the changes they produced, and surfaces a queryable Decision Log per team.

### 6. Meeting Intelligence
Meetings are transcribed, segmented by topic, and folded into the graph. Decisions and action items become nodes with edges to the relevant Slack threads and PRs.

### 7. Developer Intelligence
Explain a system, a service boundary, or the blast radius of a proposed change — grounded in commit history, ADRs, and recent incidents.

### 8. Continuous Learning
Every user interaction (citations clicked, answers rated, links accepted) improves linking and retrieval quality. The graph gets smarter with use.

---

## System Architecture

Modular monolith today, evolving to event-driven services as ingestion throughput crosses the **1M-events-per-tenant-per-day** threshold. Optimized for shipping speed now, with clean module boundaries that make later extraction cheap.

### Data Flow

```
External tools → Ingestion → Processing → Graph + Embeddings → Query Engine → Humans & Agents
```

Each arrow is an **asynchronous, idempotent boundary**. Re-ingestion is safe and routine; the graph is always rebuildable from raw event logs.

### Modules

| Module | Responsibility |
|--------|---------------|
| **Ingestion** | Connectors for Slack, GitHub, Notion, Linear, Zoom, Google Meet. Webhook-first, with reconciling pollers. |
| **Processing** | Entity extraction, intent classification, decision detection, embedding generation. |
| **Context Graph** | Postgres + a graph layer for typed temporal edges. |
| **Embedding Store** | FAISS for hot indexes, pgvector for tenant-scoped long-term storage. |
| **Query Engine** | Hybrid retrieval, graph-walk planning, RAG with structured citations. |
| **Agent Layer** | MCP-compatible API, OAuth-scoped, with per-tool rate limiting. |

---

## Data Model

### Entities

```
User
Message
Document
Code Change
Decision
Task
Meeting Moment
```

### Relationship Types

```
leads_to
depends_on
discussed_in
decided_by
resolves
supersedes
```

### Graph Shape

```
User ──discussed_in──► Message ──leads_to──► Decision
                          │                      │
                     discussed_in            decided_by
                          │                      │
                          ▼                      ▼
                       Meeting              Code Change
                       Moment    ─resolves─►    (PR)
                                                 │
                                            depends_on
                                                 │
                                                 ▼
                                              Task
```

---

## AI / ML System

| Component | Description |
|-----------|-------------|
| **Embeddings** | Semantic retrieval with per-tenant fine-tuning over time |
| **Entity & Decision Extraction** | Small distilled model on the hot path for entity recognition and decision detection |
| **Cross-Source Linking** | The proprietary core — a model that scores the probability that event A caused event B, trained on labeled causal trajectories |
| **Temporal Reasoning** | Explicit time-aware graph walks; the LLM is not trusted to keep dates straight |
| **Causal RAG** | The LLM composes the explanation, but only over events the graph engine retrieved — no free generation |

---

## Tech Stack

### Backend
- **Runtime:** Node.js + TypeScript

### ML Services
- **Framework:** Python + FastAPI
- **Models:** HuggingFace, custom cross-source linkers

### Data
- **Primary DB:** Postgres + pgvector
- **Hot vector index:** FAISS
- **Raw event storage:** S3

### Infrastructure
- **Cloud:** Google Cloud
- **Compute:** Cloud Run
- **Messaging:** Pub/Sub + Cloud Tasks

---

## Wedge: Engineering WHY

We are not selling "context for everyone." We are selling a specific painful workflow first — and earning the right to expand from there.

### First customer: 30–200-person engineering teams
Series A to Series C software companies that are past the "everyone knows everything" stage but pre-platform-team scale.

### Flagship workflows

**Workflow A — Post-mortem reconstruction**
An engineer asks why something shipped the way it did. Dyson returns a reconstructed causal timeline with citations back to the original Slack threads, GitHub issues, Notion docs, and meeting moments.

**Workflow B — Onboarding context packs**
A new hire joins a team. Dyson generates a personalized context pack: the key decisions that shaped the current architecture, the people who made them, the trade-offs considered and rejected, and open questions still on the team's plate.

### Why these workflows
- **Acute, recurring pain** — every team does post-mortems and onboards engineers, repeatedly.
- **Bounded scope** — we do not need to know everything about your company to be useful here.
- **Demoable in 10 minutes** — connect Slack + GitHub, ask one WHY question, see the value.
- **Champion-shaped** — engineering managers feel this pain personally and have line-item budget for tooling.

---

## Competitive Landscape

| Player | What they do | Where Dyson differs |
|--------|-------------|---------------------|
| Glean / Microsoft Copilot | Federated enterprise search; LLM Q&A over indexed content | We build a typed causal graph, not just an index. Answers carry timelines and provenance, not summaries. |
| Notion AI / Slack AI | AI inside a single surface | Single-tool AI cannot reconstruct cross-tool causality. Dyson connects what they each see in isolation. |
| ChatGPT Enterprise + connectors | General-purpose assistant with read access to a few sources | We are infrastructure, not an assistant. We power assistants — including ChatGPT — with grounded context via the Agent API. |
| Mem / Sana / Dust | Knowledge management for general teams | We are technical-team-first, with deep GitHub and meeting intelligence and a graph engineers can trust. |
| DIY (RAG over Slack export) | Internal tools built on LangChain / vector DBs | Building this well takes 18+ months and an ML team. Dyson is the buy-vs-build answer. |

### Durable moats

1. **Graph compounding** — The longer Dyson runs in your company, the more valuable the graph becomes and the harder it is to rip out. Switching cost grows monotonically with usage.
2. **Cross-source linking IP** — The hard problem is not retrieval — it is identifying which Slack thread caused which PR. We are building proprietary evaluation sets and linking models around this exact task.
3. **Trust surface** — Citations + confidence + audit log. Once a team trusts Dyson for post-mortems, they trust it for performance reviews, planning, and agent automation.
4. **Agent-native distribution** — As AI agents proliferate, the company that owns the context endpoint they all call becomes the default integration. MCP positions us for this directly.

---

## Trust, Explainability & Safety

A WHY engine that hallucinates is worse than no WHY engine at all. One confidently wrong post-mortem destroys the trust that justifies the product. **Trust is not a feature — it is the entire game.**

### Five trust mechanisms baked into the product

1. **Citations on every claim** — No sentence is generated without an attached source event. Uncited claims are suppressed by the response policy.
2. **Confidence scoring** — Every causal link carries a calibrated confidence. Below threshold, Dyson says "I don't know" or returns the underlying events without an interpretation.
3. **Reversible conclusions** — Users can mark a link as wrong; the correction feeds the linking model and is logged in the audit trail.
4. **Human-in-the-loop on high-stakes outputs** — Decision logs and post-mortems include a one-click "verify with author" flow.
5. **Source-faithful redaction** — If a user does not have access to a source channel, Dyson returns no claim derived from it — full stop, with no leakage via summary.

### Privacy & access controls

- **Permission-aware ingestion:** Dyson never sees what the requesting user cannot see.
- **Tenant isolation** at the database, embedding store, and graph layer.
- **Customer-controlled redaction rules** for sensitive channels (HR, legal, security).
- **SOC 2 Type II** target by Q4 2026; HIPAA path on enterprise tier.

---

## Go-to-Market & Pricing

### Ideal customer profile

- **Stage:** Series A to Series C, 30–200 engineers
- **Stack:** Slack + GitHub at minimum; bonus for Notion and Linear
- **Pain trigger:** Recent painful onboarding, a post-mortem with missing context, or an exec asking "why did we build this?"
- **Champion:** Head of Engineering, VP Eng, or Eng Ops lead

### GTM motion

1. **Slack-first install** — three-click connect, value visible in <1 hour
2. **Bottoms-up:** free for the first 5 seats and 90 days of history
3. **Land** on the WHY engine for one team; **expand** to org-wide context and the Agent API as adjacent teams pull it in
4. **Content engine** — public post-mortem teardowns, eng-leader podcast tour, conference talks on "agent-grade context"
5. **Design partners first:** 8–12 hand-picked teams, weekly feedback loops, co-published case studies in Q3 2026

### Pricing

| Tier | Limits | Price |
|------|--------|-------|
| **Free** | Up to 5 users, 90 days of history, Slack + GitHub only | $0 |
| **Team** | Up to 50 users, full history, all connectors, Decision Log, Agent API (read) | $25 / user / month |
| **Business** | Unlimited users, SOC 2, custom retention, SSO, audit log, priority support | $45 / user / month |
| **Enterprise** | VPC option, custom DPA, HIPAA path, dedicated success | Custom |

### Success metrics (12-month targets)

| Metric | Target |
|--------|--------|
| North-star: Cited Answers per Active User per Week | Measures real, grounded usage |
| Activation: teams asking 5+ WHY questions in week one | 70% |
| Retention: net dollar retention by month 12 on Team plan | >120% |
| Trust: cited answers flagged as incorrect | <3% |
| Trust: citation click-through rate | >90% |

---

## Roadmap

### Phase 1 — Wedge (Q2–Q3 2026)
- Slack + GitHub connectors
- WHY Engine (core product)
- Post-mortem and onboarding workflows
- 8–12 design partners
- Public eval suite

### Phase 2 — Graph (Q4 2026 – Q1 2027)
- Notion + Linear + meetings ingestion
- Cross-source causal linking v2
- Decision Log GA
- Self-serve Team plan
- SOC 2 Type II

### Phase 3 — Agents (2027)
- Public Agent Context API
- MCP server in production
- Partnerships with code copilots and support agents
- Enterprise tier with VPC

### Phase 4 — OS (2028+)
Dyson becomes the default context endpoint for AI-native companies — the layer every human and every agent calls before acting.

---

## Risks & Mitigations

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Hallucination** | A confidently wrong WHY answer destroys trust permanently | Citations enforced by response policy; calibrated confidence; "I don't know" is a first-class output |
| **Crowded space** | Glean, Notion AI, Slack AI all overlap our demo surface | Engineering-team wedge with deep code+meeting linking; we are infrastructure, not a chat app — sold accordingly |
| **Privacy** | Cross-source ingestion looks scary to security teams | Permission-aware retrieval, tenant isolation, customer-controlled redaction, SOC 2, optional VPC deployment |
| **Linking quality** | Wrong edges in the graph poison every downstream answer | Public eval set; user-correctable links; threshold-gated edge publication; continuous active learning |
| **Name collision** | "Dyson" overlaps a major consumer brand, complicating SEO and trademark | Trademark cleared in B2B SaaS class; rebrand reserved as a Series A option if growth demands it |

---

## Long-Term Vision

Every company in five years will run on a hybrid workforce of humans and agents. Both will be useless without grounded, structured, auditable context. Dyson is building that layer — the one neither incumbents nor general-purpose assistants are positioned to own.

> Slack is chat. GitHub is code. Notion is docs. Linear is tasks.
> **Dyson is the layer that explains why any of it happened — to anyone, human or agent, who needs to know.**

---

**Others store what. Dyson explains why.**

We are building the context infrastructure that human teams and AI agents alike will depend on to act with judgment instead of guesswork. Start with engineering post-mortems. End as the system of record every company runs on.
