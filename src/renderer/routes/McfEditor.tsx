import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { ModuleCreationFile } from '@shared/schemas/mcf'
import { McfForm } from '../features/moduleCreation/McfForm'
import { ipc } from '../lib/ipc'
import { useMcfStore } from '../stores/mcf.store'

// Handles both new and edit modes. URL pattern:
//   /workspaces/:id/mcfs/new   → new mode (slug param undefined)
//   /workspaces/:id/mcfs/:slug → edit mode (load existing MCF first)

export function McfEditor(): JSX.Element {
  const { id = '', slug } = useParams<{ id: string; slug?: string }>()
  const navigate = useNavigate()
  const save = useMcfStore((s) => s.save)
  const isNew = !slug

  // undefined = still loading (edit mode), null = new mode or not found, value = loaded
  const [initial, setInitial] = useState<ModuleCreationFile | null | undefined>(
    isNew ? null : undefined
  )

  useEffect(() => {
    if (isNew) return
    void (async () => {
      try {
        const result = await ipc.invoke('mcf:get', { workspaceId: id, slug: slug as string })
        setInitial(result ?? null)
      } catch {
        setInitial(null)
      }
    })()
  }, [isNew, id, slug])

  if (initial === undefined) {
    return <div className="p-8 text-neutral-500">Loading…</div>
  }

  if (!isNew && initial === null) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link
          to={`/workspaces/${id}/mcfs`}
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          ← Back to MCFs
        </Link>
        <h1 className="text-2xl font-semibold mt-4">MCF not found</h1>
        <p className="text-sm text-neutral-500 mt-2">It may have been deleted.</p>
      </div>
    )
  }

  async function handleSave(mcf: ModuleCreationFile): Promise<void> {
    await save(id, mcf)
    navigate(`/workspaces/${id}/mcfs`)
  }

  function handleCancel(): void {
    navigate(`/workspaces/${id}/mcfs`)
  }

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <Link
        to={`/workspaces/${id}/mcfs`}
        className="text-sm text-neutral-500 hover:text-neutral-300"
      >
        ← Back to MCFs
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {isNew ? 'New MCF' : `Edit "${initial?.meta.displayName}"`}
      </h1>
      <McfForm
        // Key so the form remounts (resetting useState) when switching between MCFs
        key={isNew ? 'new' : (initial?.meta.slug ?? 'unknown')}
        workspaceId={id}
        initial={initial}
        isEdit={!isNew}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
