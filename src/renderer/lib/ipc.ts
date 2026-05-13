import type { XBridge, Channel, Procedures } from '@shared/ipc/contracts'

// `window.api` is set by the preload via contextBridge.exposeInMainWorld.
// We wrap it here so renderer code gets cleaner error messages.
const raw: XBridge = window.api

/**
 * Electron's ipcRenderer.invoke wraps anything thrown in the main-side handler
 * as: "Error invoking remote method 'channel': Error: <original message>".
 * This unwraps that envelope so UI error displays start with the real message.
 */
function unwrapIpcError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err)
  const m = msg.match(/^Error invoking remote method '[^']+': Error: ([\s\S]*)$/)
  if (m) return new Error(m[1])
  return err instanceof Error ? err : new Error(msg)
}

async function invoke<C extends Channel>(
  channel: C,
  request: Procedures[C]['req']
): Promise<Procedures[C]['res']> {
  try {
    return await raw.invoke(channel, request)
  } catch (err) {
    throw unwrapIpcError(err)
  }
}

export const ipc: XBridge = {
  invoke,
  subscribe: raw.subscribe
}
