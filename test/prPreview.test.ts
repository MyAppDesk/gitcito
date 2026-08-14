import { describe, it, expect, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gitService } from '../src/main/git'
import { prRefCandidates, parsePrNumber, defaultPreviewBranch, flavorForRemoteUrl } from '../src/shared/prRefs'
import { cloneFixture, cleanupFixtures } from './fixtures'

afterAll(cleanupFixtures)

const git = (repo: string, ...args: string[]): string =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()

describe('pull request ref conventions', () => {
  it('offers every convention, with the URL-hinted one first', () => {
    const gh = prRefCandidates(7, 'https://github.com/owner/repo.git')
    expect(gh[0]).toEqual({ flavor: 'github', ref: 'refs/pull/7/head' })
    expect(gh).toHaveLength(4)

    const gl = prRefCandidates(7, 'git@gitlab.example.com:group/repo.git')
    expect(gl[0]).toEqual({ flavor: 'gitlab', ref: 'refs/merge-requests/7/head' })
    // The others are still probed — a vanity domain must not rule anything out.
    expect(gl.map((c) => c.ref)).toContain('refs/pull/7/head')

    // An unrecognisable host keeps the default order rather than dropping any.
    expect(prRefCandidates(7, 'https://git.example.net/repo.git').map((c) => c.flavor)).toEqual([
      'github',
      'gitlab',
      'bitbucket',
      'azure'
    ])
  })

  it('reads a PR number from a bare number, a #ref or any forge URL', () => {
    expect(parsePrNumber('7')).toBe(7)
    expect(parsePrNumber(' #42 ')).toBe(42)
    expect(parsePrNumber('https://github.com/o/r/pull/7')).toBe(7)
    expect(parsePrNumber('https://github.com/o/r/pull/7/files')).toBe(7)
    expect(parsePrNumber('https://gitlab.com/g/p/-/merge_requests/13')).toBe(13)
    expect(parsePrNumber('https://bitbucket.org/o/r/pull-requests/5')).toBe(5)
    expect(parsePrNumber('https://dev.azure.com/org/proj/_git/r/pullrequest/9')).toBe(9)
    expect(parsePrNumber('not a pr')).toBeNull()
    expect(parsePrNumber('')).toBeNull()
  })

  it('suggests a predictable local branch name', () => {
    expect(defaultPreviewBranch({ number: 7 })).toBe('pr/7')
    expect(defaultPreviewBranch({ branch: 'origin/feature/x' })).toBe('preview/feature/x')
    expect(defaultPreviewBranch({})).toBe('')
    expect(flavorForRemoteUrl(undefined)).toBeNull()
  })
})

// A "remote" here is another local repository with PR refs written into it by
// hand — exactly the shape a forge serves, without needing the network.
function upstreamWithPrRefs(): { upstream: string; local: string; featureSha: string; cleanSha: string } {
  const upstream = cloneFixture('merge-conflict')
  const featureSha = git(upstream, 'rev-parse', 'feature')

  // A second head that merges into main without conflicting, so both outcomes
  // of the merge preview are covered.
  git(upstream, 'checkout', '-b', 'tidy', 'main')
  writeFileSync(join(upstream, 'NOTES.md'), 'from the pull request\n')
  git(upstream, 'add', 'NOTES.md')
  git(upstream, 'commit', '-m', 'docs: add notes')
  const cleanSha = git(upstream, 'rev-parse', 'HEAD')
  git(upstream, 'checkout', 'main')

  git(upstream, 'update-ref', 'refs/pull/7/head', featureSha)
  git(upstream, 'update-ref', 'refs/merge-requests/3/head', cleanSha)

  const local = cloneFixture('merge-conflict')
  git(local, 'remote', 'add', 'up', upstream)
  return { upstream, local, featureSha, cleanSha }
}

describe('resolvePrRef', () => {
  it('finds the ref a pull request head lives under, and reports the flavor', async () => {
    const { local, featureSha, cleanSha } = upstreamWithPrRefs()

    const gh = await gitService.resolvePrRef(local, 'up', 7)
    expect(gh).toEqual({ flavor: 'github', ref: 'refs/pull/7/head', sha: featureSha })

    // The same probe finds a GitLab-style ref on the same remote — the
    // convention is discovered, not assumed from the URL.
    const gl = await gitService.resolvePrRef(local, 'up', 3)
    expect(gl).toEqual({ flavor: 'gitlab', ref: 'refs/merge-requests/3/head', sha: cleanSha })
  })

  it('returns null when the remote publishes no ref for that number', async () => {
    const { local } = upstreamWithPrRefs()
    expect(await gitService.resolvePrRef(local, 'up', 999)).toBeNull()
  })
})

describe('previewRef', () => {
  it('checks the pull request head out onto a local branch, leaving no commit behind', async () => {
    const { local, featureSha } = upstreamWithPrRefs()
    const before = git(local, 'rev-parse', 'main')

    const res = await gitService.previewRef(local, 'up', 'refs/pull/7/head', 'checkout', 'pr/7')
    expect(res).toMatchObject({ mode: 'checkout', localBranch: 'pr/7', sha: featureSha, conflicts: [] })
    expect((await gitService.open(local)).current).toBe('pr/7')
    // main is untouched and nothing was committed on top of the fetched head.
    expect(git(local, 'rev-parse', 'main')).toBe(before)
    expect(git(local, 'rev-parse', 'HEAD')).toBe(featureSha)
  })

  it('moves an existing preview branch to the new head instead of failing', async () => {
    const { local, featureSha, cleanSha } = upstreamWithPrRefs()

    await gitService.previewRef(local, 'up', 'refs/merge-requests/3/head', 'checkout', 'pr/7')
    expect(git(local, 'rev-parse', 'pr/7')).toBe(cleanSha)

    await gitService.previewRef(local, 'up', 'refs/pull/7/head', 'checkout', 'pr/7')
    expect(git(local, 'rev-parse', 'pr/7')).toBe(featureSha)
  })

  it('merges a clean pull request into the current branch without committing', async () => {
    const { local } = upstreamWithPrRefs()
    const head = git(local, 'rev-parse', 'HEAD')

    const res = await gitService.previewRef(local, 'up', 'refs/merge-requests/3/head', 'merge')
    expect(res.conflicts).toEqual([])
    // The tree is merged, but HEAD has not moved — that is what makes it a preview.
    expect(git(local, 'rev-parse', 'HEAD')).toBe(head)
    expect(await gitService.mergeState(local)).toBe('merge')
    expect(git(local, 'diff', '--cached', '--name-only')).toContain('NOTES.md')

    await gitService.conflictOpAbort(local, 'merge')
    expect(await gitService.mergeState(local)).toBeNull()
    expect((await gitService.status(local)).conflicted.length).toBe(0)
  })

  it('reports conflicts rather than throwing, so the conflicted tree can be inspected', async () => {
    const { local } = upstreamWithPrRefs()

    const res = await gitService.previewRef(local, 'up', 'refs/pull/7/head', 'merge')
    expect(res.conflicts.length).toBeGreaterThan(0)
    expect(await gitService.mergeState(local)).toBe('merge')

    await gitService.conflictOpAbort(local, 'merge')
    expect(await gitService.mergeState(local)).toBeNull()
  })

  it('refuses a checkout preview with no branch name to put it on', async () => {
    const { local } = upstreamWithPrRefs()
    await expect(gitService.previewRef(local, 'up', 'refs/pull/7/head', 'checkout')).rejects.toThrow()
  })
})
