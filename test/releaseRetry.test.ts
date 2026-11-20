import { describe, expect, it } from 'vitest'
// @ts-expect-error — a plain .mjs script, untyped on purpose
import { retryDecision } from '../scripts/release-retry.mjs'

const job = (name: string, conclusion: string | null, steps: Array<string | null> = []) => ({
  name,
  conclusion,
  steps: steps.map((c) => ({ conclusion: c }))
})

describe('release retry decision', () => {
  it('re-runs a job no runner ever picked up', () => {
    const d = retryDecision({
      jobs: [job('release (ubuntu-latest)', 'success', ['success']), job('release (macos-latest)', 'cancelled'), job('publish', 'skipped')]
    })
    expect(d).toEqual({ retry: true, reason: 'never started: release (macos-latest)' })
  })

  it('leaves a real build failure alone', () => {
    const d = retryDecision({ jobs: [job('release (windows-latest)', 'failure', ['success', 'failure']), job('release (macos-latest)', 'cancelled')] })
    expect(d.retry).toBe(false)
    expect(d.reason).toContain('windows-latest')
  })

  it('counts skipped steps as not run, and needs a failure to act', () => {
    expect(retryDecision({ jobs: [job('release (macos-latest)', 'failure', ['skipped', null])] }).retry).toBe(true)
    expect(retryDecision({ jobs: [job('release (macos-latest)', 'success', ['success'])] }).retry).toBe(false)
    expect(retryDecision({}).retry).toBe(false)
  })
})
