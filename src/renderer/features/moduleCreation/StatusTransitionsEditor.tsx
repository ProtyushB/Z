import type { StatusTransition } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'

interface Props {
  transitions: StatusTransition[]
  onChange: (transitions: StatusTransition[]) => void
}

function emptyTransition(): StatusTransition {
  return { from: '', to: '' }
}

export function StatusTransitionsEditor({ transitions, onChange }: Props): JSX.Element {
  function update(idx: number, patch: Partial<StatusTransition>): void {
    onChange(transitions.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }

  function add(): void {
    onChange([...transitions, emptyTransition()])
  }

  function remove(idx: number): void {
    onChange(transitions.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      {transitions.length === 0 && (
        <p className="text-xs text-neutral-500">No status transitions defined.</p>
      )}
      {transitions.map((t, idx) => (
        <div
          key={idx}
          className="rounded border border-neutral-800 bg-neutral-950 p-2 grid grid-cols-2 gap-2"
        >
          <input
            value={t.from}
            onChange={(e) => update(idx, { from: e.target.value })}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
            placeholder="from (e.g., DRAFT)"
          />
          <input
            value={t.to}
            onChange={(e) => update(idx, { to: e.target.value })}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
            placeholder="to (e.g., SUBMITTED)"
          />
          <input
            value={t.triggerEvent ?? ''}
            onChange={(e) => update(idx, { triggerEvent: e.target.value || undefined })}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
            placeholder="trigger event (optional)"
          />
          <input
            value={t.guardCondition ?? ''}
            onChange={(e) => update(idx, { guardCondition: e.target.value || undefined })}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs"
            placeholder="guard (natural language, optional)"
          />
          <div className="col-span-2 flex justify-end">
            <Button type="button" variant="ghost" onClick={() => remove(idx)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="ghost" onClick={add}>
        + Add transition
      </Button>
    </div>
  )
}
