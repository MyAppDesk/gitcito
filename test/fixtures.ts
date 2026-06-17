import { mkdtempSync, cpSync, rmSync } from 'node:fs'
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
  created.push(dir)
  return dir
}

export function cleanupFixtures(): void {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
}
