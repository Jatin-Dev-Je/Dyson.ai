-- Email verification — add email_verified_at to users
-- Existing users are treated as unverified; they will receive a prompt on next login.
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;
