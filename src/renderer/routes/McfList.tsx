import { useRef, useState, useEffect, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ModuleCreationFile } from '@shared/schemas/mcf'
import { Button } from '../components/ui/button'
import { useMcfStore } from '../stores/mcf.store'
import { formatRelative } from '../lib/format'

export function McfList(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>()
  const { list, loading, error, load, save, remove } = useMcfStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [importErr, setImportErr] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    void load(id)
  }, [id, load])

  async function handleDelete(slug: string, displayName: string): Promise<void> {
    if (window.confirm(`Delete MCF "${displayName}"? This cannot be undone.`)) {
      await remove(id, slug)
    }
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    setImportErr(null)
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      // The main-side mcf:save runs Zod + cross-field validation, so a malformed
      // import surfaces as a thrown error here.
      await save(id, parsed as ModuleCreationFile)
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
      // Reset so the same file can be re-selected.
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="min-h-screen flex flex-col p-8 gap-6 max-w-4xl mx-auto w-full">
      <Link
        to={`/workspaces/${id}`}
        className="text-sm text-neutral-500 hover:text-neutral-300"
      >
        ← Back to workspace
      </Link>

      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Module Creation Files</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Each MCF describes a new business module to scaffold. Phase 3+ agents read these
            as the canonical input.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="ghost"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing…' : 'Import JSON'}
          </Button>
          <Link to={`/workspaces/${id}/mcfs/new`}>
            <Button>New MCF</Button>
          </Link>
        </div>
      </header>

      {(error || importErr) && (
        <div className="rounded border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
          {importErr ?? error}
        </div>
      )}

      {loading && <p className="text-neutral-500 text-sm">Loading…</p>}

      {!loading && list.length === 0 && (
        <div className="rounded border border-neutral-800 bg-neutral-900/40 p-12 text-center">
          <p className="text-neutral-400 mb-4">No MCFs yet for this workspace.</p>
          <Link to={`/workspaces/${id}/mcfs/new`}>
            <Button>Create your first MCF</Button>
          </Link>
        </div>
      )}

      {!loading && list.length > 0 && (
        <ul className="space-y-3">
          {list.map((mcf) => (
            <li
              key={mcf.slug}
              className="rounded border border-neutral-800 bg-neutral-900 p-4 flex items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
            >
              <Link
                to={`/workspaces/${id}/mcfs/${mcf.slug}`}
                className="flex-1 min-w-0"
              >
                <div className="font-medium">{mcf.displayName}</div>
                <div className="text-xs text-neutral-500 font-mono mt-1">{mcf.slug}</div>
                <div className="text-xs text-neutral-600 mt-1">
                  Updated {formatRelative(mcf.updatedAt)}
                </div>
              </Link>
              <Button
                variant="ghost"
                onClick={() => handleDelete(mcf.slug, mcf.displayName)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
