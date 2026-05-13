-- Phase 2, V005 — MCF (Module Creation File) library.
--
-- One row per MCF the user has authored for a workspace. The MCF itself is
-- stored as a JSON blob in `mcf_json` (parsed and validated via Zod on read).
-- `slug` and `display_name` are duplicated as columns so the list view doesn't
-- have to JSON-parse every row.
--
-- (workspace_id, slug) is the PK — slugs are unique within a workspace, but
-- two different workspaces can each have an MCF named, e.g., "spa".
-- FK CASCADE: deleting a workspace also drops its MCFs.

CREATE TABLE IF NOT EXISTS mcfs (
  workspace_id TEXT NOT NULL,
  slug         TEXT NOT NULL,
  display_name TEXT NOT NULL,
  mcf_json     TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (workspace_id, slug),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mcfs_workspace_updated
  ON mcfs (workspace_id, updated_at DESC);
