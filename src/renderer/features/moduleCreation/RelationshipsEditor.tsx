import type { Relationship } from '@shared/schemas/mcf'
import { COMMON_ENTITIES } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'

interface Props {
  relationships: Relationship[]
  /** Slugs of all entities in this MCF (used to populate the target picker). */
  availableEntities: string[]
  onChange: (relationships: Relationship[]) => void
}

const KINDS = ['many-to-one', 'one-to-many', 'one-to-one', 'many-to-many'] as const

function emptyRelationship(): Relationship {
  return {
    name: '',
    kind: 'many-to-one',
    targetEntity: '',
    nullable: true
  }
}

export function RelationshipsEditor({
  relationships,
  availableEntities,
  onChange
}: Props): JSX.Element {
  function update(idx: number, patch: Partial<Relationship>): void {
    onChange(relationships.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function remove(idx: number): void {
    onChange(relationships.filter((_, i) => i !== idx))
  }

  function add(): void {
    onChange([...relationships, emptyRelationship()])
  }

  return (
    <div className="space-y-2">
      {relationships.length === 0 && (
        <p className="text-xs text-neutral-500">No relationships defined.</p>
      )}
      {relationships.map((rel, idx) => (
        <div
          key={idx}
          className="rounded border border-neutral-800 bg-neutral-950 p-2 space-y-2"
        >
          <div className="grid grid-cols-[1fr_140px_1fr] gap-2">
            <input
              value={rel.name}
              onChange={(e) => update(idx, { name: e.target.value })}
              className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
              placeholder="name (e.g., parent)"
            />
            <select
              value={rel.kind}
              onChange={(e) =>
                update(idx, { kind: e.target.value as Relationship['kind'] })
              }
              className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={rel.targetEntity}
              onChange={(e) => update(idx, { targetEntity: e.target.value })}
              className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
            >
              <option value="">— target entity —</option>
              {availableEntities.length > 0 && (
                <optgroup label="This MCF">
                  {availableEntities.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Common (modulex)">
                {COMMON_ENTITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Kind-specific extras */}
          {rel.kind === 'one-to-many' && (
            <input
              value={rel.inverseFieldName ?? ''}
              onChange={(e) =>
                update(idx, { inverseFieldName: e.target.value || undefined })
              }
              className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
              placeholder="inverse field name on target (optional)"
            />
          )}
          {rel.kind === 'many-to-many' && (
            <input
              value={rel.joinTableName ?? ''}
              onChange={(e) =>
                update(idx, { joinTableName: e.target.value || undefined })
              }
              className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
              placeholder="join table name (optional)"
            />
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rel.nullable}
                onChange={(e) => update(idx, { nullable: e.target.checked })}
              />
              Nullable
            </label>
            <Button type="button" variant="ghost" onClick={() => remove(idx)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="ghost" onClick={add}>
        + Add relationship
      </Button>
    </div>
  )
}
