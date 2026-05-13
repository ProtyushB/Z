import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Workspace } from '@shared/schemas/workspace'
import { Button } from '../components/ui/button'
import { useWorkspaceStore } from '../stores/workspace.store'
import { formatRelative, shortRepoLabel } from '../lib/format'

export function WorkspaceList(): JSX.Element {
  const { workspaces, loading, error, load } = useWorkspaceStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="min-h-screen flex flex-col p-8 gap-6 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Workspaces</h1>
        <Link to="/workspaces/new">
          <Button>New workspace</Button>
        </Link>
      </header>

      {error && (
        <div className="rounded border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && <p className="text-neutral-500 text-sm">Loading…</p>}

      {!loading && workspaces.length === 0 && (
        <div className="rounded border border-neutral-800 bg-neutral-900/40 p-12 text-center">
          <p className="text-neutral-400 mb-4">No workspaces yet.</p>
          <Link to="/workspaces/new">
            <Button>Create your first workspace</Button>
          </Link>
        </div>
      )}

      {!loading && workspaces.length > 0 && (
        <ul className="space-y-3">
          {workspaces.map((ws) => (
            <WorkspaceRow key={ws.id} ws={ws} />
          ))}
        </ul>
      )}
    </div>
  )
}

function WorkspaceRow({ ws }: { ws: Workspace }): JSX.Element {
  const cloned = !!(ws.backendLocalPath && ws.frontendLocalPath)
  return (
    <li>
      <Link
        to={`/workspaces/${ws.id}`}
        className="block rounded border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800/60 hover:border-neutral-700 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{ws.name}</div>
            <div className="text-xs text-neutral-500 font-mono mt-1 truncate">
              BE: {shortRepoLabel(ws.backendRepoUrl)} · FE: {shortRepoLabel(ws.frontendRepoUrl)}
            </div>
            <div className="text-xs mt-1">
              <span className="text-neutral-600">Created {formatRelative(ws.createdAt)}</span>
              <span className="mx-1.5 text-neutral-700">·</span>
              {cloned ? (
                <span className="text-green-400">✓ Cloned</span>
              ) : (
                <span className="text-neutral-500">Not cloned</span>
              )}
            </div>
          </div>
          <div className="text-neutral-600 shrink-0 text-xl leading-none">›</div>
        </div>
      </Link>
    </li>
  )
}
