interface Props {
  value: string | undefined
  onChange: (notes: string | undefined) => void
}

export function GlobalNotesSection({ value, onChange }: Props): JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-neutral-300">Global notes</h2>
      <p className="text-xs text-neutral-500">
        Free text for the agent — assumptions, edge cases, naming conventions, anything
        worth flagging that doesn't fit elsewhere.
      </p>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm min-h-[100px]"
        placeholder="Use 'cabin' (not 'room' or 'workstation') everywhere — it's the customer-facing word."
        maxLength={5000}
      />
    </section>
  )
}
