import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import type { Workspace } from '@shared/schemas/workspace'
import type { ReferenceModule } from '@shared/ipc/contracts'
import { Button } from '../components/ui/button'
import { GithubLoginPanel } from '../components/GithubLoginPanel'
import { ipc } from '../lib/ipc'
import { useWorkspaceStore } from '../stores/workspace.store'
import { formatRelative } from '../lib/format'

export function WorkspaceDetail(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clone, remove, openFolder } = useWorkspaceStore()

  const [ws, setWs] = useState<Workspace | null | undefined>(undefined)
  const [busyClone, setBusyClone] = useState(false)
  const [cloneErr, setCloneErr] = useState<string | null>(null)
  const [openErr, setOpenErr] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean
    username: string | null
  } | null>(null)
  const [refs, setRefs] = useState<ReferenceModule[]>([])

  const loadWs = useCallback(async () => {
    try {
      const result = await ipc.invoke('workspace:get', { id })
      setWs(result ?? null)
    } catch {
      setWs(null)
    }
  }, [id])

  const refreshRefs = useCallback(async () => {
    try {
      const result = await ipc.invoke('reference:scan', { workspaceId: id })
      setRefs(result)
    } catch {
      // ignore
    }
  }, [id])

  // authStatus is driven by GithubLoginPanel via its `onStatusChange` prop —
  // single source of truth for auth state on this page.
  useEffect(() => {
    void loadWs()
    void refreshRefs()
  }, [id, loadWs, refreshRefs])

  async function handleClone(): Promise<void> {
    setBusyClone(true)
    setCloneErr(null)
    try {
      await clone(id)
      await loadWs()
      await refreshRefs()
    } catch (e) {
      setCloneErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyClone(false)
    }
  }

  async function handleOpenFolder(): Promise<void> {
    setOpenErr(null)
    try {
      await openFolder(id)
    } catch (e) {
      setOpenErr(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleDelete(): Promise<void> {
    if (!ws) return
    const confirmed = window.confirm(
      `Delete workspace "${ws.name}"?\n\nThis will permanently remove the cloned files and the workspace's stored GitHub token. This cannot be undone.`
    )
    if (!confirmed) return
    await remove(id)
    navigate('/workspaces')
  }

  if (ws === undefined) {
    return <div className="p-8 text-neutral-500">Loading…</div>
  }

  if (ws === null) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link to="/workspaces" className="text-sm text-neutral-500 hover:text-neutral-300">
          ← Back to workspaces
        </Link>
        <h1 className="text-2xl font-semibold mt-4">Workspace not found</h1>
        <p className="text-sm text-neutral-500 mt-2">
          It may have been deleted. Go back to the list.
        </p>
      </div>
    )
  }

  const cloned = !!(ws.backendLocalPath && ws.frontendLocalPath)

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <Link to="/workspaces" className="text-sm text-neutral-500 hover:text-neutral-300">
        ← Back to workspaces
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{ws.name}</h1>
        <p className="text-xs text-neutral-500 mt-1">Created {formatRelative(ws.createdAt)}</p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-neutral-300 mb-2">Repositories</h2>
        <div className="rounded border border-neutral-800 bg-neutral-900 p-4 space-y-3">
          <div>
            <div className="text-xs text-neutral-500">Backend</div>
            <div className="font-mono text-sm break-all">{ws.backendRepoUrl}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Frontend</div>
            <div className="font-mono text-sm break-all">{ws.frontendRepoUrl}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-300 mb-2">GitHub authentication</h2>
        <GithubLoginPanel workspaceId={id} onStatusChange={setAuthStatus} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-300 mb-2">Clone status</h2>
        {!cloned && (
          <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs text-neutral-500 mb-3">
              Will be cloned to{' '}
              <code className="font-mono bg-neutral-950 px-1 py-0.5 rounded text-[10px] break-all">
                userData/workspaces/{id}/{`{backend,frontend}`}
              </code>
            </p>
            <Button onClick={handleClone} disabled={busyClone || !authStatus?.authenticated}>
              {busyClone
                ? 'Cloning…'
                : authStatus?.authenticated
                  ? 'Clone'
                  : 'Sign in to GitHub first'}
            </Button>
            {cloneErr && (
              <div className="mt-3 rounded border border-red-900 bg-red-950/30 p-2 text-xs text-red-300">
                {cloneErr}
              </div>
            )}
          </div>
        )}
        {cloned && (
          <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-green-400 mb-3">✓ Cloned</p>
            <Button onClick={handleOpenFolder}>Open folder</Button>
            {openErr && (
              <div className="mt-3 rounded border border-red-900 bg-red-950/30 p-2 text-xs text-red-300">
                {openErr}
              </div>
            )}
          </div>
        )}
      </section>

      {cloned && refs.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-neutral-300 mb-2">Reference modules detected</h2>
          <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs text-neutral-500 mb-3">
              Module verticals found in the cloned backend. Phase 2 will use one as a template.
            </p>
            <ul className="space-y-1.5">
              {refs.map((r) => (
                <li key={r.slug} className="text-sm">
                  <span className="font-mono text-neutral-200">{r.slug}</span>
                  {r.entityHints.length > 0 && (
                    <span className="text-xs text-neutral-500 ml-2">
                      ({r.entityHints.length}: {r.entityHints.slice(0, 6).join(', ')}
                      {r.entityHints.length > 6 ? '…' : ''})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-red-400 mb-2">Danger zone</h2>
        <div className="rounded border border-red-900/50 bg-red-950/10 p-4">
          <p className="text-sm text-neutral-400 mb-3">
            Delete this workspace, its stored GitHub token, and all its cloned files. This cannot
            be undone.
          </p>
          <Button
            variant="ghost"
            onClick={handleDelete}
            className="text-red-400 hover:bg-red-950/30"
          >
            Delete workspace + cloned files
          </Button>
        </div>
      </section>
    </div>
  )
}
