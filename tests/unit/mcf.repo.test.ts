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
import { mcfRepo } from '../../src/main/services/db/repositories/mcf.repo'
import type { ModuleCreationFile } from '../../src/shared/schemas/mcf'

const MIGRATIONS_DIR = path.join(process.cwd(), 'resources', 'migrations')

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs({
    locateFile: (f) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', f)
  })
})

let db: Database
let workspaceId: string

beforeEach(() => {
  db = new SQL.Database()
  _setDbForTesting(db)
  runMigrations(MIGRATIONS_DIR)
  const ws = workspacesRepo.create({
    name: 'fixture',
    backendRepoUrl: 'https://github.com/o/be.git',
    frontendRepoUrl: 'https://github.com/o/fe.git'
  })
  workspaceId = ws.id
})

function fixtureMcf(slug = 'spa'): ModuleCreationFile {
  const now = '2026-05-13T10:00:00.000Z'
  return {
    mcfVersion: 1,
    kind: 'new-module',
    meta: {
      slug,
      displayName: slug.charAt(0).toUpperCase() + slug.slice(1),
      description: 'Test fixture.',
      referenceModule: 'parlour',
      createdAt: now,
      updatedAt: now
    },
    entities: [
      {
        slug: 'category',
        displayName: 'Category',
        inheritFromReference: true,
        fieldOverrides: [],
        fields: [],
        relationships: [],
        endpoints: [],
        statusTransitions: [],
        searchableFields: []
      }
    ],
    ui: { inheritFromReference: true, screens: [] },
    integrations: {
      dms: { enabled: false, folderTypes: [] },
      loyalty: { enabled: false },
      paymentPlans: { enabled: false },
      servicePlans: { enabled: false },
      tabConfig: { enabled: true, tabs: [] }
    },
    testing: {
      backend: { generateUnit: true, generateIntegration: true },
      frontend: { generateComponent: true, generateHook: true },
      e2e: { generate: false, scenarios: [] }
    }
  }
}

describe('mcfRepo', () => {
  it('list() is empty initially', () => {
    expect(mcfRepo.list(workspaceId)).toEqual([])
  })

  it('save() then get() round-trips the MCF', () => {
    const mcf = fixtureMcf()
    mcfRepo.save(workspaceId, mcf)
    const fetched = mcfRepo.get(workspaceId, 'spa')
    expect(fetched).not.toBeNull()
    expect(fetched?.meta.slug).toBe('spa')
    expect(fetched?.entities[0].slug).toBe('category')
  })

  it('save() upserts on conflict', () => {
    mcfRepo.save(workspaceId, fixtureMcf())
    const updated: ModuleCreationFile = {
      ...fixtureMcf(),
      meta: { ...fixtureMcf().meta, displayName: 'Spa Renamed' }
    }
    mcfRepo.save(workspaceId, updated)
    expect(mcfRepo.list(workspaceId)).toHaveLength(1)
    expect(mcfRepo.get(workspaceId, 'spa')?.meta.displayName).toBe('Spa Renamed')
  })

  it('list() returns rows in updated_at DESC order', async () => {
    mcfRepo.save(workspaceId, fixtureMcf('alpha'))
    await new Promise((r) => setTimeout(r, 10))
    mcfRepo.save(workspaceId, fixtureMcf('beta'))
    const list = mcfRepo.list(workspaceId)
    expect(list.map((r) => r.slug)).toEqual(['beta', 'alpha'])
  })

  it('delete() removes the row', () => {
    mcfRepo.save(workspaceId, fixtureMcf())
    mcfRepo.delete(workspaceId, 'spa')
    expect(mcfRepo.get(workspaceId, 'spa')).toBeNull()
  })

  it('deleting a workspace cascades to its MCFs (FK + PRAGMA foreign_keys=ON)', () => {
    mcfRepo.save(workspaceId, fixtureMcf('one'))
    mcfRepo.save(workspaceId, fixtureMcf('two'))
    expect(db.exec('SELECT COUNT(*) FROM mcfs')[0].values[0][0]).toBe(2)
    workspacesRepo.delete(workspaceId)
    expect(db.exec('SELECT COUNT(*) FROM mcfs')[0].values[0][0]).toBe(0)
  })

  it('MCFs are isolated per workspace', () => {
    const ws2 = workspacesRepo.create({
      name: 'other',
      backendRepoUrl: 'https://github.com/o/be2.git',
      frontendRepoUrl: 'https://github.com/o/fe2.git'
    })
    mcfRepo.save(workspaceId, fixtureMcf('shared_slug'))
    mcfRepo.save(ws2.id, fixtureMcf('shared_slug'))
    // Same slug allowed across workspaces (PK is composite)
    expect(mcfRepo.list(workspaceId)).toHaveLength(1)
    expect(mcfRepo.list(ws2.id)).toHaveLength(1)
  })
})
