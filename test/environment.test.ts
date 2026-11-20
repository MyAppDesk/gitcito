import { describe, it, expect } from 'vitest'
import {
  credentialHelperCheck,
  ghCheck,
  ghTokenScopes,
  gitVersionCheck,
  inotifyCheck,
  GH_WORKFLOW_FIX,
  MIN_INOTIFY_WATCHES
} from '../src/main/environment'
import { envCheckDetailKey } from '../src/renderer/src/lib/environmentCheck'

describe('environment check — git', () => {
  it('passes 2.31 and newer, warns below it, and reports the version', () => {
    expect(gitVersionCheck('git version 2.47.1\n')).toEqual({ id: 'git', status: 'ok', actual: '2.47.1' })
    expect(gitVersionCheck('git version 2.30.2 (Apple Git-128)')).toEqual({ id: 'git', status: 'warn', actual: '2.30.2' })
  })
})

describe('environment check — credential helper', () => {
  it('reports the helper git will use last', () => {
    expect(credentialHelperCheck('cache --timeout=900\0libsecret\0')).toEqual({
      id: 'credentialHelper',
      status: 'ok',
      actual: 'libsecret'
    })
  })

  it('warns when none is set, or when an empty value resets the list', () => {
    expect(credentialHelperCheck('')).toEqual({ id: 'credentialHelper', status: 'warn' })
    // An empty helper clears the ones before it (a system helper, here).
    expect(credentialHelperCheck('manager\0\0').status).toBe('warn')
    expect(credentialHelperCheck('manager\0\0osxkeychain\0').actual).toBe('osxkeychain')
  })

  it('warns about the plain-text store helper, even with options', () => {
    expect(credentialHelperCheck('store --file ~/.my-credentials\0\n')).toEqual({
      id: 'credentialHelper',
      status: 'warn',
      actual: 'store'
    })
  })
})

describe('environment check — GitHub CLI', () => {
  const status = (scopes: string): string =>
    `github.com\n  ✓ Logged in to github.com account someone (keyring)\n  - Token: gho_************\n  - Token scopes: ${scopes}\n`

  it('reads quoted and unquoted scope lists', () => {
    expect(ghTokenScopes(status("'gist', 'read:org', 'repo'"))).toEqual(['gist', 'read:org', 'repo'])
    expect(ghTokenScopes('  ✓ Token scopes: gist, repo, workflow')).toEqual(['gist', 'repo', 'workflow'])
  })

  it('offers the refresh command only when workflow is missing', () => {
    expect(ghCheck(status("'repo', 'workflow'"))?.status).toBe('ok')
    expect(ghCheck(status("'gist', 'repo'"))).toEqual({
      id: 'gh',
      status: 'warn',
      actual: 'gist, repo',
      fix: GH_WORKFLOW_FIX
    })
  })

  it('shows no row when signed out or when the token reports no scopes', () => {
    expect(ghCheck('You are not logged into any GitHub hosts. To log in, run: gh auth login')).toBeNull()
    expect(ghCheck('  - Token scopes: none')).toBeNull()
  })
})

describe('environment check — inotify', () => {
  it('warns below the minimum and passes at it', () => {
    expect(inotifyCheck('8192\n')).toMatchObject({ status: 'warn', actual: '8192' })
    expect(inotifyCheck('8192\n')?.fix).toContain('max_user_watches')
    expect(inotifyCheck(String(MIN_INOTIFY_WATCHES))).toEqual({ id: 'inotify', status: 'ok', actual: String(MIN_INOTIFY_WATCHES) })
    expect(inotifyCheck('')).toBeNull()
  })
})

describe('envCheckDetailKey', () => {
  it('tells the two credential-helper warnings apart', () => {
    expect(envCheckDetailKey({ id: 'credentialHelper', status: 'warn' })).toBe('env.credentialHelper.none')
    expect(envCheckDetailKey({ id: 'credentialHelper', status: 'warn', actual: 'store' })).toBe('env.credentialHelper.plain')
    expect(envCheckDetailKey({ id: 'git', status: 'fail' })).toBe('env.git.fail')
  })
})
