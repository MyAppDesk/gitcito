// Every file discard can be undone: captureWork saves what is staged and what
// is on disk before it, restoreWork puts exactly the discarded paths back. And
// Discard all removes newly added files instead of leaving them untracked.
import { describe, it, expect, afterAll } from 'vitest'
import { writeFileSync, readFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gitService } from '../src/main/git'

const dirs: string[] = []
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))

function repo(): { dir: string; git: (...a: string[]) => string } {
  const dir = mkdtempSync(join(tmpdir(), 'gitcito-discard-undo-'))
  dirs.push(dir)
  const git = (...a: string[]): string =>
    execFileSync('git', ['-C', dir, '-c', 'user.name=D', '-c', 'user.email=d@example.invalid', ...a], {
      encoding: 'utf8'
    })
  git('init', '-q', '-b', 'main')
  writeFileSync(join(dir, 'a.txt'), 'one\n')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git('add', '-A')
  git('commit', '-qm', 'start')
  return { dir, git }
}

/** Discard all, the way the app does it: unstage, then discard tracked and untracked. */
async function discardAll(dir: string, tracked: string[], untracked: string[]): Promise<void> {
  await gitService.unstageAll(dir)
  if (tracked.length) await gitService.discard(dir, tracked, false)
  if (untracked.length) await gitService.discard(dir, untracked, true)
}

describe('discard all', () => {
  it('removes a staged new file instead of leaving it untracked', async () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, 'added.txt'), 'staged new\n')
    git('add', 'added.txt')
    await discardAll(dir, ['added.txt'], [])
    expect(existsSync(join(dir, 'added.txt'))).toBe(false)
    expect(git('status', '--porcelain').trim()).toBe('')
  })
})

