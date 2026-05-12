import { contextBridge, ipcRenderer } from 'electron'
import type { XBridge } from '@shared/ipc/contracts'

const bridge: XBridge = {
  invoke: (channel, request) => ipcRenderer.invoke(channel as string, request),
  subscribe: (event, handler) => {
    const wrapped = (_evt: unknown, payload: unknown): void => handler(payload as never)
    ipcRenderer.on(event as string, wrapped)
    return () => {
      ipcRenderer.off(event as string, wrapped)
    }
  }
}

contextBridge.exposeInMainWorld('api', bridge)
