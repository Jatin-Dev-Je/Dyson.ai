import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/config/env.js'
import * as schema from './schema/index.js'

const connectionString =
  env.NODE_ENV === 'production' ? env.DATABASE_URL_POOLED : env.DATABASE_URL

const client = postgres(connectionString, {
  max:             env.NODE_ENV === 'production' ? 10 : 3,
  idle_timeout:    20,
  connect_timeout: 10,
  max_lifetime:    60 * 30,   // recycle connections every 30 min
  // Protect against runaway queries. WHY Engine at p99 is ~5s;
  // 15s gives 3x headroom and kills genuinely hung queries.
  connection: {
    statement_timeout: 15000,  // milliseconds
  },
})

export const db = drizzle(client, { schema })
export type Database = typeof db
