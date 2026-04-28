# Dyson — Deployment Guide

End-to-end runbook for deploying Dyson to **Google Cloud Run + Supabase**.
Scope: backend API + MCP. Frontend deploys separately to Vercel (or any static host).

---

## 0. Prereqs (one-time, ~30 min)

- A **Supabase** project — note the project ref, anon key, service-role key, DB URL.
- A **Google Cloud** project with billing enabled.
- `gcloud` CLI installed and authenticated (`gcloud auth login`).
- A registered **Slack App** (for OAuth + Events) and **GitHub App** (for repo events + backfill).
- A **Gemini** API key (https://aistudio.google.com/app/apikey).
- A **Cohere** API key (https://dashboard.cohere.com).

---

## 1. Database — Supabase

### 1a. Enable pgvector
Run in the Supabase SQL editor (or `psql`):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 1b. Run migrations

From `backend/`:

```bash
DATABASE_URL='postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres' \
  npm run db:migrate
```

This applies:
- `0000_initial.sql` — all 13 tables, enums, indexes
- `0001_pgvector.sql` — extension (idempotent)
- `0002_hnsw_index.sql` — HNSW index on `node_embeddings`

Verify in Supabase dashboard → Table Editor — you should see all tables.

---

## 2. Secrets — Google Secret Manager

Never put secrets in env vars on Cloud Run directly — use Secret Manager and mount.

```bash
PROJECT=dyson-prod   # your GCP project id

# JWT secret — at least 48 chars (env.ts refuses defaults in prod)
openssl rand -base64 64 | gcloud secrets create dyson-jwt-secret --data-file=- --project=$PROJECT

# Database
echo -n 'postgres://...:5432/postgres'        | gcloud secrets create dyson-db-url        --data-file=- --project=$PROJECT
echo -n 'postgres://....pooler.supabase.com'  | gcloud secrets create dyson-db-url-pooled --data-file=- --project=$PROJECT
echo -n 'eyJ...'                              | gcloud secrets create dyson-supabase-anon --data-file=- --project=$PROJECT
echo -n 'eyJ...'                              | gcloud secrets create dyson-supabase-srv  --data-file=- --project=$PROJECT

# AI
echo -n 'AIza...' | gcloud secrets create dyson-gemini-key  --data-file=- --project=$PROJECT
echo -n '...'     | gcloud secrets create dyson-cohere-key  --data-file=- --project=$PROJECT

# Slack
echo -n 'xoxb-...'  | gcloud secrets create dyson-slack-bot-token  --data-file=- --project=$PROJECT
echo -n '...'       | gcloud secrets create dyson-slack-signing    --data-file=- --project=$PROJECT
echo -n '...'       | gcloud secrets create dyson-slack-client-id  --data-file=- --project=$PROJECT
echo -n '...'       | gcloud secrets create dyson-slack-client-sec --data-file=- --project=$PROJECT

# GitHub App — private key includes literal newlines; preserve them
gcloud secrets create dyson-gh-private-key --data-file=path/to/private-key.pem --project=$PROJECT
echo -n '...'       | gcloud secrets create dyson-gh-webhook-secret --data-file=- --project=$PROJECT
```

Grant the runtime service account access:

```bash
SERVICE_ACCOUNT=$(gcloud iam service-accounts list \
  --filter='displayName:Default compute service account' \
  --format='value(email)' --project=$PROJECT)

for s in dyson-jwt-secret dyson-db-url dyson-db-url-pooled dyson-supabase-anon \
         dyson-supabase-srv dyson-gemini-key dyson-cohere-key dyson-slack-bot-token \
         dyson-slack-signing dyson-slack-client-id dyson-slack-client-sec \
         dyson-gh-private-key dyson-gh-webhook-secret; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT
done
```

---

## 3. Cloud Tasks (job queue)

```bash
gcloud tasks queues create dyson-ingestion --location=us-central1 --project=$PROJECT
```

---

## 4. Cloud Storage (raw event archive)

```bash
gsutil mb -p $PROJECT -l us-central1 -b on gs://dyson-raw-events
```

---

## 5. Build & deploy the backend

From the repo root:

```bash
PROJECT=dyson-prod
REGION=us-central1
SERVICE=dyson-api

gcloud builds submit ./backend \
  --tag=gcr.io/$PROJECT/$SERVICE:$(git rev-parse --short HEAD) \
  --project=$PROJECT

gcloud run deploy $SERVICE \
  --image=gcr.io/$PROJECT/$SERVICE:$(git rev-parse --short HEAD) \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=20 \
  --timeout=300s \
  --set-env-vars=NODE_ENV=production,GCP_PROJECT_ID=$PROJECT,GCP_REGION=$REGION,GCS_BUCKET_NAME=dyson-raw-events,CLOUD_TASKS_QUEUE_NAME=dyson-ingestion,CLOUD_TASKS_HANDLER_URL=https://YOUR-CLOUD-RUN-URL/jobs,SWAGGER_ENABLED=false,CORS_ORIGINS=https://app.dyson.ai \
  --set-secrets=DATABASE_URL=dyson-db-url:latest,DATABASE_URL_POOLED=dyson-db-url-pooled:latest,SUPABASE_URL=dyson-supabase-url:latest,SUPABASE_ANON_KEY=dyson-supabase-anon:latest,SUPABASE_SERVICE_ROLE_KEY=dyson-supabase-srv:latest,JWT_SECRET=dyson-jwt-secret:latest,GEMINI_API_KEY=dyson-gemini-key:latest,COHERE_API_KEY=dyson-cohere-key:latest,SLACK_BOT_TOKEN=dyson-slack-bot-token:latest,SLACK_SIGNING_SECRET=dyson-slack-signing:latest,SLACK_CLIENT_ID=dyson-slack-client-id:latest,SLACK_CLIENT_SECRET=dyson-slack-client-sec:latest,GITHUB_APP_PRIVATE_KEY=dyson-gh-private-key:latest,GITHUB_WEBHOOK_SECRET=dyson-gh-webhook-secret:latest \
  --project=$PROJECT
```

After the first deploy, **rerun** the command with `CLOUD_TASKS_HANDLER_URL` pointed at the actual Cloud Run URL.

---

## 6. Verify

```bash
URL=$(gcloud run services describe dyson-api --region=us-central1 --project=$PROJECT --format='value(status.url)')

curl -fsS $URL/health           # → {"status":"ok",...}
curl -fsS $URL/health/ready     # → {"status":"ok"}  (200 means DB reachable)
```

---

## 7. MCP — connect Claude Desktop / Cursor

### Option A: Hosted MCP (over the deployed `/mcp` endpoint)

Any MCP-compatible client that supports Streamable HTTP can connect to:

```
POST https://<your-cloud-run-url>/mcp
Authorization: Bearer dys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Create the API key in the app at `/settings/api-keys` (admin only).

### Option B: Local stdio bridge (recommended for Cursor/Claude Desktop)

```json
{
  "mcpServers": {
    "dyson": {
      "command": "npx",
      "args": ["-y", "@dyson-ai/mcp"],
      "env": {
        "DYSON_API_URL": "https://<your-cloud-run-url>",
        "DYSON_API_KEY": "dys_xxxxxxxx"
      }
    }
  }
}
```

(For now, until the package is published to npm, use the local build:
`"command": "node", "args": ["/abs/path/to/backend/dist/modules/agent-layer/mcp/stdio.js"]`)

---

## 8. Webhook setup

### Slack
- Event Subscriptions URL: `https://<your-cloud-run-url>/webhooks/slack`
- Subscribe to: `message.channels`, `message.groups`, `message.im`
- Add OAuth scopes: `channels:history`, `channels:read`, `groups:history`, `users:read`

### GitHub
- Webhook URL: `https://<your-cloud-run-url>/webhooks/github`
- Content type: `application/json`
- Secret: same value as `GITHUB_WEBHOOK_SECRET`
- Events: `pull_request`, `issues`, `issue_comment`, `pull_request_review`, `pull_request_review_comment`

---

## 9. Frontend (Vercel)

```bash
cd frontend
vercel --prod
# Set env: VITE_API_URL=https://<your-cloud-run-url>
```

Add the deployed frontend origin to `CORS_ORIGINS` on the backend, then redeploy.

---

## Rollback

```bash
gcloud run services update-traffic dyson-api \
  --to-revisions=PREVIOUS_REVISION_NAME=100 \
  --region=us-central1 --project=$PROJECT
```

List revisions with:

```bash
gcloud run revisions list --service=dyson-api --region=us-central1 --project=$PROJECT
```

---

## Operational notes

- **Migrations** are forward-only (additive per CLAUDE.md §7). Never drop columns in the same migration that removes their code reference; deprecate first.
- **Cold starts**: keep `--min-instances=1` for the API. The job handlers can scale to zero.
- **Costs at 100 active tenants** (rough order): Cloud Run ≈ $80/mo, Supabase Pro $25, Gemini Flash on WHY queries ≈ $200, Cohere embeddings ≈ $50, Cloud Tasks/Storage negligible. Total ~$400/mo.
- **`/health/ready`** does a `SELECT 1` — it's the right Cloud Run readiness probe.
- **Audit log** writes are fire-and-forget; never block the request path.
