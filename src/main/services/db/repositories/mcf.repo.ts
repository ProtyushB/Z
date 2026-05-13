import { query, queryOne, run, persist } from '../client'
import {
  ModuleCreationFile,
  type ModuleCreationFile as Mcf,
  type McfSummary
} from '@shared/schemas/mcf'

interface McfRow {
  workspace_id: string
  slug: string
  display_name: string
  mcf_json: string
  created_at: string
  updated_at: string
}

interface McfListRow {
  slug: string
  display_name: string
  updated_at: string
}

export const mcfRepo = {
  /** Minimal columns for the list view — avoids JSON-parsing every row. */
  list(workspaceId: string): McfSummary[] {
    return query<McfListRow>(
      'SELECT slug, display_name, updated_at FROM mcfs WHERE workspace_id = ? ORDER BY updated_at DESC',
      [workspaceId]
    ).map((r) => ({
      slug: r.slug,
      displayName: r.display_name,
      updatedAt: r.updated_at
    }))
  },

  /** Full MCF parsed and Zod-validated on read. Returns null if not found. */
  get(workspaceId: string, slug: string): Mcf | null {
    const row = queryOne<McfRow>(
      'SELECT * FROM mcfs WHERE workspace_id = ? AND slug = ?',
      [workspaceId, slug]
    )
    if (!row) return null
    const parsed = JSON.parse(row.mcf_json) as unknown
    // Defensive: re-parse via Zod so any structural drift surfaces immediately
    // instead of crashing some downstream agent in Phase 3+.
    return ModuleCreationFile.parse(parsed)
  },

  /**
   * Upsert by (workspace_id, slug). The MCF is shallow-validated via Zod here;
   * cross-field validation is the caller's responsibility (the IPC handler
   * runs `ModuleCreationFileChecked.safeParse` before calling this).
   */
  save(workspaceId: string, mcf: Mcf): void {
    const validated = ModuleCreationFile.parse(mcf)
    const json = JSON.stringify(validated)
    const now = new Date().toISOString()
    run(
      `INSERT INTO mcfs (workspace_id, slug, display_name, mcf_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (workspace_id, slug) DO UPDATE SET
         display_name = excluded.display_name,
         mcf_json     = excluded.mcf_json,
         updated_at   = excluded.updated_at`,
      [workspaceId, validated.meta.slug, validated.meta.displayName, json, now, now]
    )
    persist()
  },

  delete(workspaceId: string, slug: string): void {
    run('DELETE FROM mcfs WHERE workspace_id = ? AND slug = ?', [workspaceId, slug])
    persist()
  }
}
