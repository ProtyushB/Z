import { create } from 'zustand'
import { ipc } from '../lib/ipc'
import type { ModuleCreationFile, McfSummary } from '@shared/schemas/mcf'

interface McfStore {
  workspaceId: string | null
  list: McfSummary[]
  loading: boolean
  error: string | null

  load: (workspaceId: string) => Promise<void>
  save: (workspaceId: string, mcf: ModuleCreationFile) => Promise<void>
  remove: (workspaceId: string, slug: string) => Promise<void>
}

export const useMcfStore = create<McfStore>((set, get) => ({
  workspaceId: null,
  list: [],
  loading: false,
  error: null,

  async load(workspaceId) {
    set({ loading: true, error: null, workspaceId })
    try {
      const list = await ipc.invoke('mcf:list', { workspaceId })
      set({ list, loading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false })
    }
  },

  async save(workspaceId, mcf) {
    await ipc.invoke('mcf:save', { workspaceId, mcf })
    if (get().workspaceId === workspaceId) {
      await get().load(workspaceId)
    }
  },

  async remove(workspaceId, slug) {
    await ipc.invoke('mcf:delete', { workspaceId, slug })
    if (get().workspaceId === workspaceId) {
      await get().load(workspaceId)
    }
  }
}))
