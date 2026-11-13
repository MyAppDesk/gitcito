// Perf check for the batched discard: N dirty files in one call must stay fast.
import { describe, it, expect, afterAll } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gitService } from '../src/main/git'

const dirs: string[] = []
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))

describe('discard batching', () => {
  it('discards 30 modified files in a handful of spawns, not one-per-file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-bench-'))
    dirs.push(dir)
    const git = (...a: string[]): string =>
      execFileSync('git', ['-C', dir, '-c', 'user.name=T', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' })
    git('init', '-q', '-b', 'main')
    const files = Array.from({ length: 30 }, (_, i) => `f${i}.txt`)
    files.forEach((f) => writeFileSync(join(dir, f), 'x\n'))
    git('add', '-A')
    git('commit', '-qm', 's')
    files.forEach((f) => writeFileSync(join(dir, f), 'changed\n'))

    const t0 = performance.now()
    await gitService.discard(dir, files, false)
    const ms = performance.now() - t0
    // The old per-file cascade paid up to ~5 spawns per path (~150 for 30
    // files); the batch needs ~6. Generous bound so CI noise cannot flake it.
    expect(git('status', '--porcelain').trim()).toBe('')
    expect(ms).toBeLessThan(5000)
    // eslint-disable-next-line no-console
    console.log(`[bench] discarded 30 files in ${Math.round(ms)}ms`)
  })
})
