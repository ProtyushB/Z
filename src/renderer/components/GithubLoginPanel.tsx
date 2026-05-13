import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { ipc } from '../lib/ipc'
import { cn } from '../lib/cn'

interface AuthStatus {
  authenticated: boolean
  username: string | null
}

interface Props {
  workspaceId: string
  /**
   * Called every time the panel re-fetches its status (mount, after sign-in,
   * after sign-out). Lets parent components stay in sync with auth state
   * without making their own redundant IPC calls.
   */
  onStatusChange?: (status: AuthStatus) => void
  className?: string
}

export function GithubLoginPanel({
  workspaceId,
  onStatusChange,
  className
}: Props): JSX.Element {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  async function refresh(): Promise<void> {
    try {
      const s = await ipc.invoke('github:auth:status', { workspaceId })
      setStatus(s)
      onStatusChange?.(s)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  async function save(): Promise<void> {
    if (!token.trim()) return
    setBusy(true)
    setErr(null)
    try {
      await ipc.invoke('github:auth:setPat', { workspaceId, token: token.trim() })
      setToken('')
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function logout(): Promise<void> {
    try {
      await ipc.invoke('github:auth:logout', { workspaceId })
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  if (status === null) {
    return (
      <div className={cn('rounded border border-neutral-800 bg-neutral-900 p-4', className)}>
        <p className="text-xs text-neutral-500">Loading auth status…</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded border border-neutral-800 bg-neutral-900 p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">GitHub authentication</h3>
        {status.authenticated && status.username && (
          <span className="text-xs text-green-400">
            Signed in as <span className="font-mono">{status.username}</span>
          </span>
        )}
      </div>

      {!status.authenticated && (
        <>
          <p className="text-xs text-neutral-500 mb-3">
            Paste a GitHub personal access token with{' '}
            <code className="font-mono bg-neutral-950 px-1 py-0.5 rounded text-[10px]">repo</code>{' '}
            scope.{' '}
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=X+orchestrator"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline"
            >
              Create one →
            </a>
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-mono"
              placeholder="ghp_..."
              autoComplete="off"
              spellCheck={false}
            />
            <Button onClick={save} disabled={busy || !token.trim()}>
              {busy ? 'Validating…' : 'Sign in'}
            </Button>
          </div>
          {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
        </>
      )}

      {status.authenticated && (
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-neutral-500">
            Token stored encrypted via OS keychain (safeStorage), scoped to this workspace.
          </p>
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      )}
    </div>
  )
}
