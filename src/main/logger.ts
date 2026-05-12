import { app } from 'electron'
import pino, { type Logger } from 'pino'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

// Default fallback writes to stdout; replaced after app.whenReady() resolves
// because app.getPath('userData') is only valid then.
let underlying: Logger = pino({ level: 'info' })

export function initLogger(): void {
  const dir = join(app.getPath('userData'), 'logs')
  mkdirSync(dir, { recursive: true })

  underlying = pino(
    {
      level: app.isPackaged ? 'info' : 'debug',
      redact: {
        paths: ['authorization', 'Authorization', 'token', 'apiKey', 'githubToken', 'anthropicKey'],
        remove: true
      }
    },
    pino.destination({ dest: join(dir, 'main.log'), mkdir: true, sync: false })
  )
}

// Transparent proxy so callers always see the most recently initialized logger.
export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop) {
    const value = Reflect.get(underlying, prop)
    return typeof value === 'function' ? value.bind(underlying) : value
  }
})
