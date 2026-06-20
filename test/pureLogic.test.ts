import { describe, it, expect } from 'vitest'
import { parseRemoteUrl } from '../src/main/hosting'
import { lintCommit, subjectCounterLevel } from '../src/renderer/src/lib/commitLint'
import { isSecretFile, maskSecretLine } from '../src/renderer/src/lib/secrets'

// Pure-function unit tests — no git, no DOM.

describe('parseRemoteUrl', () => {
  it('parses GitHub https + ssh', () => {
    expect(parseRemoteUrl('https://github.com/o/r.git')).toMatchObject({ provider: 'github', owner: 'o', repo: 'r' })
    expect(parseRemoteUrl('git@github.com:o/r.git')).toMatchObject({ provider: 'github', owner: 'o', repo: 'r' })
  })

  it('parses GitLab, including multi-level subgroups (https + ssh)', () => {
    expect(parseRemoteUrl('https://gitlab.com/group/repo.git')).toMatchObject({ provider: 'gitlab', owner: 'group', repo: 'repo' })
    expect(parseRemoteUrl('git@gitlab.com:group/sub/repo.git')).toMatchObject({ provider: 'gitlab', owner: 'group/sub', repo: 'repo' })
    expect(parseRemoteUrl('https://gitlab.com/group/sub/repo')).toMatchObject({ provider: 'gitlab', owner: 'group/sub', repo: 'repo' })
  })

  it('parses Bitbucket https + ssh', () => {
    expect(parseRemoteUrl('https://bitbucket.org/team/repo.git')).toMatchObject({ provider: 'bitbucket', owner: 'team', repo: 'repo' })
    expect(parseRemoteUrl('git@bitbucket.org:team/repo.git')).toMatchObject({ provider: 'bitbucket', owner: 'team', repo: 'repo' })
  })

  it('parses Azure DevOps', () => {
    expect(parseRemoteUrl('https://dev.azure.com/org/proj/_git/repo')).toMatchObject({ provider: 'azure', owner: 'org', project: 'proj', repo: 'repo' })
  })

  it('returns null for unknown hosts', () => {
    expect(parseRemoteUrl('https://example.com/x/y.git')).toBeNull()
  })
})

describe('commit lint', () => {
  it('clean conventional subject yields no hints', () => {
    expect(lintCommit('feat(api): add endpoint', '')).toEqual([])
  })

  it('flags trailing period and non-imperative mood', () => {
    const h = lintCommit('Fixed the bug.', '')
    expect(h.some((x) => /period/i.test(x.text))).toBe(true)
    expect(h.some((x) => /imperative/i.test(x.text))).toBe(true)
  })

  it('flags an over-long subject as an error', () => {
    const long = 'x'.repeat(80)
    const h = lintCommit(long, '')
    expect(h.some((x) => x.level === 'error')).toBe(true)
  })

  it('nudges to capitalize a lowercase non-conventional subject', () => {
    expect(lintCommit('add stuff', '').some((x) => /capitalize/i.test(x.text))).toBe(true)
  })

  it('flags over-wide body lines', () => {
    expect(lintCommit('Add caching', 'x'.repeat(90)).some((x) => /wrap/i.test(x.text))).toBe(true)
  })

  it('subject counter level bands', () => {
    expect(subjectCounterLevel(10)).toBe('')
    expect(subjectCounterLevel(60)).toBe('warn')
    expect(subjectCounterLevel(80)).toBe('error')
  })
})

describe('secret masking', () => {
  it('recognizes secret-bearing files', () => {
    for (const f of ['.env', 'config/.env.production', 'key.pem', 'id_rsa', 'deploy/credentials.json']) {
      expect(isSecretFile(f)).toBe(true)
    }
    for (const f of ['src/app.ts', 'README.md', 'environment.ts', '.env.example', '.env.sample', 'config/.env.template']) {
      expect(isSecretFile(f)).toBe(false)
    }
  })

  it('masks assignment values but keeps keys, comments and plain lines', () => {
    expect(maskSecretLine('API_KEY=sk-12345')).toBe('API_KEY=••••••')
    expect(maskSecretLine('export DB_URL="postgres://u:p@h/db"')).toBe('export DB_URL=••••••')
    expect(maskSecretLine('TOKEN: abc123')).toBe('TOKEN: ••••••')
    expect(maskSecretLine('# a comment')).toBe('# a comment')
    expect(maskSecretLine('not an assignment')).toBe('not an assignment')
  })
})
