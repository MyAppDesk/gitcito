import { describe, it } from 'vitest'
import { gitService } from '../src/main/git'

/**
 * Not an assertion suite — a measuring stick. Times the git service methods a
 * refresh actually calls, against a repository big enough for the differences
 * to be visible, and prints a table.
 *
 * Skipped unless pointed at a repo, because the answer depends entirely on
 * which repo it runs against:
 *
 *   npm run playground:monster
 *   GITCITO_BENCH_REPO=examples/monster/universal-ish npx vitest run test/perf.bench.test.ts
 *
 * This measures the whole main-process path — subprocess spawn, git's own work,
 * and the parsing on our side — which is the part `examples/repo-stats.sh`
 * cannot see. When the two disagree, the gap is our parsing.
 */

const REPO = process.env.GITCITO_BENCH_REPO
const RUNS = Number(process.env.GITCITO_BENCH_RUNS ?? 5)

const suite = REPO ? describe : describe.skip

suite('refresh cost', () => {
  it(
    'times every read a full refresh performs',
    async () => {
      const repo = REPO as string
      const rows: { name: string; best: number; median: number; size: string }[] = []

      const measure = async (name: string, fn: () => Promise<unknown>): Promise<void> => {
        const times: number[] = []
        let last: unknown
        // One untimed call first: the git-dir cache, the pack index and the OS
        // file cache all warm up on it, and timing that once as if it were
        // steady state would blame the wrong thing.
        last = await fn()
        for (let i = 0; i < RUNS; i++) {
          const t0 = performance.now()
          last = await fn()
          times.push(performance.now() - t0)
        }
        times.sort((a, b) => a - b)
        rows.push({
          name,
          best: times[0],
          median: times[Math.floor(times.length / 2)],
          size: describeSize(last)
        })
      }

      await measure('log(400)', () => gitService.log(repo, 400))
      await measure('branches()', () => gitService.branches(repo))
      await measure('status()', () => gitService.status(repo))
      await measure('treeStatus()', () => gitService.treeStatus(repo))
      await measure('stashes()', () => gitService.stashes(repo))
      await measure('remotes()', () => gitService.remotes(repo))
      await measure('conflictContext()', () => gitService.conflictContext(repo))
      await measure('worktrees()', () => gitService.worktrees(repo))
      await measure('submodules()', () => gitService.submodules(repo))
      await measure('notedCommits()', () => gitService.notedCommits(repo))
      // The pair `doRefresh` fires together. They share one working-tree walk,
      // so this should land near a single status, not near the sum of two.
      await measure('status() + treeStatus() together', () =>
        Promise.all([gitService.status(repo), gitService.treeStatus(repo)])
      )

      // The renderer half of a refresh: the graph relayout that a new `commits`
      // array identity forces. Pure, so it can be timed here even though the
      // app itself is never launched.
      const { layoutGraph } = await import('../src/renderer/src/graph/layout')
      const commits = await gitService.log(repo, 400)
      await measure('layoutGraph(400 commits)', async () => layoutGraph(commits, new Set(), 'full', commits[0]?.hash))

      const width = Math.max(...rows.map((r) => r.name.length))
      const lines = rows.map(
        (r) => `  ${r.name.padEnd(width)}  ${fmt(r.median)}  (best ${fmt(r.best)})  ${r.size}`
      )
      // A full refresh fires these together and reads run concurrently, so the
      // wall-clock cost is the slowest one, not the sum. Both are worth seeing:
      // the sum is what the CPU pays, the max is what the user waits for.
      // The combined row measures the same work as two rows above it, so it is
      // a check on the coalescing, not part of what a refresh costs.
      const COMPOSITE = 'status() + treeStatus() together'
      const parts = rows.filter((r) => r.name !== COMPOSITE)
      const sum = parts.reduce((acc, r) => acc + r.median, 0)
      // treeStatus is only fetched while the sidebar's Files tab is open, so a
      // refresh has two shapes. Report both rather than one average of neither.
      const gitTab = parts.filter((r) => r.name !== 'treeStatus()')
      const wall = (rs: typeof rows): number => Math.max(...rs.map((r) => r.median))
      console.log(
        [
          '',
          `Repository: ${repo}  (median of ${RUNS} runs, after one warm-up)`,
          '',
          ...lines,
          '',
          `  ${'refresh wall, Git tab (no treeStatus)'.padEnd(width)}  ${fmt(wall(gitTab))}`,
          `  ${'refresh wall, Files tab'.padEnd(width)}  ${fmt(wall(parts))}`,
          `  ${'sum of all reads (what the CPU pays)'.padEnd(width)}  ${fmt(sum)}`,
          ''
        ].join('\n')
      )
    },
    { timeout: 600_000 }
  )
})

const fmt = (ms: number): string => `${ms.toFixed(0).padStart(5)} ms`

const describeSize = (v: unknown): string => {
  if (Array.isArray(v)) return `${v.length} items`
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    const parts = Object.entries(o)
      .filter(([, val]) => Array.isArray(val))
      .map(([k, val]) => `${k}=${(val as unknown[]).length}`)
    if (parts.length) return parts.join(' ')
    return `${Object.keys(o).length} keys`
  }
  return ''
}
