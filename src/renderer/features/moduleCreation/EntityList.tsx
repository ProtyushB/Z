import type { Entity } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'
import { EntityCard } from './EntityCard'

interface Props {
  entities: Entity[]
  onChange: (entities: Entity[]) => void
}

function emptyEntity(): Entity {
  return {
    slug: 'new_entity',
    displayName: 'New Entity',
    inheritFromReference: true,
    fieldOverrides: [],
    fields: [],
    relationships: [],
    endpoints: [],
    statusTransitions: [],
    searchableFields: []
  }
}

export function EntityList({ entities, onChange }: Props): JSX.Element {
  function update(idx: number, entity: Entity): void {
    onChange(entities.map((e, i) => (i === idx ? entity : e)))
  }

  function add(): void {
    onChange([...entities, emptyEntity()])
  }

  function remove(idx: number): void {
    if (entities.length <= 1) return // schema requires ≥ 1
    onChange(entities.filter((_, i) => i !== idx))
  }

  const allSlugs = entities.map((e) => e.slug)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">Entities</h2>
        <Button type="button" variant="ghost" onClick={add}>
          + Add entity
        </Button>
      </div>

      <p className="text-xs text-neutral-500">
        Click an entity to expand its editor. At least one entity is required.
      </p>

      <div className="space-y-2">
        {entities.map((entity, idx) => (
          <EntityCard
            key={idx}
            entity={entity}
            availableEntities={allSlugs}
            canRemove={entities.length > 1}
            onChange={(next) => update(idx, next)}
            onRemove={() => remove(idx)}
            // Auto-expand single-entity new MCFs so the user immediately sees the editor
            defaultExpanded={entities.length === 1}
          />
        ))}
      </div>
    </section>
  )
}
