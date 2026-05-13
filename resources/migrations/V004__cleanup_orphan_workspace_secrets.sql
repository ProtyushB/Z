-- Phase 1, V004 — clean up orphan workspace_secrets rows.
--
-- V003 declared `FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE`
-- on workspace_secrets, but SQLite's foreign-key enforcement is OFF by default
-- and we weren't enabling it on the connection. So workspace deletes between
-- V003 and the client.ts pragma fix did NOT cascade, leaving orphan rows.
--
-- From V004 onward, the connection sets `PRAGMA foreign_keys = ON` on every
-- open (see client.ts), so future deletes cascade automatically. This
-- migration is a one-time cleanup of the orphans that piled up before the fix.

DELETE FROM workspace_secrets
WHERE workspace_id NOT IN (SELECT id FROM workspaces);
