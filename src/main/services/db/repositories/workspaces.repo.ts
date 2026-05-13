import { randomUUID } from 'node:crypto'
import { query, queryOne, run, persist } from '../client'
import type { Workspace, CreateWorkspaceInput } from '@shared/schemas/workspace'

// DB row shape (snake_case columns) vs the camelCase Workspace shape exposed
// across IPC. The mapping is small and explicit on purpose — no ORM.

interface WorkspaceRow {
  id: string
  name: string
  backend_repo_url: string
  frontend_repo_url: string
  backend_local_path: string | null
  frontend_local_path: string | null
  created_at: string
  updated_at: string
}

function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    backendRepoUrl: row.backend_repo_url,
    frontendRepoUrl: row.frontend_repo_url,
    backendLocalPath: row.backend_local_path,
    frontendLocalPath: row.frontend_local_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const workspacesRepo = {
  list(): Workspace[] {
    return query<WorkspaceRow>('SELECT * FROM workspaces ORDER BY created_at DESC').map(
      rowToWorkspace
    )
  },

  get(id: string): Workspace | null {
    const row = queryOne<WorkspaceRow>('SELECT * FROM workspaces WHERE id = ?', [id])
    return row ? rowToWorkspace(row) : null
  },

  create(input: CreateWorkspaceInput): Workspace {
    const id = randomUUID()
    const now = new Date().toISOString()
    try {
      run(
        `INSERT INTO workspaces
         (id, name, backend_repo_url, frontend_repo_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, input.name, input.backendRepoUrl, input.frontendRepoUrl, now, now]
      )
    } catch (err) {
      // Translate the raw sqlite error into something human-readable. The
      // renderer surfaces this directly via the IPC error path.
      const msg = err instanceof Error ? err.message : String(err)
      if (/UNIQUE constraint failed: workspaces\.name/i.test(msg)) {
        throw new Error(`A workspace named "${input.name}" already exists. Pick a different name.`)
      }
      throw err
    }
    persist()
    const created = this.get(id)
    if (!created) throw new Error('workspace insert succeeded but get() returned null')
    return created
  },

  delete(id: string): void {
    run('DELETE FROM workspaces WHERE id = ?', [id])
    persist()
  },

  updateLocalPaths(id: string, backendPath: string, frontendPath: string): Workspace {
    const now = new Date().toISOString()
    run(
      `UPDATE workspaces
       SET backend_local_path = ?, frontend_local_path = ?, updated_at = ?
       WHERE id = ?`,
      [backendPath, frontendPath, now, id]
    )
    persist()
    const updated = this.get(id)
    if (!updated) throw new Error('workspace update succeeded but get() returned null')
    return updated
  }
}
