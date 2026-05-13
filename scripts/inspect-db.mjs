// Standalone DB inspection script. Run with:
//   node scripts/inspect-db.mjs
//
// Prints migrations applied, tables present, and row counts in each. Reads
// x.db directly from the user-data path; doesn't need the Electron app running.

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

// On Windows: %APPDATA%\x\x.db. On macOS / Linux: ~/.config/x/x.db or similar.
function dbPath() {
  if (process.env.APPDATA) return join(process.env.APPDATA, 'x', 'x.db')
  if (process.platform === 'darwin') {
    return join(process.env.HOME ?? '', 'Library', 'Application Support', 'x', 'x.db')
  }
  return join(process.env.HOME ?? '', '.config', 'x', 'x.db')
}

const path = dbPath()
if (!existsSync(path)) {
  console.error(`x.db not found at: ${path}`)
  console.error('Have you run `npm run dev` at least once?')
  process.exit(1)
}

const SQL = await initSqlJs({
  locateFile: (f) => join(projectRoot, 'node_modules', 'sql.js', 'dist', f)
})

const db = new SQL.Database(readFileSync(path))

console.log(`db file: ${path}`)
console.log(`size:    ${readFileSync(path).length} bytes`)

console.log()
console.log('=== migrations ===')
const migrations = db.exec('SELECT version, applied_at FROM __migrations ORDER BY version')[0]
if (migrations) {
  for (const r of migrations.values) console.log(`  ${r[0]}  ${r[1]}`)
} else {
  console.log('  (none — fresh db)')
}

console.log()
console.log('=== tables ===')
const tables = db.exec(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
)[0]
if (tables) for (const r of tables.values) console.log(`  - ${r[0]}`)

console.log()
console.log('=== row counts ===')
for (const t of ['workspaces', 'workspace_secrets', 'mcfs', 'secrets']) {
  try {
    const c = db.exec(`SELECT COUNT(*) FROM ${t}`)[0].values[0][0]
    console.log(`  ${t.padEnd(20)} ${c}`)
  } catch {
    console.log(`  ${t.padEnd(20)} (table not present)`)
  }
}

console.log()
console.log('=== orphan check (workspace_secrets / mcfs without parent workspace) ===')
for (const t of ['workspace_secrets', 'mcfs']) {
  try {
    const result = db.exec(
      `SELECT COUNT(*) FROM ${t} WHERE workspace_id NOT IN (SELECT id FROM workspaces)`
    )[0].values[0][0]
    console.log(`  ${t.padEnd(20)} ${result === 0 ? '✓ clean' : `⚠ ${result} orphans`}`)
  } catch {
    console.log(`  ${t.padEnd(20)} (table not present)`)
  }
}

// ── mcf-assets on disk ─────────────────────────────────────────────────────
import { statSync, readdirSync } from 'node:fs'

function listMcfAssets() {
  const root = path.join(path.dirname(dbPath()), 'mcf-assets')
  if (!existsSync(root)) return null
  const out = []
  for (const ws of readdirSync(root)) {
    const wsDir = path.join(root, ws)
    if (!statSync(wsDir).isDirectory()) continue
    const mcfs = []
    for (const slug of readdirSync(wsDir)) {
      const slugDir = path.join(wsDir, slug)
      if (!statSync(slugDir).isDirectory()) continue
      const files = readdirSync(slugDir).map((f) => {
        const s = statSync(path.join(slugDir, f))
        return { name: f, size: s.size }
      })
      mcfs.push({ slug, files })
    }
    out.push({ workspaceId: ws, mcfs })
  }
  return out
}

console.log()
console.log('=== mcf-assets on disk ===')
const assets = listMcfAssets()
if (assets === null) {
  console.log('  (mcf-assets dir does not exist — nothing uploaded yet)')
} else if (assets.length === 0) {
  console.log('  (empty)')
} else {
  for (const ws of assets) {
    console.log(`  ws ${ws.workspaceId.slice(0, 8)}..`)
    if (ws.mcfs.length === 0) {
      console.log('    (no mcf subdirs)')
    }
    for (const m of ws.mcfs) {
      console.log(`    ${m.slug}/`)
      for (const f of m.files) {
        console.log(`      ${f.name}  (${f.size} bytes)`)
      }
      if (m.files.length === 0) console.log('      (empty)')
    }
  }
}
