import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { gitService } from '../src/main/git'
import { readManifest, repoPath } from './helpers'

// Fixture-level smoke tests: the playground generated and every scenario is a
// real, openable git repo. Fast guardrail before the deeper assertions.
const EXPECTED = [
  'merge-conflict',
  'cherry-pick',
  'stash-picking',
  'rebase-conflict',
  'interactive-rebase',
  'bisect-bug',
  'multi-remote',
  'octopus-merge',
  'tags-and-releases',
  'detached-head',
  'collaborators',
  'submodules-worktrees',
  'reflog-recovery',
  'binary-images-unicode',
  'deep-history-monorepo',
  'image-showcase'
]

describe('playground fixtures', () => {
  const manifest = readManifest()

  it('manifest lists every expected scenario', () => {
    const names = manifest.map((m) => m.name)
    for (const name of EXPECTED) expect(names).toContain(name)
    expect(names.length).toBe(EXPECTED.length)
  })

  it('every manifest entry has a description', () => {
    for (const m of manifest) expect(m.description.length).toBeGreaterThan(0)
  })

  it('git is available', async () => {
    expect(await gitService.version()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it.each(EXPECTED)('"%s" is an openable git repo', async (name) => {
    const path = repoPath(name)
    expect(existsSync(resolve(path, '.git')), `${name}/.git missing`).toBe(true)
    const summary = await gitService.open(path)
    expect(summary.name).toBe(name)
    expect(summary.current.length).toBeGreaterThan(0)
  })
})
