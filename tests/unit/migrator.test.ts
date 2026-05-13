import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import initSqlJs, { type SqlJsStatic, type Database } from 'sql.js'
import path from 'node:path'
import os from 'node:os'

// Mock Electron so node-env tests can import main-process modules. The mock
// is hoisted to the top of the module by Vitest, ahead of the imports below.
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => path.join(os.tmpdir(), 'x-vitest', String(process.pid))),
    getAppPath: vi.fn(() => process.cwd()),
    isPackaged: false
  }
}))

import { _setDbForTesting } from '../../src/main/services/db/client'
import { runMigrations } from '../../src/main/services/db/migrator'

const MIGRATIONS_DIR = path.join(process.cwd(), 'resources', 'migrations')

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs({
    locateFile: (f) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', f)
  })
})

let db: Database

beforeEach(() => {
  db = new SQL.Database()
  _setDbForTesting(db)
})

describe('runMigrations', () => {
  it('applies every migration on a fresh db', () => {
    runMigrations(MIGRATIONS_DIR)
    const tables = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    const tableNames = tables[0].values.map((r) => r[0] as string)
    expect(tableNames).toContain('__migrations')
    expect(tableNames).toContain('workspaces')
    expect(tableNames).toContain('secrets')
    expect(tableNames).toContain('workspace_secrets')
    expect(tableNames).toContain('mcfs')
  })

  it('records each applied migration in __migrations', () => {
    runMigrations(MIGRATIONS_DIR)
    const applied = db.exec('SELECT version FROM __migrations ORDER BY version')[0].values.map(
      (r) => r[0] as string
    )
    expect(applied).toEqual(['V001', 'V002', 'V003', 'V004', 'V005'])
  })

  it('is idempotent — running twice does not re-apply', () => {
    runMigrations(MIGRATIONS_DIR)
    const before = db.exec('SELECT COUNT(*) FROM __migrations')[0].values[0][0]
    runMigrations(MIGRATIONS_DIR)
    const after = db.exec('SELECT COUNT(*) FROM __migrations')[0].values[0][0]
    expect(after).toBe(before)
  })

  it('workspace_secrets has the foreign-key column shape', () => {
    runMigrations(MIGRATIONS_DIR)
    // pragma returns rows describing the FK
    const fks = db.exec('PRAGMA foreign_key_list(workspace_secrets)')
    expect(fks.length).toBe(1)
    const row = fks[0].values[0]
    // Columns: id, seq, table, from, to, on_update, on_delete, match
    expect(row).toContain('workspaces')
    expect(row).toContain('CASCADE')
  })
})
