import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { gitService } from '../src/main/git'
import { cloneFixture, cleanupFixtures } from './fixtures'
import { parseDiff, splitEditPartners } from '../src/renderer/src/lib/diff'
import { buildLinePatch, extractHunks, singleHunkPatch } from '../src/renderer/src/lib/hunkPatch'

// The hunk actions run real `git apply` against the line-staging fixture, whose
// one unstaged hunk in config.js changes `host` and adds `debug` and `tls`.
// Patches are cut exactly as the diff viewer cuts them, from the diff gitService
// returns for that source, so a wrong line-selection rule fails here.

afterAll(cleanupFixtures)

const git = (repo: string, ...args: string[]): string => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' })
const config = (repo: string): string => readFileSync(join(repo, 'config.js'), 'utf8')

/** A patch selecting only the changed lines whose text contains `needle`. */
function linesPatch(diff: string, needle: string, direction: 'forward' | 'reverse'): string {
  const lines = parseDiff(diff)
  const selected = new Set(
    lines.flatMap((l, i) => ((l.kind === 'add' || l.kind === 'del') && l.text.includes(needle) ? [i] : []))
  )
  expect(selected.size).toBeGreaterThan(0)
  return buildLinePatch(lines, extractHunks(diff).header, selected, direction)
}

