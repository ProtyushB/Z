import { useState } from 'react'
import { Button } from './components/ui/button'
import { ipc } from './lib/ipc'

export function App(): JSX.Element {
  const [pong, setPong] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function ping(): Promise<void> {
    setBusy(true)
    try {
      const res = await ipc.invoke('app:ping', undefined)
      setPong(res.at)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-semibold tracking-tight">X</h1>
      <p className="text-neutral-400 text-sm max-w-md text-center">
        Desktop orchestrator for modulex module scaffolding and testing.
      </p>
      <Button onClick={ping} disabled={busy}>
        {busy ? 'pinging…' : 'Ping main'}
      </Button>
      {pong && (
        <div className="rounded border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-300 font-mono">
          pong at {pong}
        </div>
      )}
    </div>
  )
}
