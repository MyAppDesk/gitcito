import { describe, it, expect } from 'vitest'
import {
  GITLAB_COM,
  gitlabInstanceOf,
  normalizeGitlabUrl,
  profileGitlabBase,
  remoteIsOnGitlab
} from '../src/shared/gitlabInstance'

const SELF = 'https://git.example.org'
const SUB = 'https://example.net/gitlab'

describe('normalizeGitlabUrl', () => {
  it('canonicalizes hosts and URLs, and refuses plain http', () => {
    expect(normalizeGitlabUrl('git.example.org')).toBe(SELF)
    expect(normalizeGitlabUrl('https://Git.Example.org/')).toBe(SELF)
    expect(normalizeGitlabUrl(' https://example.net/gitlab/ ')).toBe(SUB)
    expect(normalizeGitlabUrl('https://git.example.org:8443')).toBe('https://git.example.org:8443')
    expect(normalizeGitlabUrl('http://git.example.org')).toBeNull()
    expect(normalizeGitlabUrl('')).toBeNull()
    expect(normalizeGitlabUrl(undefined)).toBeNull()
  })

  it('drops credentials, query and fragment', () => {
    expect(normalizeGitlabUrl('https://me:pw@git.example.org/?x=1#y')).toBe(SELF)
  })

  it('a profile without a URL uses gitlab.com', () => {
    expect(profileGitlabBase('')).toBe(GITLAB_COM)
    expect(profileGitlabBase('git.example.org')).toBe(SELF)
  })
})

describe('gitlabInstanceOf', () => {
  it('keeps gitlab.com working with no instances configured', () => {
    expect(gitlabInstanceOf('https://gitlab.com/group/sub/repo.git', [])).toEqual({ base: GITLAB_COM, path: 'group/sub/repo' })
    expect(gitlabInstanceOf('git@gitlab.com:group/repo.git', [])).toEqual({ base: GITLAB_COM, path: 'group/repo' })
  })

  it('recognises a self-managed instance over https and ssh', () => {
    expect(gitlabInstanceOf('https://git.example.org/team/app.git', [SELF])).toEqual({ base: SELF, path: 'team/app' })
    expect(gitlabInstanceOf('git@git.example.org:team/app.git', [SELF])).toEqual({ base: SELF, path: 'team/app' })
    expect(gitlabInstanceOf('ssh://git@git.example.org:2222/team/app.git', [SELF])).toEqual({ base: SELF, path: 'team/app' })
  })

  it('strips an instance base path over https, not over ssh', () => {
    expect(gitlabInstanceOf('https://example.net/gitlab/team/app.git', [SUB])).toEqual({ base: SUB, path: 'team/app' })
    expect(gitlabInstanceOf('git@example.net:team/app.git', [SUB])).toEqual({ base: SUB, path: 'team/app' })
    // Same host, outside the base path: not that instance.
    expect(gitlabInstanceOf('https://example.net/other/team/app.git', [SUB])).toBeNull()
  })

  it('does not claim an unknown host, or a lookalike', () => {
    expect(gitlabInstanceOf('https://git.example.org/team/app.git', [])).toBeNull()
    expect(gitlabInstanceOf('https://mygitlab.com/team/app.git', [])).toBeNull()
    expect(gitlabInstanceOf('https://git.example.org.evil.io/team/app.git', [SELF])).toBeNull()
  })
})

describe('remoteIsOnGitlab', () => {
  it('only lets a token reach the instance that issued it', () => {
    expect(remoteIsOnGitlab('https://gitlab.com/g/r.git', GITLAB_COM)).toBe(true)
    expect(remoteIsOnGitlab('https://git.example.org/g/r.git', GITLAB_COM)).toBe(false)
    expect(remoteIsOnGitlab('https://gitlab.com/g/r.git', SELF)).toBe(false)
    expect(remoteIsOnGitlab('https://git.example.org/g/r.git', SELF)).toBe(true)
  })
})

describe('remoteAvatarUrl', () => {
  it('asks only the public hosts, never about a self-managed remote', async () => {
    const { remoteAvatarUrl } = await import('../src/renderer/src/components/RemoteIcon')
    expect(remoteAvatarUrl('https://gitlab.com/group/repo.git')).toBe('https://gitlab.com/group.png')
    expect(remoteAvatarUrl('git@github.com:org/repo.git')).toContain('avatars.githubusercontent.com/org')
    expect(remoteAvatarUrl('https://gitlab.example.org/internal-team/repo.git')).toBeNull()
    expect(remoteAvatarUrl('git@github.example.org:internal-team/repo.git')).toBeNull()
  })
})

describe('isReviewableRemote', () => {
  it('offers review on a self-managed GitLab only once a profile points at it', async () => {
    const { isReviewableRemote } = await import('../src/renderer/src/lib/hosting')
    expect(isReviewableRemote('https://gitlab.com/g/r.git')).toBe(true)
    expect(isReviewableRemote('git@github.com:o/r.git')).toBe(true)
    expect(isReviewableRemote('https://git.example.org/g/r.git')).toBe(false)
    expect(isReviewableRemote('https://git.example.org/g/r.git', ['git.example.org'])).toBe(true)
    expect(isReviewableRemote('https://notgithub.com/o/r.git')).toBe(false)
  })
})
