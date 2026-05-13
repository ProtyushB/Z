-- Phase 1, V002 — secrets table.
--
-- Stores credentials (GitHub PAT now; Anthropic API key later in Phase 3) as
-- base64-encoded ciphertext from Electron's `safeStorage.encryptString()`.
-- The encryption key is held by the OS keychain (Windows DPAPI on Windows,
-- Keychain on macOS, libsecret/kwallet on Linux), so the encrypted value is
-- only decryptable by the same OS user on the same machine.
--
-- (service, account) is the primary key: e.g., ("github", "<github-login>"),
-- ("anthropic", "default").

CREATE TABLE IF NOT EXISTS secrets (
  service         TEXT NOT NULL,
  account         TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,                 -- base64 ciphertext
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (service, account)
);
