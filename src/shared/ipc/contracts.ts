// Single source of truth for the renderer↔main wire format.
// Both processes import this. If they drift, the compiler tells you.
//
// Phase 0: only `app:ping` exists, to prove the IPC pipe end-to-end.
// Later phases add workspace, MCF, module-run, test-run, git, and settings procedures.

export type Procedures = {
  'app:ping': { req: void; res: { pong: true; at: string } }
}

// No streamed events in Phase 0. The event channel set grows in later phases.
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
