import { describe, it, expect } from 'vitest'
import {
  recoveryDelayMs,
  formatRecoveryLine,
  QUICK_RECOVERIES,
  RECOVERY_WINDOW_MS
} from '../src/main/rendererRecovery'

describe('automatic reload after a blank window', () => {
  const now = 1_000_000_000

  it('reloads straight away for the first few failures', () => {
    expect(recoveryDelayMs([], now)).toBeLessThan(1000)
    const recent = Array.from({ length: QUICK_RECOVERIES - 1 }, (_, i) => now - i * 1000)
    expect(recoveryDelayMs(recent, now)).toBeLessThan(1000)
  })

  it('backs off when the page keeps failing, up to five minutes', () => {
    const burst = (n: number): number[] => Array.from({ length: n }, (_, i) => now - i * 1000)
    const delays = [3, 4, 5, 20].map((n) => recoveryDelayMs(burst(n), now))
    expect(delays[0]).toBe(15_000)
    expect(delays[1]).toBe(30_000)
    expect(delays[2]).toBe(60_000)
    expect(delays[3]).toBe(5 * 60_000)
  })

  it('forgets failures older than the window', () => {
    const old = Array.from({ length: 10 }, (_, i) => now - RECOVERY_WINDOW_MS - i)
    expect(recoveryDelayMs(old, now)).toBeLessThan(1000)
  })

  it('writes one tab-separated line per incident', () => {
    const line = formatRecoveryLine(new Date(0), 'crash', 'oom\n(exit code 5)', 300)
    expect(line).toBe('1970-01-01T00:00:00.000Z\tcrash\toom (exit code 5)\treload in 300 ms\n')
  })
})
