import { describe, it, expect, afterAll } from 'vitest'
import { writeFileSync, existsSync } from 'node:fs'
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
})
