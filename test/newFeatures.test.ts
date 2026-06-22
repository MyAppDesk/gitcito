import { describe, it, expect, afterAll } from 'vitest'
import { writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { gitService } from '../src/main/git'
import { repoPath } from './helpers'
import { cloneFixture, cleanupFixtures } from './fixtures'

// Integration tests for the features added on top of the base gitService.
// Read-only checks run against the shared playground; mutating ones clone first.
afterAll(cleanupFixtures)

describe('generateChangelog (changelog playground)', () => {
  const R = repoPath('changelog')
  it('groups conventional commits since the latest tag, breaking first', async () => {
    const { markdown, count } = await gitService.generateChangelog(R)
    expect(count).toBe(11) // v1.0.0..HEAD
    expect(markdown).toContain('BREAKING CHANGES')
    expect(markdown).toContain('Features')
    expect(markdown).toContain('Bug Fixes')
    // The non-conventional commit lands under "Other".
    expect(markdown).toContain('Other')
  })

  it('honours an explicit version heading', async () => {
    const { markdown } = await gitService.generateChangelog(R, { version: 'v1.1.0' })
    expect(markdown).toMatch(/^## v1\.1\.0/)
  })
})

describe('repoInsights (insights playground)', () => {
  const R = repoPath('insights')
  it('ranks the hot file and the top author, with weekly churn', async () => {
    const ins = await gitService.repoInsights(R)
    expect(ins.hotspots[0].path).toBe('src/core.js')
    expect(ins.authors[0].name).toBe('Alice')
    expect(ins.authors[0].commits).toBeGreaterThanOrEqual(ins.authors[1].commits)
    expect(ins.churn.length).toBeGreaterThanOrEqual(5)
    expect(ins.totalCommits).toBeGreaterThan(0)
  })
})

describe('code search (code-search playground)', () => {
  const R = repoPath('code-search')
  it('greps tracked + untracked working tree', async () => {
    const hits = await gitService.grepWorkingTree(R, 'TODO')
    const files = new Set(hits.map((h) => h.file))
    expect(files.has('scratch.js')).toBe(true) // untracked coverage
    expect(hits.length).toBeGreaterThanOrEqual(3)
    expect(hits[0]).toHaveProperty('line')
  })

  it('history pickaxe finds add + remove of a symbol', async () => {
    const commits = await gitService.searchHistory(R, 'validateToken')
    expect(commits.length).toBe(3) // add, use, drop
  })
})

describe('stacked branches (stacked-branches playground)', () => {
  it('reports the chain and that both lower levels need restack', async () => {
    const info = await gitService.stackInfo(repoPath('stacked-branches'))
    expect(info.trunk).toBe('main')
    expect(info.branches.map((b) => b.name)).toEqual(['feature/api', 'feature/ui'])
    expect(info.branches.every((b) => b.needsRestack)).toBe(true)
  })

  it('restack cascades so nothing needs restacking afterwards', async () => {
    const R = cloneFixture('stacked-branches')
    await gitService.stackRestack(R, 'feature/ui')
    const info = await gitService.stackInfo(R, 'feature/ui')
    expect(info.branches.every((b) => !b.needsRestack)).toBe(true)
    // Left checked out on the leaf.
    expect((await gitService.open(R)).current).toBe('feature/ui')
  })
})

describe('WIP snapshots (snapshots playground)', () => {
  it('lists the seeded snapshots and takes a new one when dirty', async () => {
    const R = cloneFixture('snapshots')
    const before = await gitService.listSnapshots(R)
    expect(before.length).toBe(2)
    expect(before.every((s) => s.sha && s.time > 0)).toBe(true)

    const snap = await gitService.createSnapshot(R) // working tree is dirty in this fixture
    expect(snap).not.toBeNull()
    const after = await gitService.listSnapshots(R)
    expect(after.length).toBe(3)
  })
})

describe('rebaseOnto (drag-to-rebase)', () => {
  it('checks out the branch and rebases it onto the target', async () => {
    const R = cloneFixture('stacked-branches')
    await gitService.rebaseOnto(R, 'feature/api', 'main')
    expect((await gitService.open(R)).current).toBe('feature/api')
    const log = await gitService.log(R)
    expect(log.some((c) => c.subject.includes('hotfix'))).toBe(true)
  })
})

describe('cherryPickMany (multi-select graph)', () => {
  it('applies several commits onto another branch in order', async () => {
    const R = cloneFixture('changelog')
    const base = (await gitService.open(R)).current

    // Build two independent commits (new files ⇒ conflict-free picks) on a side
    // branch, then return to base and cherry-pick them across.
    await gitService.createBranch(R, 'donor', 'HEAD')
    await gitService.checkout(R, 'donor')
    writeFileSync(join(R, 'cpm-one.txt'), '1\n')
    await gitService.stageAll(R)
    await gitService.commit(R, 'add cpm-one')
    writeFileSync(join(R, 'cpm-two.txt'), '2\n')
    await gitService.stageAll(R)
    await gitService.commit(R, 'add cpm-two')

    const donorLog = await gitService.log(R) // newest-first: cpm-two, cpm-one, …
    const selection = [donorLog[0].hash, donorLog[1].hash] // as the UI collects it

    await gitService.checkout(R, base)
    await gitService.cherryPickMany(R, [...selection].reverse()) // oldest-first

    const after = await gitService.log(R)
    expect(after[0].subject).toBe('add cpm-two') // newest pick ends on top
    expect(after[1].subject).toBe('add cpm-one')
    expect(existsSync(join(R, 'cpm-one.txt'))).toBe(true)
  })
})

describe('createTag (annotated tags)', () => {
  const tagType = (R: string, name: string): string =>
    execFileSync('git', ['-C', R, 'cat-file', '-t', name]).toString().trim()

  it('creates a lightweight tag by default and an annotated tag with a message', async () => {
    const R = cloneFixture('changelog')
    await gitService.createTag(R, 'light-1')
    expect(tagType(R, 'light-1')).toBe('commit') // lightweight → points straight at the commit

    await gitService.createTag(R, 'annot-1', undefined, { message: 'release notes' })
    expect(tagType(R, 'annot-1')).toBe('tag') // annotated → a tag object
    const msg = execFileSync('git', ['-C', R, 'tag', '-l', '--format=%(contents)', 'annot-1']).toString()
    expect(msg).toContain('release notes')
  })
})

describe('squashCommits (multi-select squash)', () => {
  it('folds a contiguous run of the newest commits into one', async () => {
    const R = cloneFixture('changelog')
    for (const n of ['a', 'b', 'c']) {
      writeFileSync(join(R, `sq-${n}.txt`), `${n}\n`)
      await gitService.stageAll(R)
      await gitService.commit(R, `add ${n}`)
    }
    const before = await gitService.log(R) // c, b, a, …
    const oldest = before[1].hash // squash the top two: c (HEAD) + b

    await gitService.squashCommits(R, oldest, 'squash b and c')

    const after = await gitService.log(R)
    expect(after[0].subject).toBe('squash b and c')
    expect(after.length).toBe(before.length - 1)
    expect(after.some((c) => c.subject === 'add a')).toBe(true) // untouched
    // Both squashed files survive in the tree.
    expect(existsSync(join(R, 'sq-b.txt')) && existsSync(join(R, 'sq-c.txt'))).toBe(true)
  })
})

describe('contributors (co-author picker)', () => {
  it('lists distinct authors with name + email', async () => {
    const R = repoPath('insights') // seeded with Alice / Bob / Carol
    const people = await gitService.contributors(R)
    expect(people.length).toBeGreaterThanOrEqual(3)
    expect(people.every((p) => p.name && p.email.includes('@'))).toBe(true)
    expect(new Set(people.map((p) => p.email.toLowerCase())).size).toBe(people.length) // deduped
  })
})

describe('stashToBranch (stash → branch)', () => {
  it('creates the branch, applies the stash there and drops it', async () => {
    const R = cloneFixture('changelog')
    writeFileSync(join(R, 'wip.txt'), 'wip\n')
    await gitService.stash(R, 'wip work')
    expect((await gitService.stashes(R)).length).toBe(1)

    await gitService.stashToBranch(R, 'wip-branch')

    expect((await gitService.open(R)).current).toBe('wip-branch') // checked out
    expect(existsSync(join(R, 'wip.txt'))).toBe(true) // stash applied
    expect((await gitService.stashes(R)).length).toBe(0) // dropped
  })
})

describe('stashPush (partial stash)', () => {
  it('stashes only the selected file, leaving the rest dirty', async () => {
    const R = cloneFixture('snapshots')
    writeFileSync(join(R, 'partial-a.txt'), 'a\n')
    writeFileSync(join(R, 'partial-b.txt'), 'b\n')

    await gitService.stashPush(R, 'only a', ['partial-a.txt'])

    expect(existsSync(join(R, 'partial-a.txt'))).toBe(false) // stashed away
    expect(existsSync(join(R, 'partial-b.txt'))).toBe(true) // left behind
    const stashes = await gitService.stashes(R)
    expect(stashes[0]?.message).toContain('only a')
  })

  it('keeps staged changes in the tree with keepIndex', async () => {
    const R = cloneFixture('snapshots')
    writeFileSync(join(R, 'keep.txt'), 'keep\n')
    await gitService.stageAll(R)

    await gitService.stashPush(R, 'keep test', ['keep.txt'], true)

    expect(existsSync(join(R, 'keep.txt'))).toBe(true) // --keep-index leaves it staged
    expect((await gitService.stashes(R)).length).toBe(1)
  })
})
