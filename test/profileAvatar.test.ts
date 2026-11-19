import { describe, it, expect } from 'vitest'
import {
  AVATAR_MAX_BYTES,
  PROFILE_AVATAR_COLORS,
  avatarDataUrlPayload,
  avatarFitSize,
  isProfileAvatarId,
  noreplyEmail,
  validProfileAvatar
} from '../src/shared/profileAvatar'

describe('profile avatar ids', () => {
  it('accepts generated ids and refuses anything that could leave the avatars folder', () => {
    expect(isProfileAvatarId('default')).toBe(true)
    expect(isProfileAvatarId('p_1700000000000-ab12')).toBe(true)
    for (const bad of ['', '../settings', 'a/b', 'a\\b', '.', 'x'.repeat(65), 42, null]) {
      expect(isProfileAvatarId(bad)).toBe(false)
    }
  })
})

describe('imported avatar data URLs', () => {
  it('takes a PNG data URL and hands back its payload', () => {
    expect(avatarDataUrlPayload('data:image/png;base64,iVBORw0KGgo=')).toBe('iVBORw0KGgo=')
  })

  it('refuses other types, malformed base64 and anything over the size limit', () => {
    expect(avatarDataUrlPayload('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull()
    expect(avatarDataUrlPayload('data:text/html;base64,PGI+')).toBeNull()
    expect(avatarDataUrlPayload('data:image/png;base64,not base64!')).toBeNull()
    expect(avatarDataUrlPayload('https://example.com/a.png')).toBeNull()
    expect(avatarDataUrlPayload({})).toBeNull()
    const huge = 'A'.repeat(Math.ceil((AVATAR_MAX_BYTES * 4) / 3) + 8)
    expect(avatarDataUrlPayload(`data:image/png;base64,${huge}`)).toBeNull()
  })
})

describe('avatar scaling', () => {
  it('fits the longest side to the limit, keeping the aspect ratio', () => {
    expect(avatarFitSize(1024, 512)).toEqual({ width: 256, height: 128 })
    expect(avatarFitSize(300, 1200)).toEqual({ width: 64, height: 256 })
  })

  it('never upscales a small image', () => {
    expect(avatarFitSize(64, 48)).toEqual({ width: 64, height: 48 })
  })
})

describe('avatar setting from a settings file', () => {
  it('keeps a valid choice as it is', () => {
    expect(validProfileAvatar({ source: 'icon', icon: 'rocket', color: '#0ea5e9' })).toEqual({
      source: 'icon',
      icon: 'rocket',
      color: '#0ea5e9'
    })
    expect(
      validProfileAvatar({ source: 'account', accountHost: 'github', accountUrl: 'https://avatars.githubusercontent.com/u/1' })
    ).toEqual({ source: 'account', accountHost: 'github', accountUrl: 'https://avatars.githubusercontent.com/u/1' })
  })

  it('falls back instead of letting an unknown icon or a non-hex colour reach a style', () => {
    expect(validProfileAvatar({ source: 'icon', icon: 'nope', color: 'red;background:url(x)' })).toEqual({
      source: 'icon',
      icon: 'user',
      color: PROFILE_AVATAR_COLORS[0]
    })
  })

  it('drops an account picture that is not an https URL, and anything unknown', () => {
    expect(validProfileAvatar({ source: 'account', accountHost: 'github', accountUrl: 'javascript:alert(1)' })).toBeUndefined()
    expect(validProfileAvatar({ source: 'account', accountHost: 'bitbucket', accountUrl: 'https://x' })).toBeUndefined()
    expect(validProfileAvatar({ source: 'video' })).toBeUndefined()
    expect(validProfileAvatar(null)).toBeUndefined()
  })
})

describe('noreply email', () => {
  it('builds the address GitHub and GitLab keep private for an account', () => {
    expect(noreplyEmail('github', 583231, 'octocat')).toBe('583231+octocat@users.noreply.github.com')
    expect(noreplyEmail('gitlab', 42, 'jdoe')).toBe('42-jdoe@users.noreply.gitlab.com')
  })

  it('has none for other hosts, or without a real id and login', () => {
    expect(noreplyEmail('azure', 1, 'x')).toBeNull()
    expect(noreplyEmail('github', undefined, 'octocat')).toBeNull()
    expect(noreplyEmail('github', 0, 'octocat')).toBeNull()
    expect(noreplyEmail('github', 1, 'bad login\nhost=evil')).toBeNull()
  })
})
