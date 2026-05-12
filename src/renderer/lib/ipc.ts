import type { XBridge } from '@shared/ipc/contracts'

// `window.api` is set by the preload via contextBridge.exposeInMainWorld.
// The shape is enforced by XBridge; the preload must implement it.
export const ipc: XBridge = window.api
