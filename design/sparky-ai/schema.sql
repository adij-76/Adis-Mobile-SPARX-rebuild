-- ============================================================================
-- Sparky knowledge base + chat memory — Postgres / pgvector setup
-- Run this ONCE against your existing Postgres database.
-- ============================================================================

-- 1) Enable the pgvector extension (the one step n8n can't do for you).
--    Requires a superuser/owner role. On Supabase/RDS it's usually available.
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Knowledge base table.
--    Holds chunked text from your books, lessons, workshops, and transcripts,
--    plus the OpenAI embedding for each chunk.
--    1536 = dimensions of text-embedding-3-small. (Use 3072 for -3-large.)
CREATE TABLE IF NOT EXISTS sparky_documents (
  id        BIGSERIAL PRIMARY KEY,
  content   TEXT NOT NULL,                 -- the chunk of text
  metadata  JSONB DEFAULT '{}'::jsonb,     -- {source, title, type, lesson_id, ...}
  embedding VECTOR(1536)
);

-- 3) Similarity-search index (cosine distance).
--    Build AFTER you've loaded a meaningful amount of data for best results.
CREATE INDEX IF NOT EXISTS sparky_documents_embedding_idx
  ON sparky_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Optional: index metadata for filtered retrieval (e.g. only "workshop" chunks).
CREATE INDEX IF NOT EXISTS sparky_documents_metadata_idx
  ON sparky_documents USING gin (metadata);

-- ----------------------------------------------------------------------------
-- 4) Chat memory.
--    n8n's "Postgres Chat Memory" node will auto-create its table on first use,
--    so you normally DON'T need to run this. Shown here for reference / if you
--    want to pre-create it. The node defaults to a table named like below.
-- ----------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS sparky_chat_histories (
--   id         SERIAL PRIMARY KEY,
--   session_id VARCHAR(255) NOT NULL,
--   message    JSONB NOT NULL
-- );
-- CREATE INDEX IF NOT EXISTS sparky_chat_histories_session_idx
--   ON sparky_chat_histories (session_id);

-- ============================================================================
-- NOTE on column names: n8n's "Postgres PGVector Store" node lets you set the
-- table name and the column names (content / metadata / embedding). Point it at
-- `sparky_documents` with columns content, metadata, embedding as above.
-- ============================================================================
