import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gitService } from '../src/main/git'
import { repoPath } from './helpers'
import { cloneFixture, cleanupFixtures } from './fixtures'
import { diffSymbols, semanticCompare } from '../src/main/semantic'

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

  it('searchFileMatches returns every matching line of the given files', async () => {
    const hits = await gitService.searchFileMatches(R, ['src/util/log.js', 'src/util/mail.js'], 'TODO')
    // log.js has 3 TODO lines, mail.js 2 — grouped by file, with line numbers.
    expect(hits.filter((h) => h.file === 'src/util/log.js').length).toBe(3)
    expect(hits.filter((h) => h.file === 'src/util/mail.js').length).toBe(2)
    expect(hits.every((h) => h.line > 0 && h.text.includes('TODO'))).toBe(true)
    // Files outside the given list are never searched.
    expect(hits.some((h) => h.file === 'README.md')).toBe(false)
  })

  it('searchFileMatches honours the case/whole-word/regex toggles', async () => {
    expect(await gitService.searchFileMatches(R, ['README.md'], 'todo', { caseSensitive: true })).toEqual([])
    expect((await gitService.searchFileMatches(R, ['README.md'], 'todo')).length).toBe(1)
    const emails = await gitService.searchFileMatches(R, ['src/util/mail.js'], '\\w+@corp\\.dev', { regex: true })
    expect(emails.length).toBe(1)
    expect(await gitService.searchFileMatches(R, ['src/util/log.js'], 'TOD', { wholeWord: true })).toEqual([])
  })

  it('searchFileMatches caps the hits per file', async () => {
    const hits = await gitService.searchFileMatches(R, ['src/util/log.js'], 'TODO', { maxPerFile: 2 })
    expect(hits.length).toBe(2)
  })

  it('searchCommitMatches greps the tree of a commit, not the working copy', async () => {
    // validateToken exists at the commit that added it and is gone from HEAD.
    const added = execFileSync('git', ['-C', R, 'log', '--format=%H', '--grep=add validateToken'], {
      encoding: 'utf-8'
    }).trim()
    const hits = await gitService.searchCommitMatches(R, added, 'validateToken')
    expect(hits.length).toBeGreaterThanOrEqual(1)
    expect(hits[0].file).toBe('src/auth/token.js')
    expect(hits[0].line).toBe(1)
    expect(await gitService.searchCommitMatches(R, 'HEAD', 'validateToken')).toEqual([])
  })

  it('searchCommitMatches limits the search to the given paths', async () => {
    const hits = await gitService.searchCommitMatches(R, 'HEAD', 'TODO', { paths: ['README.md'] })
    expect(hits.length).toBe(1)
    expect(hits[0].file).toBe('README.md')
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
  it('lists the seeded snapshots with their kinds and takes a new one when dirty', async () => {
    const R = cloneFixture('snapshots')
    const before = await gitService.listSnapshots(R)
    expect(before.length).toBe(3)
    expect(before.map((s) => s.kind).sort()).toEqual(['auto', 'guard', 'manual'])
    expect(before.every((s) => s.sha && s.time > 0)).toBe(true)

    const snap = await gitService.createSnapshot(R) // working tree is dirty in this fixture
    expect(snap).not.toBeNull()
    expect(snap!.kind).toBe('manual')
    const after = await gitService.listSnapshots(R)
    expect(after.length).toBe(4)
  })

  it('captures untracked files and restores one after deletion', async () => {
    const R = cloneFixture('snapshots')
    // scratch.txt is untracked in the fixture — the legacy `git stash create`
    // mechanism could not capture it; the temp-index one must.
    const snap = await gitService.createSnapshot(R)
    expect(snap).not.toBeNull()
    rmSync(join(R, 'scratch.txt'))
    await gitService.restoreSnapshot(R, snap!.sha, ['scratch.txt'])
    expect(readFileSync(join(R, 'scratch.txt'), 'utf-8')).toContain('todo: not yet added')
  })

  it('dedupes timer ticks on an unchanged tree but always honours a manual request', async () => {
    const R = cloneFixture('snapshots')
    const first = await gitService.createSnapshot(R, 'auto')
    expect(first).not.toBeNull()
    expect(await gitService.createSnapshot(R, 'auto')).toBeNull()
    expect(await gitService.createSnapshot(R, 'manual')).not.toBeNull()
  })

  it('guards a discard: the destroyed state lands in a guard snapshot', async () => {
    const R = cloneFixture('snapshots')
    const before = (await gitService.listSnapshots(R)).length
    await gitService.discard(R, ['draft.md'], false)
    expect(readFileSync(join(R, 'draft.md'), 'utf-8')).not.toContain('Even more uncommitted edits.')

    const after = await gitService.listSnapshots(R)
    expect(after.length).toBe(before + 1)
    expect(after[0].kind).toBe('guard')
    await gitService.restoreSnapshot(R, after[0].sha, ['draft.md'])
    expect(readFileSync(join(R, 'draft.md'), 'utf-8')).toContain('Even more uncommitted edits.')
  })

  it('restores a legacy stash-shaped snapshot', async () => {
    const R = cloneFixture('snapshots')
    const seeded = await gitService.listSnapshots(R)
    const manualSeed = seeded.find((s) => s.kind === 'manual')
    expect(manualSeed).toBeDefined()
    await gitService.restoreSnapshot(R, manualSeed!.sha, ['draft.md'])
    const content = readFileSync(join(R, 'draft.md'), 'utf-8')
    expect(content).toContain('section one')
    expect(content).not.toContain('section two')
  })
})