describe('hunk actions', () => {
  it('discard of selected lines removes only those, and undo puts them back', async () => {
    const R = cloneFixture('line-staging')
    const patch = linesPatch(await gitService.diffFile(R, 'config.js', false, false), 'debug', 'reverse')

    await gitService.applyHunkPatch(R, patch, 'worktree', true)
    expect(config(R)).not.toContain('debug: true')
    expect(config(R)).toContain('tls: true')
    expect(config(R)).toContain("host: 'api.example.com'")

    // Undo is the same patch, the other way round.
    await gitService.applyHunkPatch(R, patch, 'worktree', false)
    expect(config(R)).toContain('debug: true')
  })

  it('unstage of selected lines takes them out of the index and leaves the file alone', async () => {
    const R = cloneFixture('line-staging')
    const unstaged = await gitService.diffFile(R, 'config.js', false, false)
    await gitService.applyHunkPatch(R, singleHunkPatch(extractHunks(unstaged), 0), 'index', false)

    const staged = await gitService.diffFile(R, 'config.js', true, false)
    await gitService.applyHunkPatch(R, linesPatch(staged, 'tls', 'reverse'), 'index', true)

    const stillStaged = git(R, 'diff', '--cached')
    expect(stillStaged).toContain('debug: true')
    expect(stillStaged).not.toContain('tls: true')
    expect(config(R)).toContain('tls: true')
  })

  it('revert of selected lines from a commit undoes them in the working tree only', async () => {
    const R = cloneFixture('line-staging')
    git(R, 'commit', '-qam', 'enable debug and tls')
    const head = git(R, 'rev-parse', 'HEAD').trim()

    const diff = await gitService.commitFileDiff(R, head, 'config.js')
    await gitService.applyHunkPatch(R, linesPatch(diff, 'debug', 'reverse'), 'worktree', true)

    expect(config(R)).not.toContain('debug: true')
    expect(config(R)).toContain('tls: true')
    expect(git(R, 'rev-parse', 'HEAD').trim()).toBe(head)
    expect(git(R, 'diff', '--cached')).toBe('')
  })

  it('apply of selected lines from a stash brings only those back and keeps the stash', async () => {
    const R = cloneFixture('line-staging')
    git(R, 'stash', 'push', '-q')
    const sha = git(R, 'rev-parse', 'stash@{0}').trim()

    const diff = await gitService.stashFileDiff(R, sha, 'config.js')
    await gitService.applyHunkPatch(R, linesPatch(diff, 'tls', 'forward'), 'worktree', false)

    expect(config(R)).toContain('tls: true')
    expect(config(R)).not.toContain('debug: true')
    expect(config(R)).toContain("host: 'localhost'")
    expect(git(R, 'stash', 'list').trim().split('\n')).toHaveLength(1)
  })

  it('reverts from a commit with a three-way merge when the file has been edited since', async () => {
    const R = cloneFixture('line-staging')
    git(R, 'commit', '-qam', 'enable debug and tls')
    const head = git(R, 'rev-parse', 'HEAD').trim()
    const diff = await gitService.commitFileDiff(R, head, 'config.js')
    // An uncommitted edit to a context line of that hunk: plain `git apply`
    // refuses, `--3way` refuses a dirty file — only the merge fallback works.
    writeFileSync(join(R, 'config.js'), config(R).replace('port: 3000', 'port: 8080'))

    const result = await gitService.applyHunkPatch(R, linesPatch(diff, 'debug', 'reverse'), 'worktree', true)

    expect(result.conflicts).toBe(0)
    expect(config(R)).toContain('port: 8080')
    expect(config(R)).not.toContain('debug: true')
    expect(config(R)).toContain('tls: true')
  })

  it('leaves conflict markers, and says how many, when the edit overlaps the hunk', async () => {
    const R = cloneFixture('line-staging')
    git(R, 'commit', '-qam', 'enable debug and tls')
    const head = git(R, 'rev-parse', 'HEAD').trim()
    const diff = await gitService.commitFileDiff(R, head, 'config.js')
    writeFileSync(join(R, 'config.js'), config(R).replace('debug: true', 'debug: false'))

    const result = await gitService.applyHunkPatch(R, linesPatch(diff, 'debug', 'reverse'), 'worktree', true)

    expect(result.conflicts).toBe(1)
    expect(config(R)).toMatch(/<<<<<<< working copy[\s\S]*debug: false[\s\S]*>>>>>>> hunk/)
  })

  it('stages a hunk cut from a whitespace-ignoring diff, leaving the hidden whitespace change unstaged', async () => {
    const R = cloneFixture('line-staging')
    git(R, 'checkout', '-q', '--', 'config.js')
    // A re-indented context line (hidden by -w) next to a real change (shown).
    writeFileSync(join(R, 'config.js'), config(R).replace('  port: 3000,', '    port: 3000,').replace('  retries: 3,', '  retries: 5,'))
    const diff = await gitService.diffFile(R, 'config.js', false, false, true)
    expect(diff).not.toContain('-  port: 3000,')

    const patch = singleHunkPatch(extractHunks(diff), 0)
    await gitService.applyHunkPatch(R, patch, 'index', false, true)

    const staged = git(R, 'diff', '--cached')
    expect(staged).toContain('+  retries: 5,')
    expect(staged).not.toContain('+    port: 3000,')
    // The re-indent is still in the working copy, unstaged.
    expect(git(R, 'diff')).toContain('+    port: 3000,')
  })

  it('stages both halves of an edited split row from either side', async () => {
    const R = cloneFixture('line-staging')
    git(R, 'checkout', '-q', '--', 'config.js')
    writeFileSync(
      join(R, 'config.js'),
      config(R).replace('  retries: 3,', '  retries: 5,').replace('  timeout: 1000,', '  timeout: 2000,')
    )
    const diff = await gitService.diffFile(R, 'config.js', false, false)
    const lines = parseDiff(diff)
    const add = lines.findIndex((l) => l.kind === 'add' && l.text.includes('retries'))
    const partner = splitEditPartners(lines).get(add)
    expect(partner).toBeDefined()

    // Clicking only the new cell selects it and the old one opposite it.
    const patch = buildLinePatch(lines, extractHunks(diff).header, new Set([add, partner as number]), 'forward')
    await gitService.applyHunkPatch(R, patch, 'index', false)

    const staged = git(R, 'diff', '--cached')
    expect(staged).toContain('-  retries: 3,')
    expect(staged).toContain('+  retries: 5,')
    expect(staged).not.toContain('timeout: 2000')
    expect(git(R, 'diff')).not.toMatch(/^[-+]  retries/m)
  })

  it('stages a selection that reaches the last line of the file', async () => {
    const R = cloneFixture('line-staging')
    const diff = await gitService.diffFile(R, 'config.js', false, false)
    // The hunk runs to the end of config.js; a line patch must not claim one more.
    await gitService.applyHunkPatch(R, linesPatch(diff, 'tls', 'forward'), 'index', false)

    const staged = git(R, 'diff', '--cached')
    expect(staged).toContain('+  tls: true,')
    expect(staged).not.toContain('debug')
  })

  it('fails without touching the file when the hunk no longer matches', async () => {
    const R = cloneFixture('line-staging')
    const patch = singleHunkPatch(extractHunks(await gitService.diffFile(R, 'config.js', false, false)), 0)
    await gitService.applyHunkPatch(R, patch, 'worktree', true)
    const before = config(R)
    await expect(gitService.applyHunkPatch(R, patch, 'worktree', true)).rejects.toThrow(/patch does not apply|patch failed/)
    expect(config(R)).toBe(before)
  })
})

