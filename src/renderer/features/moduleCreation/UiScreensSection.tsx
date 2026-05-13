import type { ModuleCreationFile } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'
import { ScreenshotsEditor } from './ScreenshotsEditor'

type UiSection = ModuleCreationFile['ui']
type Screen = UiSection['screens'][number]
type ScreenType = Screen['screenType']

interface Props {
  workspaceId: string
  mcfSlug: string
  isEdit: boolean
  ui: UiSection
  availableEntities: string[]
  onChange: (ui: UiSection) => void
}

const SCREEN_TYPES: ScreenType[] = ['list', 'detail', 'form', 'page', 'custom']

function emptyScreen(entitySlug: string): Screen {
  return {
    entitySlug,
    screenType: 'detail',
    inheritFromReference: true,
    screenshots: []
  }
}

export function UiScreensSection({
  workspaceId,
  mcfSlug,
  isEdit,
  ui,
  availableEntities,
  onChange
}: Props): JSX.Element {
  function updateScreen(idx: number, patch: Partial<Screen>): void {
    const next = ui.screens.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    onChange({ ...ui, screens: next })
  }

  function add(): void {
    onChange({
      ...ui,
      screens: [...ui.screens, emptyScreen(availableEntities[0] ?? '')]
    })
  }

  function remove(idx: number): void {
    onChange({ ...ui, screens: ui.screens.filter((_, i) => i !== idx) })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">UI screens</h2>
        <Button type="button" variant="ghost" onClick={add}>
          + Add screen
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
        <input
          type="checkbox"
          checked={ui.inheritFromReference}
          onChange={(e) => onChange({ ...ui, inheritFromReference: e.target.checked })}
        />
        Inherit all screens from reference vertical (uncheck to specify per-screen overrides)
      </label>

      {ui.screens.length === 0 && (
        <p className="text-xs text-neutral-500">
          No screen overrides. Phase 5's frontend agents will use the reference vertical's
          screens as-is.
        </p>
      )}

      <div className="space-y-2">
        {ui.screens.map((screen, idx) => (
          <div
            key={idx}
            className="rounded border border-neutral-800 bg-neutral-900 p-3 space-y-2"
          >
            <div className="grid grid-cols-[1fr_140px_auto] gap-2">
              <select
                value={screen.entitySlug}
                onChange={(e) => updateScreen(idx, { entitySlug: e.target.value })}
                className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs font-mono"
              >
                {availableEntities.length === 0 && (
                  <option value="">(define an entity first)</option>
                )}
                {availableEntities.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={screen.screenType}
                onChange={(e) =>
                  updateScreen(idx, { screenType: e.target.value as ScreenType })
                }
                className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs font-mono"
              >
                {SCREEN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button type="button" variant="ghost" onClick={() => remove(idx)}>
                Remove
              </Button>
            </div>

            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={screen.inheritFromReference}
                onChange={(e) =>
                  updateScreen(idx, { inheritFromReference: e.target.checked })
                }
              />
              Inherit this screen's structure from the reference
            </label>

            {screen.inheritFromReference && (
              <input
                value={screen.referenceScreenPath ?? ''}
                onChange={(e) =>
                  updateScreen(idx, { referenceScreenPath: e.target.value || undefined })
                }
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs font-mono"
                placeholder="src/backend/modules/parlour/ui/ParlourOrderDetails.jsx (optional override)"
              />
            )}

            <textarea
              value={screen.deviationNotes ?? ''}
              onChange={(e) =>
                updateScreen(idx, { deviationNotes: e.target.value || undefined })
              }
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs min-h-[48px]"
              placeholder="Notes on what's different from the reference (free text for the agent)"
              maxLength={2000}
            />

            <div>
              <p className="text-xs text-neutral-500 mb-1.5">Screenshots</p>
              <ScreenshotsEditor
                workspaceId={workspaceId}
                mcfSlug={mcfSlug}
                isEdit={isEdit}
                screenshots={screen.screenshots}
                onChange={(screenshots) => updateScreen(idx, { screenshots })}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
