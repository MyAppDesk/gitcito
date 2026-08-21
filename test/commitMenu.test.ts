import { describe, it, expect, afterAll } from 'vitest'
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { gitMethodIsRead, gitService } from '../src/main/git'
import { commitMenuCapabilities } from '../src/renderer/src/lib/commitMenuCapabilities'
import { githubCommitUrl } from '../src/renderer/src/lib/hosting'

const roots: string[] = []

afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

function git(repo: string, args: string[]): string {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf-8' }).trim()
}

function initRepo(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `gitcito-cmenu-${name}-`))
  roots.push(root)
  const repo = join(root, 'repo')
  mkdirSync(repo)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  git(repo, ['config', 'user.name', 'Gitcito Test'])
  git(repo, ['config', 'user.email', 'gitcito@example.invalid'])
  git(repo, ['config', 'commit.gpgsign', 'false'])
  git(repo, ['config', 'core.autocrlf', 'false'])
  return repo
}

function commitFile(repo: string, file: string, content: string, message: string): string {
  writeFileSync(join(repo, file), content)
  git(repo, ['add', file])
  git(repo, ['commit', '-qm', message])
  return git(repo, ['rev-parse', 'HEAD'])
}

function attachBareOrigin(repo: string): string {
  const bare = join(repo, '..', 'origin.git')
  execFileSync('git', ['init', '-q', '--bare', bare])
  git(repo, ['remote', 'add', 'origin', bare])
  git(repo, ['push', '-q', '-u', 'origin', 'main'])
  return bare
}

