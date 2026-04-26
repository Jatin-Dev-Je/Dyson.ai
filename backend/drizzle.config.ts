import { defineConfig } from 'drizzle-kit'
import { env } from './src/config/env.js'

export default defineConfig({
  schema: './src/infra/db/schema/*.schema.ts',
  out: './src/infra/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
})