describe('discard undo', () => {
  it('puts back staged and unstaged edits, an untracked file and a staged new file exactly', async () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, 'a.txt'), 'one\nstaged\n')
    git('add', 'a.txt')
    writeFileSync(join(dir, 'a.txt'), 'one\nstaged\nunstaged\n')
    writeFileSync(join(dir, 'new.txt'), 'untracked\n')
    writeFileSync(join(dir, 'added.txt'), 'staged new\n')
    git('add', 'added.txt')
    const statusBefore = git('status', '--porcelain')
    const stagedBefore = git('diff', '--cached')

    const saved = await gitService.captureWork(dir)
    expect(saved).not.toBeNull()
    await discardAll(dir, ['a.txt', 'added.txt'], ['new.txt'])
    expect(git('status', '--porcelain').trim()).toBe('')

    await gitService.restoreWork(dir, saved!, ['a.txt', 'added.txt', 'new.txt'])
    expect(git('status', '--porcelain')).toBe(statusBefore)
    expect(git('diff', '--cached')).toBe(stagedBefore)
    expect(readFileSync(join(dir, 'a.txt'), 'utf8')).toBe('one\nstaged\nunstaged\n')
    expect(readFileSync(join(dir, 'new.txt'), 'utf8')).toBe('untracked\n')
  })

  it('puts back a deleted file and a new untracked folder', async () => {
    const { dir, git } = repo()
    rmSync(join(dir, 'a.txt'))
    mkdirSync(join(dir, 'fresh'))
    writeFileSync(join(dir, 'fresh', 'one.txt'), '1\n')
    writeFileSync(join(dir, 'fresh', 'two.txt'), '2\n')
    const statusBefore = git('status', '--porcelain')

    const saved = await gitService.captureWork(dir)
    // Git lists an untracked folder as one entry, `fresh/`.
    await gitService.discard(dir, ['a.txt'], false)
    await gitService.discard(dir, ['fresh/'], true)
    expect(git('status', '--porcelain').trim()).toBe('')

    await gitService.restoreWork(dir, saved!, ['a.txt', 'fresh/'])
    expect(git('status', '--porcelain')).toBe(statusBefore)
    expect(readFileSync(join(dir, 'fresh', 'two.txt'), 'utf8')).toBe('2\n')
  })

  it('touches only the discarded paths', async () => {
    const { dir } = repo()
    writeFileSync(join(dir, 'a.txt'), 'changed\n')
    const saved = await gitService.captureWork(dir)
    await gitService.discard(dir, ['a.txt'], false)
    // Edited after the discard, before the undo: must survive it.
    writeFileSync(join(dir, 'keep.txt'), 'edited later\n')
    await gitService.restoreWork(dir, saved!, ['a.txt'])
    expect(readFileSync(join(dir, 'a.txt'), 'utf8')).toBe('changed\n')
    expect(readFileSync(join(dir, 'keep.txt'), 'utf8')).toBe('edited later\n')
  })

  it('removes a path that did not exist when the work was saved', async () => {
    const { dir } = repo()
    const saved = await gitService.captureWork(dir)
    writeFileSync(join(dir, 'later.txt'), 'x\n')
    await gitService.restoreWork(dir, saved!, ['later.txt'])
    expect(existsSync(join(dir, 'later.txt'))).toBe(false)
  })

  it('saves nothing while a merge has conflicts', async () => {
    const { dir, git } = repo()
    git('checkout', '-qb', 'side')
    writeFileSync(join(dir, 'a.txt'), 'side\n')
    git('commit', '-qam', 'side')
    git('checkout', '-q', 'main')
    writeFileSync(join(dir, 'a.txt'), 'main\n')
    git('commit', '-qam', 'main')
    try {
      execFileSync('git', ['-C', dir, 'merge', 'side'], { stdio: 'ignore' })
    } catch {
      /* the conflict is the point */
    }
    expect(await gitService.captureWork(dir)).toBeNull()
  })

  it('refuses a path outside the repository', async () => {
    const { dir } = repo()
    const saved = await gitService.captureWork(dir)
    await expect(gitService.restoreWork(dir, saved!, ['../escape.txt'])).rejects.toThrow(/outside/)
  })

  it('refuses a path behind a symlinked folder', async () => {
    const { dir } = repo()
    const outside = mkdtempSync(join(tmpdir(), 'gitcito-discard-outside-'))
    dirs.push(outside)
    writeFileSync(join(outside, 'victim.txt'), 'precious\n')
    symlinkSync(outside, join(dir, 'link'))
    const saved = await gitService.captureWork(dir)
    await expect(gitService.restoreWork(dir, saved!, ['link/victim.txt'])).rejects.toThrow(/outside/)
    expect(readFileSync(join(outside, 'victim.txt'), 'utf8')).toBe('precious\n')
  })

  it('refuses saved work that is not a pair of object ids', async () => {
    const { dir } = repo()
    await expect(
      gitService.restoreWork(dir, { index: '--orphan', worktree: 'HEAD' }, ['a.txt'])
    ).rejects.toThrow(/Invalid/)
  })

  it('treats a file name with glob characters literally', async () => {
    const { dir } = repo()
    writeFileSync(join(dir, '*.txt'), 'star\n')
    const saved = await gitService.captureWork(dir)
    await gitService.discard(dir, ['*.txt'], true)
    writeFileSync(join(dir, 'a.txt'), 'edited after\n')
    await gitService.restoreWork(dir, saved!, ['*.txt'])
    expect(readFileSync(join(dir, '*.txt'), 'utf8')).toBe('star\n')
    expect(readFileSync(join(dir, 'a.txt'), 'utf8')).toBe('edited after\n')
  })
})

describe('discard failures', () => {
  it('leaves a tracked file on disk when git cannot take the index lock', async () => {
    const { dir, git } = repo()
    writeFileSync(join(dir, 'added.txt'), 'staged new\n')
    git('add', 'added.txt')
    const lock = join(dir, '.git', 'index.lock')
    writeFileSync(lock, '')
    try {
      await expect(gitService.discard(dir, ['added.txt'], false)).rejects.toThrow()
    } finally {
      rmSync(lock, { force: true })
    }
    expect(readFileSync(join(dir, 'added.txt'), 'utf8')).toBe('staged new\n')
  })
})
