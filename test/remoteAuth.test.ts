import { describe, it, expect } from 'vitest'
import {
  githubScopeVerdict,
  gitlabScopeVerdict,
  parseScopeHeader,
  remoteUrlKind,
  urlWithoutUserinfo
} from '../src/main/remoteAuthCheck'
import { remoteAuthFindings, remoteAuthStatus } from '../src/renderer/src/lib/remoteAuth'
import type { RemoteAuthCheck } from '../src/shared/types'

describe('remote URL handling', () => {
  it('never shows a password that sits in the URL', () => {
    expect(urlWithoutUserinfo('https://me:ghp_secret@github.com/o/r.git')).toBe('https://github.com/o/r.git')
    expect(urlWithoutUserinfo('https://github.com/o/r.git')).toBe('https://github.com/o/r.git')
    expect(urlWithoutUserinfo('git@github.com:o/r.git')).toBe('git@github.com:o/r.git')
  })

  it('tells ssh, a URL with a password, and plain https apart', () => {
    expect(remoteUrlKind('git@github.com:o/r.git')).toBe('ssh')
    expect(remoteUrlKind('ssh://git@host:22/o/r.git')).toBe('ssh')
    expect(remoteUrlKind('https://me:pw@gitlab.com/o/r.git')).toBe('embedded')
    // A username alone is not a stored password.
    expect(remoteUrlKind('https://me@dev.azure.com/org/p/_git/r')).toBe('https')
    expect(remoteUrlKind('/srv/git/r.git')).toBe('other')
  })
})

describe('host scope verdicts', () => {
  it('reads the X-OAuth-Scopes header, absent meaning unknown', () => {
    expect(parseScopeHeader('repo, workflow, read:org')).toEqual(['repo', 'workflow', 'read:org'])
    expect(parseScopeHeader('')).toEqual([])
    expect(parseScopeHeader(null)).toBeNull()
  })

  it('GitHub: repo allows push, workflow allows workflow files', () => {
    expect(githubScopeVerdict(['repo', 'gist'])).toEqual({ scopes: ['repo', 'gist'], canPush: true, canPushWorkflows: false })
    expect(githubScopeVerdict(['read:org'])).toMatchObject({ canPush: false })
    expect(githubScopeVerdict(null)).toEqual({})
  })

  it('GitLab: write_repository or api allow push', () => {
    expect(gitlabScopeVerdict(['read_repository'])).toMatchObject({ canPush: false })
    expect(gitlabScopeVerdict(['write_repository']).canPush).toBe(true)
    expect(gitlabScopeVerdict(['api']).canPush).toBe(true)
  })
})

describe('remoteAuthFindings', () => {
  const base: RemoteAuthCheck = { remote: 'origin', url: 'https://github.com/o/r.git', provider: 'github', source: 'gh' }

  it('the missing workflow scope is a warning, not a failure', () => {
    const c = { ...base, scopes: ['repo'], canPush: true, canPushWorkflows: false }
    expect(remoteAuthFindings(c).map((f) => f.key)).toEqual(['remoteAuth.noWorkflow'])
    expect(remoteAuthStatus(c)).toBe('warn')
  })

  it('a refused credential stops the list', () => {
    const c = { ...base, rejected: true, canPush: false }
    expect(remoteAuthFindings(c).map((f) => f.key)).toEqual(['remoteAuth.rejected'])
    expect(remoteAuthStatus(c)).toBe('fail')
  })

  it('reports a healthy token, and an unknown one as unknown', () => {
    expect(remoteAuthFindings({ ...base, scopes: ['repo', 'workflow'], canPush: true, canPushWorkflows: true })[0].key).toBe(
      'remoteAuth.ok'
    )
    expect(remoteAuthFindings({ ...base, source: 'token' })[0].key).toBe('remoteAuth.okUnknown')
  })

  it('flags a password in the URL, and nothing to sign in with', () => {
    expect(remoteAuthFindings({ ...base, source: 'embedded' }).map((f) => f.key)).toContain('remoteAuth.embedded')
    expect(remoteAuthStatus({ ...base, source: 'none' })).toBe('fail')
    expect(remoteAuthStatus({ ...base, source: 'ssh' })).toBe('ok')
  })
})