describe('hunk merge fallback safety', () => {
  /** A revert patch that only the three-way fallback can apply (see above). */
  async function staleRevert(R: string): Promise<string> {
    git(R, 'commit', '-qam', 'enable debug and tls')
    const diff = await gitService.commitFileDiff(R, git(R, 'rev-parse', 'HEAD').trim(), 'config.js')
    writeFileSync(join(R, 'config.js'), config(R).replace('port: 3000', 'port: 8080'))
    return linesPatch(diff, 'debug', 'reverse')
  }

  it('refuses a patch naming a file outside the repository', async () => {
    const R = cloneFixture('line-staging')
    const patch = await staleRevert(R)
    const outside = mkdtempSync(join(tmpdir(), 'gitcito-hunk-outside-'))
    const victim = join(outside, 'victim.js')
    writeFileSync(victim, config(R))
    const rel = relative(R, victim)
    const escaping = patch.replace(/^\+\+\+ b\/config\.js$/m, `+++ b/${rel}`)

    await expect(gitService.applyHunkPatch(R, escaping, 'worktree', true)).rejects.toThrow()
    expect(readFileSync(victim, 'utf8')).toContain('debug: true')
    rmSync(outside, { recursive: true, force: true })
  })

  it('does not write through a symlink', async () => {
    const R = cloneFixture('line-staging')
    const patch = await staleRevert(R)
    const outside = mkdtempSync(join(tmpdir(), 'gitcito-hunk-outside-'))
    const victim = join(outside, 'victim.js')
    writeFileSync(victim, config(R))
    rmSync(join(R, 'config.js'))
    symlinkSync(victim, join(R, 'config.js'))

    await expect(gitService.applyHunkPatch(R, patch, 'worktree', true)).rejects.toThrow()
    expect(readFileSync(victim, 'utf8')).toContain('debug: true')
    rmSync(outside, { recursive: true, force: true })
  })

  it('never leaves a CRLF working copy with mixed line endings', async () => {
    const R = cloneFixture('line-staging')
    git(R, 'commit', '-qam', 'enable debug and tls')
    const diff = await gitService.commitFileDiff(R, git(R, 'rev-parse', 'HEAD').trim(), 'config.js')
    git(R, 'config', 'core.autocrlf', 'true')
    rmSync(join(R, 'config.js'))
    git(R, 'checkout', '--', 'config.js')
    expect(config(R)).toContain('\r\n')
    writeFileSync(join(R, 'config.js'), config(R).replace('port: 3000', 'port: 8080'))

    await gitService.applyHunkPatch(R, linesPatch(diff, 'debug', 'reverse'), 'worktree', true).catch(() => null)
    expect(config(R)).toContain('port: 8080')
    expect(config(R).replace(/\r\n/g, '')).not.toContain('\n')
  })
})
