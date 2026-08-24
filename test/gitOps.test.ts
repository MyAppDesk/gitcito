import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { gitMethodIsRead, gitService } from '../src/main/git'
import { prepareRepoFileActions } from '../src/main/repoFileActions'
import { cloneFixture, cleanupFixtures } from './fixtures'

// Mutation/integration tests: exercise the WRITE paths of gitService (the same
// code Gitcito runs for merge / cherry-pick / rebase / conflict-resolve / stash
// / commit). Each test works on an isolated copy of a playground repo.
afterAll(cleanupFixtures)

describe('repository chat file actions', () => {
  it('applies a prepared edit as an exclusive repository write', async () => {
    const repo = cloneFixture('bisect-bug')
    const prepared = await prepareRepoFileActions(
      repo,
      [
        {
          type: 'edit_file',
          path: 'README.md',
          oldText: '# BugShop',
          newText: '# BugShop updated',
          description: 'Update heading'
        }
      ],
      {
        evidencePaths: new Set(['README.md']),
        completePaths: new Set(['README.md']),
        ignoredPaths: new Set()
      }
    )

    expect(gitMethodIsRead('applyRepoFileActions')).toBe(false)
    expect(await gitService.applyRepoFileActions(repo, prepared)).toEqual({ ok: true, applied: 1 })
    expect(readFileSync(join(repo, 'README.md'), 'utf8')).toContain('# BugShop updated')
    expect((await gitService.status(repo)).unstaged.map((file) => file.path)).toContain('README.md')
  })
})

/** Raw git in a fixture, for assertions the service does not expose. */
const raw = async (repo: string, args: string[]): Promise<string> => {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const { stdout } = await promisify(execFile)('git', ['-C', repo, ...args])
  return stdout
}
const shaOf = async (repo: string, ref: string): Promise<string> => (await raw(repo, ['rev-parse', ref])).trim()

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

