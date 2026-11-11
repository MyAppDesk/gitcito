import { describe, expect, it } from 'vitest'
import { gitSupportsCredentialEnv } from '../src/main/gitCredentialEnv'

describe('gitSupportsCredentialEnv', () => {
  it('refuses git older than 2.31 and names the version', () => {
    for (const out of ['git version 2.25.1', 'git version 2.30.9', 'git version 1.9.5', 'git version 2.20.1\n'])
      expect(gitSupportsCredentialEnv(out).ok).toBe(false)
    expect(gitSupportsCredentialEnv('git version 2.30.2')).toEqual({ ok: false, found: '2.30' })
  })
  it('accepts 2.31 and newer, including vendor suffixes', () => {
    for (const out of [
      'git version 2.31.0',
      'git version 2.34.1',
      'git version 2.39.3 (Apple Git-145)',
      'git version 2.45.1.windows.1',
      'git version 3.0.0',
      'git version 2.100.0'
    ])
      expect(gitSupportsCredentialEnv(out).ok).toBe(true)
  })
  it('does not refuse on output it cannot read', () => {
    expect(gitSupportsCredentialEnv('')).toEqual({ ok: true })
    expect(gitSupportsCredentialEnv('command not found')).toEqual({ ok: true })
  })
})
