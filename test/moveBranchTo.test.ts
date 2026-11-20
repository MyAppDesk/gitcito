import { describe, it, expect, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { gitService } from '../src/main/git'
import { cloneFixture, cleanupFixtures } from './fixtures'

afterAll(() => cleanupFixtures())

const rev = (repo: string, ref: string): string =>
  execFileSync('git', ['-C', repo, 'rev-parse', ref], { encoding: 'utf8' }).trim()

describe('moveBranchTo — a commit dropped on a branch badge', () => {
  it('moves a branch that is not checked out and returns where it was', async () => {
    const R = cloneFixture('absorb')
    const head = rev(R, 'HEAD')
    const parent = rev(R, 'HEAD~1')
    execFileSync('git', ['-C', R, 'branch', 'side', parent])
    const before = await gitService.moveBranchTo(R, 'side', head)
    expect(before).toBe(parent)
    expect(rev(R, 'side')).toBe(head)
    // The undo path: put it back.
    await gitService.setBranchRef(R, 'side', before)
    expect(rev(R, 'side')).toBe(parent)
  })

  it('refuses to move the branch that is checked out', async () => {
    const R = cloneFixture('absorb')
    const current = execFileSync('git', ['-C', R, 'branch', '--show-current'], { encoding: 'utf8' }).trim()
    await expect(gitService.moveBranchTo(R, current, rev(R, 'HEAD~1'))).rejects.toThrow()
  })
})
