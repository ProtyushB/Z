import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { useWorkspaceStore } from '../stores/workspace.store'
import { normalizeRepoUrl } from '../lib/format'

// Strict shape we want to actually send + store. Server-side Zod enforces too.
const REPO_URL_RE = /^https:\/\/[\w.-]+\/[\w.-]+\/[\w.-]+(\.git)?$/

const URL_HINT_BACKEND = 'HTTPS clone URL for the ModuleX (Java + Postgres) repo.'
const URL_HINT_FRONTEND = 'HTTPS clone URL for the Centrix (React) repo.'
const URL_ERROR_MSG = 'Must look like https://github.com/owner/repo — or just owner/repo.'

export function WorkspaceSetup(): JSX.Element {
  const navigate = useNavigate()
  const create = useWorkspaceStore((s) => s.create)

  const [name, setName] = useState('')
  const [backendRepoUrl, setBackend] = useState('')
  const [frontendRepoUrl, setFrontend] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const nameOk = name.trim().length >= 1
  const beNorm = normalizeRepoUrl(backendRepoUrl)
  const feNorm = normalizeRepoUrl(frontendRepoUrl)
  const beOk = beNorm.length > 0 && REPO_URL_RE.test(beNorm)
  const feOk = feNorm.length > 0 && REPO_URL_RE.test(feNorm)
  const ready = nameOk && beOk && feOk && !busy

  const beHint =
    beOk && beNorm !== backendRepoUrl.trim() ? `Will clone from: ${beNorm}` : URL_HINT_BACKEND
  const feHint =
    feOk && feNorm !== frontendRepoUrl.trim() ? `Will clone from: ${feNorm}` : URL_HINT_FRONTEND

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setErr(null)
    try {
      const ws = await create({
        name: name.trim(),
        backendRepoUrl: beNorm,
        frontendRepoUrl: feNorm
      })
      // Send the user to the workspace's detail page where they sign in + clone.
      navigate(`/workspaces/${ws.id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <Link to="/workspaces" className="text-sm text-neutral-500 hover:text-neutral-300">
        ← Back to workspaces
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mt-4 mb-3">New workspace</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Workspaces are independent — each has its own GitHub authentication and cloned files.
        You'll sign in on the next screen.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <Field label="Name" hint="A short label for this workspace.">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2"
            placeholder="ModuleX (main)"
            autoFocus
          />
        </Field>

        <Field
          label="Backend repo URL"
          hint={beHint}
          error={backendRepoUrl && !beOk ? URL_ERROR_MSG : null}
        >
          <input
            value={backendRepoUrl}
            onChange={(e) => setBackend(e.target.value)}
            className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm"
            placeholder="https://github.com/owner/ModuleX.git"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Frontend repo URL"
          hint={feHint}
          error={frontendRepoUrl && !feOk ? URL_ERROR_MSG : null}
        >
          <input
            value={frontendRepoUrl}
            onChange={(e) => setFrontend(e.target.value)}
            className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm"
            placeholder="https://github.com/owner/Centrix.git"
            spellCheck={false}
          />
        </Field>

        {err && (
          <div className="rounded border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
            {err}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={!ready}>
            {busy ? 'Creating…' : 'Create workspace'}
          </Button>
          <Link to="/workspaces">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  hint,
  error,
  children
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-neutral-500 mt-0.5 mb-1.5">{hint}</span>}
      {children}
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  )
}
