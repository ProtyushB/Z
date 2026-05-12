// Re-exports of channel name types from contracts.ts.
// Procedure channels are addressed via the Procedures keys directly; this file
// exists so that channel constants can be added here as the surface grows
// without churning callers' import paths.

export type { Channel, EventChannel } from './contracts'
