import { defineConfig } from 'drizzle-kit'

// drizzle-kit reads schemas directly — don't go through the Zod-validated env loader
// (which exits the process on missing prod secrets). DATABASE_URL is the only var needed here.
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://placeholder@localhost:5432/placeholder'

export default defineConfig({
  schema:  './src/infra/db/schema/*.schema.ts',
  out:     './src/infra/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict:  true,
})
