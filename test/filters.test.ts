import { describe, it, expect, afterAll } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { gitService, gitMethodIsRead } from '../src/main/git'
import { cloneFixture, cleanupFixtures } from './fixtures'

afterAll(cleanupFixtures)

const track = (repo: string, file: string, content: string): void => {
  writeFileSync(join(repo, file), content)
  execFileSync('git', ['-C', repo, 'add', file])
}

describe('clean/smudge filter drivers', () => {
  it('writes a filter, lists it, and returns what it overwrote', async () => {
    const R = cloneFixture('bisect-bug')

    const before = await gitService.setFilterDriver(R, 'vault', { clean: 'cat', smudge: 'cat', required: true })
    expect(before).toEqual({ clean: '', smudge: '', required: false })

    const listed = (await gitService.filterDrivers(R)).find((f) => f.name === 'vault')!
    expect(listed.clean).toBe('cat')
    expect(listed.smudge).toBe('cat')
    expect(listed.required).toBe(true)
    expect(listed.scope).toBe('repo')
    expect(listed.cleanAvailable).toBe(true)

    // Overwriting hands back the old values — the undo payload.
    const previous = await gitService.setFilterDriver(R, 'vault', { clean: 'tac', smudge: '', required: false })
    expect(previous).toEqual({ clean: 'cat', smudge: 'cat', required: true })

    // Clearing removes every key.
    await gitService.setFilterDriver(R, 'vault', { clean: '', smudge: '', required: false })
    expect((await gitService.filterDrivers(R)).some((f) => f.name === 'vault')).toBe(false)
  })

  it('flags a filter whose command does not exist', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.setFilterDriver(R, 'ghost', { clean: 'definitely-not-installed --x', smudge: '', required: false })
    const listed = (await gitService.filterDrivers(R)).find((f) => f.name === 'ghost')!
    expect(listed.cleanAvailable).toBe(false)
  })

  it('dry run: a lossless pair roundtrips, and nothing is configured', async () => {
    const R = cloneFixture('bisect-bug')
    track(R, 'creds.secret', 'token=hunter2\n')

    const result = await gitService.filterDryRun(R, '*.secret', 'cat', 'cat')
    expect(result.matched).toBe(1)
    expect(result.tested).toHaveLength(1)
    expect(result.tested[0].ok).toBe(true)
    expect(result.tested[0].roundtrip).toBe('ok')
    expect(result.tested[0].preview).toContain('token=hunter2')

    // The dry run must not have written any config. (Global drivers — e.g. a
    // developer's own git-lfs — may exist; only the repo scope matters here.)
    expect((await gitService.filterDrivers(R)).filter((f) => f.scope === 'repo').length).toBe(0)
  })

  it('dry run: a lossy clean is reported as a differing roundtrip', async () => {
    const R = cloneFixture('bisect-bug')
    track(R, 'creds.secret', 'token=hunter2\n')
    // Uppercasing is not invertible — smudge cannot restore the original.
    const result = await gitService.filterDryRun(R, '*.secret', "tr 'a-z' 'A-Z'", 'cat')
    expect(result.tested[0].ok).toBe(true)
    expect(result.tested[0].roundtrip).toBe('different')
  })

  it('dry run: no smudge command means the roundtrip is skipped, not failed', async () => {
    const R = cloneFixture('bisect-bug')
    track(R, 'creds.secret', 'token=hunter2\n')
    const result = await gitService.filterDryRun(R, '*.secret', "tr 'a-z' 'A-Z'", '')
    expect(result.tested[0].ok).toBe(true)
    expect(result.tested[0].roundtrip).toBe('skipped')
    expect(result.tested[0].preview).toContain('TOKEN=HUNTER2')
  })

  it('dry run: a failing command reports its stderr instead of pretending', async () => {
    const R = cloneFixture('bisect-bug')
    track(R, 'creds.secret', 'token=hunter2\n')
    const result = await gitService.filterDryRun(R, '*.secret', 'sh -c "echo broken >&2; exit 3"', '')
    expect(result.tested[0].ok).toBe(false)
    expect(result.tested[0].error).toContain('broken')
  })

  it('dry run: an unmatched pattern says so', async () => {
    const R = cloneFixture('bisect-bug')
    const result = await gitService.filterDryRun(R, '*.nothing-matches-this', 'cat', 'cat')
    expect(result.matched).toBe(0)
    expect(result.tested).toHaveLength(0)
  })

  it('substitutes %f with the repo-relative path, like git does', async () => {
    const R = cloneFixture('bisect-bug')
    track(R, 'creds.secret', 'token=hunter2\n')
    const result = await gitService.filterDryRun(R, '*.secret', 'echo %f', '')
    expect(result.tested[0].preview.trim()).toBe('creds.secret')
  })

  it('classifies the new methods correctly for the repo lock', () => {
    expect(gitMethodIsRead('filterDrivers')).toBe(true)
    expect(gitMethodIsRead('filterDryRun')).toBe(true)
    expect(gitMethodIsRead('setFilterDriver')).toBe(false)
  })
})
