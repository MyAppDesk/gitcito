import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WebContents } from 'electron'
import { makeBatchedSender } from '../src/main/ptyBatch'

function fakeWc() {
  return { isDestroyed: () => false, send: vi.fn() } as unknown as WebContents & { send: ReturnType<typeof vi.fn> }
}

describe('makeBatchedSender', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('coalesces small chunks into one message on the timer', () => {
    const wc = fakeWc()
    const s = makeBatchedSender(wc, 'ch')
    s.push('a')
    s.push('b')
    s.push('c')
    expect(wc.send).not.toHaveBeenCalled()
    vi.advanceTimersByTime(8)
    expect(wc.send).toHaveBeenCalledTimes(1)
    expect(wc.send).toHaveBeenCalledWith('ch', 'abc')
  })

  it('flushes immediately at the size threshold without a timer', () => {
    const wc = fakeWc()
    const s = makeBatchedSender(wc, 'ch')
    s.push('x'.repeat(64 * 1024))
    expect(wc.send).toHaveBeenCalledTimes(1)
    expect(wc.send).toHaveBeenCalledWith('ch', 'x'.repeat(64 * 1024))
    vi.advanceTimersByTime(100)
    expect(wc.send).toHaveBeenCalledTimes(1)
  })

  it('dispose delivers buffered bytes before the caller sends its exit', () => {
    const wc = fakeWc()
    const s = makeBatchedSender(wc, 'ch')
    s.push('tail')
    s.dispose()
    expect(wc.send).toHaveBeenCalledWith('ch', 'tail')
    vi.advanceTimersByTime(100)
    expect(wc.send).toHaveBeenCalledTimes(1)
  })

  it('does not send to a destroyed webContents', () => {
    const wc = { isDestroyed: () => true, send: vi.fn() } as unknown as WebContents & { send: ReturnType<typeof vi.fn> }
    const s = makeBatchedSender(wc, 'ch')
    s.push('data')
    s.dispose()
    expect(wc.send).not.toHaveBeenCalled()
  })
})
