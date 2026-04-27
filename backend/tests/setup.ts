// Provide minimum env vars so imports of @/config/env don't process.exit during tests.
// Real integration tests should override DATABASE_URL with a local Supabase instance.
process.env.NODE_ENV                  ||= 'test'
process.env.DATABASE_URL              ||= 'postgres://test:test@localhost:5432/test'
process.env.DATABASE_URL_POOLED       ||= 'postgres://test:test@localhost:5432/test'
process.env.SUPABASE_URL              ||= 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY         ||= 'test_anon_key'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test_service_role_key'
process.env.JWT_SECRET                ||= 'test_jwt_secret_must_be_at_least_32_chars_long'
process.env.SWAGGER_ENABLED           ||= 'false'
