import { describe, it, expectTypeOf } from 'vitest'
import type { Procedures, Invoke } from '@shared/ipc/contracts'

describe('IPC contract types', () => {
  it('app:ping request is void', () => {
    expectTypeOf<Procedures['app:ping']['req']>().toEqualTypeOf<void>()
  })

  it('app:ping response is { pong: true; at: string }', () => {
    expectTypeOf<Procedures['app:ping']['res']>().toEqualTypeOf<{ pong: true; at: string }>()
  })

  it('Invoke returns a Promise', () => {
    type R = ReturnType<Invoke>
    expectTypeOf<R>().toMatchTypeOf<Promise<unknown>>()
  })
})
