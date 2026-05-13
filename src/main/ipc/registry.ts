import { ipcMain, BrowserWindow } from 'electron'
import type { Procedures, Events, Channel, EventChannel } from '@shared/ipc/contracts'
import { logger } from '../logger'

// Generic IPC handler registration so every handler is just procedure → service
// call, fully typed against the shared contract. Errors are logged and re-thrown
// (the renderer-side invoke promise rejects with the original error message).

type HandlerReturn<C extends Channel> = Procedures[C]['res'] | Promise<Procedures[C]['res']>
type Handler<C extends Channel> = (req: Procedures[C]['req']) => HandlerReturn<C>

export function registerHandler<C extends Channel>(channel: C, handler: Handler<C>): void {
  ipcMain.handle(channel as string, async (_evt, req) => {
    try {
      return await handler(req as Procedures[C]['req'])
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error({ channel, err: message }, 'ipc handler error')
      throw err
    }
  })
}

export function emit<E extends EventChannel>(event: E, payload: Events[E]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(event as string, payload)
  }
}
