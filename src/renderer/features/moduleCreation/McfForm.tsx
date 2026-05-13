import { useEffect, useState, type FormEvent } from 'react'
import type { ModuleCreationFile, Entity } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'
import { ipc } from '../../lib/ipc'
import { McfMetaSection } from './McfMetaSection'
import { EntityList } from './EntityList'
import { IntegrationsSection } from './IntegrationsSection'
import { UiScreensSection } from './UiScreensSection'
import { TestingSection } from './TestingSection'
import { GlobalNotesSection } from './GlobalNotesSection'

interface Props {
  workspaceId: string
  initial: ModuleCreationFile | null // null = new mode
  isEdit: boolean
  onSave: (mcf: ModuleCreationFile) => Promise<void>
  onCancel: () => void
}

const SEED_ENTITY: Entity = {
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

function emptyMcf(): ModuleCreationFile {
  const now = new Date().toISOString()
  return {
    mcfVersion: 1,
    kind: 'new-module',
    meta: {
      slug: '',
      displayName: '',
      description: '',
      referenceModule: '',
      createdAt: now,
      updatedAt: now
    },
    entities: [SEED_ENTITY],
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

/** Browser-side JSON export: trigger a download of the current MCF as a .mcf.json file. */
function exportMcfAsJson(mcf: ModuleCreationFile): void {
  const json = JSON.stringify(mcf, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${mcf.meta.slug || 'untitled'}.mcf.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Defer cleanup so the browser has a tick to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function McfForm({
  workspaceId,
  initial,
  isEdit,
  onSave,
  onCancel
}: Props): JSX.Element {
  const [mcf, setMcf] = useState<ModuleCreationFile>(() => initial ?? emptyMcf())
  const [busy, setBusy] = useState(false)
  const [serverErr, setServerErr] = useState<string | null>(null)
  const [liveIssues, setLiveIssues] = useState<string[]>([])

  function touchUpdatedAt(prev: ModuleCreationFile): ModuleCreationFile['meta'] {
    return { ...prev.meta, updatedAt: new Date().toISOString() }
  }

  function updateMeta(patch: Partial<ModuleCreationFile['meta']>): void {
    setMcf((prev) => ({
      ...prev,
      meta: { ...prev.meta, ...patch, updatedAt: new Date().toISOString() }
    }))
  }

  function updateEntities(entities: Entity[]): void {
    setMcf((prev) => ({ ...prev, entities, meta: touchUpdatedAt(prev) }))
  }

  function updateIntegrations(integrations: ModuleCreationFile['integrations']): void {
    setMcf((prev) => ({ ...prev, integrations, meta: touchUpdatedAt(prev) }))
  }

  function updateUi(ui: ModuleCreationFile['ui']): void {
    setMcf((prev) => ({ ...prev, ui, meta: touchUpdatedAt(prev) }))
  }

  function updateTesting(testing: ModuleCreationFile['testing']): void {
    setMcf((prev) => ({ ...prev, testing, meta: touchUpdatedAt(prev) }))
  }

  function updateGlobalNotes(globalNotes: string | undefined): void {
    setMcf((prev) => ({ ...prev, globalNotes, meta: touchUpdatedAt(prev) }))
  }

  // Live validation — debounce IPC calls so we don't spam on every keystroke.
  // 500 ms feels responsive without flicker.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const result = await ipc.invoke('mcf:validate', { mcf })
        setLiveIssues(result.ok ? [] : result.issues)
      } catch {
        // ignore — server-side validation runs again on save
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [mcf])

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setServerErr(null)
    setBusy(true)
    try {
      await onSave(mcf)
    } catch (e) {
      setServerErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const availableEntities = mcf.entities.map((e) => e.slug)

  return (
    <form onSubmit={submit} className="space-y-8">
      <McfMetaSection
        workspaceId={workspaceId}
        meta={mcf.meta}
        isEdit={isEdit}
        onChange={updateMeta}
      />

      <EntityList entities={mcf.entities} onChange={updateEntities} />

      <IntegrationsSection
        integrations={mcf.integrations}
        onChange={updateIntegrations}
      />

      <UiScreensSection
        workspaceId={workspaceId}
        mcfSlug={mcf.meta.slug}
        isEdit={isEdit}
        ui={mcf.ui}
        availableEntities={availableEntities}
        onChange={updateUi}
      />

      <TestingSection testing={mcf.testing} onChange={updateTesting} />

      <GlobalNotesSection value={mcf.globalNotes} onChange={updateGlobalNotes} />

      {liveIssues.length > 0 && (
        <div className="rounded border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-300">
          <div className="font-medium mb-1">
            {liveIssues.length} validation issue
            {liveIssues.length === 1 ? '' : 's'} — fix before saving:
          </div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            {liveIssues.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </div>
      )}

      {serverErr && (
        <div className="rounded border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
          {serverErr}
        </div>
      )}

      <div className="flex gap-2 pt-2 sticky bottom-0 bg-neutral-950 py-3 -mx-8 px-8 border-t border-neutral-800">
        <Button type="submit" disabled={busy || liveIssues.length > 0}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create MCF'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={() => exportMcfAsJson(mcf)}>
          Export JSON
        </Button>
      </div>
    </form>
  )
}
