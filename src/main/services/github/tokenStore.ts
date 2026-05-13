import { safeStorage } from 'electron'
import { queryOne, run, persist } from '../db/client'
import { logger } from '../../logger'

// Two stores live here:
//   • `secretStore`          — global, workspace-agnostic (Anthropic API key in Phase 3)
//   • `workspaceSecretStore` — per-workspace (GitHub PATs from Chunk 5 onward)
//
// Both encrypt at rest via Electron's safeStorage, which wraps OS-level
// keychain primitives (DPAPI on Windows, Keychain on macOS, libsecret on Linux).
// Decryption only works for the same OS user on the same machine.

interface SecretRow {
  encrypted_value: string
}

// ── Global secrets ──────────────────────────────────────────────────────────

export const secretStore = {
  available(): boolean {
    return safeStorage.isEncryptionAvailable()
  },

  save(service: string, account: string, plaintext: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS-level encryption (safeStorage) is not available on this platform')
    }
    const encrypted = safeStorage.encryptString(plaintext).toString('base64')
    run(
      `INSERT INTO secrets (service, account, encrypted_value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (service, account) DO UPDATE SET
         encrypted_value = excluded.encrypted_value,
         updated_at      = excluded.updated_at`,
      [service, account, encrypted, new Date().toISOString()]
    )
    persist()
  },

  read(service: string, account: string): string | null {
    const row = queryOne<SecretRow>(
      'SELECT encrypted_value FROM secrets WHERE service = ? AND account = ?',
      [service, account]
    )
    if (!row) return null
    try {
      return safeStorage.decryptString(Buffer.from(row.encrypted_value, 'base64'))
    } catch (err) {
      logger.warn({ service, account, err: (err as Error).message }, 'failed to decrypt secret')
      return null
    }
  },

  delete(service: string, account: string): void {
    run('DELETE FROM secrets WHERE service = ? AND account = ?', [service, account])
    persist()
  }
}

// ── Per-workspace secrets ──────────────────────────────────────────────────

interface WorkspaceSecretRow {
  account: string
  encrypted_value: string
}

export const workspaceSecretStore = {
  save(workspaceId: string, service: string, account: string, plaintext: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS-level encryption (safeStorage) is not available on this platform')
    }
    const encrypted = safeStorage.encryptString(plaintext).toString('base64')
    run(
      `INSERT INTO workspace_secrets (workspace_id, service, account, encrypted_value, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (workspace_id, service) DO UPDATE SET
         account         = excluded.account,
         encrypted_value = excluded.encrypted_value,
         updated_at      = excluded.updated_at`,
      [workspaceId, service, account, encrypted, new Date().toISOString()]
    )
    persist()
  },

  read(workspaceId: string, service: string): { account: string; token: string } | null {
    const row = queryOne<WorkspaceSecretRow>(
      'SELECT account, encrypted_value FROM workspace_secrets WHERE workspace_id = ? AND service = ?',
      [workspaceId, service]
    )
    if (!row) return null
    try {
      const token = safeStorage.decryptString(Buffer.from(row.encrypted_value, 'base64'))
      return { account: row.account, token }
    } catch (err) {
      logger.warn(
        { workspaceId, service, err: (err as Error).message },
        'failed to decrypt workspace secret'
      )
      return null
    }
  },

  /** Just the account name without decrypting the value — for status display. */
  account(workspaceId: string, service: string): string | null {
    const row = queryOne<{ account: string }>(
      'SELECT account FROM workspace_secrets WHERE workspace_id = ? AND service = ?',
      [workspaceId, service]
    )
    return row?.account ?? null
  },

  delete(workspaceId: string, service: string): void {
    run('DELETE FROM workspace_secrets WHERE workspace_id = ? AND service = ?', [workspaceId, service])
    persist()
  }
}

// ── GitHub-specific facade — per-workspace ─────────────────────────────────

export const githubTokenStore = {
  save(workspaceId: string, username: string, token: string): void {
    workspaceSecretStore.save(workspaceId, 'github', username, token)
  },

  /** Returns `{ username, token }` if a PAT is stored for this workspace. */
  read(workspaceId: string): { username: string; token: string } | null {
    const row = workspaceSecretStore.read(workspaceId, 'github')
    return row ? { username: row.account, token: row.token } : null
  },

  /** Display-only: returns the username without touching safeStorage. */
  username(workspaceId: string): string | null {
    return workspaceSecretStore.account(workspaceId, 'github')
  },

  delete(workspaceId: string): void {
    workspaceSecretStore.delete(workspaceId, 'github')
  }
}
