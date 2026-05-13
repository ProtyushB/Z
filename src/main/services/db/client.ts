import initSqlJs, { type SqlJsStatic, type Database } from 'sql.js'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { paths } from '../../paths'
import { logger } from '../../logger'

// X uses sql.js — a pure-WASM build of SQLite. No native compilation.
// Tradeoff: persistence isn't automatic. We hold the DB in memory and write
// the whole file to disk via persist() after each successful write. The
// volume is tiny (workspaces, MCFs, run history) so this is plenty fast.

let SQL: SqlJsStatic | null = null
let _db: Database | null = null

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (SQL) return SQL

  // sql.js needs to find sql-wasm.wasm at runtime. The file sits next to the
  // JS entry inside the package. require.resolve handles both dev and packaged
  // (asar-unpacked) locations because electron-builder.yml asarUnpacks this file.
  const sqlJsEntry = require.resolve('sql.js')
  const sqlJsDir = dirname(sqlJsEntry)

  SQL = await initSqlJs({
    locateFile: (file: string) => `${sqlJsDir}/${file}`
  })
  return SQL
}

export async function initDb(): Promise<Database> {
  if (_db) return _db

  const sql = await loadSqlJs()
  const path = paths.dbFile()

  if (existsSync(path)) {
    const bytes = readFileSync(path)
    _db = new sql.Database(bytes)
    logger.info({ path, size: bytes.length }, 'loaded existing db from disk')
  } else {
    _db = new sql.Database()
    logger.info({ path }, 'created fresh in-memory db (will persist on first write)')
  }
  configureConnection(_db)
  return _db
}

/**
 * Per-connection pragmas. Most importantly: SQLite's foreign-key enforcement
 * is OFF by default, but we declare `ON DELETE CASCADE` on `workspace_secrets`
 * (and future tables will too). Pragmas are connection-scoped — not persisted
 * to disk — so they must be re-applied every time the DB is opened.
 *
 * Subtle: PRAGMA statements cannot be run through sqlite3_prepare (which is
 * what sql.js's `db.run` uses); they must go through sqlite3_exec (`db.exec`).
 * Using `run` here would silently be a no-op.
 */
function configureConnection(database: Database): void {
  database.exec('PRAGMA foreign_keys = ON')
}

export function db(): Database {
  if (!_db) throw new Error('Database not initialized; call initDb() first')
  return _db
}

/**
 * Serialize the in-memory db and write it to disk. Call after every successful
 * write. With small data volumes this is fast; if it ever becomes a hot spot
 * we can debounce.
 */
export function persist(): void {
  if (!_db) return
  const bytes = _db.export()
  const path = paths.dbFile()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, bytes)
  // sql.js's db.export() resets per-connection pragmas (FK enforcement etc.).
  // Re-apply so subsequent DELETEs still cascade. This is a sql.js quirk
  // confirmed via isolated repro: PRAGMA flips back to 0 after export().
  configureConnection(_db)
}

export function closeDb(): void {
  if (!_db) return
  persist()
  _db.close()
  _db = null
}

// ── Query helpers ───────────────────────────────────────────────────────────
// sql.js's raw API is verbose (prepare → bind → step → getAsObject → free).
// These wrappers keep repository code readable.

type Param = string | number | bigint | null | Uint8Array

export function query<T = Record<string, unknown>>(sql: string, params: Param[] = []): T[] {
  const stmt = db().prepare(sql)
  if (params.length) stmt.bind(params as never)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

export function queryOne<T = Record<string, unknown>>(sql: string, params: Param[] = []): T | null {
  return query<T>(sql, params)[0] ?? null
}

export function run(sql: string, params: Param[] = []): void {
  db().run(sql, params as never)
}

// ── Test-only ───────────────────────────────────────────────────────────────

/**
 * Test-only: replace the singleton DB connection with a caller-provided one.
 * Production code paths go through `initDb()` instead. Lives here so tests
 * don't need to mock the entire client module.
 */
export function _setDbForTesting(testDb: Database): void {
  _db = testDb
  configureConnection(testDb)
}
