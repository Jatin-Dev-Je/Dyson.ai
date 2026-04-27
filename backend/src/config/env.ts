import { z } from 'zod'

const EnvSchema = z.object({
  // ── App ──────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(8080),

  // ── Database — required to boot ──────────────────────────────────────────
  DATABASE_URL: z.string().url(),
  DATABASE_URL_POOLED: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ── JWT — required to boot ────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // ── Slack — required for Week 2 (connector) ───────────────────────────────
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-').optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_APP_TOKEN: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),

  // ── GitHub — required for Week 2 (connector) ──────────────────────────────
  GITHUB_APP_ID: z.coerce.number().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // ── Google Cloud — required for Week 3 (queue/storage) ───────────────────
  GCP_PROJECT_ID: z.string().optional(),
  GCP_REGION: z.string().default('us-central1'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GCS_BUCKET_NAME: z.string().default('dyson-raw-events'),
  CLOUD_TASKS_QUEUE_NAME: z.string().default('dyson-ingestion'),
  CLOUD_TASKS_LOCATION: z.string().default('us-central1'),
  CLOUD_TASKS_HANDLER_URL: z.string().default('http://localhost:8080/jobs'),
  PUBSUB_TOPIC_INGESTION: z.string().default('dyson-ingestion-events'),
  PUBSUB_TOPIC_PROCESSING: z.string().default('dyson-processing-events'),
  PUBSUB_SUBSCRIPTION_PROCESSING: z.string().default('dyson-processing-sub'),
  PUBSUB_SUBSCRIPTION_GRAPH: z.string().default('dyson-graph-sub'),

  // ── AI — required for Week 4-5 ────────────────────────────────────────────
  COHERE_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash-latest'),

  // ── Rate limiting ─────────────────────────────────────────────────────────
  RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().default(100),
  WHY_ENGINE_RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().default(10),

  // ── CORS ──────────────────────────────────────────────────────────────────
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // ── Swagger ───────────────────────────────────────────────────────────────
  SWAGGER_ENABLED: z.string().transform(v => v === 'true').default('true'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('\n❌  Missing required environment variables:\n')
  const errors = parsed.error.flatten().fieldErrors
  Object.entries(errors).forEach(([key, msgs]) => {
    console.error(`   ${key}: ${msgs?.join(', ')}`)
  })
  console.error('\n   See backend/.env.example for reference.\n')
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