describe('restore files from a commit', () => {
  it('overwrites the working copy with the version at the commit, leaving HEAD alone', async () => {
    const R = cloneFixture('stash-picking')
    const head = await shaOf(R, 'HEAD')

    writeFileSync(join(R, 'alpha.txt'), 'local edit\n')
    await gitService.restoreFromCommit(R, head, ['alpha.txt'])

    expect(readFileSync(join(R, 'alpha.txt'), 'utf8')).toContain('alpha v1')
    expect(await shaOf(R, 'HEAD')).toBe(head)
  })

  it('is a no-op with an empty path list', async () => {
    const R = cloneFixture('stash-picking')
    await gitService.restoreFromCommit(R, await shaOf(R, 'HEAD'), [])
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

describe('rename branch', () => {
  it('renames the checked-out branch and stays on it', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.createBranch(R, 'fix', undefined, true)

    await gitService.renameBranch(R, 'fix', 'fix/login-redirect')

    const after = await gitService.branches(R)
    expect(after.current).toBe('fix/login-redirect')
    expect(after.locals.map((b) => b.name)).not.toContain('fix')
  })

  it('renames a branch you are not on, leaving HEAD alone', async () => {
    const R = cloneFixture('bisect-bug')
    const before = (await gitService.branches(R)).current
    await gitService.createBranch(R, 'wip', 'HEAD', false)

    await gitService.renameBranch(R, 'wip', 'feature/checkout')

    const after = await gitService.branches(R)
    expect(after.current).toBe(before)
    expect(after.locals.map((b) => b.name)).toContain('feature/checkout')
  })

  // The undo entry is just the rename applied backwards — worth pinning, since
  // that is what makes the action safe to try.
  it('renames back, which is what undo does', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.createBranch(R, 'typoo', 'HEAD', false)

    await gitService.renameBranch(R, 'typoo', 'typo')
    await gitService.renameBranch(R, 'typo', 'typoo')

    expect((await gitService.branches(R)).locals.map((b) => b.name)).toContain('typoo')
  })

  it('refuses a name that is already taken', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.createBranch(R, 'one', 'HEAD', false)
    await gitService.createBranch(R, 'two', 'HEAD', false)

    await expect(gitService.renameBranch(R, 'one', 'two')).rejects.toThrow()
    expect((await gitService.branches(R)).locals.map((b) => b.name)).toContain('one')
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

describe('git-flow (gitflow playground)', () => {
  it('reads the layout the git flow CLI wrote, and spots the current flow branch', async () => {
    const R = cloneFixture('gitflow')
    // Pin the branch rather than trusting the fixture's: a screenshot run's
    // `prepare` step checks this repo out elsewhere, and a test that depends on
    // where it was left is a test that fails for unrelated reasons.
    await gitService.checkout(R, 'develop')
    const status = await gitService.gitflowStatus(R)
    expect(status.initialized).toBe(true)
    expect(status.config.main).toBe('main')
    expect(status.config.develop).toBe('develop')
    expect(status.config.featurePrefix).toBe('feature/')
    expect(status.config.versionTagPrefix).toBe('v')
    expect(status.hasMain && status.hasDevelop).toBe(true)
    // Sitting on develop, which is not a flow branch.
    expect(status.currentFlow).toBeNull()

    await gitService.checkout(R, 'feature/search')
    expect((await gitService.gitflowStatus(R)).currentFlow).toEqual({ kind: 'feature', name: 'search' })
  })

  it('proposes a layout, and creates develop, for a repo that has never used it', async () => {
    const R = cloneFixture('merge-conflict')
    const before = await gitService.gitflowStatus(R)
    expect(before.initialized).toBe(false)
    // The proposal matches what is already there rather than a fixed guess.
    expect(before.config.main).toBe('main')
    expect(before.hasDevelop).toBe(false)

    await gitService.gitflowInit(R, before.config)
    const after = await gitService.gitflowStatus(R)
    expect(after.initialized).toBe(true)
    expect(after.hasDevelop).toBe(true)
  })

  it('starts a feature off develop and a hotfix off main', async () => {
    const R = cloneFixture('gitflow')
    const feature = await gitService.gitflowStart(R, 'feature', 'login')
    expect(feature).toBe('feature/login')
    expect((await gitService.open(R)).current).toBe('feature/login')
    // Branched off develop, so it starts exactly at develop's tip.
    expect(await shaOf(R, 'feature/login')).toBe(await shaOf(R, 'develop'))

    await gitService.checkout(R, 'main')
    const hotfix = await gitService.gitflowStart(R, 'hotfix', '1.0.1')
    expect(hotfix).toBe('hotfix/1.0.1')
    expect(await shaOf(R, 'hotfix/1.0.1')).toBe(await shaOf(R, 'main'))
  })

  it('refuses a name that already exists, and an empty one', async () => {
    const R = cloneFixture('gitflow')
    await expect(gitService.gitflowStart(R, 'feature', 'search')).rejects.toThrow(/already exists/)
    await expect(gitService.gitflowStart(R, 'feature', '  ')).rejects.toThrow()
  })

  it('finishes a feature into develop only, with a merge commit, and deletes the branch', async () => {
    const R = cloneFixture('gitflow')
    const mainBefore = await shaOf(R, 'main')
    const snapshot = await gitService.gitflowFinish(R, 'feature', 'search')

    expect((await gitService.open(R)).current).toBe('develop')
    expect(await shaOf(R, 'main')).toBe(mainBefore) // main is untouched by a feature
    expect(snapshot.tag).toBeNull()
    // --no-ff, so the merge is visible: develop's tip has two parents.
    const parents = (await raw(R, ['rev-list', '--parents', '-n', '1', 'develop'])).trim().split(' ')
    expect(parents.length).toBe(3)
    expect((await gitService.branches(R)).locals.map((b) => b.name)).not.toContain('feature/search')
  })

  it('finishes a release into main and develop, and tags it', async () => {
    const R = cloneFixture('gitflow')
    const snapshot = await gitService.gitflowFinish(R, 'release', '1.1.0')

    expect(snapshot.tag).toBe('v1.1.0')
    expect((await gitService.commitTags(R, await shaOf(R, 'main'))).map((t) => t.name ?? t)).toContain('v1.1.0')
    // Both branches moved, and both contain the release commit.
    for (const branch of ['main', 'develop']) {
      expect(await raw(R, ['branch', '--contains', snapshot.branch.sha, branch])).toContain(branch)
    }
  })

  it('puts every ref back when a finish is undone', async () => {
    const R = cloneFixture('gitflow')
    const before = { main: await shaOf(R, 'main'), develop: await shaOf(R, 'develop') }
    const snapshot = await gitService.gitflowFinish(R, 'release', '1.1.0')

    await gitService.gitflowUndo(R, snapshot)
    expect(await shaOf(R, 'main')).toBe(before.main)
    expect(await shaOf(R, 'develop')).toBe(before.develop)
    expect((await gitService.branches(R)).locals.map((b) => b.name)).toContain('release/1.1.0')
    expect((await gitService.branches(R)).tags.map((t) => t.name)).not.toContain('v1.1.0')
  })

  it('refuses to finish with a dirty working tree, changing nothing', async () => {
    const R = cloneFixture('gitflow')
    writeFileSync(join(R, 'app.js'), 'dirty\n')
    const before = await shaOf(R, 'develop')
    await expect(gitService.gitflowFinish(R, 'feature', 'search')).rejects.toThrow(/stash/)
    expect(await shaOf(R, 'develop')).toBe(before)
  })
})

describe('removing a path from history (leaked-secret playground)', () => {
  const SECRET = 'config/credentials.env'

  /** A clone that still holds the secret. Fails loudly if the shared fixture was
   *  ever mutated, rather than letting later assertions fail confusingly. */
  const freshClone = async (): Promise<string> => {
    const R = cloneFixture('leaked-secret')
    expect(await raw(R, ['log', '--branches', '--tags', '--oneline', '--', SECRET])).not.toBe('')
    expect(await raw(R, ['for-each-ref', '--format=%(refname)', 'refs/gitcito/pre-purge'])).toBe('')
    return R
  }

  it('measures the damage before anything is rewritten', async () => {
    const R = await freshClone()
    const preview = await gitService.historyPurgePreview(R, [SECRET])
    // Added, rotated, deleted — three commits touch it.
    expect(preview.commits).toBe(3)
    expect(preview.firstCommit?.subject).toBe('chore: add service credentials')
    expect(preview.branches).toEqual(expect.arrayContaining(['main', 'feature/reporting']))
    expect(preview.tags).toContain('v1.0.0')
    expect(preview.bytes).toBeGreaterThan(0)
    expect(preview.blocked).toBe('')
  })

  it('refuses while the working tree is dirty, and says why', async () => {
    const R = await freshClone()
    writeFileSync(join(R, 'app.js'), 'dirty\n')
    expect((await gitService.historyPurgePreview(R, [SECRET])).blocked).toMatch(/stash/i)
    await expect(gitService.historyPurge(R, [SECRET])).rejects.toThrow(/stash/i)
  })

  it('refuses a path no commit ever touched, rather than rewriting for nothing', async () => {
    const R = await freshClone()
    await expect(gitService.historyPurge(R, ['does/not/exist.env'])).rejects.toThrow(/nothing to rewrite/i)
  })

  it('removes the blob from every commit, on every branch and tag', async () => {
    const R = await freshClone()
    const result = await gitService.historyPurge(R, [SECRET])
    expect(result.rewritten).toBeGreaterThan(0)

    // No branch or tag mentions the path any more. (`--all` would still find it
    // through the backup refs, which is exactly what they are for.)
    expect(await raw(R, ['log', '--branches', '--tags', '--oneline', '--', SECRET])).toBe('')
    // And the content is unreachable from the rewritten refs.
    for (const ref of ['main', 'feature/reporting', 'v1.0.0']) {
      await expect(raw(R, ['cat-file', '-e', `${ref}:${SECRET}`])).rejects.toThrow()
    }
    // The rest of the history survived.
    expect(await raw(R, ['log', '--oneline', 'main'])).toContain('feat: bump app')
  })

  it('keeps a backup of every ref, outside the range the rewrite touches', async () => {
    const R = await freshClone()
    const before = await shaOf(R, 'main')
    const { backup } = await gitService.historyPurge(R, [SECRET])

    expect(backup.paths).toEqual([SECRET])
    expect(backup.refs).toBeGreaterThan(0)
    // The backup still points at the original commits, secret and all.
    expect(await shaOf(R, `${backup.prefix}/heads/main`)).toBe(before)
    expect(await raw(R, ['log', '--oneline', `${backup.prefix}/heads/main`, '--', SECRET])).not.toBe('')

    const backups = await gitService.historyPurgeBackups(R)
    expect(backups.map((b) => b.prefix)).toContain(backup.prefix)
    expect(backups[0].paths).toEqual([SECRET])
  })

  it('puts every branch and tag back when the purge is undone', async () => {
    const R = await freshClone()
    const before = {
      main: await shaOf(R, 'main'),
      feature: await shaOf(R, 'feature/reporting')
    }
    const { backup } = await gitService.historyPurge(R, [SECRET])
    expect(await shaOf(R, 'main')).not.toBe(before.main)

    await gitService.historyPurgeRestore(R, backup.prefix)
    expect(await shaOf(R, 'main')).toBe(before.main)
    expect(await shaOf(R, 'feature/reporting')).toBe(before.feature)
    // The file is back in history, which is the whole point of a restore.
    expect(await raw(R, ['log', '--all', '--oneline', '--', SECRET])).not.toBe('')
  })

  it('makes the purge permanent only when the backup is dropped', async () => {
    const R = await freshClone()
    const { backup } = await gitService.historyPurge(R, [SECRET])
    // Until then the old history is still reachable — that is the trade the
    // backup makes, and the reason space is not reclaimed yet.
    expect(await raw(R, ['log', '--all', '--oneline', '--', SECRET])).not.toBe('')

    await gitService.historyPurgeDropBackup(R, backup.prefix)
    expect(await gitService.historyPurgeBackups(R)).toEqual([])
    expect(await raw(R, ['for-each-ref', '--format=%(refname)', 'refs/gitcito/pre-purge'])).toBe('')
    expect(await raw(R, ['log', '--all', '--oneline', '--', SECRET])).toBe('')
  })

  it('will not restore or drop something that is not a purge backup', async () => {
    const R = await freshClone()
    await expect(gitService.historyPurgeRestore(R, 'refs/heads/main')).rejects.toThrow(/not a purge backup/i)
    await expect(gitService.historyPurgeDropBackup(R, 'refs/heads/main')).rejects.toThrow(/not a purge backup/i)
  })
})

describe('history path picker (leaked-secret playground)', () => {
  it('lists paths that no longer exist in the working tree', async () => {
    const R = cloneFixture('leaked-secret')
    const entries = await gitService.historyPaths(R)
    const secret = entries.find((e) => e.path === 'config/credentials.env')
    // The whole point: a file dialog could not offer this one.
    expect(secret).toBeDefined()
    expect(secret!.deleted).toBe(true)
    // Added once, rotated once — two distinct blobs.
    expect(secret!.versions).toBe(2)
    expect(secret!.bytes).toBeGreaterThan(0)
  })

  it('marks files that are still tracked as not deleted', async () => {
    const R = cloneFixture('leaked-secret')
    const entries = await gitService.historyPaths(R)
    expect(entries.find((e) => e.path === 'app.js')?.deleted).toBe(false)
  })

  it('orders by weight, so the reason a clone is huge is at the top', async () => {
    const R = cloneFixture('leaked-secret')
    const bytes = (await gitService.historyPaths(R)).map((e) => e.bytes)
    expect(bytes).toEqual([...bytes].sort((a, b) => b - a))
  })

  it('honours the cap rather than returning a whole monorepo', async () => {
    const R = cloneFixture('leaked-secret')
    expect((await gitService.historyPaths(R, 2)).length).toBe(2)
  })
})

describe('pushing to several remotes (multi-remote playground)', () => {
  /** The fixture's remotes point at shared bare repos; a push test has to own
   *  its own copies of those too, or it rewrites the playground for everyone. */
  const isolatedClone = async (): Promise<{ repo: string; origin: string; upstream: string }> => {
    const repo = cloneFixture('multi-remote')
    const origin = cloneFixture('multi-remote-origin.git')
    const upstream = cloneFixture('multi-remote-upstream.git')
    await raw(repo, ['remote', 'set-url', 'origin', origin])
    await raw(repo, ['remote', 'set-url', 'upstream', upstream])
    return { repo, origin, upstream }
  }

  const headOf = async (bare: string, branch: string): Promise<string> =>
    (await raw(bare, ['rev-parse', branch])).trim()

  /** A branch neither remote has yet — the fixture's `upstream` is deliberately
   *  ahead of `main`, so pushing that would be a real non-fast-forward. */
  const newBranch = async (repo: string): Promise<string> => {
    await raw(repo, ['checkout', '-b', 'feature/push-test'])
    return 'feature/push-test'
  }

  it('pushes one branch to every remote asked for', async () => {
    const { repo, origin, upstream } = await isolatedClone()
    const branch = await newBranch(repo)
    const local = await shaOf(repo, branch)

    const results = await gitService.pushToRemotes(repo, branch, ['origin', 'upstream'])
    expect(results.map((r) => r.remote)).toEqual(['origin', 'upstream'])
    expect(results.every((r) => r.ok)).toBe(true)
    expect(await headOf(origin, branch)).toBe(local)
    expect(await headOf(upstream, branch)).toBe(local)
  })

  it('keeps going when one remote rejects, and says which', async () => {
    const { repo, origin } = await isolatedClone()
    await raw(repo, ['remote', 'set-url', 'upstream', '/nowhere/at/all.git'])
    const branch = await newBranch(repo)
    const local = await shaOf(repo, branch)

    const results = await gitService.pushToRemotes(repo, branch, ['origin', 'upstream'])
    expect(results.find((r) => r.remote === 'origin')?.ok).toBe(true)
    const failed = results.find((r) => r.remote === 'upstream')
    expect(failed?.ok).toBe(false)
    expect(failed?.error).not.toBe('')
    // The working remote still got the branch — that is the whole point.
    expect(await headOf(origin, branch)).toBe(local)
  })

  it('sets the upstream from the first remote only', async () => {
    const { repo } = await isolatedClone()
    const branch = await newBranch(repo)
    await gitService.pushToRemotes(repo, branch, ['upstream', 'origin'])
    expect((await raw(repo, ['rev-parse', '--abbrev-ref', `${branch}@{upstream}`])).trim()).toBe(`upstream/${branch}`)
  })

  it('refuses an empty remote list rather than guessing', async () => {
    const { repo } = await isolatedClone()
    await expect(gitService.pushToRemotes(repo, 'main', [])).rejects.toThrow(/at least one remote/i)
    await expect(gitService.pushToRemotes(repo, 'main', ['  '])).rejects.toThrow(/at least one remote/i)
  })

  it('publishes every local tag, annotated and lightweight alike', async () => {
    const { repo, origin } = await isolatedClone()
    await raw(repo, ['tag', 'v9.9.9-light'])
    await raw(repo, ['tag', '-a', 'v9.9.9', '-m', 'Release'])

    await gitService.pushAllTags(repo, 'origin')
    const tags = await raw(origin, ['tag', '--list'])
    expect(tags).toContain('v9.9.9')
    expect(tags).toContain('v9.9.9-light')
  })
})

describe('commit notes (cherry-pick playground)', () => {
  const headSha = async (repo: string): Promise<string> => shaOf(repo, 'HEAD')

  it('reports no note for a commit that has none', async () => {
    const R = cloneFixture('cherry-pick')
    expect(await gitService.note(R, await headSha(R))).toBe('')
    expect(await gitService.notedCommits(R)).toEqual([])
  })

  it('writes a note and reads it back verbatim, newlines and all', async () => {
    const R = cloneFixture('cherry-pick')
    const sha = await headSha(R)
    const text = 'Reviewed by Ana.\n\nShipped in build 412 — see the incident doc.'
    await gitService.setNote(R, sha, text)
    expect(await gitService.note(R, sha)).toBe(text)
    // git's own reader agrees, so the note is a real note and not our invention.
    expect(await raw(R, ['log', '-1', '--format=%N', sha])).toContain('build 412')
  })

  it('overwrites rather than appending when a note already exists', async () => {
    const R = cloneFixture('cherry-pick')
    const sha = await headSha(R)
    await gitService.setNote(R, sha, 'first')
    await gitService.setNote(R, sha, 'second')
    expect(await gitService.note(R, sha)).toBe('second')
  })

  it('lists exactly the commits that carry a note', async () => {
    const R = cloneFixture('cherry-pick')
    const sha = await headSha(R)
    await gitService.setNote(R, sha, 'noted')
    expect(await gitService.notedCommits(R)).toEqual([sha])
  })

  it('treats an empty note as a removal, not as an empty note', async () => {
    const R = cloneFixture('cherry-pick')
    const sha = await headSha(R)
    await gitService.setNote(R, sha, 'temporary')
    await gitService.setNote(R, sha, '   ')
    expect(await gitService.note(R, sha)).toBe('')
    expect(await gitService.notedCommits(R)).toEqual([])
  })

  it('removes a note, and removing a missing one is not an error', async () => {
    const R = cloneFixture('cherry-pick')
    const sha = await headSha(R)
    await gitService.setNote(R, sha, 'gone soon')
    await gitService.removeNote(R, sha)
    expect(await gitService.note(R, sha)).toBe('')
    await expect(gitService.removeNote(R, sha)).resolves.toBeUndefined()
  })

  it('leaves the commit itself untouched — that is the point of a note', async () => {
    const R = cloneFixture('cherry-pick')
    const sha = await headSha(R)
    await gitService.setNote(R, sha, 'annotation')
    expect(await headSha(R)).toBe(sha)
  })
})

describe('subtrees (subtree playground)', () => {
  const PREFIX = 'vendor/parser'

  it('finds a subtree from the trailer git leaves in history', async () => {
    const R = cloneFixture('subtree')
    const found = await gitService.subtrees(R)
    const parser = found.find((s) => s.prefix === PREFIX)
    expect(parser).toBeDefined()
    expect(parser!.present).toBe(true)
    // The import commit records which upstream commit it came from.
    expect(parser!.lastSplit).toMatch(/^[0-9a-f]{7,}$/)
    // Nothing records the url — that is the gap Gitcito fills.
    expect(parser!.url).toBe('')
  })

  it('remembers the source after an add, since git does not', async () => {
    const R = cloneFixture('subtree')
    const lib = cloneFixture('subtree-lib.git')
    await gitService.subtreeAdd(R, 'vendor/second', lib, 'main')

    const added = (await gitService.subtrees(R)).find((s) => s.prefix === 'vendor/second')
    expect(added?.url).toBe(lib)
    expect(added?.ref).toBe('main')
    expect(existsSync(join(R, 'vendor/second/parser.js'))).toBe(true)
  })

  it('refuses to add onto a path that already exists', async () => {
    const R = cloneFixture('subtree')
    const lib = cloneFixture('subtree-lib.git')
    await expect(gitService.subtreeAdd(R, PREFIX, lib, 'main')).rejects.toThrow(/already exists/i)
  })

  it('refuses an add missing any of prefix, repository or ref', async () => {
    const R = cloneFixture('subtree')
    await expect(gitService.subtreeAdd(R, '', 'x', 'main')).rejects.toThrow(/required/i)
    await expect(gitService.subtreeAdd(R, 'vendor/x', '', 'main')).rejects.toThrow(/required/i)
    await expect(gitService.subtreeAdd(R, 'vendor/x', 'x', '')).rejects.toThrow(/required/i)
  })

  it('pulls upstream changes into the vendored directory', async () => {
    const R = cloneFixture('subtree')
    const lib = cloneFixture('subtree-lib.git')
    // Move the library on: a clone of the bare repo, a commit, a push back.
    const work = mkdtempSync(join(tmpdir(), 'gitcito-lib-work-'))
    await raw(work, ['clone', lib, 'w'])
    const w = join(work, 'w')
    writeFileSync(join(w, 'parser.js'), 'exports.parse = () => 42\n')
    await raw(w, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-am', 'feat: upstream change'])
    await raw(w, ['push', 'origin', 'main'])

    await gitService.subtreePull(R, PREFIX, lib, 'main')
    expect(readFileSync(join(R, PREFIX, 'parser.js'), 'utf-8')).toContain('42')
    rmSync(work, { recursive: true, force: true })
  })

  it('splits the vendored directory back into a branch of its own', async () => {
    const R = cloneFixture('subtree')
    await gitService.subtreeSplit(R, PREFIX, 'parser-only')
    // The split branch holds the library's files at its root, not under the prefix.
    expect(await raw(R, ['ls-tree', '--name-only', 'parser-only'])).toContain('parser.js')
    expect(await raw(R, ['ls-tree', '--name-only', 'parser-only'])).not.toContain('app.js')
  })

  it('refuses a pull or push with no repository to talk to', async () => {
    const R = cloneFixture('subtree')
    await expect(gitService.subtreePull(R, PREFIX, '', 'main')).rejects.toThrow(/no remembered repository/i)
    await expect(gitService.subtreePush(R, PREFIX, '', 'main')).rejects.toThrow(/no remembered repository/i)
  })

  it('forgets the remembered source without touching the files', async () => {
    const R = cloneFixture('subtree')
    const lib = cloneFixture('subtree-lib.git')
    await gitService.subtreeAdd(R, 'vendor/third', lib, 'main')
    await gitService.subtreeForget(R, 'vendor/third')

    const entry = (await gitService.subtrees(R)).find((s) => s.prefix === 'vendor/third')
    // Still discovered from history, just no longer remembered.
    expect(entry?.url).toBe('')
    expect(existsSync(join(R, 'vendor/third/parser.js'))).toBe(true)
  })
})

describe('rerere (merge-conflict playground)', () => {
  it('reports the memory off by default, with nothing recorded', async () => {
    // cloneFixture already pins rerere off and clears any inherited cache.
    const R = cloneFixture('merge-conflict')
    const status = await gitService.rerereStatus(R)
    expect(status.enabled).toBe(false)
    expect(status.recorded).toBe(0)
    expect(status.replayed).toEqual([])
  })

  it('turns on per repository without touching the global setting', async () => {
    const R = cloneFixture('merge-conflict')
    await gitService.setRerere(R, { enabled: true, autoUpdate: true }, 'repo')
    const status = await gitService.rerereStatus(R)
    expect(status.enabled).toBe(true)
    expect(status.autoUpdate).toBe(true)
    expect(status.perRepo).toBe(true)
    expect((await raw(R, ['config', '--local', '--get', 'rerere.enabled'])).trim()).toBe('true')
  })

  it('replays a resolution the second time the same conflict appears', async () => {
    const R = cloneFixture('merge-conflict')
    await gitService.setRerere(R, { enabled: true }, 'repo')

    // First encounter: conflict, resolve by hand, commit.
    await expect(gitService.merge(R, 'feature')).rejects.toThrow()
    const conflicted = (await gitService.status(R)).conflicted.map((f) => f.path)
    expect(conflicted.length).toBeGreaterThan(0)
    // Every conflicted file has to be settled, or the commit below refuses.
    for (const file of conflicted) await gitService.resolveConflict(R, file, 'resolved by hand\n')
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '--no-edit'])
    expect((await gitService.rerereStatus(R)).recorded).toBeGreaterThan(0)

    // Rewind and hit the very same conflict again.
    await raw(R, ['reset', '--hard', 'HEAD~1'])
    await expect(gitService.merge(R, 'feature')).rejects.toThrow()

    // git replayed what it had memorised, and says so.
    const replayed = (await gitService.rerereStatus(R)).replayed
    expect(replayed.length).toBeGreaterThan(0)
    expect(readFileSync(join(R, replayed[0]), 'utf-8')).toBe('resolved by hand\n')
  })

  it('forgets one file’s resolution, so the conflict comes back raw', async () => {
    const R = cloneFixture('merge-conflict')
    await gitService.setRerere(R, { enabled: true }, 'repo')
    await expect(gitService.merge(R, 'feature')).rejects.toThrow()
    const conflicted = (await gitService.status(R)).conflicted.map((f) => f.path)
    // Only files rerere took a preimage of can be forgotten later.
    const tracked = (await raw(R, ['rerere', 'status'])).split('\n').map((l) => l.trim()).filter(Boolean)
    expect(tracked.length).toBeGreaterThan(0)
    const file = tracked[0]
    for (const each of conflicted) await gitService.resolveConflict(R, each, 'first answer\n')
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '--no-edit'])

    await raw(R, ['reset', '--hard', 'HEAD~1'])
    await expect(gitService.merge(R, 'feature')).rejects.toThrow()
    await gitService.rerereForget(R, file)
    // Forgetting restores the conflict markers for that file.
    expect(readFileSync(join(R, file), 'utf-8')).toContain('<<<<<<<')
  })

  it('clears the whole memory without touching the working tree', async () => {
    const R = cloneFixture('merge-conflict')
    await gitService.setRerere(R, { enabled: true }, 'repo')
    await expect(gitService.merge(R, 'feature')).rejects.toThrow()
    const conflicted = (await gitService.status(R)).conflicted.map((f) => f.path)
    const file = conflicted[0]
    for (const each of conflicted) await gitService.resolveConflict(R, each, 'answer\n')
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '--no-edit'])
    expect((await gitService.rerereStatus(R)).recorded).toBeGreaterThan(0)

    await gitService.rerereClear(R)
    expect((await gitService.rerereStatus(R)).recorded).toBe(0)
    expect(existsSync(join(R, file))).toBe(true)
  })
})

