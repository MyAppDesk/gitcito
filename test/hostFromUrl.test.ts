import { describe, expect, it } from 'vitest'
import { hostFromUrl } from '../src/main/git'

describe('hostFromUrl', () => {
  it('matches real provider hosts', () => {
    expect(hostFromUrl('https://github.com/a/b.git')).toBe('github')
    expect(hostFromUrl('https://gitlab.com/a/b.git')).toBe('gitlab')
    expect(hostFromUrl('https://bitbucket.org/a/b.git')).toBe('bitbucket')
    expect(hostFromUrl('https://dev.azure.com/o/p/_git/r')).toBe('azure')
  })
  it('never offers a profile token to a look-alike host', () => {
    for (const u of [
      'https://github.evil.com/a/b.git',
      'https://notgithub.com/a/b.git',
      'https://evil.com/github.com/a.git',
      'https://gitlab-x.io/a.git',
      'https://bitbucket.org.evil.net/a.git',
      'https://azure.evil.com/a.git'
    ])
      expect(hostFromUrl(u)).toBeUndefined()
  })
})