describe('teammateRadar (teammate-radar playground)', () => {
  it('reports remote activity, overlap with dirty files and conflict risk', async () => {
    const R = cloneFixture('teammate-radar')
    const r = await gitService.teammateRadar(R)
    expect(r.dirtyCount).toBeGreaterThan(0)

    const api = r.entries.find((e) => e.ref === 'origin/feature/api-tokens')
    expect(api).toBeDefined()
    expect(api!.overlap).toContain('api.ts')
    expect(api!.author).toBe('María García')
    expect(api!.ahead).toBe(1)
    expect(api!.risk).toBe('clean')

    const ui = r.entries.find((e) => e.ref === 'origin/feature/ui-polish')
    expect(ui).toBeDefined()
    expect(ui!.risk).toBe('conflict')
    expect(ui!.conflictFiles).toContain('ui.css')
    expect(ui!.overlap).toEqual([])

    const main = r.entries.find((e) => e.ref === 'origin/main')
    expect(main).toBeDefined()
    expect(main!.risk).toBe('clean')

    // Collision-prone first: the branch touching a dirty file leads.
    expect(r.entries[0].ref).toBe('origin/feature/api-tokens')
  })

  it('is quiet in a repo with no remote branches', async () => {
    const R = cloneFixture('stash-picking')
    const r = await gitService.teammateRadar(R)
    expect(r.entries).toEqual([])
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

    // Assert the parent chain, not the log's date order: both picks land in the
    // same second on a loaded machine, and `git log` sorts equal dates
    // arbitrarily — the topology is what "in order" actually means here.
    const chain = execFileSync('git', ['-C', R, 'log', '--topo-order', '--format=%s', '-2'], {
      encoding: 'utf-8'
    })
      .trim()
      .split('\n')
    expect(chain).toEqual(['add cpm-two', 'add cpm-one']) // newest pick ends on top
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

describe('interactive rebase edit', () => {
  it('pauses the rebase at an edit step', async () => {
    const R = cloneFixture('changelog')
    const raw = await gitService.interactiveRebaseSteps(R, 'HEAD~3') // oldest-first
    const steps = raw.map((s, i) => ({ ...s, action: i === 0 ? ('edit' as const) : ('pick' as const) }))

    await gitService.runInteractiveRebase(R, 'HEAD~3', steps)

    expect(await gitService.mergeState(R)).toBe('rebase') // stopped for amending
    await gitService.rebaseAbort(R) // clean up
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

describe('deleteRemoteBranch (stale tracking ref)', () => {
  // Build a working repo wired to a bare "remote", push a branch, then delete it
  // straight from the bare repo — simulating e.g. Dependabot removing its branch
  // on GitHub after merging. The local remote-tracking ref survives until a
  // pruning fetch, so the branch still shows up in the UI. Deleting it from
  // gitcito must NOT fail with "remote ref does not exist"; it should just prune
  // the stale tracking ref so the branch disappears.
  const git = (cwd: string, ...args: string[]): string =>
    execFileSync('git', ['-C', cwd, ...args], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()

  it('prunes the stale tracking ref instead of erroring when the remote ref is gone', async () => {
    const remote = mkdtempSync(join(tmpdir(), 'gitcito-remote-'))
    const work = mkdtempSync(join(tmpdir(), 'gitcito-work-'))
    try {
      execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' })
      execFileSync('git', ['init', work], { stdio: 'ignore' })
      git(work, 'config', 'user.email', 'test@example.com')
      git(work, 'config', 'user.name', 'Test')
      git(work, 'remote', 'add', 'origin', remote)
      writeFileSync(join(work, 'a.txt'), 'a\n')
      git(work, 'add', '-A')
      git(work, 'commit', '-m', 'init')
      git(work, 'branch', 'gone-branch')
      git(work, 'push', '-u', 'origin', 'main', 'gone-branch')

      // Branch is now a remote-tracking ref…
      const before = await gitService.branches(work)
      expect(before.remotes.some((r) => r.fullName === 'origin/gone-branch')).toBe(true)

      // …delete it directly on the remote, leaving our tracking ref stale.
      // (`--git-dir` keeps this working under safe.bareRepository=explicit.)
      execFileSync('git', ['--git-dir', remote, 'update-ref', '-d', 'refs/heads/gone-branch'], {
        stdio: 'ignore'
      })

      // Deleting from gitcito must succeed and drop the stale tracking ref.
      await expect(gitService.deleteRemoteBranch(work, 'origin', 'gone-branch')).resolves.toBeUndefined()

      const after = await gitService.branches(work)
      expect(after.remotes.some((r) => r.fullName === 'origin/gone-branch')).toBe(false)
    } finally {
      rmSync(remote, { recursive: true, force: true })
      rmSync(work, { recursive: true, force: true })
    }
  })
})

describe('mergePreview — conflict radar (conflict-radar playground)', () => {
  const R = repoPath('conflict-radar')
  const refs = [
    'chore/merged',
    'feature/big-refactor',
    'feature/config-bump',
    'feature/docs',
    'feature/rename-api',
    'legacy/import'
  ]

  it('reports one verdict per branch, in the order asked for', async () => {
    const res = await gitService.mergePreview(R, 'main', refs)
    expect(res.entries.map((e) => e.ref)).toEqual(refs)
    expect(res.baseSha).toMatch(/^[0-9a-f]{40}$/)
  })

  it('flags the branches that would conflict, with their files', async () => {
    const { entries } = await gitService.mergePreview(R, 'main', refs)
    const byRef = new Map(entries.map((e) => [e.ref, e]))
    expect(byRef.get('feature/big-refactor')!.status).toBe('conflict')
    expect(byRef.get('feature/big-refactor')!.files.sort()).toEqual([
      'README.md',
      'src/app.js',
      'src/config.js'
    ])
    expect(byRef.get('feature/rename-api')!.files).toEqual(['src/app.js'])
    expect(byRef.get('feature/config-bump')!.files).toEqual(['src/config.js'])
  })

  it('separates a clean merge from one that is already in the base', async () => {
    const { entries } = await gitService.mergePreview(R, 'main', refs)
    const byRef = new Map(entries.map((e) => [e.ref, e]))
    expect(byRef.get('feature/docs')!.status).toBe('clean')
    expect(byRef.get('feature/docs')!.files).toEqual([])
    expect(byRef.get('chore/merged')!.status).toBe('merged')
  })

  it('keeps scanning after git refuses a merge outright', async () => {
    // The orphan branch aborts the batched run mid-stream; the remaining refs
    // are retried one at a time, so no verdict goes missing.
    const { entries } = await gitService.mergePreview(R, 'main', refs)
    const legacy = entries.find((e) => e.ref === 'legacy/import')!
    expect(legacy.status).toBe('error')
    expect(legacy.message).toMatch(/unrelated histories/)
    expect(entries.filter((e) => e.status === 'conflict')).toHaveLength(3)
  })

  it('never touches the working tree, the index or HEAD', async () => {
    const before = await gitService.status(R)
    const head = (await gitService.branches(R)).current
    await gitService.mergePreview(R, 'main', refs)
    const after = await gitService.status(R)
    expect(after).toEqual(before)
    expect((await gitService.branches(R)).current).toBe(head)
  })
})

describe('semantic diff (tree-sitter)', () => {
  const OLD_TS = `export function start(a: string) {
  const x = compute(a)
  return x + 1
}
class Repo {
  open(path: string) { return path }
  close() { return null }
}
`
  const NEW_TS = `export function boot(a: string) {
  const x = compute(a)
  return x + 1
}
class Repo {
  open(path: string, mode: string) { return path }
  reopen() { return null }
}
export function brandNew() { return 7 }
`

  it('reads a rename as a rename, not a delete plus an add', async () => {
    const { language, changes } = await semanticCompare('app.ts', OLD_TS, NEW_TS)
    expect(language).toBe('typescript')
    const renamed = changes.filter((c) => c.kind === 'renamed')
    expect(renamed.map((c) => [c.oldName, c.symbol])).toEqual([
      ['start', 'boot'],
      ['Repo.close', 'Repo.reopen']
    ])
    // Bodies were untouched, so neither rename is flagged as rewritten.
    expect(renamed.every((c) => !c.bodyChanged)).toBe(true)
    expect(changes.some((c) => c.kind === 'removed')).toBe(false)
  })

  it('separates a signature change from a body change', async () => {
    const { changes } = await semanticCompare('app.ts', OLD_TS, NEW_TS)
    const sig = changes.find((c) => c.kind === 'signature')!
    expect(sig.symbol).toBe('Repo.open')
    expect(sig.oldSignature).toBe('(path: string)')
    expect(sig.newSignature).toBe('(path: string, mode: string)')
    expect(sig.bodyChanged).toBe(false)
  })

  it('reports new declarations and drops the container they live in', async () => {
    const { changes } = await semanticCompare('app.ts', OLD_TS, NEW_TS)
    expect(changes.find((c) => c.kind === 'added')?.symbol).toBe('brandNew')
    // `Repo` itself is not listed: its own rows already explain the change.
    expect(changes.some((c) => c.symbol === 'Repo')).toBe(false)
  })

  it('parses the other shipped languages, not just TypeScript', async () => {
    const cases: [string, string, string, string][] = [
      ['a.py', 'python', 'def start(a):\n    return a\n', 'def boot(a):\n    return a\n'],
      ['a.go', 'go', 'package m\nfunc Start(a int) int { return a }\n', 'package m\nfunc Boot(a int) int { return a }\n'],
      ['a.rs', 'rust', 'fn start(a: u8) -> u8 { a }\n', 'fn boot(a: u8) -> u8 { a }\n'],
      ['a.rb', 'ruby', 'def start(a)\n  a\nend\n', 'def boot(a)\n  a\nend\n'],
      ['a.java', 'java', 'class A { int start(int a) { return a; } }', 'class A { int boot(int a) { return a; } }'],
      ['a.cs', 'c_sharp', 'class A { int Start(int a) { return a; } }', 'class A { int Boot(int a) { return a; } }']
    ]
    for (const [file, grammar, before, after] of cases) {
      const r = await semanticCompare(file, before, after)
      expect(r.language, file).toBe(grammar)
      expect(r.changes.filter((c) => c.kind === 'renamed'), file).toHaveLength(1)
    }
  })

  it('stays out of the way for languages with no grammar', async () => {
    const r = await semanticCompare('notes.txt', 'one\n', 'two\n')
    expect(r.language).toBeNull()
    expect(r.changes).toEqual([])
  })

  it('matches a rename whose body also changed, and counts its call sites', () => {
    const before = [
      { key: 'start', name: 'start', kind: 'function' as const, signature: '(a)', body: 'const x = compute(a); return x + 1', line: 1 }
    ]
    const after = [
      { key: 'boot', name: 'boot', kind: 'function' as const, signature: '(a)', body: 'const x = compute(a); return x + 2', line: 1 }
    ]
    const [change] = diffSymbols(before, after, 'start start', 'boot boot boot')
    expect(change.kind).toBe('renamed')
    expect(change.bodyChanged).toBe(true)
    expect(change.detail).toBe('3')
  })

  it('calls a symbol that only shifted position a move', () => {
    const sym = { name: 'f', kind: 'function' as const, signature: '()', body: 'return 1' }
    const [change] = diffSymbols([{ ...sym, key: 'f', line: 10 }], [{ ...sym, key: 'f', line: 42 }])
    expect(change.kind).toBe('moved')
    expect(change.detail).toBe('+32')
  })

  it('ignores the small drift of a symbol whose neighbour grew', () => {
    const sym = { name: 'f', kind: 'function' as const, signature: '()', body: 'return 1' }
    expect(diffSymbols([{ ...sym, key: 'f', line: 10 }], [{ ...sym, key: 'f', line: 12 }])).toEqual([])
  })

  it('refuses to pair two unrelated one-liners as a rename', async () => {
    // `return "pong"` and `return true` share most of their characters; only a
    // long-enough body may be matched on similarity alone.
    const before = 'package m\nfunc LegacyPing() string { return "pong" }\n'
    const after = 'package m\nfunc HealthCheck() bool { return true }\n'
    const { changes } = await semanticCompare('a.go', before, after)
    expect(changes.map((c) => c.kind).sort()).toEqual(['added', 'removed'])
  })
})

describe('semanticDiff over git blobs (conflict-radar playground)', () => {
  const R = repoPath('conflict-radar')

  it('summarises a commit against its parent', async () => {
    // main's last commit rewrote start() → launch() in src/app.js.
    const r = await gitService.semanticDiff(
      R,
      'src/app.js',
      { kind: 'ref', ref: 'main^1' },
      { kind: 'ref', ref: 'main' }
    )
    expect(r.language).toBe('javascript')
    expect(r.changes[0]).toMatchObject({ kind: 'renamed', oldName: 'start', symbol: 'launch' })
  })

  it('returns nothing for a path missing on both sides', async () => {
    const r = await gitService.semanticDiff(R, 'nope.ts', { kind: 'ref', ref: 'main' }, { kind: 'ref', ref: 'main' })
    expect(r).toEqual({ language: null, changes: [] })
  })
})

describe('rangeDiff + refTips (force-push playground)', () => {
  // The fixture is deliberately left un-fetched so the app can demo the
  // discovery; the copy fetches for real (its origin is the same bare repo).
  let R = ''
  let forced: Awaited<ReturnType<typeof gitService.fetchAll>> = []

  beforeAll(async () => {
    R = cloneFixture('force-push')
    forced = await gitService.fetchAll(R)
  })

  it('reports the force-pushed ref, with the commit it used to point at', () => {
    expect(forced).toHaveLength(1)
    expect(forced[0].ref).toBe('origin/feature/login')
    expect(forced[0].oldSha).not.toBe(forced[0].newSha)
  })

  it('reads the previous positions of a tracking ref from its reflog', async () => {
    const tips = await gitService.refTips(R, 'origin/feature/login')
    expect(tips.length).toBeGreaterThanOrEqual(2)
    expect(tips[0].selector).toBe('origin/feature/login@{0}')
    // The rewrite is recorded as a forced update, which is what makes it
    // findable without any bookkeeping of our own.
    expect(tips.some((t) => /forced-update/.test(t.reason))).toBe(true)
    expect(tips[0].sha).not.toBe(tips[1].sha)
    // The tip we now hold is the one the fetch reported.
    expect(tips[0].sha).toBe(forced[0].newSha)
  })

  it('pairs the rewritten commit and separates the dropped and new ones', async () => {
    const entries = await gitService.rangeDiff(R, forced[0].oldSha, 'origin/feature/login')
    const byKind = (k: string): string[] => entries.filter((e) => e.kind === k).map((e) => e.subject)
    expect(byKind('modified')).toEqual(['validate password'])
    expect(byKind('removed')).toEqual(['add debug logging'])
    expect(byKind('added')).toEqual(['add rate limiting'])
  })

  it('accepts a reflog selector, which the plain old...new form rejects', async () => {
    const entries = await gitService.rangeDiff(R, 'origin/feature/login@{1}', 'origin/feature/login')
    expect(entries.some((e) => e.kind === 'modified')).toBe(true)
  })

  it('carries the interdiff of the rewritten commit, not its whole content', async () => {
    const entries = await gitService.rangeDiff(R, 'origin/feature/login@{1}', 'origin/feature/login')
    const rewritten = entries.find((e) => e.kind === 'modified')!
    expect(rewritten.body).toContain('validate password (min length)')
    expect(rewritten.body).toContain('pw.length < 12')
    expect(rewritten.oldSha).toBeTruthy()
    expect(rewritten.newSha).toBeTruthy()
    expect(rewritten.oldSha).not.toBe(rewritten.newSha)
  })

  it('reports nothing when a ref is compared with itself', async () => {
    expect(await gitService.rangeDiff(R, 'main', 'main')).toEqual([])
  })

  it('returns no tips for a ref that has no reflog', async () => {
    expect(await gitService.refTips(R, 'refs/heads/does-not-exist')).toEqual([])
  })
})

describe('absorb (absorb playground)', () => {
  it('routes each staged hunk to the commit that introduced its lines', async () => {
    const R = cloneFixture('absorb')
    await gitService.stageAll(R)
    const plan = await gitService.absorbPlan(R)

    expect(plan.targets.map((t) => t.subject)).toEqual(['feat: add parser', 'feat: add auth'])
    expect(plan.targets[0].hunks.map((h) => h.file)).toEqual(['src/parser.ts'])
    expect(plan.targets[1].hunks.map((h) => h.file)).toEqual(['src/auth.ts'])
    // The untouched commit is not dragged in.
    expect(plan.targets.some((t) => t.subject.includes('logger'))).toBe(false)
    // A brand-new file has no history to be absorbed into.
    expect(plan.unmatched.map((h) => h.file)).toEqual(['src/cache.ts'])
    expect(plan.base).toBe('origin/main')
  })

  it('never offers to rewrite a commit that is already pushed', async () => {
    const R = cloneFixture('absorb')
    // Publish everything: now there is nothing left that may be rewritten.
    // Push to a throwaway bare repo — the fixture's own origin is shared with
    // the playground, and writing to it would corrupt the next test run.
    const bare = mkdtempSync(join(tmpdir(), 'gitcito-absorb-origin-'))
    execFileSync('git', ['init', '-q', '--bare', bare])
    execFileSync('git', ['-C', R, 'remote', 'set-url', 'origin', bare])
    execFileSync('git', ['-C', R, 'push', '-q', 'origin', 'HEAD:main'])
    execFileSync('git', ['-C', R, 'fetch', '-q', 'origin'])
    await gitService.stageAll(R)
    const plan = await gitService.absorbPlan(R)
    expect(plan.targets).toEqual([])
  })

  it('creates one fixup per target and leaves the rest staged', async () => {
    const R = cloneFixture('absorb')
    await gitService.stageAll(R)
    const res = await gitService.absorbApply(R)

    expect(res).toEqual({ created: 2, rebased: false })
    const log = await gitService.log(R, 10)
    expect(log.slice(0, 2).map((c) => c.subject)).toEqual(['fixup! feat: add parser', 'fixup! feat: add auth'])
    // The unattributed file is still staged, ready to be committed normally.
    const status = await gitService.status(R)
    expect(status.staged.map((f) => f.path)).toEqual(['src/cache.ts'])
    expect(status.unstaged).toEqual([])
  })

  it('folds the fixups into their commits when asked to rebase', async () => {
    const R = cloneFixture('absorb')
    await gitService.stageAll(R)
    const res = await gitService.absorbApply(R, { rebase: true })

    expect(res).toEqual({ created: 2, rebased: true })
    const log = await gitService.log(R, 10)
    // Back to the original three commits — no fixup left behind.
    expect(log.map((c) => c.subject)).toEqual([
      'feat: add logger',
      'feat: add parser',
      'feat: add auth',
      'init: readme'
    ])
    // The fix really landed inside the commit that needed it.
    const auth = await gitService.fileContent(R, 'src/auth.ts', log[2].hash)
    expect(auth).toContain('if (!password) return null')
    // …and the unrelated change survived the rebase, still staged.
    expect((await gitService.status(R)).staged.map((f) => f.path)).toEqual(['src/cache.ts'])
  })

  it('says why there is nothing to do instead of failing', async () => {
    const R = cloneFixture('absorb')
    expect((await gitService.absorbPlan(R)).reason).toBe('no-staged')
    expect(await gitService.absorbApply(R)).toEqual({ created: 0, rebased: false })
  })
})

describe('listDirAt — time machine tree (semantic-diff playground)', () => {
  const R = repoPath('semantic-diff')

  it('lists a past commit tree without touching the working copy', async () => {
    const root = await gitService.listDirAt(R, 'HEAD')
    // Directories first, then files, each alphabetically — same order the
    // working-tree listing uses.
    expect(root.map((e) => e.name)).toEqual(['src', 'notes.txt', 'README.md'])
    expect(root.find((e) => e.name === 'src')?.dir).toBe(true)
    // Reading history must not disturb the checkout.
    const status = await gitService.status(R)
    expect(status.staged).toEqual([])
  })

  it('returns repo-relative paths for a subdirectory', async () => {
    const src = await gitService.listDirAt(R, 'HEAD', 'src')
    expect(src.map((e) => e.path)).toEqual(['src/api.py', 'src/app.ts', 'src/server.go'])
    expect(src.every((e) => !e.dir)).toBe(true)
  })

  it('reflects the tree as it was, not as it is', async () => {
    // The refactor commit is the tip; its parent still has the old file set.
    const now = await gitService.listDirAt(R, 'HEAD', 'src')
    const before = await gitService.listDirAt(R, 'HEAD~1', 'src')
    expect(now.map((e) => e.name)).toEqual(before.map((e) => e.name))
    const oldApp = await gitService.fileContent(R, 'src/app.ts', 'HEAD~1')
    expect(oldApp).toContain('startServer')
    expect(oldApp).not.toContain('bootServer')
  })

  it('treats a folder that does not exist at that commit as empty', async () => {
    expect(await gitService.listDirAt(R, 'HEAD', 'nope')).toEqual([])
    expect(await gitService.listDirAt(R, 'deadbeef', '')).toEqual([])
  })
})

describe('timelapseData (time-machine playground)', () => {
  const R = repoPath('time-machine')

  it('streams the whole history oldest-first, with the files each commit touched', async () => {
    const data = await gitService.timelapseData(R)
    expect(data).toHaveLength(12)
    expect(data[0].subject).toBe('init: one-file app')
    expect(data[data.length - 1].subject).toBe('chore: release 1.2.0')
    expect(data[0].files).toEqual([{ path: 'index.js', status: 'A' }])
    expect(data.every((c) => c.author === 'Playground' && c.date > 0)).toBe(true)
  })

  it('reports adds, edits and deletions so the animation can play them', async () => {
    const data = await gitService.timelapseData(R)
    const bySubject = new Map(data.map((c) => [c.subject, c]))

    const extract = bySubject.get('refactor: extract lib/util.js')!
    expect(extract.files).toEqual([
      { path: 'index.js', status: 'M' },
      { path: 'lib/util.js', status: 'A' }
    ])

    const dropped = bySubject.get('chore: drop unused formatter')!
    expect(dropped.files).toEqual([{ path: 'src/utils/format.js', status: 'D' }])

    // A rename is reported as one entry, not an unrelated add + delete.
    const moved = bySubject.get('chore: move entry point into src/')!
    expect(moved.files).toEqual([{ path: 'src/index.js', status: 'R' }])
  })

  it('honours the commit cap', async () => {
    expect(await gitService.timelapseData(R, 3)).toHaveLength(3)
  })
})

describe('repoPulse — mission control (playground)', () => {
  it('reads branch, upstream and ahead/behind in one pass', async () => {
    const p = await gitService.repoPulse(repoPath('absorb'))
    expect(p.name).toBe('absorb')
    expect(p.branch).toBe('main')
    expect(p.upstream).toBe('origin/main')
    // Three unpushed commits is exactly what makes that fixture absorbable.
    expect(p.ahead).toBe(3)
    expect(p.behind).toBe(0)
    expect(p.lastCommitAt).toBeGreaterThan(0)
    expect(p.error).toBeNull()
  })

  it('counts staged, unstaged and untracked separately', async () => {
    const R = cloneFixture('absorb')
    let p = await gitService.repoPulse(R)
    // The fixture leaves two edits and one new file in the working tree.
    expect(p.unstaged).toBe(2)
    expect(p.untracked).toBe(1)
    expect(p.staged).toBe(0)

    await gitService.stageAll(R)
    p = await gitService.repoPulse(R)
    expect(p.staged).toBe(3)
    expect(p.unstaged).toBe(0)
    expect(p.untracked).toBe(0)
  })

  it('flags a conflicted merge left in progress', async () => {
    const R = cloneFixture('merge-conflict')
    await gitService.merge(R, 'feature').catch(() => undefined) // conflicts on purpose
    const p = await gitService.repoPulse(R)
    expect(p.operation).toBe('merge')
    expect(p.conflicted).toBeGreaterThan(0)
  })

  it('counts stashes', async () => {
    const R = cloneFixture('stash-picking')
    const before = await gitService.repoPulse(R)
    expect(before.stashes).toBeGreaterThan(0)
  })

  it('reports an unreadable path instead of throwing', async () => {
    const p = await gitService.repoPulse('/definitely/not/a/repo')
    expect(p.error).toBeTruthy()
    expect(p.branch).toBe('')
  })
})

describe('repoPulse activity + repoDetail (mission control)', () => {
  it('buckets recent commits per day for the sparkline', async () => {
    const R = cloneFixture('absorb')
    const p = await gitService.repoPulse(R)
    expect(p.activity).toHaveLength(14)
    // The fixture's commits were made just now, so they land in the last bucket.
    expect(p.activity[13]).toBeGreaterThan(0)
    expect(p.activity.slice(0, 13).every((n) => n === 0)).toBe(true)
  })

  it('lists what is dirty and what is waiting to be pushed', async () => {
    const R = cloneFixture('absorb')
    const detail = await gitService.repoDetail(R)
    // Three unpushed commits, newest first.
    expect(detail.commits.map((c) => c.subject)).toEqual([
      'feat: add logger',
      'feat: add parser',
      'feat: add auth'
    ])
    expect(detail.commits.every((c) => /^[0-9a-f]{7,}$/.test(c.hash))).toBe(true)
    // Two edits plus the untracked file the fixture leaves behind — the row
    // shows everything that is in flight, however it got there.
    expect(detail.files.map((f) => `${f.status} ${f.path}`).sort()).toEqual([
      '? src/cache.ts',
      'M src/auth.ts',
      'M src/parser.ts'
    ])
  })

  it('caps how much detail it reads', async () => {
    const detail = await gitService.repoDetail(repoPath('deep-history-monorepo'), 3)
    expect(detail.commits.length).toBeLessThanOrEqual(3)
    expect(detail.files.length).toBeLessThanOrEqual(3)
  })
})

describe('discoverLaunch — compounds & serverReadyAction (launch-configs playground)', () => {
  it('surfaces a compound as a synthetic config carrying its members and stopAll', async () => {
    const { discoverLaunch } = await import('../src/main/launch')
    const groups = await discoverLaunch(repoPath('launch-configs'))
    const root = groups.find((g) => g.isRoot)
    expect(root).toBeDefined()
    const compound = root!.configs.find((c) => c.name === 'Run both services')
    expect(compound).toBeDefined()
    expect(compound!.type).toBe('compound')
    expect(compound!.compound).toEqual(['Service A', 'Service B'])
    expect(compound!.compoundStopAll).toBe(true)
    // Both members exist as plain configs, so the renderer can spawn one
    // parallel session per member.
    expect(root!.configs.some((c) => c.name === 'Service A')).toBe(true)
    expect(root!.configs.some((c) => c.name === 'Service B')).toBe(true)
  })

  it('parses the inputs array — promptString and pickString with options and defaults', async () => {
    const { discoverLaunch } = await import('../src/main/launch')
    const groups = await discoverLaunch(repoPath('launch-configs'))
    const root = groups.find((g) => g.isRoot)!
    const who = root.inputs.find((i) => i.id === 'who')
    expect(who).toMatchObject({ type: 'promptString', default: 'gitcito' })
    const greeting = root.inputs.find((i) => i.id === 'greeting')
    expect(greeting).toMatchObject({ type: 'pickString', default: 'hola' })
    expect(greeting!.options).toEqual(['hola', 'hello', 'bonjour', 'ciao'])
  })

  it('preserves serverReadyAction on the config it belongs to', async () => {
    const { discoverLaunch } = await import('../src/main/launch')
    const groups = await discoverLaunch(repoPath('launch-configs'))
    const root = groups.find((g) => g.isRoot)!
    const srv = root.configs.find((c) => c.name === 'Server (opens browser when ready)')
    expect(srv).toBeDefined()
    expect(srv!.serverReadyAction?.pattern).toContain('Local:')
    expect(srv!.serverReadyAction?.action).toBe('openExternally')
  })
})
