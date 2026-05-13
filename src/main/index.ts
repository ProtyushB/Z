import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { initLogger, logger } from './logger'
import { initDb, closeDb } from './services/db/client'
import { runMigrations } from './services/db/migrator'
import { registerWorkspaceHandlers } from './ipc/workspace.handlers'
import { registerGithubHandlers } from './ipc/github.handlers'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'X',
    show: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  logger.info(
    { url: process.env['ELECTRON_RENDERER_URL'] ?? 'file://renderer/index.html' },
    'main window created'
  )
}

ipcMain.handle('app:ping', () => ({ pong: true as const, at: new Date().toISOString() }))

app.whenReady().then(async () => {
  initLogger()
  logger.info({ version: app.getVersion() }, 'app ready')

  try {
    await initDb()
    runMigrations()
    logger.info('db ready')
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'db init failed; quitting')
    app.quit()
    return
  }

  registerWorkspaceHandlers()
  registerGithubHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'uncaughtException')
})

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'unhandledRejection')
})
