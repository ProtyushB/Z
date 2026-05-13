import { create } from 'zustand'
import { ipc } from '../lib/ipc'
import type { Workspace, CreateWorkspaceInput } from '@shared/schemas/workspace'

interface WorkspaceStore {
  workspaces: Workspace[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  create: (input: CreateWorkspaceInput) => Promise<Workspace>
  remove: (id: string) => Promise<void>
  clone: (id: string) => Promise<Workspace>
  openFolder: (id: string) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  loading: false,
  error: null,

  async load() {
    set({ loading: true, error: null })
    try {
      const workspaces = await ipc.invoke('workspace:list', undefined)
      set({ workspaces, loading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false })
    }
  },

  async create(input) {
    const ws = await ipc.invoke('workspace:create', input)
    await get().load()
    return ws
  },

  async remove(id) {
    await ipc.invoke('workspace:delete', { id })
    await get().load()
  },

  async clone(id) {
    const ws = await ipc.invoke('workspace:cloneRepos', { id })
    // Surgical replacement so the row's "Cloning…" → "✓ Cloned" transition
    // doesn't blink through a full list refetch.
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? ws : w))
    }))
    return ws
  },

  async openFolder(id) {
    await ipc.invoke('workspace:openFolder', { id })
  }
}))
