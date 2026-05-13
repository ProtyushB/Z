import { useState, type KeyboardEvent } from 'react'

interface Props {
  fields: string[]
  onChange: (fields: string[]) => void
}

// Chip input for an array of identifier strings. Phase 3+ uses these as hints
// for which fields to index / search by.

export function SearchableFieldsEditor({ fields, onChange }: Props): JSX.Element {
  const [input, setInput] = useState('')

  function add(): void {
    const v = input.trim()
    if (!v) return
    if (!fields.includes(v)) onChange([...fields, v])
    setInput('')
  }

  function remove(idx: number): void {
    onChange(fields.filter((_, i) => i !== idx))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !input && fields.length > 0) {
      remove(fields.length - 1)
    }
  }

  return (
    <div className="space-y-2">
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fields.map((f, idx) => (
            <span
              key={idx}
              className="rounded bg-neutral-800 px-2 py-1 text-xs font-mono flex items-center gap-1.5"
            >
              {f}
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-neutral-500 hover:text-neutral-200"
                aria-label={`remove ${f}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={add}
        className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs font-mono"
        placeholder="field name + Enter"
      />
    </div>
  )
}
