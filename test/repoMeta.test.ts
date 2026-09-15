import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cloneFixture, cleanupFixtures } from './fixtures'
import { readHeadBranch, ownerFromRemoteUrl, readOriginOwner, gitDirOf } from '../src/main/repoMeta'

const tmpDirs: string[] = []

afterAll(() => {
  cleanupFixtures()
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true })
})

describe('ownerFromRemoteUrl', () => {
  it('reads a GitHub org', () => {
    expect(ownerFromRemoteUrl('https://github.com/acme/widget.git')).toBe('acme')
    expect(ownerFromRemoteUrl('git@github.com:acme/widget.git')).toBe('acme')
  })

  it('takes the first segment of a nested GitLab namespace', () => {
    expect(ownerFromRemoteUrl('https://gitlab.com/top-solution/sub/widget.git')).toBe('top-solution')
  })

  it('falls back to the first path segment on an unknown host', () => {
    expect(ownerFromRemoteUrl('https://git.example.com/top-solution/widget.git')).toBe('top-solution')
    expect(ownerFromRemoteUrl('git@git.example.com:top-solution/widget.git')).toBe('top-solution')
  })

  it('returns null when there is no namespace to read', () => {
    expect(ownerFromRemoteUrl('https://git.example.com/widget.git')).toBeNull()
    expect(ownerFromRemoteUrl('not a url')).toBeNull()
    expect(ownerFromRemoteUrl('')).toBeNull()
  })

  it('does not mistake a port for the owner on a scheme URL', () => {
    expect(ownerFromRemoteUrl('ssh://git@host.example.com:2222/group/repo.git')).toBe('group')
    expect(ownerFromRemoteUrl('https://user@git.example.com:8443/top-solution/widget.git')).toBe(
      'top-solution'
    )
  })

  it('still parses a plain scp-style URL with no scheme', () => {
    expect(ownerFromRemoteUrl('git@git.example.com:top-solution/widget.git')).toBe('top-solution')
  })
})

describe('readHeadBranch', () => {
  it('reads the checked-out branch without spawning git', async () => {
    const dir = cloneFixture('file-nav')
    expect(await readHeadBranch(dir)).toBe('main')
  })

  it('returns null for a path that is not a repo', async () => {
    expect(await readHeadBranch('/definitely/not/here')).toBeNull()
  })
})

describe('gitDirOf', () => {
  it('resolves a .git directory', async () => {
    const dir = cloneFixture('file-nav')
    expect(await gitDirOf(dir)).toBe(join(dir, '.git'))
  })

  it('follows a .git file to the real git directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-wt-'))
    tmpDirs.push(dir)
    const real = mkdtempSync(join(tmpdir(), 'gitcito-wtgit-'))
    tmpDirs.push(real)
    writeFileSync(join(dir, '.git'), `gitdir: ${real}\n`)
    writeFileSync(join(real, 'HEAD'), 'ref: refs/heads/feature\n')
    expect(await gitDirOf(dir)).toBe(real)
    expect(await readHeadBranch(dir)).toBe('feature')
  })

  it('returns null for a detached HEAD', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-det-'))
    tmpDirs.push(dir)
    mkdirSync(join(dir, '.git'))
    writeFileSync(join(dir, '.git', 'HEAD'), '9f4a1c2e8b7d6a5f4e3c2b1a0d9e8f7a6b5c4d3e\n')
    expect(await readHeadBranch(dir)).toBeNull()
  })
})

describe('readOriginOwner', () => {
  it('returns null for a repo with no remote', async () => {
    const dir = cloneFixture('file-nav')
    expect(await readOriginOwner(dir)).toBeNull()
  })

  it('reads the owner of origin from .git/config', async () => {
    const dir = cloneFixture('host-remotes')
    expect(await readOriginOwner(dir)).toBe('contoso')
  })
})
