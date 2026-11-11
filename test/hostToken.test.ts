import { describe, it, expect, vi } from 'vitest'
import { isAccountLogin, linkHoldsAccount, pickHostAuth, validAccountLink } from '../src/shared/hostToken'

const ghLink = { source: 'gh' as const, login: 'StarleyDev' }

describe('pickHostAuth', () => {
  it("uses the bound profile's credentials over what the renderer sent", async () => {
    const active = vi.fn(async () => ({ token: 'active-pat' }))
    expect(await pickHostAuth({ sent: 'sent-pat', bound: { token: ' bound-pat ' }, active })).toEqual({
      token: 'bound-pat',
      link: undefined
    })
    expect(active).not.toHaveBeenCalled()
  })

  it('a bound profile with nothing configured is not connected, not another profile', async () => {
    // Falling back would authenticate the repository as a second account.
    expect(await pickHostAuth({ sent: 'sent-pat', bound: {}, active: async () => ({ token: 'x' }) })).toEqual({
      token: undefined,
      link: undefined
    })
  })

  it("a bound profile's link travels with it", async () => {
    expect(await pickHostAuth({ bound: { link: ghLink } })).toEqual({ token: undefined, link: ghLink })
  })

  it('an unbound repository takes the token the renderer sent', async () => {
    const active = vi.fn(async () => ({ token: 'active-pat' }))
    expect(await pickHostAuth({ sent: 'sent-pat', active })).toEqual({ token: 'sent-pat' })
    expect(active).not.toHaveBeenCalled()
  })

  it('falls back to the active profile (Settings never opened), link included', async () => {
    expect(await pickHostAuth({ sent: '', active: async () => ({ token: 'active-pat' }) })).toEqual({
      token: 'active-pat',
      link: undefined
    })
    expect(await pickHostAuth({ sent: '  ', active: async () => ({ link: ghLink }) })).toEqual({
      token: undefined,
      link: ghLink
    })
  })
})

describe('account links', () => {
  it('accepts real account names and refuses ones that could inject protocol fields or flags', () => {
    for (const ok of ['StarleyDev', 'starley.dev@corp.com', 'PersonalAccessToken', 'a b']) expect(isAccountLogin(ok)).toBe(true)
    for (const bad of ['', ' lead', 'x\nhost=evil', 'x\r', 'x\u0000', '-flag', '--user=x', 'x'.repeat(256), 42])
      expect(isAccountLogin(bad)).toBe(false)
  })

  it('keeps only a well-formed link', () => {
    expect(validAccountLink({ source: 'gh', login: 'StarleyDev' })).toEqual({ source: 'gh', login: 'StarleyDev' })
    expect(validAccountLink({ source: 'ssh', login: 'x' })).toBeUndefined()
    expect(validAccountLink({ source: 'git', login: 'a\nb' })).toBeUndefined()
    expect(validAccountLink(null)).toBeUndefined()
  })

  it('finds the same account held by another profile, whatever the case', () => {
    const found = { source: 'gh' as const, login: 'StarleyDev' }
    expect(linkHoldsAccount({ source: 'gh', login: 'starleydev' }, 'StarleyDev', found)).toBe(true)
    // A helper username that differs from the API login still matches by login.
    expect(linkHoldsAccount({ source: 'git', login: 'StarleyDev' }, 'StarleyDev', { source: 'git', login: 'oauth' })).toBe(true)
    expect(linkHoldsAccount({ source: 'gh', login: 'someone-else' }, 'StarleyDev', found)).toBe(false)
    expect(linkHoldsAccount(undefined, 'StarleyDev', found)).toBe(false)
  })
})