describe('commitMenuProbe + undoCommit', () => {
  it('labels commitMenuProbe as a read and undoCommit as a write', () => {
    expect(gitMethodIsRead('commitMenuProbe')).toBe(true)
    expect(gitMethodIsRead('undoCommit')).toBe(false)
    expect(gitMethodIsRead('restoreUndoneCommit')).toBe(false)
  })

  it('unpushed HEAD: amend+undo, not reset, not GitHub', async () => {
    const repo = initRepo('unpushed')
    const head = commitFile(repo, 'a.txt', 'a\n', 'first')
    const probe = await gitService.commitMenuProbe(repo, head)
    const c = commitMenuCapabilities({
      ...probe,
      mutationInFlight: false,
      githubCommitUrl: githubCommitUrl(await gitService.remotes(repo), head)
    })
    expect(probe.isHead).toBe(true)
    expect(probe.isOnLocalBranch).toBe(true)
    expect(probe.isPublished).toBe(false)
    expect(c.canAmend).toBe(true)
    expect(c.canUndo).toBe(true)
    expect(c.canReset).toBe(false)
    expect(c.canViewOnGitHub).toBe(false)
  })

  it('pushed HEAD: amend on, undo off, view on GitHub when origin is github.com', async () => {
    const repo = initRepo('pushed-head')
    const head = commitFile(repo, 'a.txt', 'a\n', 'first')
    attachBareOrigin(repo)
    git(repo, ['remote', 'set-url', 'origin', 'https://github.com/acme/app.git'])
    const probe = await gitService.commitMenuProbe(repo, head)
    const c = commitMenuCapabilities({
      ...probe,
      mutationInFlight: false,
      githubCommitUrl: githubCommitUrl([{ name: 'origin', url: 'https://github.com/acme/app.git' }], head)
    })
    expect(probe.isPublished).toBe(true)
    expect(c.canAmend).toBe(true)
    expect(c.canUndo).toBe(false)
    expect(c.canReset).toBe(false)
    expect(c.canViewOnGitHub).toBe(true)
  })

  it('older local ancestor is resettable; first published ancestor is the boundary', async () => {
    const repo = initRepo('boundary')
    const base = commitFile(repo, 'a.txt', 'base\n', 'base')
    attachBareOrigin(repo)
    const local1 = commitFile(repo, 'a.txt', 'local1\n', 'local one')
    const head = commitFile(repo, 'a.txt', 'local2\n', 'local two')

    const baseProbe = await gitService.commitMenuProbe(repo, base)
    const localProbe = await gitService.commitMenuProbe(repo, local1)
    const headProbe = await gitService.commitMenuProbe(repo, head)
    expect(headProbe.isHead).toBe(true)
    expect(localProbe.isPublished).toBe(false)
    expect(localProbe.isAncestorOfHead).toBe(true)
    expect(localProbe.isWithinResetBoundary).toBe(true)
    expect(baseProbe.isPublished).toBe(true)
    expect(baseProbe.isWithinResetBoundary).toBe(true)
    expect(commitMenuCapabilities({ ...headProbe, mutationInFlight: false, githubCommitUrl: null }).canReset).toBe(
      false
    )
  })

  it('older published commit beyond the first published ancestor is not resettable', async () => {
    const repo = initRepo('beyond')
    const ancient = commitFile(repo, 'a.txt', '0\n', 'ancient')
    const base = commitFile(repo, 'a.txt', '1\n', 'base')
    attachBareOrigin(repo)
    commitFile(repo, 'a.txt', '2\n', 'local')
    const ancientProbe = await gitService.commitMenuProbe(repo, ancient)
    const baseProbe = await gitService.commitMenuProbe(repo, base)
    expect(baseProbe.isPublished).toBe(true)
    expect(baseProbe.isWithinResetBoundary).toBe(true)
    expect(ancientProbe.isPublished).toBe(true)
    expect(ancientProbe.isAncestorOfHead).toBe(true)
    expect(ancientProbe.isWithinResetBoundary).toBe(false)
  })

  it('a tag on a published commit does not by itself make an older commit resettable', async () => {
    const repo = initRepo('tagged')
    const ancient = commitFile(repo, 'a.txt', '0\n', 'ancient')
    const base = commitFile(repo, 'a.txt', '1\n', 'base')
    attachBareOrigin(repo)
    git(repo, ['tag', 'v1', ancient])
    const probe = await gitService.commitMenuProbe(repo, ancient)
    expect(probe.isPublished).toBe(true)
    expect(probe.isWithinResetBoundary).toBe(false)
    expect(base).toBeTruthy()
  })

  it('root commit undo leaves an unborn branch and preserves the working tree', async () => {
    const repo = initRepo('root-undo')
    commitFile(repo, 'a.txt', 'hello\n', 'initial\n\nThe body.')
    writeFileSync(join(repo, 'wip.txt'), 'keep me\n')
    const result = await gitService.undoCommit(repo)
    expect(result.wasRoot).toBe(true)
    expect(result.message).toContain('initial')
    const symbolic = git(repo, ['symbolic-ref', 'HEAD'])
    expect(symbolic).toBe('refs/heads/main')
    await expect(gitService.status(repo)).resolves.toMatchObject({ current: 'main' })
    const files = git(repo, ['status', '--porcelain', '-uall'])
    expect(files).toMatch(/a\.txt/)
    expect(files).toMatch(/wip\.txt/)
    expect(() => git(repo, ['rev-parse', 'HEAD'])).toThrow()
    await gitService.restoreUndoneCommit(repo, result.previousSha)
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(result.previousSha)
  })

  it('undo of a non-root HEAD is a mixed reset and keeps prior WIP', async () => {
    const repo = initRepo('undo-mixed')
    const parent = commitFile(repo, 'a.txt', 'one\n', 'first')
    commitFile(repo, 'a.txt', 'two\n', 'second\n\nBody line.')
    writeFileSync(join(repo, 'a.txt'), 'two\nand wip\n')
    writeFileSync(join(repo, 'extra.txt'), 'untracked\n')
    const result = await gitService.undoCommit(repo)
    expect(result.wasRoot).toBe(false)
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(parent)
    expect(result.message).toContain('second')
    const porcelain = git(repo, ['status', '--porcelain', '-uall'])
    expect(porcelain).toMatch(/a\.txt/)
    expect(porcelain).toMatch(/extra\.txt/)
    expect(git(repo, ['show', ':a.txt'])).toBe('one')
  })

  it('detached HEAD is not on a local branch', async () => {
    const repo = initRepo('detached')
    const head = commitFile(repo, 'a.txt', 'a\n', 'first')
    git(repo, ['checkout', '--detach', 'HEAD'])
    const probe = await gitService.commitMenuProbe(repo, head)
    expect(probe.isOnLocalBranch).toBe(false)
    expect(probe.isHead).toBe(true)
    const c = commitMenuCapabilities({ ...probe, mutationInFlight: false, githubCommitUrl: null })
    expect(c.canAmend).toBe(false)
    expect(c.canUndo).toBe(false)
  })

  it('no remote: unpublished, GitHub URL null', async () => {
    const repo = initRepo('no-remote')
    const head = commitFile(repo, 'a.txt', 'a\n', 'first')
    const probe = await gitService.commitMenuProbe(repo, head)
    expect(probe.isPublished).toBe(false)
    expect(githubCommitUrl(await gitService.remotes(repo), head)).toBeNull()
  })

  it('non-GitHub remote: published but no github commit URL', async () => {
    const repo = initRepo('gitlab')
    const head = commitFile(repo, 'a.txt', 'a\n', 'first')
    attachBareOrigin(repo)
    git(repo, ['remote', 'set-url', 'origin', 'https://gitlab.com/acme/app.git'])
    const probe = await gitService.commitMenuProbe(repo, head)
    expect(probe.isPublished).toBe(true)
    expect(githubCommitUrl(await gitService.remotes(repo), head)).toBeNull()
  })

  it('dirty working tree and staged files do not change probe flags', async () => {
    const repo = initRepo('dirty')
    const parent = commitFile(repo, 'a.txt', 'a\n', 'first')
    const head = commitFile(repo, 'a.txt', 'b\n', 'second')
    writeFileSync(join(repo, 'a.txt'), 'dirty\n')
    writeFileSync(join(repo, 'staged.txt'), 's\n')
    git(repo, ['add', 'staged.txt'])
    const headProbe = await gitService.commitMenuProbe(repo, head)
    const parentProbe = await gitService.commitMenuProbe(repo, parent)
    expect(headProbe.isHead).toBe(true)
    expect(parentProbe.isWithinResetBoundary).toBe(true)
  })

  it('merge in progress sets operationInProgress', async () => {
    const repo = initRepo('merging')
    commitFile(repo, 'a.txt', 'main\n', 'main')
    git(repo, ['checkout', '-q', '-b', 'feature'])
    commitFile(repo, 'a.txt', 'feature\n', 'feature')
    git(repo, ['checkout', '-q', 'main'])
    commitFile(repo, 'a.txt', 'other\n', 'other')
    try {
      git(repo, ['merge', '--no-commit', 'feature'])
    } catch {
      /* conflict is expected */
    }
    const head = git(repo, ['rev-parse', 'HEAD'])
    const probe = await gitService.commitMenuProbe(repo, head)
    expect(probe.operationInProgress).toBe(true)
    const c = commitMenuCapabilities({ ...probe, mutationInFlight: false, githubCommitUrl: null })
    expect(c.canAmend).toBe(false)
    expect(c.canUndo).toBe(false)
  })

  it('cherry-pick in progress sets operationInProgress', async () => {
    const repo = initRepo('cherry')
    commitFile(repo, 'a.txt', 'main\n', 'main')
    git(repo, ['checkout', '-q', '-b', 'feature'])
    commitFile(repo, 'a.txt', 'feature\n', 'picked')
    git(repo, ['checkout', '-q', 'main'])
    commitFile(repo, 'a.txt', 'other\n', 'other')
    try {
      git(repo, ['cherry-pick', 'feature'])
    } catch {
      /* conflict is expected */
    }
    const head = git(repo, ['rev-parse', 'HEAD'])
    const probe = await gitService.commitMenuProbe(repo, head)
    expect(probe.operationInProgress).toBe(true)
    expect(
      commitMenuCapabilities({ ...probe, mutationInFlight: false, githubCommitUrl: null }).canAmend
    ).toBe(false)
  })

  it('rebase in progress sets operationInProgress', async () => {
    const repo = initRepo('rebasing')
    commitFile(repo, 'a.txt', 'base\n', 'base')
    git(repo, ['checkout', '-q', '-b', 'feature'])
    commitFile(repo, 'a.txt', 'feature\n', 'feature')
    git(repo, ['checkout', '-q', 'main'])
    commitFile(repo, 'a.txt', 'main\n', 'main')
    try {
      git(repo, ['rebase', 'feature'])
    } catch {
      /* conflict is expected */
    }
    const head = git(repo, ['rev-parse', 'HEAD'])
    const probe = await gitService.commitMenuProbe(repo, head)
    expect(probe.operationInProgress).toBe(true)
  })

  it('mutationInFlight is a UI flag — the probe itself does not set it', async () => {
    const repo = initRepo('inflight')
    const head = commitFile(repo, 'a.txt', 'a\n', 'first')
    const probe = await gitService.commitMenuProbe(repo, head)
    expect(probe.operationInProgress).toBe(false)
    const c = commitMenuCapabilities({ ...probe, mutationInFlight: true, githubCommitUrl: null })
    expect(c.canAmend).toBe(false)
    expect(c.canUndo).toBe(false)
  })

  it('reset mixed preserves uncommitted work relative to the target', async () => {
    const repo = initRepo('reset-dirty')
    const target = commitFile(repo, 'a.txt', 'one\n', 'one')
    commitFile(repo, 'a.txt', 'two\n', 'two')
    writeFileSync(join(repo, 'a.txt'), 'two plus wip\n')
    await gitService.reset(repo, target, 'mixed')
    expect(git(repo, ['rev-parse', 'HEAD'])).toBe(target)
    const porcelain = git(repo, ['status', '--porcelain'])
    expect(porcelain.length).toBeGreaterThan(0)
  })
})
