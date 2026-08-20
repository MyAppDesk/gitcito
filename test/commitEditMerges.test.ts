import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { gitService } from '../src/main/git'

// Commit editing across merges: the cascade replays merge commits by
// cherry-picking their RECORDED result (tree + resolutions) onto the rewritten
// first parent, preserving every parent pointer through an old→new map.

const tmp: string[] = []
afterAll(() => {
  for (const d of tmp) rmSync(d, { recursive: true, force: true })
})

const g = (repo: string, ...args: string[]): string =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf-8' }).trim()

/**
 * A: adds config.txt + feature.txt("base"), the edit target.
 * side (from A): changes feature.txt to "side-change".
 * B (main): changes feature.txt to "main-change".
 * M: merge side into main — CONFLICT, resolved by hand as "resolved-by-human".
 * C: touches an unrelated file on top.
 */
function makeMergeRepo(): { repo: string; A: string; B: string; side: string; M: string } {
  const repo = mkdtempSync(join(tmpdir(), 'gitcito-editmerge-'))
  tmp.push(repo)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  g(repo, 'config', 'user.email', 't@t')
  g(repo, 'config', 'user.name', 'T')
  writeFileSync(join(repo, 'config.txt'), 'setting=1\n')
  writeFileSync(join(repo, 'feature.txt'), 'base\n')
  g(repo, 'add', '.')
  g(repo, 'commit', '-qm', 'A: base')
  const A = g(repo, 'rev-parse', 'HEAD')

  g(repo, 'checkout', '-q', '-b', 'side')
  writeFileSync(join(repo, 'feature.txt'), 'side-change\n')
  g(repo, 'commit', '-qam', 'side: change feature')
  const side = g(repo, 'rev-parse', 'HEAD')

  g(repo, 'checkout', '-q', 'main')
  writeFileSync(join(repo, 'feature.txt'), 'main-change\n')
  g(repo, 'commit', '-qam', 'B: change feature on main')
  const B = g(repo, 'rev-parse', 'HEAD')

  try {
    g(repo, 'merge', '--no-ff', 'side')
  } catch {
    /* expected conflict */
  }
  writeFileSync(join(repo, 'feature.txt'), 'resolved-by-human\n')
  g(repo, 'add', 'feature.txt')
  g(repo, 'commit', '-qm', 'M: merge side')
  const M = g(repo, 'rev-parse', 'HEAD')

  writeFileSync(join(repo, 'other.txt'), 'later\n')
  g(repo, 'add', 'other.txt')
  g(repo, 'commit', '-qm', 'C: later work')
  return { repo, A, B, side, M }
}

describe('commit editing across merges', () => {
  it('replays a merge with its recorded conflict resolution intact', async () => {
    const { repo, A, side } = makeMergeRepo()
    const info = await gitService.commitEditInfo(repo, A)
    expect(info.ancestor).toBe(true)
    expect(info.merges).toBe(1)

    const preview = await gitService.commitEditPreview(repo, A, { 'config.txt': 'setting=2\n' }, '')
    expect(preview.newTip).not.toBeNull()
    const mergeStep = preview.steps.find((s) => s.merge)
    expect(mergeStep?.status).toBe('clean')

    const res = await gitService.commitEditApply(repo, A, { 'config.txt': 'setting=2\n' }, '')
    // The hand-made resolution survived the replay verbatim.
    expect(readFileSync(join(repo, 'feature.txt'), 'utf-8')).toBe('resolved-by-human\n')
    // The edit reached the tip.
    expect(readFileSync(join(repo, 'config.txt'), 'utf-8')).toBe('setting=2\n')
    // The replayed merge still has two parents, and the side branch — which
    // also descends from A — was itself rewritten and re-pointed.
    const newMerge = g(repo, 'rev-parse', 'HEAD^')
    const parents = g(repo, 'rev-list', '--parents', '-n', '1', newMerge).split(' ')
    expect(parents).toHaveLength(3)
    const newSide = parents[2]
    expect(newSide).not.toBe(side)
    expect(g(repo, 'show', `${newSide}:config.txt`)).toBe('setting=2')
    // History depth is unchanged.
    expect(g(repo, 'rev-list', '--count', 'HEAD')).toBe('5')
    expect(res.newTip).toBe(g(repo, 'rev-parse', 'HEAD'))
  })

  it('leaves a side branch alone when it does not descend from the edited commit', async () => {
    const { repo, B, side } = makeMergeRepo()
    // Editing B (after the branch point): side does not contain B.
    const preview = await gitService.commitEditPreview(repo, B, {}, 'B: reworded on main')
    expect(preview.newTip).not.toBeNull()
    await gitService.commitEditApply(repo, B, {}, 'B: reworded on main')
    const newMerge = g(repo, 'rev-parse', 'HEAD^')
    const parents = g(repo, 'rev-list', '--parents', '-n', '1', newMerge).split(' ')
    // Second parent is the ORIGINAL side commit — untouched identity.
    expect(parents[2]).toBe(side)
    expect(readFileSync(join(repo, 'feature.txt'), 'utf-8')).toBe('resolved-by-human\n')
  })

  it('forecasts a conflict when the edit collides with a replayed change', async () => {
    const { repo, A } = makeMergeRepo()
    // Editing the very line both branches rewrote cannot replay cleanly.
    const preview = await gitService.commitEditPreview(repo, A, { 'feature.txt': 'edited-base\n' }, '')
    expect(preview.newTip).toBeNull()
    expect(preview.steps.some((s) => s.status === 'conflict')).toBe(true)
    await expect(gitService.commitEditApply(repo, A, { 'feature.txt': 'edited-base\n' }, '')).rejects.toThrow(
      /conflict/i
    )
  })

  it('rewords a merge commit itself, keeping tree and both parents', async () => {
    const { repo, M } = makeMergeRepo()
    const info = await gitService.commitEditInfo(repo, M)
    expect(info.ancestor).toBe(true)
    const oldTree = g(repo, 'rev-parse', `${M}^{tree}`)
    await gitService.commitEditApply(repo, M, {}, 'M: reworded merge')
    const newMerge = g(repo, 'rev-parse', 'HEAD^')
    expect(g(repo, 'log', '-1', '--format=%s', newMerge)).toBe('M: reworded merge')
    expect(g(repo, 'rev-parse', `${newMerge}^{tree}`)).toBe(oldTree)
    expect(g(repo, 'rev-list', '--parents', '-n', '1', newMerge).split(' ')).toHaveLength(3)
  })
})
