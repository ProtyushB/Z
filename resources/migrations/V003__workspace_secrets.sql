-- Phase 1, V003 — workspace-scoped secrets.
--
-- V002 introduced a global `secrets` table. Chunk 5 pivots to per-workspace
-- credentials so the user can use different GitHub identities for different
-- workspaces (personal + work account, etc.). The original `secrets` table
-- stays for workspace-agnostic credentials (Anthropic API key in Phase 3).
--
-- Migration semantics:
--   1. Create the new table.
--   2. Copy any existing global GitHub PATs into every existing workspace, so
--      the user doesn't have to re-paste their token. They can sign out
--      per-workspace and re-paste a different token to differentiate.
--   3. Drop the global GitHub PATs (they're now redundant and would otherwise
--      be orphaned from any UI path).

CREATE TABLE IF NOT EXISTS workspace_secrets (
  workspace_id    TEXT NOT NULL,
  service         TEXT NOT NULL,
  account         TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (workspace_id, service),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO workspace_secrets (workspace_id, service, account, encrypted_value, updated_at)
SELECT w.id, s.service, s.account, s.encrypted_value, s.updated_at
FROM workspaces w
CROSS JOIN secrets s
WHERE s.service = 'github';

DELETE FROM secrets WHERE service = 'github';