describe('remove untracked files (git clean)', () => {
  const find = (entries: { path: string }[], path: string): { path: string } | undefined =>
    entries.find((e) => e.path === path)

  it('previews untracked and ignored paths apart, collapsing whole directories', async () => {
    const R = cloneFixture('untracked-mess')
    const { entries, truncated } = await gitService.cleanPreview(R)
    expect(truncated).toBe(false)

    const untracked = entries.filter((e) => !e.ignored).map((e) => e.path)
    const ignored = entries.filter((e) => e.ignored).map((e) => e.path)
    expect(untracked).toContain('notes.md')
    // A wholly untracked directory is one entry, not one per file inside it.
    expect(untracked).toContain('tmp/')
    expect(untracked).not.toContain('tmp/scratch.txt')
    expect(ignored).toContain('.env')
    expect(ignored).toContain('dist/')
    // Ignored paths never leak into the untracked list — they are the ones the
    // UI leaves unselected.
    expect(untracked).not.toContain('.env')

    // A directory is sized by what it holds, and the nested repo is flagged.
    expect(find(entries, 'tmp/')!.bytes).toBeGreaterThan(0)
    expect(entries.find((e) => e.path === 'experiment/')!.nested).toBe(true)
    expect(entries.find((e) => e.path === 'notes.md')!.kind).toBe('file')
  })

  it('removes only the chosen paths and leaves ignored ones alone', async () => {
    const R = cloneFixture('untracked-mess')
    const result = await gitService.clean(R, ['notes.md', 'tmp/'], false)
    expect(result.removed).toBe(2)
    expect(result.bytes).toBeGreaterThan(0)
    expect(result.trashed).toBe(false)

    expect(existsSync(join(R, 'notes.md'))).toBe(false)
    expect(existsSync(join(R, 'tmp'))).toBe(false)
    expect(existsSync(join(R, '.env'))).toBe(true)
    expect(existsSync(join(R, 'dist'))).toBe(true)
    // Tracked files are untouched, and the repo is otherwise as it was.
    expect(existsSync(join(R, 'src/app.js'))).toBe(true)
  })

  it('removes an ignored path when it is explicitly chosen', async () => {
    const R = cloneFixture('untracked-mess')
    await gitService.clean(R, ['dist/'], false)
    expect(existsSync(join(R, 'dist'))).toBe(false)
    expect(existsSync(join(R, 'node_modules'))).toBe(true)
  })

  it('refuses a tracked path and anything outside the repository', async () => {
    const R = cloneFixture('untracked-mess')
    await expect(gitService.clean(R, ['src/app.js'], true)).rejects.toThrow(/untracked/i)
    await expect(gitService.clean(R, ['../escape.txt'], true)).rejects.toThrow(/untracked/i)
    expect(existsSync(join(R, 'src/app.js'))).toBe(true)
  })

  it('reports the nested repository git skips, and takes it via the trash', async () => {
    const R = cloneFixture('untracked-mess')
    await expect(gitService.clean(R, ['experiment/'], false)).rejects.toThrow(/nested repository/i)
    expect(existsSync(join(R, 'experiment'))).toBe(true)

    // The trash route does not go through git, so it has no such limit.
    const result = await gitService.clean(R, ['experiment/'], true)
    expect(result.trashed).toBe(true)
    expect(existsSync(join(R, 'experiment'))).toBe(false)
  })
})

