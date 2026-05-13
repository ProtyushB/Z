-- Phase 1, V001 — initial schema.
-- `__migrations` is also bootstrapped by the migrator (CREATE TABLE IF NOT EXISTS)
-- before this file runs; the duplicate here is intentional and harmless.

CREATE TABLE IF NOT EXISTS __migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- One row per registered workspace.
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  backend_repo_url TEXT NOT NULL,
  frontend_repo_url TEXT NOT NULL,
  backend_local_path TEXT,                       -- null until cloned (Chunk 4)
  frontend_local_path TEXT,                      -- null until cloned (Chunk 4)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces (created_at DESC);
