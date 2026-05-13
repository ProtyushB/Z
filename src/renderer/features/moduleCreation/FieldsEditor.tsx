import type { FieldDefinition } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'
import { FieldDefinitionRow, emptyFieldDefinition } from './FieldDefinitionRow'

interface Props {
  fields: FieldDefinition[]
  availableEntities: string[]
  onChange: (fields: FieldDefinition[]) => void
}

// Full fields array — used when entity.inheritFromReference === false.
// Author is defining the entity from scratch.

export function FieldsEditor({ fields, availableEntities, onChange }: Props): JSX.Element {
  function update(idx: number, field: FieldDefinition): void {
    onChange(fields.map((f, i) => (i === idx ? field : f)))
  }

  function remove(idx: number): void {
    onChange(fields.filter((_, i) => i !== idx))
  }

  function add(): void {
    onChange([...fields, emptyFieldDefinition()])
  }

  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-xs text-neutral-500">
          No fields yet. Add at least one to fully define this entity.
        </p>
      )}
      {fields.map((field, idx) => (
        <FieldDefinitionRow
          key={idx}
          field={field}
          availableEntities={availableEntities}
          onChange={(next) => update(idx, next)}
          onRemove={() => remove(idx)}
        />
      ))}
      <Button type="button" variant="ghost" onClick={add}>
        + Add field
      </Button>
    </div>
  )
}
