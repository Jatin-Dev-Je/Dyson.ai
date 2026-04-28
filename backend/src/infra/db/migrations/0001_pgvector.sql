-- Enable pgvector. Required by node_embeddings.embedding (vector(1024)).
-- Idempotent — safe to re-run.
CREATE EXTENSION IF NOT EXISTS vector;
