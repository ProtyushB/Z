import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import initSqlJs, { type SqlJsStatic, type Database } from 'sql.js'
import path from 'node:path'
import os from 'node:os'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => path.join(os.tmpdir(), 'x-vitest', String(process.pid))),
    getAppPath: vi.fn(() => process.cwd()),
    isPackaged: false
  }
}))

import { _setDbForTesting } from '../../src/main/services/db/client'
import { runMigrations } from '../../src/main/services/db/migrator'
import { workspacesRepo } from '../../src/main/services/db/repositories/workspaces.repo'

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
  runMigrations(MIGRATIONS_DIR)
})

const validInput = {
  name: 'fixture',
  backendRepoUrl: 'https://github.com/owner/be.git',
  frontendRepoUrl: 'https://github.com/owner/fe.git'
}

describe('workspacesRepo', () => {
  it('list() is empty on a fresh database', () => {
    expect(workspacesRepo.list()).toEqual([])
  })

  it('create() persists and get() returns the same row', () => {
    const created = workspacesRepo.create(validInput)
    expect(created.name).toBe(validInput.name)
    expect(created.backendRepoUrl).toBe(validInput.backendRepoUrl)
    expect(created.backendLocalPath).toBeNull()
    expect(created.frontendLocalPath).toBeNull()
    const fetched = workspacesRepo.get(created.id)
    expect(fetched).toEqual(created)
  })

  it('list() orders by created_at DESC', async () => {
    workspacesRepo.create({ ...validInput, name: 'first' })
    await new Promise((r) => setTimeout(r, 10)) // ensure distinct timestamps
    workspacesRepo.create({ ...validInput, name: 'second' })
    const list = workspacesRepo.list()
    expect(list[0].name).toBe('second')
    expect(list[1].name).toBe('first')
  })

  it('throws a friendly error when the name is duplicated', () => {
    workspacesRepo.create({ ...validInput, name: 'dup' })
    expect(() => workspacesRepo.create({ ...validInput, name: 'dup' })).toThrow(
      /already exists/i
    )
  })

  it('updateLocalPaths() sets the clone paths', () => {
    const created = workspacesRepo.create(validInput)
    const updated = workspacesRepo.updateLocalPaths(created.id, '/tmp/be', '/tmp/fe')
    expect(updated.backendLocalPath).toBe('/tmp/be')
    expect(updated.frontendLocalPath).toBe('/tmp/fe')
  })

  it('delete() removes the row', () => {
    const created = workspacesRepo.create(validInput)
    workspacesRepo.delete(created.id)
    expect(workspacesRepo.get(created.id)).toBeNull()
  })

  it('delete() cascades to workspace_secrets (FK + PRAGMA foreign_keys=ON)', () => {
    const created = workspacesRepo.create(validInput)
    db.run(
      `INSERT INTO workspace_secrets (workspace_id, service, account, encrypted_value, updated_at)
       VALUES (?, 'github', 'someuser', 'fake-encrypted-blob', ?)`,
      [created.id, new Date().toISOString()]
    )
    expect(db.exec('SELECT COUNT(*) FROM workspace_secrets')[0].values[0][0]).toBe(1)

    workspacesRepo.delete(created.id)

    expect(db.exec('SELECT COUNT(*) FROM workspace_secrets')[0].values[0][0]).toBe(0)
  })
})
