import { mkdtempSync, cpSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repoPath } from './helpers'

// Mutation tests must not corrupt the shared playground repos. cloneFixture()
// copies a scenario repo (including its .git) into a throwaway temp dir; the
// test mutates the copy. Call cleanupFixtures() in afterAll to remove them.
//
// Only use this for self-contained repos — NOT submodules-worktrees, whose
// linked worktrees / submodule gitlinks point at absolute paths that don't
// survive a copy.
const created: string[] = []

export function cloneFixture(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `gitcito-${name}-`))
  cpSync(repoPath(name), dir, { recursive: true })
  // The developer's global git config must not decide what these tests see.
  // `rerere.enabled` in particular changes what a conflicting merge leaves
  // behind, so a machine with it on would fail tests that have nothing to do
  // with it. Tests that *are* about rerere turn it on themselves.
  neutralize(dir)
  created.push(dir)
  return dir
}

/** Pin the settings that would otherwise leak in from the machine's config. */
function neutralize(dir: string): void {
  try {
    execFileSync('git', ['-C', dir, 'config', '--local', 'rerere.enabled', 'false'], { stdio: 'ignore' })
    rmSync(join(dir, '.git', 'rr-cache'), { recursive: true, force: true })
  } catch {
    /* a bare fixture (a .git directory used as a remote) has neither */
  }
}

export function cleanupFixtures(): void {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
}
