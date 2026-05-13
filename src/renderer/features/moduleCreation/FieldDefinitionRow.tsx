import type { FieldDefinition, FieldType } from '@shared/schemas/mcf'
import { COMMON_ENTITIES } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'

interface Props {
  field: FieldDefinition
  /** Slugs of entities in this MCF (used by `type: 'reference'` picker). */
  availableEntities: string[]
  onChange: (field: FieldDefinition) => void
  onRemove?: () => void
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

export function emptyFieldDefinition(): FieldDefinition {
  return {
    name: 'newField',
    type: 'text',
    validation: { required: false, unique: false }
  }
}

export function FieldDefinitionRow({
  field,
  availableEntities,
  onChange,
  onRemove
}: Props): JSX.Element {
  function patch(p: Partial<FieldDefinition>): void {
    onChange({ ...field, ...p })
  }

  function patchValidation(p: Partial<FieldDefinition['validation']>): void {
    onChange({ ...field, validation: { ...field.validation, ...p } })
  }

  return (
    <div className="rounded border border-neutral-800 bg-neutral-950 p-2 space-y-2">
      <div className="grid grid-cols-[1fr_140px_auto] gap-2">
        <input
          value={field.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
          placeholder="fieldName"
        />
        <select
          value={field.type}
          onChange={(e) => patch({ type: e.target.value as FieldType })}
          className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {onRemove && (
          <Button type="button" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      {/* Type-specific config */}
      {field.type === 'varchar' && (
        <input
          type="number"
          value={field.varcharLength ?? ''}
          onChange={(e) =>
            patch({ varcharLength: e.target.value ? Number(e.target.value) : undefined })
          }
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
          placeholder="max length (e.g., 255)"
          min={1}
          max={10000}
        />
      )}

      {field.type === 'decimal' && (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={field.decimalPrecision ?? ''}
            onChange={(e) =>
              patch({
                decimalPrecision: e.target.value ? Number(e.target.value) : undefined
              })
            }
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
            placeholder="precision (e.g., 12)"
            min={1}
            max={38}
          />
          <input
            type="number"
            value={field.decimalScale ?? ''}
            onChange={(e) =>
              patch({ decimalScale: e.target.value ? Number(e.target.value) : undefined })
            }
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
            placeholder="scale (e.g., 2)"
            min={0}
          />
        </div>
      )}

      {field.type === 'enum' && (
        <input
          value={(field.validation.enumValues ?? []).join(', ')}
          onChange={(e) =>
            patchValidation({
              enumValues: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            })
          }
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
          placeholder="comma-separated values (DRAFT, SUBMITTED, …)"
        />
      )}

      {field.type === 'reference' && (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={field.referenceEntity ?? ''}
            onChange={(e) => patch({ referenceEntity: e.target.value || undefined })}
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
          <select
            value={field.referenceCardinality ?? 'many-to-one'}
            onChange={(e) =>
              patch({
                referenceCardinality: e.target.value as 'many-to-one' | 'one-to-one'
              })
            }
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-mono"
          >
            <option value="many-to-one">many-to-one</option>
            <option value="one-to-one">one-to-one</option>
          </select>
        </div>
      )}

      {/* Common validation toggles */}
      <div className="flex gap-4 text-xs text-neutral-400">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.validation.required}
            onChange={(e) => patchValidation({ required: e.target.checked })}
          />
          required
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.validation.unique}
            onChange={(e) => patchValidation({ unique: e.target.checked })}
          />
          unique
        </label>
      </div>

      {/* Optional description */}
      <input
        value={field.description ?? ''}
        onChange={(e) => patch({ description: e.target.value || undefined })}
        className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs"
        placeholder="Description (optional)"
        maxLength={500}
      />
    </div>
  )
}
