import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db, persist } from './client'
import { paths } from '../../paths'
import { logger } from '../../logger'

/**
 * Apply pending SQL migrations in version order. Idempotent — already-applied
 * migrations are skipped. Each migration runs in a transaction so partial
 * failures don't leave the schema half-applied.
 *
 * @param dir Override the migrations directory. Defaults to `paths.migrationsDir()`.
 *            Tests pass an explicit path so they can run without Electron's `app`.
 */
export function runMigrations(dir?: string): void {
  const conn = db()

  conn.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const result = conn.exec('SELECT version FROM __migrations')
  const applied = new Set<string>(
    result.length ? result[0].values.map((row) => row[0] as string) : []
  )

  const migrationsDir = dir ?? paths.migrationsDir()
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let appliedAny = false

  for (const file of files) {
    const version = file.replace(/__.*$/, '') // "V001" from "V001__init.sql"
    if (applied.has(version)) continue

    const sql = readFileSync(join(migrationsDir, file), 'utf8')

    try {
      conn.run('BEGIN')
      conn.exec(sql)
      conn.run('INSERT INTO __migrations (version, applied_at) VALUES (?, ?)', [
        version,
        new Date().toISOString()
      ])
      conn.run('COMMIT')
      appliedAny = true
      logger.info({ version, file }, 'migration applied')
    } catch (err) {
      try {
        conn.run('ROLLBACK')
      } catch {
        // swallow: rollback failure shouldn't mask the original error
      }
      logger.error({ version, file, err: (err as Error).message }, 'migration failed')
      throw err
    }
  }

  if (appliedAny) persist()
}
