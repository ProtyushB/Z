import { app, shell } from 'electron'
import { join } from 'node:path'
import {
  mkdirSync,
  existsSync,
  rmSync,
  chmodSync,
  statSync,
  readdirSync
} from 'node:fs'
import { workspacesRepo } from '../db/repositories/workspaces.repo'
import { githubTokenStore } from '../github/tokenStore'
import { gitService } from '../git/git.service'
import { logger } from '../../logger'
import type { Workspace } from '@shared/schemas/workspace'

function workspaceDir(workspaceId: string): string {
  return join(app.getPath('userData'), 'workspaces', workspaceId)
}

/**
 * Recursive `rm -rf` that handles Windows's read-only file quirk.
 *
 * After a `git clone` on Windows, files inside `.git/objects/pack/` (and some
 * other plumbing files) get the **read-only attribute** set as an upstream
 * safety measure. Node's `fs.rmSync({ force: true })` does NOT auto-clear that
 * bit before deletion, so it throws `EPERM` partway through and aborts.
 *
 * The fix: walk the tree first, `chmod` every entry writable, then delete with
 * retries (covers transient EBUSY when AV scanners or git processes still hold
 * handles for a few hundred ms).
 */
function cleanup(path: string): void {
  if (!existsSync(path)) return
  makeWritableRecursive(path)
  rmSync(path, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
}

function makeWritableRecursive(path: string): void {
  let stats
  try {
    stats = statSync(path)
  } catch {
    return // already gone
  }
  if (stats.isDirectory()) {
    try {
      chmodSync(path, 0o755)
    } catch {
      // best-effort
    }
    let entries: string[]
    try {
      entries = readdirSync(path)
    } catch {
      return
    }
    for (const entry of entries) {
      makeWritableRecursive(join(path, entry))
    }
  } else {
    try {
      chmodSync(path, 0o644)
    } catch {
      // best-effort
    }
  }
}

export const workspaceService = {
  workspaceDir,

  /**
   * Clone both repos for a workspace into `<userData>/workspaces/<id>/{backend,frontend}`.
   * Uses the **workspace-scoped** GitHub PAT. All-or-nothing: if either clone
   * fails, both destination directories are removed so a retry starts clean.
   */
  async cloneRepos(workspaceId: string): Promise<Workspace> {
    const ws = workspacesRepo.get(workspaceId)
    if (!ws) throw new Error(`Workspace not found: ${workspaceId}`)

    if (ws.backendLocalPath && ws.frontendLocalPath) {
      throw new Error('Workspace is already cloned. Delete and re-create to clone again.')
    }

    const tokenRow = githubTokenStore.read(workspaceId)
    if (!tokenRow) {
      throw new Error('Not signed in to GitHub for this workspace. Sign in first, then retry.')
    }

    const dir = workspaceDir(workspaceId)
    mkdirSync(dir, { recursive: true })

    const backendPath = join(dir, 'backend')
    const frontendPath = join(dir, 'frontend')

    cleanup(backendPath)
    cleanup(frontendPath)

    logger.info(
      { workspaceId, backend: ws.backendRepoUrl, frontend: ws.frontendRepoUrl },
      'workspace clone start'
    )

    try {
      await gitService.clone({ url: ws.backendRepoUrl, destination: backendPath, token: tokenRow.token })
      await gitService.clone({ url: ws.frontendRepoUrl, destination: frontendPath, token: tokenRow.token })
    } catch (err) {
      cleanup(backendPath)
      cleanup(frontendPath)
      throw err
    }

    return workspacesRepo.updateLocalPaths(workspaceId, backendPath, frontendPath)
  },

  /**
   * Delete a workspace, its cloned files, and (via FK CASCADE) its per-workspace
   * secrets. This is destructive and irreversible.
   */
  delete(workspaceId: string): void {
    const ws = workspacesRepo.get(workspaceId)
    if (!ws) return // already gone — no-op
    cleanup(workspaceDir(workspaceId))
    workspacesRepo.delete(workspaceId)
    logger.info(
      { workspaceId, name: ws.name },
      'workspace deleted (including cloned files and secrets)'
    )
  },

  /** Open the workspace's directory in the OS file explorer. */
  async openFolder(workspaceId: string): Promise<void> {
    const ws = workspacesRepo.get(workspaceId)
    if (!ws) throw new Error('Workspace not found')
    if (!ws.backendLocalPath) throw new Error('Workspace is not cloned yet')
    const dir = workspaceDir(workspaceId)
    const result = await shell.openPath(dir)
    if (result) throw new Error(`Failed to open folder: ${result}`)
  }
}
