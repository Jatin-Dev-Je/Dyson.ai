import { z } from 'zod'

// ─── Schema ────────────────────────────────────────────────────────────────
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

  // ── Slack ─────────────────────────────────────────────────────────────────
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-').optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_APP_TOKEN: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),

  // ── GitHub ────────────────────────────────────────────────────────────────
  GITHUB_APP_ID: z.coerce.number().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // ── Google Cloud ──────────────────────────────────────────────────────────
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

  // ── AI ────────────────────────────────────────────────────────────────────
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

  // ── Email — Resend (optional in dev, required in prod for invites + password reset) ──
  RESEND_API_KEY:    z.string().optional(),
  RESEND_FROM_EMAIL: z.string().min(1).default('Dyson <noreply@dyson.ai>'),
  APP_URL:           z.string().url().default('http://localhost:3000'),

  // ── Observability (optional in dev, recommended in prod) ──────────────────
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL:  z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})

// ─── Production safety guards ─────────────────────────────────────────────
// In production we refuse to boot if any default-/test-looking secret is present
// or if a critical operational dependency is missing. Failing closed here is
// cheaper than discovering it via a leaked token in the wild.
const KNOWN_TEST_SECRETS = new Set<string>([
  'test_jwt_secret_must_be_at_least_32_chars_long',
  'changeme', 'change_me', 'CHANGEME', 'secret', 'development', 'dev',
])

function assertProductionInvariants(env: z.infer<typeof EnvSchema>): string[] {
  const errors: string[] = []
  if (env.NODE_ENV !== 'production') return errors

  if (KNOWN_TEST_SECRETS.has(env.JWT_SECRET)) {
    errors.push('JWT_SECRET looks like a default/test value — refuse to boot in production')
  }
  if (env.JWT_SECRET.length < 48) {
    errors.push('JWT_SECRET must be ≥48 chars in production (`openssl rand -base64 64`)')
  }
  if (env.SWAGGER_ENABLED) {
    errors.push('SWAGGER_ENABLED must be false in production (do not expose API docs publicly)')
  }
  if (env.CORS_ORIGINS.includes('localhost')) {
    errors.push('CORS_ORIGINS must not include localhost in production')
  }
  if (env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('placeholder')) {
    errors.push('DATABASE_URL points at localhost/placeholder in production')
  }
  if (!env.GCP_PROJECT_ID) {
    errors.push('GCP_PROJECT_ID required in production (Cloud Tasks / Pub/Sub / Storage)')
  }
  if (!env.GEMINI_API_KEY) {
    errors.push('GEMINI_API_KEY required in production (WHY Engine cannot operate without it)')
  }
  if (!env.COHERE_API_KEY) {
    errors.push('COHERE_API_KEY required in production (vector search cannot operate without embeddings)')
  }
  return errors
}

// ─── Parse + report ──────────────────────────────────────────────────────
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

const prodErrors = assertProductionInvariants(parsed.data)
if (prodErrors.length > 0) {
  console.error('\n❌  Production environment invariant violations:\n')
  prodErrors.forEach(e => console.error(`   • ${e}`))
  console.error('\n   Refusing to boot — fix the configuration and redeploy.\n')
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
