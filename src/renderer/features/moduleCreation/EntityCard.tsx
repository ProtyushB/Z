import { useState } from 'react'
import type { Entity } from '@shared/schemas/mcf'
import { Button } from '../../components/ui/button'
import { toSlug } from './McfMetaSection'
import { FieldsEditor } from './FieldsEditor'
import { FieldOverridesEditor } from './FieldOverridesEditor'
import { RelationshipsEditor } from './RelationshipsEditor'
import { EndpointsEditor } from './EndpointsEditor'
import { StatusTransitionsEditor } from './StatusTransitionsEditor'
import { SearchableFieldsEditor } from './SearchableFieldsEditor'

interface Props {
  entity: Entity
  availableEntities: string[]
  canRemove: boolean
  onChange: (entity: Entity) => void
  onRemove: () => void
  defaultExpanded?: boolean
}

function summary(entity: Entity): string {
  const parts: string[] = []
  if (entity.inheritFromReference) {
    parts.push(
      `inherits${entity.fieldOverrides.length ? ` (${entity.fieldOverrides.length} overrides)` : ''}`
    )
  } else {
    parts.push(`${entity.fields.length} fields`)
  }
  if (entity.relationships.length) parts.push(`${entity.relationships.length} rel`)
  if (entity.endpoints.length) parts.push(`${entity.endpoints.length} endpoint`)
  if (entity.statusTransitions.length)
    parts.push(`${entity.statusTransitions.length} transition`)
  return parts.join(' · ')
}

export function EntityCard({
  entity,
  availableEntities,
  canRemove,
  onChange,
  onRemove,
  defaultExpanded = false
}: Props): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded)

  function patch(p: Partial<Entity>): void {
    onChange({ ...entity, ...p })
  }

  function setDisplayName(displayName: string): void {
    // Auto-derive slug from display name unless user customized it.
    const slugWasAutoDerived =
      entity.slug === '' || entity.slug === toSlug(entity.displayName)
    patch({
      displayName,
      slug: slugWasAutoDerived ? toSlug(displayName) || 'entity' : entity.slug
    })
  }

  // Filter availableEntities so a relationship/reference picker doesn't list THIS entity
  // (would let it reference itself by mistake; uncommon and easier to forbid).
  const otherEntities = availableEntities.filter((s) => s !== entity.slug)

  return (
    <div className="rounded border border-neutral-800 bg-neutral-900">
      {/* Always-visible header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-neutral-800/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-neutral-500 shrink-0">{expanded ? '▼' : '▶'}</span>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">
              {entity.displayName || '(unnamed)'}
            </div>
            <div className="text-xs text-neutral-500 font-mono truncate">
              {entity.slug || '(no slug)'}
              <span className="mx-1.5 text-neutral-700">·</span>
              {summary(entity)}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-800 p-4 space-y-5">
          {/* Basic identity */}
          <div className="space-y-2">
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <input
                value={entity.displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm"
                placeholder="Display name"
                maxLength={60}
              />
              <input
                value={entity.slug}
                onChange={(e) => patch({ slug: e.target.value })}
                className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 font-mono text-xs"
                placeholder="entity_slug"
                maxLength={40}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={entity.inheritFromReference}
                onChange={(e) => patch({ inheritFromReference: e.target.checked })}
              />
              Inherit from reference vertical
            </label>
            <textarea
              value={entity.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value || undefined })}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs min-h-[48px]"
              placeholder="Notes for the agent (assumptions, edge cases, free text)"
              maxLength={2000}
            />
          </div>

          {/* Fields OR Field overrides depending on inheritFromReference */}
          <SubSection
            title={
              entity.inheritFromReference
                ? 'Field overrides on inherited fields'
                : 'Fields'
            }
          >
            {entity.inheritFromReference ? (
              <FieldOverridesEditor
                overrides={entity.fieldOverrides}
                availableEntities={otherEntities}
                onChange={(fieldOverrides) => patch({ fieldOverrides })}
              />
            ) : (
              <FieldsEditor
                fields={entity.fields}
                availableEntities={otherEntities}
                onChange={(fields) => patch({ fields })}
              />
            )}
          </SubSection>

          <SubSection title="Relationships">
            <RelationshipsEditor
              relationships={entity.relationships}
              availableEntities={otherEntities}
              onChange={(relationships) => patch({ relationships })}
            />
          </SubSection>

          <SubSection title="Endpoint overrides">
            <EndpointsEditor
              endpoints={entity.endpoints}
              onChange={(endpoints) => patch({ endpoints })}
            />
          </SubSection>

          <SubSection title="Status transitions">
            <StatusTransitionsEditor
              transitions={entity.statusTransitions}
              onChange={(statusTransitions) => patch({ statusTransitions })}
            />
          </SubSection>

          <SubSection title="Searchable fields">
            <SearchableFieldsEditor
              fields={entity.searchableFields}
              onChange={(searchableFields) => patch({ searchableFields })}
            />
          </SubSection>

          {/* Bottom action */}
          <div className="flex justify-end pt-2 border-t border-neutral-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onRemove}
              disabled={!canRemove}
              className="text-red-400 hover:bg-red-950/30 disabled:text-neutral-600"
            >
              Remove entity
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SubSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div>
      <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}
