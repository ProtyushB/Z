import type { ModuleCreationFile } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'

type Integrations = ModuleCreationFile['integrations']
type Tabs = Integrations['tabConfig']['tabs']

interface Props {
  integrations: Integrations
  onChange: (integrations: Integrations) => void
}

const DMS_FOLDER_TYPES = [
  'business',
  'entity',
  'appointment',
  'bill',
  'order',
  'product',
  'service'
] as const

type DmsFolderType = (typeof DMS_FOLDER_TYPES)[number]

export function IntegrationsSection({ integrations, onChange }: Props): JSX.Element {
  function patchDms(patch: Partial<Integrations['dms']>): void {
    onChange({ ...integrations, dms: { ...integrations.dms, ...patch } })
  }

  function patchTabConfig(patch: Partial<Integrations['tabConfig']>): void {
    onChange({ ...integrations, tabConfig: { ...integrations.tabConfig, ...patch } })
  }

  function toggleFolderType(type: DmsFolderType): void {
    const folders = integrations.dms.folderTypes
    const next = folders.includes(type)
      ? folders.filter((t) => t !== type)
      : [...folders, type]
    patchDms({ folderTypes: next })
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-300">Cross-cutting integrations</h2>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-3 space-y-3">
        <Toggle
          label="Document management (DMS)"
          checked={integrations.dms.enabled}
          onChange={(enabled) => patchDms({ enabled })}
        />
        {integrations.dms.enabled && (
          <div className="pl-6 space-y-1">
            <p className="text-xs text-neutral-500 mb-1">Folder types to provision:</p>
            <div className="flex flex-wrap gap-2">
              {DMS_FOLDER_TYPES.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={integrations.dms.folderTypes.includes(t)}
                    onChange={() => toggleFolderType(t)}
                  />
                  <span className="font-mono">{t}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Toggle
          label="Loyalty"
          checked={integrations.loyalty.enabled}
          onChange={(enabled) =>
            onChange({ ...integrations, loyalty: { enabled } })
          }
        />
        <Toggle
          label="Payment plans"
          checked={integrations.paymentPlans.enabled}
          onChange={(enabled) =>
            onChange({ ...integrations, paymentPlans: { enabled } })
          }
        />
        <Toggle
          label="Service plans"
          checked={integrations.servicePlans.enabled}
          onChange={(enabled) =>
            onChange({ ...integrations, servicePlans: { enabled } })
          }
        />
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-3 space-y-2">
        <Toggle
          label="Tab config"
          hint="Per-module tab visibility for the modulex frontend."
          checked={integrations.tabConfig.enabled}
          onChange={(enabled) => patchTabConfig({ enabled })}
        />
        {integrations.tabConfig.enabled && (
          <TabsEditor
            tabs={integrations.tabConfig.tabs}
            onChange={(tabs) => patchTabConfig({ tabs })}
          />
        )}
      </div>
    </section>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}): JSX.Element {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span className="flex-1">
        <span className="text-sm">{label}</span>
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
    </label>
  )
}

function TabsEditor({
  tabs,
  onChange
}: {
  tabs: Tabs
  onChange: (tabs: Tabs) => void
}): JSX.Element {
  function update(idx: number, patch: Partial<Tabs[number]>): void {
    onChange(tabs.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }
  function add(): void {
    onChange([...tabs, { key: '', label: '', enabledByDefault: true }])
  }
  function remove(idx: number): void {
    onChange(tabs.filter((_, i) => i !== idx))
  }
  return (
    <div className="pl-6 space-y-2">
      {tabs.length === 0 && (
        <p className="text-xs text-neutral-500">No tabs defined yet.</p>
      )}
      {tabs.map((tab, idx) => (
        <div
          key={idx}
          className="rounded border border-neutral-800 bg-neutral-950 p-2 grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center"
        >
          <input
            value={tab.key}
            onChange={(e) => update(idx, { key: e.target.value })}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
            placeholder="key (e.g., appointments)"
          />
          <input
            value={tab.label}
            onChange={(e) => update(idx, { label: e.target.value })}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs"
            placeholder="Label"
          />
          <label className="flex items-center gap-1 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={tab.enabledByDefault}
              onChange={(e) => update(idx, { enabledByDefault: e.target.checked })}
            />
            on by default
          </label>
          <Button type="button" variant="ghost" onClick={() => remove(idx)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" onClick={add}>
        + Add tab
      </Button>
    </div>
  )
}
