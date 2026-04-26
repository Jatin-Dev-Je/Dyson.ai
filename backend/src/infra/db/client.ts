import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/config/env.js'
import * as schema from './schema/index.js'

// Use pooled URL in production (Supabase PgBouncer), direct in dev/migrations
const connectionString =
  env.NODE_ENV === 'production' ? env.DATABASE_URL_POOLED : env.DATABASE_URL

const client = postgres(connectionString, {
  max: env.NODE_ENV === 'production' ? 10 : 3,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema })
export type Database = typeof db
