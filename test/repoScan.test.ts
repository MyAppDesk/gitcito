import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanForRepos } from '../src/main/repoScan'

const roots: string[] = []

/** A tree of fake repos: a .git directory is all the scanner looks for. */
function tree(): string {
  const root = mkdtempSync(join(tmpdir(), 'gitcito-scan-'))
  roots.push(root)
  const repo = (rel: string): void => {
    mkdirSync(join(root, rel, '.git'), { recursive: true })
    writeFileSync(join(root, rel, '.git', 'HEAD'), 'ref: refs/heads/main\n')
  }
  repo('alpha')
  repo('client/beta')
  repo('client/gamma')
  repo('too/deep/for/us/delta')
  repo('alpha/vendor/nested')
  repo('node_modules/evil')
  mkdirSync(join(root, 'plain-folder'), { recursive: true })
  return root
}

afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true })
})

describe('scanForRepos', () => {
  it('finds repos down to the given depth', async () => {
    const root = tree()
    const found = await scanForRepos(root, 3)
    expect(found).toContain(join(root, 'alpha'))
    expect(found).toContain(join(root, 'client', 'beta'))
    expect(found).toContain(join(root, 'client', 'gamma'))
  })

  it('does not descend past the depth limit', async () => {
    const root = tree()
    const found = await scanForRepos(root, 3)
    expect(found).not.toContain(join(root, 'too', 'deep', 'for', 'us', 'delta'))
  })

  it('stops at a repository rather than walking into it', async () => {
    const root = tree()
    const found = await scanForRepos(root, 5)
    expect(found).not.toContain(join(root, 'alpha', 'vendor', 'nested'))
  })

  it('skips node_modules', async () => {
    const root = tree()
    const found = await scanForRepos(root, 5)
    expect(found).not.toContain(join(root, 'node_modules', 'evil'))
  })

  it('returns nothing for a root that does not exist', async () => {
    expect(await scanForRepos('/definitely/not/here', 3)).toEqual([])
  })
})
