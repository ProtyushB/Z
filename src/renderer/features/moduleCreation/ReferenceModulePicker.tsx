import { useEffect, useState } from 'react'
import type { ReferenceModule } from '@shared/ipc/contracts'
import { ipc } from '../../lib/ipc'

interface Props {
  workspaceId: string
  value: string
  onChange: (slug: string) => void
}

export function ReferenceModulePicker({
  workspaceId,
  value,
  onChange
}: Props): JSX.Element {
  const [modules, setModules] = useState<ReferenceModule[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const result = await ipc.invoke('reference:scan', { workspaceId })
        // Sort by entity count DESC — densest reference (the most complete
        // template) appears first. Better default than alphabetical.
        setModules([...result].sort((a, b) => b.entities.length - a.entities.length))
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [workspaceId])

  if (err) {
    return (
      <div className="rounded border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
        {err}
      </div>
    )
  }

  if (modules === null) {
    return <p className="text-xs text-neutral-500">Scanning cloned backend…</p>
  }

  if (modules.length === 0) {
    return (
      <div className="rounded border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-400">
        No reference modules detected. Make sure the workspace is cloned and the backend
        contains{' '}
        <code className="font-mono text-xs bg-neutral-950 px-1 py-0.5 rounded">
          src/main/java/com/modulex/modules/
        </code>
        .
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {modules.map((m) => {
        const selected = value === m.slug
        return (
          <button
            key={m.slug}
            type="button"
            onClick={() => onChange(m.slug)}
            className={
              'text-left rounded border p-3 transition-colors ' +
              (selected
                ? 'border-blue-500 bg-blue-950/30'
                : 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800/60')
            }
          >
            <div className="font-mono text-sm">{m.slug}</div>
            <div className="text-xs text-neutral-500 mt-1">
              {m.entities.length}{' '}
              {m.entities.length === 1 ? 'entity' : 'entities'}
              {m.entities.length > 0 && (
                <>
                  : {m.entities.slice(0, 4).map((e) => e.slug).join(', ')}
                  {m.entities.length > 4 ? '…' : ''}
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
