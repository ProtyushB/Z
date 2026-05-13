import type { FieldOverride, FieldType } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'
import { FieldDefinitionRow, emptyFieldDefinition } from './FieldDefinitionRow'

interface Props {
  overrides: FieldOverride[]
  availableEntities: string[]
  onChange: (overrides: FieldOverride[]) => void
}

const FIELD_TYPES: FieldType[] = [
  'text',
  'varchar',
  'int',
  'bigint',
  'decimal',
  'boolean',
  'date',
  'time',
  'timestamp',
  'uuid',
  'enum',
  'json',
  'reference'
]

// Overrides on inherited fields — used when entity.inheritFromReference === true.
// Four actions: add, remove, rename, change-type.

export function FieldOverridesEditor({
  overrides,
  availableEntities,
  onChange
}: Props): JSX.Element {
  function update(idx: number, next: FieldOverride): void {
    onChange(overrides.map((o, i) => (i === idx ? next : o)))
  }

  function remove(idx: number): void {
    onChange(overrides.filter((_, i) => i !== idx))
  }

  function add(action: FieldOverride['action']): void {
    let next: FieldOverride
    switch (action) {
      case 'add':
        next = { action: 'add', field: emptyFieldDefinition() }
        break
      case 'remove':
        next = { action: 'remove', fieldName: '' }
        break
      case 'rename':
        next = { action: 'rename', fieldName: '', newName: '' }
        break
      case 'change-type':
        next = { action: 'change-type', fieldName: '', newType: 'text' }
        break
    }
    onChange([...overrides, next])
  }

  return (
    <div className="space-y-2">
      {overrides.length === 0 && (
        <p className="text-xs text-neutral-500">
          No overrides — this entity uses the reference's fields verbatim.
        </p>
      )}

      {overrides.map((ov, idx) => (
        <div
          key={idx}
          className="rounded border border-neutral-800 bg-neutral-950 p-2 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300 uppercase tracking-wide">
              {ov.action}
            </span>
            <Button type="button" variant="ghost" onClick={() => remove(idx)}>
              Remove
            </Button>
          </div>

          {ov.action === 'add' && (
            <FieldDefinitionRow
              field={ov.field}
              availableEntities={availableEntities}
              onChange={(f) => update(idx, { action: 'add', field: f })}
            />
          )}

          {ov.action === 'remove' && (
            <input
              value={ov.fieldName}
              onChange={(e) =>
                update(idx, { action: 'remove', fieldName: e.target.value })
              }
              className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
              placeholder="inherited field name to remove"
            />
          )}

          {ov.action === 'rename' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={ov.fieldName}
                onChange={(e) =>
                  update(idx, { ...ov, action: 'rename', fieldName: e.target.value })
                }
                className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
                placeholder="old name"
              />
              <input
                value={ov.newName}
                onChange={(e) =>
                  update(idx, { ...ov, action: 'rename', newName: e.target.value })
                }
                className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
                placeholder="new name"
              />
            </div>
          )}

          {ov.action === 'change-type' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={ov.fieldName}
                onChange={(e) =>
                  update(idx, { ...ov, action: 'change-type', fieldName: e.target.value })
                }
                className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
                placeholder="field name"
              />
              <select
                value={ov.newType}
                onChange={(e) =>
                  update(idx, {
                    ...ov,
                    action: 'change-type',
                    newType: e.target.value as FieldType
                  })
                }
                className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={() => add('add')}>
          + Add new field
        </Button>
        <Button type="button" variant="ghost" onClick={() => add('remove')}>
          + Remove inherited
        </Button>
        <Button type="button" variant="ghost" onClick={() => add('rename')}>
          + Rename
        </Button>
        <Button type="button" variant="ghost" onClick={() => add('change-type')}>
          + Change type
        </Button>
      </div>
    </div>
  )
}
