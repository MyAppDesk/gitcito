import { describe, it, expect } from 'vitest'
import { gitService } from '../src/main/git'
import { repoPath } from './helpers'

// Integration tests: drive the real gitService (simple-git under the hood)
// against the deterministic playground repos. Assertions target structural
// facts (branch/tag/stash/worktree presence, commit counts, current ref) that
// are stable across runs — never specific SHAs.

describe('merge-conflict', () => {
  const R = repoPath('merge-conflict')
  it('has feature + main, current is main', async () => {
    const b = await gitService.branches(R)
    expect(b.current).toBe('main')
    expect(b.locals.map((l) => l.name).sort()).toEqual(['feature', 'main'])
  })
})

describe('cherry-pick', () => {
  const R = repoPath('cherry-pick')
  it('feature is ahead of main', async () => {
    expect((await gitService.open(R)).current).toBe('main')
    const log = await gitService.log(R)
    expect(log.some((c) => c.subject.includes('cherry-picks cleanly'))).toBe(true)
  })
})

describe('stash-picking', () => {
  const R = repoPath('stash-picking')
  it('holds exactly one stash with the WIP message', async () => {
    const stashes = await gitService.stashes(R)
    expect(stashes.length).toBe(1)
    expect(stashes[0].message).toContain('WIP')
  })
})

describe('rebase-conflict', () => {
  const R = repoPath('rebase-conflict')
  it('is left checked out on feature', async () => {
    expect((await gitService.open(R)).current).toBe('feature')
  })
})

describe('interactive-rebase', () => {
  const R = repoPath('interactive-rebase')
  it('messy-feature has 7 commits incl. WIP + fixup', async () => {
    expect((await gitService.open(R)).current).toBe('messy-feature')
    const log = await gitService.log(R)
    expect(log.length).toBe(7)
    expect(log.some((c) => c.subject === 'WIP')).toBe(true)
    expect(log.some((c) => c.subject.startsWith('fixup!'))).toBe(true)
  })
})

describe('bisect-bug', () => {
  const R = repoPath('bisect-bug')
  it('has 13 commits and the bug-introducing commit', async () => {
    const log = await gitService.log(R)
    expect(log.length).toBe(13)
    expect(log.some((c) => c.subject === 'refactor: simplify discount calculation')).toBe(true)
  })
})

describe('multi-remote', () => {
  const R = repoPath('multi-remote')
  it('has origin + upstream remotes and remote-tracking branches', async () => {
    const names = (await gitService.remotes(R)).map((r) => r.name).sort()
    expect(names).toEqual(['origin', 'upstream'])
    const b = await gitService.branches(R)
    expect(b.remotes.length).toBeGreaterThan(0)
  })
})

describe('octopus-merge', () => {
  const R = repoPath('octopus-merge')
  it('has three independent feature branches off main', async () => {
    const b = await gitService.branches(R)
    expect(b.current).toBe('main')
    const locals = b.locals.map((l) => l.name)
    for (const f of ['feat/auth', 'feat/api', 'feat/ui']) expect(locals).toContain(f)
  })
})

describe('tags-and-releases', () => {
  const R = repoPath('tags-and-releases')
  it('has the v1.0.0–v2.0.0 tag set and a hotfix branch', async () => {
    const b = await gitService.branches(R)
    const tags = b.tags.map((t) => t.name).sort()
    expect(tags).toEqual(['v1.0.0', 'v1.0.1', 'v1.0.2', 'v1.1.0', 'v2.0.0'])
    expect(b.locals.map((l) => l.name)).toContain('hotfix/security-patch')
  })
})

describe('detached-head', () => {
  const R = repoPath('detached-head')
  it('is in detached HEAD with main + stable present', async () => {
    expect((await gitService.open(R)).current).toBe('HEAD')
    const locals = (await gitService.branches(R)).locals.map((l) => l.name).sort()
    expect(locals).toEqual(['main', 'stable'])
  })
})

describe('collaborators', () => {
  const R = repoPath('collaborators')
  it('has 4 distinct authors and co-authored commits', async () => {
    const log = await gitService.log(R)
    const authors = new Set(log.map((c) => c.author))
    for (const a of ['Alice Liddell', 'Bob Marley', 'Carol Danvers', 'Dave Grohl']) {
      expect(authors.has(a)).toBe(true)
    }
    expect(log.some((c) => c.coAuthors.length > 0)).toBe(true)
  })
})

describe('submodules-worktrees', () => {
  const R = repoPath('submodules-worktrees')
  it('lists the main worktree plus two linked worktrees', async () => {
    const wts = await gitService.worktrees(R)
    expect(wts.length).toBe(3)
    expect(wts.filter((w) => w.isMain).length).toBe(1)
    const branches = wts.map((w) => w.branch)
    expect(branches).toContain('release/1.x')
    expect(branches).toContain('hotfix/login')
  })
})

describe('reflog-recovery', () => {
  const R = repoPath('reflog-recovery')
  it('deleted experiment branch is gone; amended commit is on main', async () => {
    const b = await gitService.branches(R)
    expect(b.current).toBe('main')
    expect(b.locals.map((l) => l.name)).not.toContain('experiment')
    const log = await gitService.log(R)
    expect(log.some((c) => c.subject.includes('newUI + betaSearch'))).toBe(true)
    // the hard-reset WIP commit is not reachable from any ref
    expect(log.some((c) => c.subject.includes('broken refactor'))).toBe(false)
  })
})

describe('binary-images-unicode', () => {
  const R = repoPath('binary-images-unicode')
  it('has a clean tree and the binary-diff logo commit', async () => {
    const st = await gitService.status(R)
    expect(st.staged.length).toBe(0)
    expect(st.unstaged.length).toBe(0)
    expect(st.conflicted.length).toBe(0)
    const log = await gitService.log(R)
    expect(log.some((c) => c.subject.includes('binary diff'))).toBe(true)
  })
})

describe('deep-history-monorepo', () => {
  const R = repoPath('deep-history-monorepo')
  it('has deep history with multiple authors and release tags', async () => {
    const log = await gitService.log(R, 500)
    expect(log.length).toBeGreaterThan(200)
    expect(new Set(log.map((c) => c.author)).size).toBeGreaterThanOrEqual(5)
    const tags = (await gitService.branches(R)).tags.map((t) => t.name).sort()
    expect(tags).toEqual(['v0.1.0', 'v0.2.0', 'v0.3.0', 'v0.4.0'])
  })
})