describe('bundles and archives', () => {
  /** Paths inside a tarball — enough to assert what an archive did and did not take. */
  const tarEntries = async (file: string): Promise<string[]> => {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const { stdout } = await promisify(execFile)('tar', ['-tf', file])
    return stdout.split('\n').map((l) => l.trim()).filter(Boolean)
  }

  it('bundles the whole repository, and another repo can fetch from the file', async () => {
    const R = cloneFixture('tags-and-releases')
    const out = join(mkdtempSync(join(tmpdir(), 'gitcito-bundle-')), 'all.bundle')
    const result = await gitService.bundleCreate(R, out, { kind: 'all' })
    expect(existsSync(out)).toBe(true)
    expect(result.bytes).toBeGreaterThan(0)
    // main, a hotfix branch and five tags all travel in one file.
    expect(result.refs).toBeGreaterThan(5)

    const info = await gitService.bundleInspect(R, out)
    expect(info.usable).toBe(true)
    expect(info.prerequisites).toEqual([])
    expect(info.refs.map((r) => r.name)).toContain('refs/heads/main')

    // The receiving side: refs land under bundle/, local branches untouched.
    const target = cloneFixture('tags-and-releases')
    await raw(target, ['reset', '--hard', 'HEAD~2'])
    const before = await shaOf(target, 'main')
    const created = await gitService.bundleFetch(target, out, ['refs/heads/main'])
    expect(created).toEqual(['bundle/main'])
    expect(await shaOf(target, 'refs/remotes/bundle/main')).toBe(await shaOf(R, 'main'))
    expect(await shaOf(target, 'main')).toBe(before)
  })

  it('bundles a range, and says so when the other side lacks its starting point', async () => {
    const R = cloneFixture('tags-and-releases')
    const out = join(mkdtempSync(join(tmpdir(), 'gitcito-bundle-')), 'range.bundle')
    await gitService.bundleCreate(R, out, { kind: 'range', from: 'HEAD~2', to: 'main' })

    // In the repository it came from, everything it builds on is present.
    expect((await gitService.bundleInspect(R, out)).usable).toBe(true)

    // In an unrelated repository it is unusable, and says which commits are missing.
    const stranger = cloneFixture('bisect-bug')
    const info = await gitService.bundleInspect(stranger, out)
    expect(info.usable).toBe(false)
    expect(info.prerequisites.length).toBeGreaterThan(0)
    expect(info.message).toMatch(/prerequisite/i)
  })

  it('refuses to create an empty bundle rather than writing a useless file', async () => {
    const R = cloneFixture('tags-and-releases')
    const out = join(mkdtempSync(join(tmpdir(), 'gitcito-bundle-')), 'empty.bundle')
    await expect(gitService.bundleCreate(R, out, { kind: 'range', from: 'main', to: 'main' })).rejects.toThrow()
  })

  it('archives one tree, wrapped in a prefix, honouring export-ignore', async () => {
    const R = cloneFixture('tags-and-releases')
    writeFileSync(join(R, '.gitattributes'), 'plugins.py export-ignore\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'add export-ignore'])

    const out = join(mkdtempSync(join(tmpdir(), 'gitcito-archive-')), 'src.tar')
    const result = await gitService.archiveCreate(R, out, 'main', 'tar', 'demo-1.0', '')
    expect(result.bytes).toBeGreaterThan(0)

    const entries = await tarEntries(out)
    expect(entries).toContain('demo-1.0/app.py')
    // export-ignore is the whole point: the path is in the commit, not in the file.
    expect(entries.some((e) => e.endsWith('plugins.py'))).toBe(false)
  })

  it('archives a single subdirectory when asked for one', async () => {
    const R = cloneFixture('deep-history-monorepo')
    const dirs = (await raw(R, ['ls-tree', '--name-only', '-d', 'HEAD'])).split('\n').filter(Boolean)
    const dir = dirs[0]
    const out = join(mkdtempSync(join(tmpdir(), 'gitcito-archive-')), 'part.tar')
    await gitService.archiveCreate(R, out, 'HEAD', 'tar', '', dir)

    const entries = await tarEntries(out)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.every((e) => e.startsWith(dir))).toBe(true)
  })
})

