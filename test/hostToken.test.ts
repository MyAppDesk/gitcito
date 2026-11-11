import { describe, it, expect, vi } from 'vitest'
import { pickHostToken } from '../src/shared/hostToken'

describe('pickHostToken', () => {
  it("uses the bound profile's token over what the renderer sent", async () => {
    const active = vi.fn(async () => 'active-pat')
    expect(await pickHostToken({ sent: 'sent-pat', bound: { token: ' bound-pat ' }, active })).toBe('bound-pat')
    expect(active).not.toHaveBeenCalled()
  })

  it('a bound profile without a token means no PAT, not another profile', async () => {
    // Falling back would authenticate the repository as a second account.
    expect(await pickHostToken({ sent: 'sent-pat', bound: {}, active: async () => 'active-pat' })).toBeUndefined()
  })

  it('an unbound repository takes the token the renderer sent', async () => {
    const active = vi.fn(async () => 'active-pat')
    expect(await pickHostToken({ sent: 'sent-pat', active })).toBe('sent-pat')
    expect(active).not.toHaveBeenCalled()
  })

  it("falls back to the active profile when the renderer sent nothing (Settings never opened)", async () => {
    expect(await pickHostToken({ sent: '', active: async () => 'active-pat' })).toBe('active-pat')
    expect(await pickHostToken({ sent: '   ', active: async () => '' })).toBeUndefined()
  })
})
