import { type ReactNode } from 'react'
import type { ModuleCreationFile } from '@shared/schemas/mcf'
import { ReferenceModulePicker } from './ReferenceModulePicker'

type Meta = ModuleCreationFile['meta']

interface Props {
  workspaceId: string
  meta: Meta
  isEdit: boolean
  onChange: (patch: Partial<Meta>) => void
}

/** Convert a display name like "Day Spa" into a valid slug like "day_spa". */
export function toSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 40)
}

export function McfMetaSection({ workspaceId, meta, isEdit, onChange }: Props): JSX.Element {
  function setDisplayName(displayName: string): void {
    if (isEdit) {
      // Edit mode: slug is locked (PK in DB); don't auto-touch it.
      onChange({ displayName })
      return
    }
    // New mode: auto-derive slug from displayName UNLESS user already
    // customized it (in which case keep their version).
    const slugWasAutoDerived = meta.slug === '' || meta.slug === toSlug(meta.displayName)
    onChange({
      displayName,
      slug: slugWasAutoDerived ? toSlug(displayName) : meta.slug
    })
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-neutral-300">Meta</h2>

      <Field label="Display name" hint="Human-friendly name of the new module (e.g., 'Spa').">
        <input
          value={meta.displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2"
          placeholder="Spa"
          autoFocus={!isEdit}
          maxLength={60}
        />
      </Field>

      <Field
        label="Slug"
        hint={
          isEdit
            ? 'Locked — slug is the primary key. Delete and re-create the MCF to change it.'
            : 'Snake_case identifier. Auto-derived from display name; edit if needed.'
        }
      >
        <input
          value={meta.slug}
          onChange={(e) => onChange({ slug: e.target.value })}
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="spa"
          disabled={isEdit}
          maxLength={40}
        />
      </Field>

      <Field
        label="Description"
        hint="What kind of business is this? Agents read this for context."
      >
        <textarea
          value={meta.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 min-h-[80px]"
          placeholder="Day-spa vertical with bookings, treatments, and retail products."
          maxLength={2000}
        />
      </Field>

      <Field
        label="Reference module"
        hint="Which existing vertical to mirror as the template."
      >
        <ReferenceModulePicker
          workspaceId={workspaceId}
          value={meta.referenceModule}
          onChange={(referenceModule) => onChange({ referenceModule })}
        />
      </Field>
    </section>
  )
}

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-neutral-500 mt-0.5 mb-1.5">{hint}</span>}
      {children}
    </label>
  )
}
