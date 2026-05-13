import { useRef, useState, type ChangeEvent } from 'react'
import type { ModuleCreationFile } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'
import { ipc } from '../../lib/ipc'

type ScreenshotRef = ModuleCreationFile['ui']['screens'][number]['screenshots'][number]

interface Props {
  workspaceId: string
  mcfSlug: string
  isEdit: boolean
  screenshots: ScreenshotRef[]
  onChange: (screenshots: ScreenshotRef[]) => void
}

/** Build the custom-protocol URL the main process serves files from. */
function assetUrl(workspaceId: string, mcfSlug: string, filename: string): string {
  return `mcf-asset://${workspaceId}/${encodeURIComponent(mcfSlug)}/${encodeURIComponent(filename)}`
}

export function ScreenshotsEditor({
  workspaceId,
  mcfSlug,
  isEdit,
  screenshots,
  onChange
}: Props): JSX.Element {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleFiles(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setBusy(true)
    setErr(null)
    try {
      const uploaded: ScreenshotRef[] = []
      for (const file of files) {
        const bytes = await file.arrayBuffer()
        const result = await ipc.invoke('mcf:uploadScreenshot', {
          workspaceId,
          mcfSlug,
          fileName: file.name,
          bytes
        })
        uploaded.push({ path: result.filename, description: file.name })
      }
      onChange([...screenshots, ...uploaded])
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleDelete(idx: number): Promise<void> {
    const ref = screenshots[idx]
    setErr(null)
    try {
      await ipc.invoke('mcf:deleteScreenshot', {
        workspaceId,
        mcfSlug,
        filename: ref.path
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      onChange(screenshots.filter((_, i) => i !== idx))
    }
  }

  function updateDescription(idx: number, description: string): void {
    onChange(
      screenshots.map((s, i) =>
        i === idx ? { ...s, description: description || undefined } : s
      )
    )
  }

  if (!isEdit) {
    return (
      <div className="rounded border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-500">
        Save the MCF first to enable screenshot uploads. Screenshots are stored
        per-MCF on disk; we need a stable slug before files can be associated.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          multiple
          onChange={handleFiles}
          disabled={busy}
          className="text-xs text-neutral-400 file:mr-2 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1 file:text-xs file:text-neutral-100 hover:file:bg-neutral-700"
        />
        {busy && <span className="text-xs text-neutral-500">Uploading…</span>}
      </div>

      {err && (
        <div className="rounded border border-red-900 bg-red-950/30 p-2 text-xs text-red-300">
          {err}
        </div>
      )}

      {screenshots.length === 0 && (
        <p className="text-xs text-neutral-500">No screenshots uploaded.</p>
      )}

      {screenshots.map((s, idx) => (
        <div
          key={idx}
          className="rounded border border-neutral-800 bg-neutral-950 p-2 flex gap-3 items-start"
        >
          <a
            href={assetUrl(workspaceId, mcfSlug, s.path)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
            title="Open full size in new window"
          >
            <img
              src={assetUrl(workspaceId, mcfSlug, s.path)}
              alt={s.description ?? 'screenshot'}
              className="rounded border border-neutral-800 w-24 h-24 object-cover bg-neutral-900"
            />
          </a>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div
              className="font-mono text-[10px] text-neutral-500 truncate"
              title={s.path}
            >
              {s.path}
            </div>
            <input
              value={s.description ?? ''}
              onChange={(e) => updateDescription(idx, e.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs"
              placeholder="Caption (what the agent should notice)"
              maxLength={500}
            />
          </div>
          <Button type="button" variant="ghost" onClick={() => handleDelete(idx)}>
            Delete
          </Button>
        </div>
      ))}
    </div>
  )
}
