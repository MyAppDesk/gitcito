import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { localCiService } from '../src/main/localCi'
import { cloneFixture, cleanupFixtures } from './fixtures'

// A stand-in for act: succeeds only when the checked-out commit contains
// ok.flag. That makes the verdict depend on WHICH commit the worktree holds —
// exactly what runAt must get right.
let fakeDir = ''

beforeAll(() => {
  fakeDir = mkdtempSync(join(tmpdir(), 'gitcito-fake-act-'))
  const bin = join(fakeDir, 'fake-act')
  writeFileSync(bin, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo fake-act 1.0; exit 0; fi\necho "run in $PWD"\ntest -f ok.flag\n')
  chmodSync(bin, 0o755)
  process.env.GITCITO_ACT_BIN = bin
})

afterAll(() => {
  delete process.env.GITCITO_ACT_BIN
  rmSync(fakeDir, { recursive: true, force: true })
  cleanupFixtures()
})

const sender = { isDestroyed: () => false, send: () => undefined } as unknown as Electron.WebContents

const gitC = (repo: string, ...args: string[]): string =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf-8' })

/** Two extra commits on top of the fixture: one with ok.flag, one without. */
function seed(repo: string): { good: string; bad: string } {
  writeFileSync(join(repo, 'ok.flag'), 'yes\n')
  gitC(repo, 'add', 'ok.flag')
  gitC(repo, 'commit', '-m', 'test: add ok.flag')
  const good = gitC(repo, 'rev-parse', 'HEAD').trim()
  gitC(repo, 'rm', '-q', 'ok.flag')
  gitC(repo, 'commit', '-m', 'test: drop ok.flag')
  const bad = gitC(repo, 'rev-parse', 'HEAD').trim()
  return { good, bad }
}

describe('local CI against a commit you are not on', () => {
  it('runs in a throwaway worktree, pins the verdict to that sha, and cleans up', async () => {
    const R = cloneFixture('local-ci')
    const { good, bad } = seed(R)
    // HEAD sits on `bad`; run against `good`, which we are NOT on.
    const r = await localCiService.runAt(R, 'ci.yml', good, sender)
    expect(r.sha).toBe(good)
    expect(r.exit).toBe(0)
    expect(r.ok).toBe(true)
    expect(r.recorded).toBe(true)

    const v = await localCiService.verdicts(R)
    expect(v[good]?.ok).toBe(true)
    // The main working tree never moved and no worktree is left behind.
    expect(gitC(R, 'rev-parse', 'HEAD').trim()).toBe(bad)
    expect(gitC(R, 'worktree', 'list', '--porcelain').split('worktree ').filter(Boolean)).toHaveLength(1)
  })

  it('a commit whose tree fails CI records a failing verdict', async () => {
    const R = cloneFixture('local-ci')
    const { bad } = seed(R)
    const r = await localCiService.runAt(R, 'ci.yml', bad, sender)
    expect(r.ok).toBe(false)
    expect((await localCiService.verdicts(R))[bad]?.ok).toBe(false)
  })

  it('rejects a sha that is not a commit', async () => {
    const R = cloneFixture('local-ci')
    await expect(localCiService.runAt(R, 'ci.yml', 'not-a-rev', sender)).rejects.toThrow()
  })

  it('resolveRange caps the list, reports the true total, and refuses option-like specs', async () => {
    const R = cloneFixture('local-ci')
    seed(R)
    const capped = await localCiService.resolveRange(R, 'HEAD', 2)
    expect(capped.shas).toHaveLength(2)
    expect(capped.total).toBeGreaterThan(2)
    expect(capped.subjects[capped.shas[0]]).toBe('test: drop ok.flag')
    await expect(localCiService.resolveRange(R, '--output=/tmp/x', 5)).rejects.toThrow(/revision spec/)
  })

  it('sweeps a range sequentially and records one verdict per commit', async () => {
    const R = cloneFixture('local-ci')
    const { good, bad } = seed(R)
    const result = await localCiService.sweep(R, 'ci.yml', [bad, good], sender)
    expect(result.aborted).toBe(false)
    expect(result.results.map((x) => x.ok)).toEqual([false, true])
    const v = await localCiService.verdicts(R)
    expect(v[good]?.ok).toBe(true)
    expect(v[bad]?.ok).toBe(false)
  })
})
