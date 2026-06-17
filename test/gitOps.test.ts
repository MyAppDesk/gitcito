import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { gitService } from '../src/main/git'
import { cloneFixture, cleanupFixtures } from './fixtures'

// Mutation/integration tests: exercise the WRITE paths of gitService (the same
// code Gitcito runs for merge / cherry-pick / rebase / conflict-resolve / stash
// / commit). Each test works on an isolated copy of a playground repo.
afterAll(cleanupFixtures)

describe('merge → conflict → abort', () => {
  it('detects conflicts on merge and aborts cleanly', async () => {
    const R = cloneFixture('merge-conflict')

    // simple-git rejects when the merge leaves conflicts.
    await expect(gitService.merge(R, 'feature')).rejects.toThrow()

    expect(await gitService.mergeState(R)).toBe('merge')
    const st = await gitService.status(R)
    expect(st.conflicted.length).toBeGreaterThan(0)

    // A content conflict exposes both sides.
    const versions = await gitService.conflictVersions(R, 'greeting.txt')
    expect(versions.ours).not.toBeNull()
    expect(versions.theirs).not.toBeNull()

    await gitService.conflictOpAbort(R, 'merge')
    expect(await gitService.mergeState(R)).toBeNull()
    const after = await gitService.status(R)
    expect(after.conflicted.length).toBe(0)
    expect((await gitService.open(R)).current).toBe('main')
  })
})

describe('cherry-pick → clean then conflict → resolve', () => {
  it('applies a clean commit, then resolves a conflicting one', async () => {
    const R = cloneFixture('cherry-pick')
    const log = await gitService.log(R)
    const clean = log.find((c) => c.subject.includes('clean-addition'))
    const conflicting = log.find((c) => c.subject.includes('will CONFLICT'))
    expect(clean && conflicting).toBeTruthy()

    // Clean cherry-pick lands without conflict.
    await gitService.cherryPick(R, clean!.hash)
    expect(existsSync(join(R, 'clean-addition.txt'))).toBe(true)
    expect((await gitService.log(R)).some((c) => c.subject.includes('clean-addition'))).toBe(true)

    // Conflicting cherry-pick (config.json) leaves a cherry-pick in progress.
    await expect(gitService.cherryPick(R, conflicting!.hash)).rejects.toThrow()
    expect(await gitService.mergeState(R)).toBe('cherry-pick')

    const st = await gitService.status(R)
    expect(st.conflicted.map((f) => f.path)).toContain('config.json')

    // Take "theirs" for each conflict, then continue.
    for (const f of st.conflicted) await gitService.conflictTakeSide(R, f.path, 'theirs')
    await gitService.conflictOpContinue(R, 'cherry-pick')
    expect(await gitService.mergeState(R)).toBeNull()
    expect((await gitService.status(R)).conflicted.length).toBe(0)
  })
})

describe('rebase → conflict → abort', () => {
  it('rebasing feature onto main conflicts, then aborts back to feature', async () => {
    const R = cloneFixture('rebase-conflict') // checked out on feature
    expect((await gitService.open(R)).current).toBe('feature')

    await expect(gitService.rebase(R, 'main')).rejects.toThrow()
    expect(await gitService.mergeState(R)).toBe('rebase')

    await gitService.rebaseAbort(R)
    expect(await gitService.mergeState(R)).toBeNull()
    expect((await gitService.open(R)).current).toBe('feature')
  })
})

describe('partial stash apply', () => {
  it('restores only the selected tracked + untracked files', async () => {
    const R = cloneFixture('stash-picking')
    const [s] = await gitService.stashes(R)
    expect(s).toBeTruthy()

    await gitService.stashApplyFiles(R, s.sha, ['alpha.txt'], ['delta-untracked.txt'])

    // alpha.txt restored to its stashed v2; beta.txt left at committed v1.
    expect(readFileSync(join(R, 'alpha.txt'), 'utf8')).toContain('alpha v2')
    expect(readFileSync(join(R, 'beta.txt'), 'utf8')).toContain('beta v1')
    // the untracked file from the stash was materialised.
    expect(existsSync(join(R, 'delta-untracked.txt'))).toBe(true)
    // the stash itself is untouched by a partial apply.
    expect((await gitService.stashes(R)).length).toBe(1)
  })
})

describe('interactive rebase (squash messy history)', () => {
  it('fixups all messy-feature commits into one', async () => {
    const R = cloneFixture('interactive-rebase') // on messy-feature, 6 commits over main
    const steps = await gitService.interactiveRebaseSteps(R, 'main')
    expect(steps.length).toBe(6)

    // Keep the first commit, fold the rest into it.
    const plan = steps.map((s, i) => ({
      action: i === 0 ? 'pick' : 'fixup',
      hash: s.hash,
      subject: s.subject
    }))
    await gitService.runInteractiveRebase(R, 'main', plan as never)

    const log = await gitService.log(R)
    expect(log.length).toBe(2) // initial (on main) + the single squashed commit
    expect(await gitService.mergeState(R)).toBeNull()
  })
})

describe('branch + stage + commit', () => {
  it('creates a branch, stages a file and commits on it', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.createBranch(R, 'test/scratch', undefined, true)
    expect((await gitService.open(R)).current).toBe('test/scratch')

    writeFileSync(join(R, 'scratch.txt'), 'hello from a test\n')
    await gitService.stage(R, ['scratch.txt'])
    const staged = await gitService.status(R)
    expect(staged.staged.map((f) => f.path)).toContain('scratch.txt')

    await gitService.commit(R, 'test: add scratch file')
    const log = await gitService.log(R)
    expect(log[0].subject).toBe('test: add scratch file')
    expect((await gitService.status(R)).staged.length).toBe(0)
  })
})
