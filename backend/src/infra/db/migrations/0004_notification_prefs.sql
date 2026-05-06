-- Migration: 0004_notification_prefs
-- Adds notification_prefs table for per-user, per-channel notification settings.
-- Run in Supabase SQL Editor or via: npm run db:migrate

CREATE TABLE IF NOT EXISTS "notification_prefs" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "users"("id")    ON DELETE CASCADE,
  "tenant_id"  UUID NOT NULL REFERENCES "tenants"("id")  ON DELETE CASCADE,
  "email"      JSONB NOT NULL DEFAULT '{}',
  "slack"      JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "notif_prefs_user_idx"   ON "notification_prefs" ("user_id");
CREATE        INDEX IF NOT EXISTS "notif_prefs_tenant_idx" ON "notification_prefs" ("tenant_id");
