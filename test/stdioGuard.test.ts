import { describe, it, expect } from 'vitest'
import { EventEmitter } from 'events'
import { guardStdio } from '../src/main/stdioGuard'

const failure = (code: string): NodeJS.ErrnoException => Object.assign(new Error(`write ${code}`), { code })

// The reported crash: Electron logged a failed IPC call with console.error, the
// write to stderr failed with EPIPE (its reader was gone), and the stream
// emitted 'error' with no listener — which Node always turns into an uncaught
// exception. A plain emitter stands in for the stream: the rule is the same.
describe('stdio guard', () => {
  it('without it, an EPIPE on the stream throws — the "error in the main process" dialog', () => {
    const stream = new EventEmitter()
    expect(() => stream.emit('error', failure('EPIPE'))).toThrow(/EPIPE/)
  })

  it('with it, a reader that went away is ignored', () => {
    const stream = new EventEmitter()
    guardStdio([stream as unknown as NodeJS.WriteStream])
    for (const code of ['EPIPE', 'EIO', 'ERR_STREAM_DESTROYED']) {
      expect(() => stream.emit('error', failure(code))).not.toThrow()
    }
  })

  it('lets any other error surface, so a real problem is not hidden', async () => {
    const stream = new EventEmitter()
    guardStdio([stream as unknown as NodeJS.WriteStream])
    const surfaced = new Promise<unknown>((resolve) => process.once('uncaughtException', resolve))
    stream.emit('error', failure('EACCES'))
    expect(await surfaced).toMatchObject({ code: 'EACCES' })
  })
})
