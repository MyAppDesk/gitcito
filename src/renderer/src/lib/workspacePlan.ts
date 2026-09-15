import type { Workspace } from '../../../shared/types'
import { tabRepos } from '../../../shared/types'

// Turning a scanned folder tree into workspaces. Pure and path-shaped: the
// caller hands in absolute paths and the workspaces that already exist, and
// gets back what a scan would offer to create. No filesystem, no IPC — the
// scanner has already done the walking, and all the structure we need survives
// in the paths it returned.

export interface WorkspaceCandidate {
  /** Folder name — and the workspace name. For the loose row, the root's own
   *  basename. */
  name: string
  /** Absolute folder path. The row's identity, and what is written to
   *  `Workspace.sourcePath`. */
  path: string
  /** Every repository beneath this folder, absolute, sorted by name. */
  repoPaths: string[]
  /** Of those, the ones not already a tab in `existingWorkspaceId`. Equal to
   *  `repoPaths` when there is no existing workspace. */
  newRepoPaths: string[]
  /** Set when this folder maps onto a workspace that already exists — the
   *  dialog says so, and applying the plan merges rather than adds. */
  existingWorkspaceId?: string
  /** True for the row covering repositories sitting directly inside the root. */
  loose: boolean
}

export interface WorkspacePlanInput {
  root: string
  /** Absolute repository paths — the registry, filtered to this root. */
  repoPaths: string[]
  workspaces: Workspace[]
}

/** Trailing separators would otherwise produce an empty first segment. */
function trimTrailingSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

function basename(path: string): string {
  const trimmed = trimTrailingSlash(path)
  return trimmed.slice(trimmed.lastIndexOf('/') + 1) || trimmed
}

/**
 * The first path segment below `root`, or null when the path *is* the root or
 * sits directly inside it. That segment is the whole attribution rule: a
 * repository three folders deep still belongs to the top-level folder it is
 * under, because that is the level the user picked from.
 */
function segmentBelow(root: string, path: string): string | null {
  const base = trimTrailingSlash(root)
  if (!path.startsWith(base + '/')) return null
  const rest = path.slice(base.length + 1)
  const slash = rest.indexOf('/')
  return slash === -1 ? null : rest.slice(0, slash)
}

/** Match by `sourcePath` first: a generated workspace that has since been
 *  renamed is still the same workspace, and matching on name alone would
 *  silently create a duplicate on the next scan. The name fallback is what
 *  lets a scan merge into a workspace the user built by hand. */
function matchWorkspace(workspaces: Workspace[], path: string, name: string): Workspace | undefined {
  return (
    workspaces.find((w) => w.sourcePath && trimTrailingSlash(w.sourcePath) === trimTrailingSlash(path)) ??
    workspaces.find((w) => !w.sourcePath && w.name === name)
  )
}

/**
 * What a scan of `root` would offer to create.
 *
 * One candidate per immediate subfolder that contains at least one repository,
 * plus one for repositories sitting loose in the root itself. A folder holding
 * no repositories is not returned — an empty workspace is not worth offering.
 */
export function planWorkspaces(input: WorkspacePlanInput): WorkspaceCandidate[] {
  const root = trimTrailingSlash(input.root)
  const byFolder = new Map<string, string[]>()
  const loose: string[] = []

  for (const repo of input.repoPaths) {
    const segment = segmentBelow(root, repo)
    if (segment === null) {
      // Directly inside the root (or the root itself) — nothing to name a
      // workspace after except the root.
      if (repo.startsWith(root + '/')) loose.push(repo)
      continue
    }
    const bucket = byFolder.get(segment)
    if (bucket) bucket.push(repo)
    else byFolder.set(segment, [repo])
  }

  const byName = (a: string, b: string): number => basename(a).localeCompare(basename(b))

  const candidates: WorkspaceCandidate[] = [...byFolder.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([segment, repos]) => build(segment, `${root}/${segment}`, repos.sort(byName), false))

  if (loose.length > 0) {
    candidates.push(build(basename(root), root, loose.sort(byName), true))
  }
  return candidates

  function build(name: string, path: string, repoPaths: string[], isLoose: boolean): WorkspaceCandidate {
    const existing = matchWorkspace(input.workspaces, path, name)
    const already = new Set(existing ? existing.tabs.flatMap((tab) => tabRepos(tab).map((r) => r.path)) : [])
    return {
      name,
      path,
      repoPaths,
      newRepoPaths: repoPaths.filter((p) => !already.has(p)),
      ...(existing ? { existingWorkspaceId: existing.id } : {}),
      loose: isLoose
    }
  }
}
