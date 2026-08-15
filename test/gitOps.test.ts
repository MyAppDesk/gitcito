import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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

    // "Merging feature into main" + a commit behind each side of the editor.
    const ctx = await gitService.conflictContext(R)
    expect(ctx).not.toBeNull()
    expect(ctx!.kind).toBe('merge')
    expect(ctx!.source).toBe('feature')
    expect(ctx!.target).toBe('main')
    expect(ctx!.ours?.branch).toBe('main')
    expect(ctx!.ours?.sha).toMatch(/^[0-9a-f]{7,}$/)
    expect(ctx!.theirs?.branch).toBe('feature')
    expect(ctx!.theirs?.subject).toContain('feature')

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

    // During a rebase HEAD sits on the target, so ours=main / theirs=replayed commit.
    const ctx = await gitService.conflictContext(R)
    expect(ctx!.kind).toBe('rebase')
    expect(ctx!.source).toBe('feature')
    expect(ctx!.target).toBe('main')
    expect(ctx!.theirs?.sha).toMatch(/^[0-9a-f]{7,}$/)

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

describe('stash apply with colliding untracked files', () => {
  it('plain apply aborts, overwrite variant clobbers the collider and applies', async () => {
    // A pre-existing untracked file blocks a plain apply of an -u stash.
    const collide = cloneFixture('stash-picking')
    writeFileSync(join(collide, 'delta-untracked.txt'), 'local, in the way\n')
    await expect(gitService.stashApply(collide)).rejects.toThrow(/could not restore untracked files/i)

    // On a fresh copy, the overwrite variant deletes the collider and applies.
    const R = cloneFixture('stash-picking')
    writeFileSync(join(R, 'delta-untracked.txt'), 'local, in the way\n')
    await gitService.stashApplyOverwrite(R, 0, false)

    // Tracked change landed and the untracked file now holds the stashed copy.
    expect(readFileSync(join(R, 'alpha.txt'), 'utf8')).toContain('alpha v2')
    expect(readFileSync(join(R, 'delta-untracked.txt'), 'utf8')).toContain('untracked file captured by the stash')
    // apply (keep) leaves the stash in place.
    expect((await gitService.stashes(R)).length).toBe(1)
  })

  it('overwrite with pop drops the stash after applying', async () => {
    const R = cloneFixture('stash-picking')
    writeFileSync(join(R, 'delta-untracked.txt'), 'local, in the way\n')
    await gitService.stashApplyOverwrite(R, 0, true)

    expect(existsSync(join(R, 'delta-untracked.txt'))).toBe(true)
    // pop removes the stash once it applies cleanly.
    expect((await gitService.stashes(R)).length).toBe(0)
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

describe('gitignore + untrack', () => {
  it('adds patterns to .gitignore without duplicating', async () => {
    const R = cloneFixture('bisect-bug')
    writeFileSync(join(R, 'debug.log'), 'noise\n')

    // New untracked file shows up before being ignored.
    expect((await gitService.status(R)).unstaged.some((f) => f.path === 'debug.log')).toBe(true)

    const added = await gitService.addToGitignore(R, ['/debug.log'])
    expect(added).toEqual(['/debug.log'])
    expect(readFileSync(join(R, '.gitignore'), 'utf8')).toContain('/debug.log')

    // Now ignored, so it no longer surfaces as an untracked change.
    expect((await gitService.status(R)).unstaged.some((f) => f.path === 'debug.log')).toBe(false)

    // Re-adding the same pattern is a no-op.
    expect(await gitService.addToGitignore(R, ['/debug.log'])).toEqual([])
  })

  it('stops tracking a file but keeps it on disk', async () => {
    const R = cloneFixture('bisect-bug')
    expect(existsSync(join(R, 'math.js'))).toBe(true)

    await gitService.untrack(R, ['math.js'], false)

    // File remains on disk, but is staged for deletion from the index.
    expect(existsSync(join(R, 'math.js'))).toBe(true)
    expect((await gitService.status(R)).staged.some((f) => f.path === 'math.js' && f.status === 'D')).toBe(true)
  })

  it('deletes a tracked file from Git and disk', async () => {
    const R = cloneFixture('bisect-bug')
    expect(existsSync(join(R, 'tax.js'))).toBe(true)

    await gitService.untrack(R, ['tax.js'], true)

    expect(existsSync(join(R, 'tax.js'))).toBe(false)
    expect((await gitService.status(R)).staged.some((f) => f.path === 'tax.js' && f.status === 'D')).toBe(true)
  })
})


// Drag & drop in the Files tab lands here: fsMove for in-repo drags, fsImport
// for paths dropped from the OS file manager.
describe('project tree drag & drop', () => {
  it('moves a tracked file into a folder as a git rename', async () => {
    const R = cloneFixture('tree-dnd')

    await gitService.fsMove(R, ['src/app.ts'], 'lib')

    expect(existsSync(join(R, 'src/app.ts'))).toBe(false)
    expect(existsSync(join(R, 'lib/app.ts'))).toBe(true)
    // `git mv` stages the rename, so history follows the file.
    const staged = (await gitService.status(R)).staged
    expect(staged.some((f) => f.path === 'lib/app.ts')).toBe(true)
  })

  it('moves an untracked file to the repository root', async () => {
    const R = cloneFixture('tree-dnd')

    await gitService.fsMove(R, ['loose.txt'], 'docs')
    expect(existsSync(join(R, 'docs/loose.txt'))).toBe(true)

    await gitService.fsMove(R, ['docs/loose.txt'], '')
    expect(existsSync(join(R, 'loose.txt'))).toBe(true)
    expect(existsSync(join(R, 'docs/loose.txt'))).toBe(false)
  })

  it('refuses to move a folder into its own descendant', async () => {
    const R = cloneFixture('tree-dnd')
    await expect(gitService.fsMove(R, ['src'], 'src/deep')).rejects.toThrow(/into itself/)
    expect(existsSync(join(R, 'src/deep/nested/keep.ts'))).toBe(true)
  })

  it('refuses to overwrite an existing name', async () => {
    const R = cloneFixture('tree-dnd')
    writeFileSync(join(R, 'helpers.ts'), 'root copy')
    await expect(gitService.fsMove(R, ['helpers.ts'], 'lib')).rejects.toThrow(/Already exists/)
  })

  it('imports an outside path by copying, and an inside path by moving', async () => {
    const R = cloneFixture('tree-dnd')
    const outside = cloneFixture('empty-repo')
    writeFileSync(join(outside, 'dropped.txt'), 'from Finder')

    await gitService.fsImport(R, [join(outside, 'dropped.txt')], 'docs')
    expect(readFileSync(join(R, 'docs/dropped.txt'), 'utf8')).toBe('from Finder')
    expect(existsSync(join(outside, 'dropped.txt'))).toBe(true) // copied, not moved

    // A path already inside the repo is a move — no duplicate left behind.
    await gitService.fsImport(R, [join(R, 'draft.md')], 'lib')
    expect(existsSync(join(R, 'lib/draft.md'))).toBe(true)
    expect(existsSync(join(R, 'draft.md'))).toBe(false)
  })

  it('copies a dropped folder recursively', async () => {
    const R = cloneFixture('tree-dnd')
    const outside = cloneFixture('empty-repo')

    await gitService.fsImport(R, [join(outside, '.git')], 'vendor')
    expect(existsSync(join(R, 'vendor/.git/HEAD'))).toBe(true)
  })
})

// Conflict handling behind the drop dialog: the renderer asks fsExisting first,
// then re-runs the drop with the user's choice.
describe('project tree drop conflicts', () => {
  it('reports which dropped names already exist at the destination', async () => {
    const R = cloneFixture('tree-dnd')
    expect(await gitService.fsExisting(R, 'docs', ['readme.md', 'loose.txt'])).toEqual(['readme.md'])
    expect(await gitService.fsExisting(R, '', ['loose.txt'])).toEqual(['loose.txt'])
  })

  it('replace trashes the existing entry and takes its name', async () => {
    const R = cloneFixture('tree-dnd')
    writeFileSync(join(R, 'readme.md'), 'incoming')

    await gitService.fsMove(R, ['readme.md'], 'docs', 'replace')

    expect(readFileSync(join(R, 'docs/readme.md'), 'utf8')).toBe('incoming')
    expect(existsSync(join(R, 'readme.md'))).toBe(false)
  })

  it('keepBoth lands next to the existing entry under a free name', async () => {
    const R = cloneFixture('tree-dnd')
    writeFileSync(join(R, 'readme.md'), 'incoming')

    await gitService.fsMove(R, ['readme.md'], 'docs', 'keepBoth')

    expect(readFileSync(join(R, 'docs/readme.md'), 'utf8')).toBe('# Docs\n')
    expect(readFileSync(join(R, 'docs/readme 2.md'), 'utf8')).toBe('incoming')

    // A third copy keeps counting up rather than clobbering "readme 2.md".
    writeFileSync(join(R, 'readme.md'), 'third')
    await gitService.fsMove(R, ['readme.md'], 'docs', 'keepBoth')
    expect(readFileSync(join(R, 'docs/readme 3.md'), 'utf8')).toBe('third')
  })

  it('applies the chosen mode to OS imports too', async () => {
    const R = cloneFixture('tree-dnd')
    const outside = cloneFixture('empty-repo')
    writeFileSync(join(outside, 'readme.md'), 'from Finder')

    await gitService.fsImport(R, [join(outside, 'readme.md')], 'docs', 'keepBoth')
    expect(readFileSync(join(R, 'docs/readme 2.md'), 'utf8')).toBe('from Finder')

    await gitService.fsImport(R, [join(outside, 'readme.md')], 'docs', 'replace')
    expect(readFileSync(join(R, 'docs/readme.md'), 'utf8')).toBe('from Finder')
  })
})

describe('clone options (merge-conflict playground as the remote)', () => {
  // A clone needs an empty parent directory to land in; the source is an
  // isolated copy so nothing here can touch the shared playground.
  const parents: string[] = []
  const parentDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-clone-'))
    parents.push(dir)
    return dir
  }
  afterAll(() => {
    for (const dir of parents.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  it('lists the branches a remote advertises', async () => {
    const source = cloneFixture('merge-conflict')
    const names = await gitService.remoteBranches(source)
    expect(names).toContain('main')
    expect(names).toContain('feature')
    // Sorted, and stripped of the refs/heads/ prefix.
    expect(names).toEqual([...names].sort())
    expect(names.every((n) => !n.startsWith('refs/'))).toBe(true)
  })

  it('clones the whole history when no options are given', async () => {
    const source = cloneFixture('merge-conflict')
    const target = await gitService.clone(parentDir(), source, 'full')
    expect((await gitService.log(target)).length).toBeGreaterThan(1)
  })

  it('keeps only the requested number of commits when shallow', async () => {
    const source = cloneFixture('merge-conflict')
    const target = await gitService.clone(parentDir(), source, 'shallow', { depth: 1 })
    expect((await gitService.log(target)).length).toBe(1)
    expect(existsSync(join(target, '.git', 'shallow'))).toBe(true)
  })

  it('checks out the branch it was asked for instead of the default', async () => {
    const source = cloneFixture('merge-conflict')
    const target = await gitService.clone(parentDir(), source, 'onbranch', { branch: 'feature' })
    expect((await gitService.open(target)).current).toBe('feature')
  })

  it('fetches one branch only when asked, and every branch otherwise', async () => {
    const source = cloneFixture('merge-conflict')
    const one = await gitService.clone(parentDir(), source, 'single', { singleBranch: true })
    const all = await gitService.clone(parentDir(), source, 'every', {})
    const remoteCount = async (repo: string): Promise<number> => (await gitService.branches(repo)).remotes.length
    expect(await remoteCount(one)).toBeLessThan(await remoteCount(all))
    // The branch that was checked out is the one that came along.
    expect((await gitService.branches(one)).remotes.some((r) => r.fullName.endsWith('main'))).toBe(true)
  })

  it('refuses to clone over an existing folder', async () => {
    const source = cloneFixture('merge-conflict')
    const parent = parentDir()
    await gitService.clone(parent, source, 'taken')
    await expect(gitService.clone(parent, source, 'taken')).rejects.toThrow(/already exists/)
  })
})
