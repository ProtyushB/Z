import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

// All filesystem paths X uses, in one place. Lazy because app.getPath() requires
// the app to be ready.

export const paths = {
  userData(): string {
    return app.getPath('userData')
  },

  /** SQLite-on-disk file (managed by sql.js — written via persist()). */
  dbFile(): string {
    return join(this.userData(), 'x.db')
  },

  logsDir(): string {
    const dir = join(this.userData(), 'logs')
    mkdirSync(dir, { recursive: true })
    return dir
  },

  /**
   * Where workspace clones live. ~/.x-workspaces was the original plan, but
   * userData/workspaces keeps everything X owns under one OS-conventional
   * directory and is the same place the DB lives.
   */
  workspacesDir(): string {
    const dir = join(this.userData(), 'workspaces')
    mkdirSync(dir, { recursive: true })
    return dir
  },

  /**
   * Bundled SQL migration files. In dev this is the project's resources/
   * dir; in a packaged build it's inside app.asar (electron-builder packages
   * resources/** via the `files` config). fs.readFile transparently handles
   * the asar virtual path.
   */
  migrationsDir(): string {
    return join(app.getAppPath(), 'resources', 'migrations')
  }
}
