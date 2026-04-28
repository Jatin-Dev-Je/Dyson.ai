-- HNSW index for fast approximate nearest-neighbour search on embeddings.
-- Cosine distance — matches the metric used in vector retrieval (CLAUDE.md §7).
-- Concurrent build keeps the table writeable during index creation.
CREATE INDEX IF NOT EXISTS embeddings_hnsw_idx
  ON node_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
