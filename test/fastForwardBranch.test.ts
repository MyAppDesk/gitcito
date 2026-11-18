import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { gitService } from '../src/main/git'

// Real git: main ← feature (feature is ahead), plus `side`, which has diverged.
describe('fast-forwarding a branch from a drop', () => {
  let repo: string
  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, '-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], {
      encoding: 'utf8'
    }).trim()
  const sha = (ref: string): string => git('rev-parse', ref)

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'gitcito-ff-'))
    execFileSync('git', ['init', '-q', '-b', 'main', repo])
    writeFileSync(join(repo, 'a.txt'), '1')
    git('add', '.')
    git('commit', '-qm', 'one')
    git('branch', 'side')
    git('checkout', '-qb', 'feature')
    git('commit', '-q', '--allow-empty', '-m', 'two')
    git('checkout', '-q', 'side')
    git('commit', '-q', '--allow-empty', '-m', 'diverged')
    git('checkout', '-q', 'feature')
  })

  afterEach(() => rmSync(repo, { recursive: true, force: true }))

  it('knows when a fast-forward is possible', async () => {
    expect(await gitService.isAncestor(repo, 'main', 'feature')).toBe(true)
    expect(await gitService.isAncestor(repo, 'feature', 'main')).toBe(false) // backwards
    expect(await gitService.isAncestor(repo, 'side', 'feature')).toBe(false) // diverged
    expect(await gitService.isAncestor(repo, 'main', 'main')).toBe(false) // nothing to move
    expect(await gitService.isAncestor(repo, 'nope', 'feature')).toBe(false)
    expect(await gitService.isAncestor(repo, '--all', 'feature')).toBe(false)
  })

  it('moves a branch that is not checked out, and hands back where it was', async () => {
    const before = sha('main')
    expect(await gitService.fastForwardBranch(repo, 'main', 'feature')).toBe(before)
    expect(sha('main')).toBe(sha('feature'))
    expect(git('symbolic-ref', '--short', 'HEAD')).toBe('feature') // no checkout happened
  })

  it('refuses what is not a fast-forward, and the branch that is checked out', async () => {
    await expect(gitService.fastForwardBranch(repo, 'side', 'feature')).rejects.toThrow(/diverged/)
    await expect(gitService.fastForwardBranch(repo, 'feature', 'main')).rejects.toThrow(/checked out/)
    await expect(gitService.fastForwardBranch(repo, '-f', 'feature')).rejects.toThrow()
  })
})

describe('pushing a branch to another remote branch from a drop', () => {
  let dir: string
  let repo: string
  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, '-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], {
      encoding: 'utf8'
    }).trim()

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'gitcito-pushref-'))
    repo = join(dir, 'repo')
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(dir, 'remote.git')])
    execFileSync('git', ['init', '-q', '-b', 'main', repo])
    writeFileSync(join(repo, 'a.txt'), '1')
    git('add', '.')
    git('commit', '-qm', 'one')
    git('remote', 'add', 'origin', join(dir, 'remote.git'))
    git('push', '-q', 'origin', 'main')
    git('checkout', '-qb', 'feature')
    git('commit', '-q', '--allow-empty', '-m', 'two')
  })

  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it("updates the remote branch to the source and leaves the source's upstream alone", async () => {
    await gitService.pushRef(repo, 'feature', 'origin', 'main')
    expect(git('ls-remote', 'origin', 'refs/heads/main').split('\t')[0]).toBe(git('rev-parse', 'feature'))
    expect(() => git('rev-parse', '--abbrev-ref', 'feature@{u}')).toThrow()
  })

  it('is never forced: a non-fast-forward is refused by the remote', async () => {
    git('checkout', '-q', 'main')
    git('commit', '-q', '--allow-empty', '-m', 'diverged')
    git('push', '-q', 'origin', 'main')
    await expect(gitService.pushRef(repo, 'feature', 'origin', 'main')).rejects.toThrow()
  })

  it('refuses a name that would read as an option', async () => {
    await expect(gitService.pushRef(repo, '--all', 'origin', 'main')).rejects.toThrow()
  })
})
