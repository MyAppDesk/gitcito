import { describe, it, expect } from 'vitest'
import {
  AVATAR_MAX_BYTES,
  PROFILE_AVATAR_COLORS,
  avatarDataUrlPayload,
  avatarFitSize,
  avatarHeaderOk,
  imageHeaderSize,
  isAccountAvatarUrl,
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

/** A PNG signature and IHDR chunk declaring the given size — enough header to parse, no pixels. */
function pngHeader(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33)
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  new DataView(b.buffer).setUint32(16, width)
  new DataView(b.buffer).setUint32(20, height)
  return b
}

/** SOI, an APP0 segment to skip, then a baseline SOF0 declaring the given size. */
function jpegHeader(width: number, height: number, sof = 0xc0): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x06, 0x4a, 0x46, 0x49, 0x46]
  const sofSeg = [0xff, sof, 0x00, 0x0b, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0]
  return new Uint8Array([0xff, 0xd8, ...app0, ...sofSeg])
}

describe('image header dimensions', () => {
  it('reads the size a PNG declares in IHDR', () => {
    expect(imageHeaderSize(pngHeader(640, 480))).toEqual({ width: 640, height: 480 })
  })

  it('reads the size a JPEG declares in its frame header, past other segments', () => {
    expect(imageHeaderSize(jpegHeader(1200, 800))).toEqual({ width: 1200, height: 800 })
    expect(imageHeaderSize(jpegHeader(300, 200, 0xc2))).toEqual({ width: 300, height: 200 })
  })

  it('does not mistake a Huffman table segment for a frame header', () => {
    const dht = [0xff, 0xc4, 0x00, 0x04, 0x00, 0x00]
    const b = jpegHeader(10, 20)
    const withDht = new Uint8Array([0xff, 0xd8, ...dht, ...b.slice(2)])
    expect(imageHeaderSize(withDht)).toEqual({ width: 10, height: 20 })
  })

  it('knows nothing about other formats or truncated headers', () => {
    expect(imageHeaderSize(new TextEncoder().encode('GIF89a\x01\x00\x01\x00'))).toBeNull()
    expect(imageHeaderSize(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBeNull()
    expect(imageHeaderSize(pngHeader(1, 1).slice(0, 20))).toBeNull()
    expect(imageHeaderSize(jpegHeader(1, 1).slice(0, 12))).toBeNull()
    expect(imageHeaderSize(new Uint8Array())).toBeNull()
  })
})

describe('decode limits', () => {
  it('lets an ordinary photo through', () => {
    expect(avatarHeaderOk(pngHeader(4096, 4096))).toBe(true)
    expect(avatarHeaderOk(jpegHeader(3000, 2000))).toBe(true)
  })

  it('refuses a small file that declares a huge bitmap', () => {
    expect(avatarHeaderOk(pngHeader(50000, 50000))).toBe(false)
    expect(avatarHeaderOk(pngHeader(4097, 10))).toBe(false)
    expect(avatarHeaderOk(jpegHeader(10, 65535))).toBe(false)
    expect(avatarHeaderOk(pngHeader(0, 10))).toBe(false)
  })

  it('refuses anything over the byte limit, and anything that is not PNG or JPEG', () => {
    const big = new Uint8Array(AVATAR_MAX_BYTES + 1)
    big.set(pngHeader(10, 10))
    expect(avatarHeaderOk(big)).toBe(false)
    expect(avatarHeaderOk(new TextEncoder().encode('GIF89a'))).toBe(false)
  })
})

describe('account picture hosts', () => {
  it('takes the hosts the account lookup returns', () => {
    expect(isAccountAvatarUrl('github', 'https://avatars.githubusercontent.com/u/583231?v=4')).toBe(true)
    expect(isAccountAvatarUrl('gitlab', 'https://gitlab.com/uploads/-/system/user/avatar/1/avatar.png')).toBe(true)
    expect(isAccountAvatarUrl('gitlab', 'https://secure.gravatar.com/avatar/abc?s=80&d=identicon')).toBe(true)
  })

  it('refuses any other host, a host from the other integration, and URL tricks', () => {
    expect(isAccountAvatarUrl('github', 'https://evil.example/u/1')).toBe(false)
    expect(isAccountAvatarUrl('github', 'https://gitlab.com/uploads/a.png')).toBe(false)
    expect(isAccountAvatarUrl('github', 'https://avatars.githubusercontent.com.evil.example/u/1')).toBe(false)
    expect(isAccountAvatarUrl('github', 'https://user@avatars.githubusercontent.com/u/1')).toBe(false)
    expect(isAccountAvatarUrl('github', 'https://avatars.githubusercontent.com:8443/u/1')).toBe(false)
    expect(isAccountAvatarUrl('github', 'http://avatars.githubusercontent.com/u/1')).toBe(false)
    expect(isAccountAvatarUrl('gitlab', 'not a url')).toBe(false)
  })

  it('drops an imported account picture pointing anywhere else', () => {
    expect(
      validProfileAvatar({ source: 'account', accountHost: 'github', accountUrl: 'https://tracker.example/p.png' })
    ).toBeUndefined()
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
