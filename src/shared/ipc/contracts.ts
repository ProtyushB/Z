// Single source of truth for the renderer↔main wire format.
// Both processes import this. If they drift, the compiler tells you.

import type { Workspace, CreateWorkspaceInput } from '../schemas/workspace'

export interface ReferenceModule {
  slug: string
  entityHints: string[]
}

export type Procedures = {
  // Plumbing — exists since Phase 0 to validate the IPC bridge end-to-end.
  'app:ping': { req: void; res: { pong: true; at: string } }

  // Workspace CRUD (Phase 1, Chunk 2).
  'workspace:list': { req: void; res: Workspace[] }
  'workspace:get': { req: { id: string }; res: Workspace | null }
  'workspace:create': { req: CreateWorkspaceInput; res: Workspace }
  // Delete is destructive in Chunk 5+: drops the DB row, removes cloned files,
  // and cascades per-workspace secrets via the workspace_secrets FK.
  'workspace:delete': { req: { id: string }; res: void }
  // Clone both repos via the workspace's stored PAT. Long-running (~30 s); UI
  // shows a busy spinner. Returns the workspace with `*LocalPath` populated.
  'workspace:cloneRepos': { req: { id: string }; res: Workspace }
  // Open the workspace directory in the OS file explorer.
  'workspace:openFolder': { req: { id: string }; res: void }

  // GitHub authentication — PER-WORKSPACE since Chunk 5. Each workspace has
  // its own encrypted PAT in `workspace_secrets`, so different workspaces can
  // use different GitHub identities.
  'github:auth:setPat': {
    req: { workspaceId: string; token: string }
    res: { username: string }
  }
  'github:auth:status': {
    req: { workspaceId: string }
    res: { authenticated: boolean; username: string | null }
  }
  'github:auth:logout': { req: { workspaceId: string }; res: void }

  // Reference module scanner — used by Phase 2's MCF authoring to enumerate
  // verticals in the cloned ModuleX repo. Empty array if the workspace
  // isn't cloned or doesn't look like ModuleX.
  'reference:scan': { req: { workspaceId: string }; res: ReferenceModule[] }
}

// No streamed events yet. Will grow in Phase 3+ (module-run progress).
export type Events = Record<never, never>

export type Channel = keyof Procedures
export type EventChannel = keyof Events

export type Invoke = <C extends Channel>(
  channel: C,
  request: Procedures[C]['req']
) => Promise<Procedures[C]['res']>

export type Subscribe = <E extends EventChannel>(
  event: E,
  handler: (payload: Events[E]) => void
) => () => void

export interface XBridge {
  invoke: Invoke
  subscribe: Subscribe
}

declare global {
  interface Window {
    api: XBridge
  }
}
