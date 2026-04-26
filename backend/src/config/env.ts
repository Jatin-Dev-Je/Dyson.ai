import { z } from 'zod'

const EnvSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(8080),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_POOLED: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // Slack
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-'),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_APP_TOKEN: z.string().startsWith('xapp-'),
  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_CLIENT_SECRET: z.string().min(1),

  // GitHub
  GITHUB_APP_ID: z.coerce.number(),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),

  // Google Cloud
  GCP_PROJECT_ID: z.string().min(1),
  GCP_REGION: z.string().default('us-central1'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // Cloud Storage
  GCS_BUCKET_NAME: z.string().min(1),

  // Cloud Tasks
  CLOUD_TASKS_QUEUE_NAME: z.string().min(1),
  CLOUD_TASKS_LOCATION: z.string().default('us-central1'),
  CLOUD_TASKS_HANDLER_URL: z.string().url(),

  // Pub/Sub
  PUBSUB_TOPIC_INGESTION: z.string().min(1),
  PUBSUB_TOPIC_PROCESSING: z.string().min(1),
  PUBSUB_SUBSCRIPTION_PROCESSING: z.string().min(1),
  PUBSUB_SUBSCRIPTION_GRAPH: z.string().min(1),

  // Cohere
  COHERE_API_KEY: z.string().min(1),

  // Gemini
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash-latest'),

  // Rate limiting
  RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().default(100),
  WHY_ENGINE_RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().default(10),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Swagger
  SWAGGER_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
