import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/config/env.js'
import * as schema from './schema/index.js'

// Use the pooled connection in all environments.
// The direct connection (port 5432) can fail from some networks on Supabase free tier.
// The pooler (port 6543) is more reliable and handles connection limits correctly.
const connectionString = env.DATABASE_URL_POOLED

const client = postgres(connectionString, {
  max:             env.NODE_ENV === 'production' ? 10 : 5,
  idle_timeout:    30,
  connect_timeout: 15,
  max_lifetime:    60 * 30,
  connection: {
    statement_timeout: 15000,
  },
})

export const db = drizzle(client, { schema })
export type Database = typeof db
