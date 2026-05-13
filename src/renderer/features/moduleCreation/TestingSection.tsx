import type { ModuleCreationFile } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'

type Testing = ModuleCreationFile['testing']
type Scenario = Testing['e2e']['scenarios'][number]

interface Props {
  testing: Testing
  onChange: (testing: Testing) => void
}

export function TestingSection({ testing, onChange }: Props): JSX.Element {
  function patchBackend(p: Partial<Testing['backend']>): void {
    onChange({ ...testing, backend: { ...testing.backend, ...p } })
  }
  function patchFrontend(p: Partial<Testing['frontend']>): void {
    onChange({ ...testing, frontend: { ...testing.frontend, ...p } })
  }
  function patchE2e(p: Partial<Testing['e2e']>): void {
    onChange({ ...testing, e2e: { ...testing.e2e, ...p } })
  }

  function updateScenario(idx: number, p: Partial<Scenario>): void {
    patchE2e({
      scenarios: testing.e2e.scenarios.map((s, i) => (i === idx ? { ...s, ...p } : s))
    })
  }
  function addScenario(): void {
    patchE2e({ scenarios: [...testing.e2e.scenarios, { name: '', steps: '' }] })
  }
  function removeScenario(idx: number): void {
    patchE2e({ scenarios: testing.e2e.scenarios.filter((_, i) => i !== idx) })
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-300">Testing</h2>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-3 space-y-2">
        <p className="text-xs text-neutral-500 mb-1">Backend</p>
        <Toggle
          label="Generate unit tests"
          checked={testing.backend.generateUnit}
          onChange={(generateUnit) => patchBackend({ generateUnit })}
        />
        <Toggle
          label="Generate integration tests (needs ephemeral Postgres in Phase 7)"
          checked={testing.backend.generateIntegration}
          onChange={(generateIntegration) => patchBackend({ generateIntegration })}
        />
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-3 space-y-2">
        <p className="text-xs text-neutral-500 mb-1">Frontend</p>
        <Toggle
          label="Generate component tests"
          checked={testing.frontend.generateComponent}
          onChange={(generateComponent) => patchFrontend({ generateComponent })}
        />
        <Toggle
          label="Generate hook tests"
          checked={testing.frontend.generateHook}
          onChange={(generateHook) => patchFrontend({ generateHook })}
        />
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-3 space-y-2">
        <p className="text-xs text-neutral-500 mb-1">End-to-end (Cypress)</p>
        <Toggle
          label="Generate E2E tests (opt-in — slower runs)"
          checked={testing.e2e.generate}
          onChange={(generate) => patchE2e({ generate })}
        />

        {testing.e2e.generate && (
          <div className="pl-6 space-y-2">
            <p className="text-xs text-neutral-500">Scenarios (natural language → Cypress):</p>
            {testing.e2e.scenarios.length === 0 && (
              <p className="text-xs text-neutral-500">No scenarios yet.</p>
            )}
            {testing.e2e.scenarios.map((sc, idx) => (
              <div
                key={idx}
                className="rounded border border-neutral-800 bg-neutral-950 p-2 space-y-2"
              >
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    value={sc.name}
                    onChange={(e) => updateScenario(idx, { name: e.target.value })}
                    className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs"
                    placeholder="Scenario name (e.g., 'Customer books appointment')"
                    maxLength={120}
                  />
                  <Button type="button" variant="ghost" onClick={() => removeScenario(idx)}>
                    Remove
                  </Button>
                </div>
                <textarea
                  value={sc.steps}
                  onChange={(e) => updateScenario(idx, { steps: e.target.value })}
                  className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs min-h-[60px]"
                  placeholder="Steps in plain English — agent will translate to Cypress."
                  maxLength={2000}
                />
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={addScenario}>
              + Add scenario
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}): JSX.Element {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}