describe('repository maintenance', () => {
  it('reports where the disk went, and packs the loose objects away', async () => {
    const R = cloneFixture('deep-history-monorepo')
    // A fresh loose object, so there is something for gc to pack.
    writeFileSync(join(R, 'loose.txt'), 'written after the clone\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'loose object'])

    const before = await gitService.maintenanceStats(R)
    expect(before.gitBytes).toBeGreaterThan(0)
    expect(before.looseObjects).toBeGreaterThan(0)
    expect(before.scheduled).toBe(false)

    const result = await gitService.maintenanceRun(R, 'gc')
    expect(result.before).toBeGreaterThan(0)

    const after = await gitService.maintenanceStats(R)
    expect(after.looseObjects).toBeLessThan(before.looseObjects)
    expect(after.packedObjects).toBeGreaterThan(0)
    expect(after.lastPack).toBeTruthy()
  })

  it('counts unreachable objects, and prune is what actually drops them', async () => {
    const R = cloneFixture('bisect-bug')
    writeFileSync(join(R, 'doomed.txt'), 'this commit is about to be abandoned\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'doomed'])
    const doomed = await shaOf(R, 'HEAD')
    await raw(R, ['reset', '--hard', 'HEAD~1'])

    // The reflog still points at it, so it is not unreachable yet — which is
    // exactly the two-week safety net gc keeps.
    expect((await gitService.maintenanceStats(R)).prunable).toBe(0)

    await raw(R, ['reflog', 'expire', '--expire=now', '--all'])
    const stats = await gitService.maintenanceStats(R)
    expect(stats.prunable).toBeGreaterThan(0)
    expect(stats.prunableBytes).toBeGreaterThan(0)

    await gitService.maintenanceRun(R, 'prune')
    // The object is gone for good; a plain gc would have kept it two weeks.
    await expect(raw(R, ['cat-file', '-e', doomed])).rejects.toThrow()
    expect((await gitService.maintenanceStats(R)).prunable).toBe(0)
  })

  it('fsck passes on a healthy repository and counts dangling objects as normal', async () => {
    const R = cloneFixture('bisect-bug')
    writeFileSync(join(R, 'orphan.txt'), 'dropped\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'orphan'])
    await raw(R, ['reset', '--hard', 'HEAD~1'])
    await raw(R, ['reflog', 'expire', '--expire=now', '--all'])

    const report = await gitService.fsck(R)
    expect(report.ok).toBe(true)
    expect(report.missing).toBe(0)
    expect(report.dangling).toBeGreaterThan(0)
  })

  it('rebuilds the commit graph without changing what git reports', async () => {
    const R = cloneFixture('deep-history-monorepo')
    const head = await shaOf(R, 'HEAD')
    await gitService.maintenanceRun(R, 'commitGraph')
    expect(existsSync(join(R, '.git/objects/info/commit-graph'))).toBe(true)
    expect(await shaOf(R, 'HEAD')).toBe(head)
  })
})

describe('advanced merge options', () => {
  /** A repo with one file conflicting on content alone — what -X can decide. */
  const contentConflict = async (): Promise<{ repo: string; file: string }> => {
    const repo = cloneFixture('bisect-bug')
    const file = 'shared.txt'
    writeFileSync(join(repo, file), 'alpha\nbeta\ngamma\n')
    await raw(repo, ['add', '-A'])
    await raw(repo, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'base'])
    const base = await shaOf(repo, 'HEAD')

    await raw(repo, ['checkout', '-b', 'incoming'])
    writeFileSync(join(repo, file), 'alpha\ntheir beta\ngamma\n')
    await raw(repo, ['add', '-A'])
    await raw(repo, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'their edit'])

    await raw(repo, ['checkout', '-b', 'mine', base])
    writeFileSync(join(repo, file), 'alpha\nour beta\ngamma\n')
    await raw(repo, ['add', '-A'])
    await raw(repo, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'our edit'])
    return { repo, file }
  }

  /** A branch that merges cleanly, for the options that are not about conflicts. */
  const cleanBranch = async (): Promise<string> => {
    const repo = cloneFixture('bisect-bug')
    await raw(repo, ['checkout', '-b', 'addition'])
    writeFileSync(join(repo, 'added.txt'), 'a file nothing else touches\n')
    await raw(repo, ['add', '-A'])
    await raw(repo, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'add a file'])
    await raw(repo, ['checkout', '-'])
    // Move this side on too, so the merge is a real merge rather than a
    // fast-forward — which no amount of --no-commit would stop.
    writeFileSync(join(repo, 'here.txt'), 'moved on over here\n')
    await raw(repo, ['add', '-A'])
    await raw(repo, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'move on'])
    return repo
  }

  it('-X ours resolves the clashing hunks in favour of the current branch', async () => {
    const { repo, file } = await contentConflict()
    // Without it, the same merge stops on the clash.
    await expect(gitService.merge(repo, 'incoming')).rejects.toThrow()
    await raw(repo, ['merge', '--abort'])

    await gitService.merge(repo, 'incoming', { favour: 'ours' })
    expect((await gitService.status(repo)).conflicted).toEqual([])
    expect(readFileSync(join(repo, file), 'utf-8')).toContain('our beta')
  })

  it('-X theirs takes the incoming side instead', async () => {
    const { repo, file } = await contentConflict()
    await gitService.merge(repo, 'incoming', { favour: 'theirs' })
    expect((await gitService.status(repo)).conflicted).toEqual([])
    expect(readFileSync(join(repo, file), 'utf-8')).toContain('their beta')
  })

  it('-X cannot decide a modify/delete clash, which is not a content hunk', async () => {
    const R = cloneFixture('merge-conflict')
    // The fixture deletes a file on one side and edits it on the other; -X only
    // ever decides between two versions of a line.
    await expect(gitService.merge(R, 'feature', { favour: 'ours' })).rejects.toThrow(/modify\/delete|CONFLICT/i)
  })

  it('--ff-only refuses a merge that would need a commit', async () => {
    const R = cloneFixture('merge-conflict')
    const head = await shaOf(R, 'HEAD')
    await expect(gitService.merge(R, 'feature', { ffOnly: true })).rejects.toThrow()
    expect(await shaOf(R, 'HEAD')).toBe(head)
  })

  it('--squash stages the result without committing or recording a merge', async () => {
    const R = await cleanBranch()
    const head = await shaOf(R, 'HEAD')
    await gitService.merge(R, 'addition', { squash: true })
    // HEAD has not moved, and there is no second parent waiting either.
    expect(await shaOf(R, 'HEAD')).toBe(head)
    expect(existsSync(join(R, '.git/MERGE_HEAD'))).toBe(false)
    expect((await gitService.status(R)).staged.length).toBeGreaterThan(0)
  })

  it('--no-commit merges but leaves the commit to you', async () => {
    const R = await cleanBranch()
    const head = await shaOf(R, 'HEAD')
    await gitService.merge(R, 'addition', { noCommit: true })
    expect(await shaOf(R, 'HEAD')).toBe(head)
    // Unlike squash, the merge is still in progress — the parent is remembered.
    expect(existsSync(join(R, '.git/MERGE_HEAD'))).toBe(true)
  })

  it('ignore-space-change merges a reindent against a real edit', async () => {
    const R = cloneFixture('bisect-bug')
    const file = 'spaced.txt'
    writeFileSync(join(R, file), 'first line\n  indented line\nlast line\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'base'])
    const base = await shaOf(R, 'HEAD')

    // One side re-indents the line; the other rewrites its text.
    await raw(R, ['checkout', '-b', 'reindent'])
    writeFileSync(join(R, file), 'first line\n\tindented line\nlast line\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'reindent'])

    await raw(R, ['checkout', '-b', 'edit', base])
    writeFileSync(join(R, file), 'first line\n  indented line, reworded\nlast line\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'reword'])

    // Plain merge: git sees two edits to one line and stops.
    await expect(gitService.merge(R, 'reindent')).rejects.toThrow()
    await raw(R, ['merge', '--abort'])

    await gitService.merge(R, 'reindent', { ignoreSpace: 'change' })
    expect((await gitService.status(R)).conflicted).toEqual([])
    expect(readFileSync(join(R, file), 'utf-8')).toContain('reworded')
  })

  it('names the commits from each side behind a conflict', async () => {
    const R = cloneFixture('merge-conflict')
    await expect(gitService.merge(R, 'feature')).rejects.toThrow()
    const file = (await gitService.status(R)).conflicted[0].path

    const commits = await gitService.conflictCommits(R, file)
    expect(commits.length).toBeGreaterThan(0)
    // Both sides are represented, and each entry carries something to read.
    expect(commits.some((c) => c.side === 'ours')).toBe(true)
    expect(commits.some((c) => c.side === 'theirs')).toBe(true)
    expect(commits[0].subject).toBeTruthy()
    expect(commits[0].author).toBeTruthy()
  })
})

describe('object explorer', () => {
  it('lists every ref plus HEAD, with what each points at', async () => {
    const R = cloneFixture('tags-and-releases')
    const refs = await gitService.objectRefs(R)

    expect(refs[0].name).toBe('HEAD')
    expect(refs.map((r) => r.name)).toContain('refs/heads/main')
    expect(refs.some((r) => r.name.startsWith('refs/tags/'))).toBe(true)
    for (const ref of refs) expect(ref.sha).toMatch(/^[0-9a-f]{40}$/)
  })

  it('walks a commit to its tree, and a tree entry to its blob', async () => {
    const R = cloneFixture('tags-and-releases')
    const commit = await gitService.gitObject(R, 'HEAD')
    expect(commit.kind).toBe('commit')
    expect(commit.commit?.tree).toMatch(/^[0-9a-f]{40}$/)
    expect(commit.commit?.author).toContain('@')
    expect(commit.commit?.message.trim()).toBeTruthy()

    const tree = await gitService.gitObject(R, commit.commit!.tree)
    expect(tree.kind).toBe('tree')
    const entry = tree.tree!.find((c) => c.name === 'app.py')!
    expect(entry.mode).toBe('100644')
    expect(entry.kind).toBe('blob')
    expect(entry.size).toBeGreaterThan(0)

    const blob = await gitService.gitObject(R, entry.sha)
    expect(blob.kind).toBe('blob')
    expect(blob.blob?.text).toContain('def ')
    expect(blob.blob?.truncated).toBe(false)
  })

  it('accepts the revision expressions git accepts', async () => {
    const R = cloneFixture('tags-and-releases')
    // A path-scoped rev resolves straight to the blob…
    const viaPath = await gitService.gitObject(R, 'HEAD:app.py')
    expect(viaPath.kind).toBe('blob')
    // …and the peeling syntax to the tree, which is the same object the commit
    // named.
    const viaPeel = await gitService.gitObject(R, 'HEAD^{tree}')
    const commit = await gitService.gitObject(R, 'HEAD')
    expect(viaPeel.sha).toBe(commit.commit!.tree)
  })

  it('reads an annotated tag as its own object, pointing at the commit', async () => {
    const R = cloneFixture('tags-and-releases')
    const refs = await gitService.objectRefs(R)
    const annotated = refs.find((r) => r.kind === 'tag')
    if (!annotated) return // the fixture may carry only lightweight tags

    const tag = await gitService.gitObject(R, annotated.name)
    expect(tag.kind).toBe('tag')
    expect(tag.tag?.type).toBe('commit')
    expect(tag.tag?.object).toMatch(/^[0-9a-f]{40}$/)
    expect((await gitService.gitObject(R, tag.tag!.object)).kind).toBe('commit')
  })

  it('says a blob is binary instead of spraying it at the pane', async () => {
    const R = cloneFixture('binary-images-unicode')
    const tree = await gitService.gitObject(R, 'HEAD^{tree}')
    const png = tree.tree!.find((c) => c.name.endsWith('.png'))
    if (!png) return
    const blob = await gitService.gitObject(R, png.sha)
    expect(blob.blob?.text).toBeNull()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('reports an unknown revision as an error rather than an empty object', async () => {
    const R = cloneFixture('tags-and-releases')
    await expect(gitService.gitObject(R, 'no-such-ref')).rejects.toThrow()
  })
})

describe('automated bisect (git bisect run)', () => {
  /** Resolve a commit by its subject: fixture shas differ between generations. */
  const shaOfSubject = async (repo: string, grep: string): Promise<string> =>
    (await raw(repo, ['log', '--format=%H', '-1', `--grep=${grep}`])).trim()

  const TEST_CMD = `node -e "const {discount}=require('./discount'); process.exit(discount(100,20)===80?0:1)"`

  const seeded = async (): Promise<string> => {
    const repo = cloneFixture('bisect-bug')
    await gitService.bisectStart(repo)
    await gitService.bisectMark(repo, 'bad')
    await gitService.bisectMark(repo, 'good', await shaOfSubject(repo, 'feat: discount function'))
    return repo
  }

  it('finds the first bad commit from a command exit code alone', async () => {
    const R = await seeded()
    const culprit = await shaOfSubject(R, 'refactor: simplify discount calculation')

    // Exit 0 = good, non-zero = bad. That contract is the whole feature.
    const status = await gitService.bisectRunScript(R, TEST_CMD)
    expect(status.finished).toBe(true)
    expect(status.firstBadSha).toBe(culprit)
    expect(status.firstBadSubject).toContain('simplify discount')

    await gitService.bisectReset(R)
    expect((await gitService.bisectStatus(R)).inProgress).toBe(false)
  })

  it('streams the command output while it runs', async () => {
    const R = await seeded()
    const chunks: string[] = []
    await gitService.bisectRunScript(R, TEST_CMD, (chunk) => chunks.push(chunk))
    // git narrates each step; without that the UI cannot show progress.
    expect(chunks.join('')).toMatch(/Bisecting|first bad commit/)
    await gitService.bisectReset(R)
  })

  it('refuses to run without a seeded session, rather than starting one silently', async () => {
    const R = cloneFixture('bisect-bug')
    await expect(gitService.bisectRunScript(R, 'true')).rejects.toThrow(/bisect/i)
  })

  it('refuses an empty command', async () => {
    const R = cloneFixture('bisect-bug')
    await expect(gitService.bisectRunScript(R, '   ')).rejects.toThrow()
  })

  it('reports nothing to cancel when no run is in flight', async () => {
    const R = cloneFixture('bisect-bug')
    expect(await gitService.bisectCancel(R)).toBe(false)
  })
})

describe('gitattributes', () => {
  it('finds every attributes file, including the private local one', async () => {
    const R = cloneFixture('bisect-bug')
    writeFileSync(join(R, '.gitattributes'), '* text=auto\n')
    mkdirSync(join(R, 'docs'), { recursive: true })
    writeFileSync(join(R, 'docs/.gitattributes'), '*.md merge=union\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'attributes'])
    mkdirSync(join(R, '.git/info'), { recursive: true })
    writeFileSync(join(R, '.git/info/attributes'), '*.secret -diff\n')

    const files = await gitService.attributeFiles(R)
    expect(files.map((f) => f.path)).toEqual(['.gitattributes', 'docs/.gitattributes', '.git/info/attributes'])
    expect(files[0].content).toBe('* text=auto\n')
    // The local one is flagged: it never travels with the clone.
    expect(files[2].local).toBe(true)
    expect(files[0].local).toBe(false)
  })

  it('asks git what applies to a path, not the file', async () => {
    const R = cloneFixture('bisect-bug')
    writeFileSync(join(R, '.gitattributes'), '*.js text\nmath.js merge=union\n')

    const [checked] = await gitService.checkAttributes(R, ['math.js'])
    expect(checked.path).toBe('math.js')
    expect(checked.attrs.text).toBe('set')
    // The later, more specific rule adds to what the earlier one set.
    expect(checked.attrs.merge).toBe('union')

    const [other] = await gitService.checkAttributes(R, ['currency.js'])
    expect(other.attrs.text).toBe('set')
    expect(other.attrs.merge ?? 'unspecified').toBe('unspecified')
  })

  it('writes an attributes file and refuses anything that is not one', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.attributeWrite(R, '.gitattributes', '*.png binary\n')
    expect(readFileSync(join(R, '.gitattributes'), 'utf-8')).toBe('*.png binary\n')

    await gitService.attributeWrite(R, '.git/info/attributes', '*.key -diff\n')
    expect(readFileSync(join(R, '.git/info/attributes'), 'utf-8')).toBe('*.key -diff\n')

    await expect(gitService.attributeWrite(R, 'math.js', 'nope')).rejects.toThrow(/attributes file/i)
    await expect(gitService.attributeWrite(R, '../escape/.gitattributes', 'nope')).rejects.toThrow()
  })

  it('makes merge=union stop a changelog conflicting', async () => {
    const R = cloneFixture('bisect-bug')
    const file = 'CHANGELOG.md'
    writeFileSync(join(R, file), '# Changelog\n')
    writeFileSync(join(R, '.gitattributes'), 'CHANGELOG.md merge=union\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'changelog'])
    const base = await shaOf(R, 'HEAD')

    await raw(R, ['checkout', '-b', 'theirs'])
    writeFileSync(join(R, file), '# Changelog\n- their entry\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'their entry'])

    await raw(R, ['checkout', '-b', 'ours', base])
    writeFileSync(join(R, file), '# Changelog\n- our entry\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'our entry'])

    // Both sides appended to the same line region: a plain merge conflicts,
    // union keeps both. That is the entire point of the attribute.
    await gitService.merge(R, 'theirs')
    expect((await gitService.status(R)).conflicted).toEqual([])
    const merged = readFileSync(join(R, file), 'utf-8')
    expect(merged).toContain('our entry')
    expect(merged).toContain('their entry')
  })

  it('keeps export-ignore paths out of an archive', async () => {
    const R = cloneFixture('bisect-bug')
    writeFileSync(join(R, '.gitattributes'), 'currency.js export-ignore\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['-c', 'user.email=t@e', '-c', 'user.name=T', 'commit', '-m', 'export-ignore'])

    const out = join(mkdtempSync(join(tmpdir(), 'gitcito-attr-')), 'src.tar')
    await gitService.archiveCreate(R, out, 'HEAD', 'tar', '', '')
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const { stdout } = await promisify(execFile)('tar', ['-tf', out])
    expect(stdout).toContain('math.js')
    expect(stdout).not.toContain('currency.js')
  })

  it('lists configured diff drivers and says which converters are missing', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.setDiffDriver(R, 'nonesuch', 'definitely-not-installed --to-text')
    const drivers = await gitService.diffDrivers(R)
    const mine = drivers.find((d) => d.name === 'nonesuch')!
    expect(mine.textconv).toBe('definitely-not-installed --to-text')
    expect(mine.available).toBe(false)
    expect(mine.scope).toBe('repo')

    await gitService.setDiffDriver(R, 'nonesuch', '')
    expect((await gitService.diffDrivers(R)).some((d) => d.name === 'nonesuch')).toBe(false)
  })

  it('offers converter suggestions with honest availability', async () => {
    const R = cloneFixture('bisect-bug')
    const suggestions = await gitService.diffDriverSuggestions(R)
    expect(suggestions.map((s) => s.name)).toContain('pdf')
    for (const suggestion of suggestions) {
      expect(suggestion.patterns.length).toBeGreaterThan(0)
      expect(typeof suggestion.available).toBe('boolean')
    }
    // word/excel/json ride the converter Gitcito ships — always available.
    for (const name of ['word', 'excel', 'json']) {
      const s = suggestions.find((x) => x.name === name)!
      expect(s.bundled).toBe(true)
      expect(s.available).toBe(true)
      expect(s.textconv).toContain('gitcito-textconv')
    }
  })
})

describe('credential helpers', () => {
  // Only ever writes --local: a test that touched the developer's global config
  // would change how their own pushes authenticate.
  it('reports a repository-scoped helper, and flags the plaintext one', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.setCredentialHelper(R, 'store', 'repo')

    const status = await gitService.credentialStatus(R)
    const mine = status.helpers.filter((h) => h.scope === 'repo')
    expect(mine.map((h) => h.value)).toEqual(['store'])
    // `store` writes passwords to a plain file — the whole reason to say so.
    expect(mine[0].plaintext).toBe(true)
    expect(mine[0].available).toBe(true)
  })

  it('clears every stacked helper rather than leaving one behind', async () => {
    const R = cloneFixture('bisect-bug')
    await raw(R, ['config', '--local', '--add', 'credential.helper', 'cache'])
    await raw(R, ['config', '--local', '--add', 'credential.helper', 'store'])
    expect((await gitService.credentialStatus(R)).helpers.filter((h) => h.scope === 'repo')).toHaveLength(2)

    await gitService.setCredentialHelper(R, '', 'repo')
    expect((await gitService.credentialStatus(R)).helpers.filter((h) => h.scope === 'repo')).toEqual([])
  })

  it('marks a helper that is not installed', async () => {
    const R = cloneFixture('bisect-bug')
    await gitService.setCredentialHelper(R, 'definitely-not-a-helper', 'repo')
    const helper = (await gitService.credentialStatus(R)).helpers.find((h) => h.scope === 'repo')!
    expect(helper.available).toBe(false)
  })

  it('surfaces per-URL rules, which beat the plain setting', async () => {
    const R = cloneFixture('bisect-bug')
    await raw(R, ['config', '--local', 'credential.https://example.com.helper', 'cache'])
    await raw(R, ['config', '--local', 'credential.https://example.com.username', 'octocat'])

    const rule = (await gitService.credentialStatus(R)).urlRules.find((r) => r.url === 'https://example.com')!
    expect(rule.helper).toBe('cache')
    expect(rule.username).toBe('octocat')
    expect(rule.scope).toBe('repo')
  })

  it('lists the https hosts this repository would ask about', async () => {
    const R = cloneFixture('bisect-bug')
    await raw(R, ['remote', 'add', 'origin', 'https://github.com/example/demo.git'])
    await raw(R, ['remote', 'add', 'ssh', 'git@gitlab.com:example/demo.git'])

    const status = await gitService.credentialStatus(R)
    expect(status.httpsHosts).toEqual(['github.com'])
    // An ssh remote never reaches a credential helper, so it is not listed.
    expect(status.httpsHosts).not.toContain('gitlab.com')
  })

  it('offers exactly one recommended helper for this platform', async () => {
    const R = cloneFixture('bisect-bug')
    const { candidates } = await gitService.credentialStatus(R)
    expect(candidates.length).toBeGreaterThan(1)
    expect(candidates.filter((c) => c.recommended)).toHaveLength(1)
    // git's own built-ins are always there.
    expect(candidates.find((c) => c.name === 'cache')?.available).toBe(true)
  })

  it('counts the plaintext credentials file without reading it out', async () => {
    const R = cloneFixture('bisect-bug')
    const { plaintextFile } = await gitService.credentialStatus(R)
    expect(plaintextFile.path.endsWith('.git-credentials')).toBe(true)
    expect(typeof plaintextFile.exists).toBe('boolean')
    // The shape carries a count and nothing else — no field can leak a secret.
    expect(Object.keys(plaintextFile).sort()).toEqual(['entries', 'exists', 'path'])
  })

  it('refuses to forget nothing', async () => {
    const R = cloneFixture('bisect-bug')
    await expect(gitService.forgetCredential(R, '  ')).rejects.toThrow(/host/i)
  })
})

describe('object replacement (git replace)', () => {
  const count = async (repo: string): Promise<number> =>
    Number((await raw(repo, ['rev-list', '--count', 'HEAD'])).trim())

  it('grafts a commit to the start of history without rewriting anything', async () => {
    const R = cloneFixture('deep-history-monorepo')
    const full = await count(R)
    const head = await shaOf(R, 'HEAD')
    const cut = (await raw(R, ['rev-parse', 'HEAD~5'])).trim()

    await gitService.replaceGraft(R, cut, [])
    // The log is shorter, and HEAD is still the very same commit — nothing was
    // rewritten, which is the whole difference from a filter-branch.
    expect(await count(R)).toBe(6)
    expect(await shaOf(R, 'HEAD')).toBe(head)
    // The real history is still there, one flag away.
    expect(Number((await raw(R, ['--no-replace-objects', 'rev-list', '--count', 'HEAD'])).trim())).toBe(full)

    const status = await gitService.replacements(R)
    expect(status.refs).toHaveLength(1)
    expect(status.refs[0].original).toBe(cut)
    expect(status.refs[0].replacementParents).toEqual([])
    expect(status.enabled).toBe(true)
  })

  it('puts the history back when the replacement is deleted', async () => {
    const R = cloneFixture('deep-history-monorepo')
    const full = await count(R)
    const cut = (await raw(R, ['rev-parse', 'HEAD~4'])).trim()

    await gitService.replaceGraft(R, cut, [])
    expect(await count(R)).toBeLessThan(full)

    await gitService.replaceDelete(R, cut)
    expect(await count(R)).toBe(full)
    expect((await gitService.replacements(R)).refs).toEqual([])
  })

  it('grafts onto chosen parents, which is how an archive is reattached', async () => {
    const R = cloneFixture('deep-history-monorepo')
    const cut = (await raw(R, ['rev-parse', 'HEAD~5'])).trim()
    const elsewhere = (await raw(R, ['rev-parse', 'HEAD~8'])).trim()

    const full = await count(R)
    await gitService.replaceGraft(R, cut, [elsewhere])
    const [ref] = (await gitService.replacements(R)).refs
    expect(ref.replacementParents).toEqual([elsewhere])
    // Only the two commits between the graft and its new parent leave the walk —
    // everything older than `elsewhere` is still reachable through it.
    expect(await count(R)).toBe(full - 2)
  })

  it('reports and honours core.useReplaceRefs', async () => {
    const R = cloneFixture('deep-history-monorepo')
    const full = await count(R)
    await gitService.replaceGraft(R, (await raw(R, ['rev-parse', 'HEAD~5'])).trim(), [])
    expect(await count(R)).toBe(6)

    await gitService.setUseReplaceRefs(R, false)
    expect((await gitService.replacements(R)).enabled).toBe(false)
    // git now reads straight through the replacement.
    expect(await count(R)).toBe(full)

    await gitService.setUseReplaceRefs(R, true)
    expect((await gitService.replacements(R)).enabled).toBe(true)
    expect(await count(R)).toBe(6)
  })

  it('replaces one object with another outright', async () => {
    const R = cloneFixture('deep-history-monorepo')
    const original = (await raw(R, ['rev-parse', 'HEAD~2'])).trim()
    const other = (await raw(R, ['rev-parse', 'HEAD~7'])).trim()

    await gitService.replaceObject(R, original, other)
    const [ref] = (await gitService.replacements(R)).refs
    expect(ref.original).toBe(original)
    expect(ref.replacement).toBe(other)
    // Both subjects are readable: the original is fetched with replacements off,
    // so the two sides do not collapse into the same line.
    expect(ref.originalSubject).toBeTruthy()
    expect(ref.replacementSubject).toBeTruthy()
    expect(ref.originalSubject).not.toBe(ref.replacementSubject)
  })

  it('refuses an empty graft or delete', async () => {
    const R = cloneFixture('deep-history-monorepo')
    await expect(gitService.replaceGraft(R, '  ', [])).rejects.toThrow()
    await expect(gitService.replaceDelete(R, '')).rejects.toThrow()
  })
})

// Double-clicking a remote branch whose local copy is AHEAD used to switch to
// the local branch silently — the user asked for the remote and got their own
// unpushed work. checkoutRemote now reports it and leaves HEAD alone.
describe('checkout remote: local branch ahead', () => {
  /** Put the fixture's local `feature` strictly ahead of origin/feature. */
  const aheadFixture = async (): Promise<string> => {
    const R = cloneFixture('diverged-checkout')
    await raw(R, ['checkout', '-q', 'feature'])
    await raw(R, ['reset', '--hard', 'origin/feature'])
    writeFileSync(join(R, 'local-only.ts'), 'export const localOnly = 1\n')
    await raw(R, ['add', '-A'])
    await raw(R, ['commit', '-qm', 'feat: unpushed work'])
    await raw(R, ['checkout', '-q', 'main'])
    return R
  }

  it('reports ahead-only without checking anything out', async () => {
    const R = await aheadFixture()

    const res = await gitService.checkoutRemote(R, 'origin/feature', 'feature', 'origin')
    expect(res).toMatchObject({ diverged: false, aheadOnly: true, ahead: 1, behind: 0 })
    // Nothing moved: the user still has to say which side they meant.
    expect((await gitService.status(R)).current).toBe('main')
  })

  it('resets mixed to the remote tip, keeping the changes unstaged', async () => {
    const R = await aheadFixture()
    const before = await shaOf(R, 'feature')

    const { previousRef, backupRef } = await gitService.resolveDivergedCheckout(
      R,
      'origin/feature',
      'feature',
      'reset-mixed',
      true
    )

    expect(previousRef).toBe(before)
    expect(await shaOf(R, 'feature')).toBe(await shaOf(R, 'origin/feature'))
    // The backup branch still points at the commits the reset walked away from.
    expect(backupRef).toMatch(/^backup\/feature-/)
    expect(await shaOf(R, backupRef!)).toBe(before)

    const st = await gitService.status(R)
    expect(st.current).toBe('feature')
    expect(st.staged).toHaveLength(0)
    expect([...st.staged, ...st.unstaged].some((f) => f.path === 'local-only.ts')).toBe(true)
  })

  it('resets soft to the remote tip, keeping the changes staged', async () => {
    const R = await aheadFixture()

    await gitService.resolveDivergedCheckout(R, 'origin/feature', 'feature', 'reset-soft', false)

    expect(await shaOf(R, 'feature')).toBe(await shaOf(R, 'origin/feature'))
    const st = await gitService.status(R)
    expect(st.staged.some((f) => f.path === 'local-only.ts')).toBe(true)
  })

  it('resets hard to the remote tip, discarding the commits and their changes', async () => {
    const R = await aheadFixture()

    await gitService.resolveDivergedCheckout(R, 'origin/feature', 'feature', 'reset-hard', false)

    expect(await shaOf(R, 'feature')).toBe(await shaOf(R, 'origin/feature'))
    expect(existsSync(join(R, 'local-only.ts'))).toBe(false)
    const st = await gitService.status(R)
    expect(st.staged).toHaveLength(0)
    expect(st.unstaged).toHaveLength(0)
  })

  it('still fast-forwards when the local branch is only behind', async () => {
    const R = cloneFixture('diverged-checkout')
    await raw(R, ['checkout', '-q', 'feature'])
    await raw(R, ['reset', '--hard', 'origin/feature~1'])
    await raw(R, ['checkout', '-q', 'main'])

    const res = await gitService.checkoutRemote(R, 'origin/feature', 'feature', 'origin')
    expect(res).toMatchObject({ diverged: false, aheadOnly: false, behind: 1 })
    expect(await shaOf(R, 'feature')).toBe(await shaOf(R, 'origin/feature'))
  })
})
