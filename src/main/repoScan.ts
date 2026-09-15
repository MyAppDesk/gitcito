import { join } from 'path'
import { readdir } from 'fs/promises'
import { gitDirOf } from './repoMeta'

// Walking a developer's home directory naively means a million files. Three
// rules keep a scan to a fraction of a second: stop at a repository (its own
// contents are never interesting), never enter a dot-directory, and skip the
// dependency folders that dwarf everything else.

const SKIP = new Set(['node_modules', 'vendor', 'Pods', 'target', 'dist', 'build', 'out'])

// The renderer's depth input clamps to this range too, but a renderer is not
// a trustworthy source of limits — an unbounded depth here is an unbounded
// recursive filesystem walk, so the ceiling is enforced again at the source.
const MAX_SCAN_DEPTH = 10

/** Absolute paths of every repository under `root`, to `depth` levels. */
export async function scanForRepos(root: string, depth: number): Promise<string[]> {
  const found: string[] = []
  await walk(root, Math.min(MAX_SCAN_DEPTH, Math.max(0, depth)), found)
  return found
}

async function walk(dir: string, depth: number, found: string[]): Promise<void> {
  if (await gitDirOf(dir)) {
    found.push(dir)
    return
  }
  if (depth === 0) return

  let entries: string[]
  try {
    const dirents = await readdir(dir, { withFileTypes: true })
    entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name)
  } catch {
    return
  }

  for (const name of entries) {
    if (name.startsWith('.') || SKIP.has(name)) continue
    await walk(join(dir, name), depth - 1, found)
  }
}
