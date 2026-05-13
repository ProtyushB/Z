import type { EntityEndpoint } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'

interface Props {
  endpoints: EntityEndpoint[]
  onChange: (endpoints: EntityEndpoint[]) => void
}

const STANDARD_OPS = ['list', 'get', 'create', 'update', 'patch', 'delete'] as const
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export function EndpointsEditor({ endpoints, onChange }: Props): JSX.Element {
  function update(idx: number, next: EntityEndpoint): void {
    onChange(endpoints.map((e, i) => (i === idx ? next : e)))
  }

  function remove(idx: number): void {
    onChange(endpoints.filter((_, i) => i !== idx))
  }

  function addExclude(): void {
    onChange([...endpoints, { action: 'exclude', standardOp: 'delete' }])
  }

  function addCustom(): void {
    onChange([
      ...endpoints,
      { action: 'add', method: 'GET', path: '/', description: '' }
    ])
  }

  return (
    <div className="space-y-2">
      {endpoints.length === 0 && (
        <p className="text-xs text-neutral-500">
          No endpoint overrides — entity uses the reference's standard CRUD.
        </p>
      )}
      {endpoints.map((ep, idx) => (
        <div
          key={idx}
          className="rounded border border-neutral-800 bg-neutral-950 p-2 space-y-2"
        >
          {ep.action === 'exclude' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 shrink-0">Exclude</span>
              <select
                value={ep.standardOp}
                onChange={(e) =>
                  update(idx, {
                    action: 'exclude',
                    standardOp: e.target.value as (typeof STANDARD_OPS)[number]
                  })
                }
                className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono flex-1"
              >
                {STANDARD_OPS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <Button type="button" variant="ghost" onClick={() => remove(idx)}>
                Remove
              </Button>
            </div>
          )}

          {ep.action === 'add' && (
            <>
              <div className="grid grid-cols-[80px_1fr_auto] gap-2">
                <select
                  value={ep.method}
                  onChange={(e) =>
                    update(idx, { ...ep, method: e.target.value as (typeof HTTP_METHODS)[number] })
                  }
                  className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  value={ep.path}
                  onChange={(e) => update(idx, { ...ep, path: e.target.value })}
                  className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
                  placeholder="/path/{id}/action"
                />
                <Button type="button" variant="ghost" onClick={() => remove(idx)}>
                  Remove
                </Button>
              </div>
              <textarea
                value={ep.description}
                onChange={(e) => update(idx, { ...ep, description: e.target.value })}
                className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs min-h-[48px]"
                placeholder="What does this endpoint do?"
                maxLength={500}
              />
            </>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={addExclude}>
          + Exclude standard op
        </Button>
        <Button type="button" variant="ghost" onClick={addCustom}>
          + Add custom endpoint
        </Button>
      </div>
    </div>
  )
}
