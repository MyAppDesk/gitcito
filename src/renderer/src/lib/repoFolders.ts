import type { RepoFolder, RepoRef } from '../../../shared/types'

/** Folder tree operations for group tabs.
 *
 *  A group keeps its repositories in one flat `repos` list — status badges,
 *  batch fetch/pull and close warnings all read that list. Folders sit on top
 *  as pure organisation: each folder claims repo *paths*, and nests further
 *  folders to any depth. A repo no folder claims renders at the group root.
 *
 *  Every function here is pure and returns new arrays, so store actions can
 *  compose them inside an immutable update. */

export interface FlatFolder {
  folder: RepoFolder
  parentId: string | null
  depth: number
}

/** Depth-first walk — the order folders render in the tab strip. */
export function flattenFolders(
  folders: RepoFolder[],
  parentId: string | null = null,
  depth = 0
): FlatFolder[] {
  const out: FlatFolder[] = []
  for (const folder of folders) {
    out.push({ folder, parentId, depth })
    out.push(...flattenFolders(folder.folders ?? [], folder.id, depth + 1))
  }
  return out
}

export function findFolder(folders: RepoFolder[], id: string): RepoFolder | null {
  for (const f of folders) {
    if (f.id === id) return f
    const hit = findFolder(f.folders ?? [], id)
    if (hit) return hit
  }
  return null
}

/** Every repo path filed anywhere under these folders. */
export function folderPaths(folders: RepoFolder[]): string[] {
  return folders.flatMap((f) => [...f.paths, ...folderPaths(f.folders ?? [])])
}

/** Repos shown at the group root — the ones no folder claims, in group order. */
export function rootRepos(repos: RepoRef[], folders: RepoFolder[] | undefined): RepoRef[] {
  const filed = new Set(folderPaths(folders ?? []))
  return repos.filter((r) => !filed.has(r.path))
}

/** Repos held directly by one folder, in the folder's own order. Paths with no
 *  matching repo (a stale entry) are skipped rather than rendered as ghosts. */
export function folderRepos(folder: RepoFolder, repos: RepoRef[]): RepoRef[] {
  return folder.paths
    .map((p) => repos.find((r) => r.path === p))
    .filter((r): r is RepoRef => r != null)
}

/** Repo count including nested folders — what the folder chip badge shows. */
export function folderCount(folder: RepoFolder): number {
  return folder.paths.length + (folder.folders ?? []).reduce((n, f) => n + folderCount(f), 0)
}

/** Paths held by a folder and everything under it. */
export function subtreePaths(folder: RepoFolder): string[] {
  return [...folder.paths, ...folderPaths(folder.folders ?? [])]
}

/** True when `candidate` is `id` itself or nested inside it. Guards a folder
 *  from being dragged into its own subtree, which would orphan the branch. */
export function isSelfOrDescendant(folders: RepoFolder[], id: string, candidate: string): boolean {
  if (id === candidate) return true
  const f = findFolder(folders, id)
  if (!f) return false
  return flattenFolders(f.folders ?? []).some((x) => x.folder.id === candidate)
}

/** Replace folder `id` with `fn`'s result, anywhere in the tree. */
export function updateFolder(
  folders: RepoFolder[],
  id: string,
  fn: (f: RepoFolder) => RepoFolder
): RepoFolder[] {
  return folders.map((f) =>
    f.id === id ? fn(f) : { ...f, folders: updateFolder(f.folders ?? [], id, fn) }
  )
}

/** Insert `node` under `parentId` (null = top level of the group), before
 *  `beforeId` when given, else appended. */
export function insertFolder(
  folders: RepoFolder[],
  parentId: string | null,
  node: RepoFolder,
  beforeId: string | null = null
): RepoFolder[] {
  if (parentId === null) return spliceFolder(folders, node, beforeId)
  return updateFolder(folders, parentId, (f) => ({
    ...f,
    folders: spliceFolder(f.folders ?? [], node, beforeId)
  }))
}

function spliceFolder(list: RepoFolder[], node: RepoFolder, beforeId: string | null): RepoFolder[] {
  const out = [...list]
  const idx = beforeId ? out.findIndex((f) => f.id === beforeId) : -1
  if (idx >= 0) out.splice(idx, 0, node)
  else out.push(node)
  return out
}

/** Lift folder `id` out of the tree, subtree intact. */
export function takeFolder(
  folders: RepoFolder[],
  id: string
): { folders: RepoFolder[]; taken: RepoFolder | null } {
  let taken: RepoFolder | null = null
  const walk = (list: RepoFolder[]): RepoFolder[] => {
    const out: RepoFolder[] = []
    for (const f of list) {
      if (f.id === id) {
        taken = f
        continue
      }
      out.push({ ...f, folders: walk(f.folders ?? []) })
    }
    return out
  }
  const next = walk(folders)
  return { folders: taken ? next : folders, taken }
}

/** Re-parent a folder. A move into its own subtree is ignored. */
export function moveFolder(
  folders: RepoFolder[],
  id: string,
  parentId: string | null,
  beforeId: string | null = null
): RepoFolder[] {
  if (parentId !== null && isSelfOrDescendant(folders, id, parentId)) return folders
  const { folders: rest, taken } = takeFolder(folders, id)
  if (!taken) return folders
  return insertFolder(rest, parentId, taken, beforeId)
}

/** Delete a folder. Its repos move up into the parent folder (or the group
 *  root, when it was top level) and its subfolders take its place, so nothing
 *  is silently dropped from the group. */
export function deleteFolder(folders: RepoFolder[], id: string): RepoFolder[] {
  const out: RepoFolder[] = []
  for (const f of folders) {
    if (f.id === id) {
      out.push(...(f.folders ?? []))
      continue
    }
    const kids = f.folders ?? []
    const doomed = kids.find((k) => k.id === id)
    out.push({
      ...f,
      paths: doomed ? [...f.paths, ...doomed.paths] : f.paths,
      folders: deleteFolder(kids, id)
    })
  }
  return out
}

/** Remove a repo path from wherever it is filed — after this it renders at the
 *  group root (or is gone entirely, when the repo left the group). */
export function detachPath(folders: RepoFolder[], path: string): RepoFolder[] {
  return folders.map((f) => ({
    ...f,
    paths: f.paths.filter((p) => p !== path),
    folders: detachPath(f.folders ?? [], path)
  }))
}

/** File a repo into `folderId` (null = group root), before `beforePath` when
 *  given. Always detaches first, so a repo is never filed in two places. */
export function movePathToFolder(
  folders: RepoFolder[],
  path: string,
  folderId: string | null,
  beforePath: string | null = null
): RepoFolder[] {
  const detached = detachPath(folders, path)
  if (folderId === null) return detached
  return updateFolder(detached, folderId, (f) => {
    const paths = [...f.paths]
    const idx = beforePath ? paths.indexOf(beforePath) : -1
    if (idx >= 0) paths.splice(idx, 0, path)
    else paths.push(path)
    return { ...f, paths }
  })
}

/** Reorder a repo inside the folder that already holds it. `beforePath` null
 *  moves it to the end. */
export function reorderInFolder(
  folders: RepoFolder[],
  path: string,
  beforePath: string | null
): RepoFolder[] {
  const owner = flattenFolders(folders).find((x) => x.folder.paths.includes(path))
  if (!owner) return folders
  return movePathToFolder(folders, path, owner.folder.id, beforePath)
}

/** Drop paths whose repo has left the group, and any duplicate filing. Run on
 *  load and after every membership change so the tree can't drift from
 *  `repos`. */
export function pruneFolders(folders: RepoFolder[], repos: RepoRef[]): RepoFolder[] {
  const known = new Set(repos.map((r) => r.path))
  const seen = new Set<string>()
  const walk = (list: RepoFolder[]): RepoFolder[] =>
    list.map((f) => ({
      ...f,
      paths: f.paths.filter((p) => {
        if (!known.has(p) || seen.has(p)) return false
        seen.add(p)
        return true
      }),
      folders: walk(f.folders ?? [])
    }))
  return walk(folders)
}

/** "Parent / Child" trail for a folder, used to label the "Move to folder"
 *  menu entries so deep trees stay readable. */
export function folderTrail(folders: RepoFolder[], id: string): string {
  const flat = flattenFolders(folders)
  const names: string[] = []
  let current: string | null = id
  while (current) {
    const entry: FlatFolder | undefined = flat.find((x) => x.folder.id === current)
    if (!entry) break
    names.unshift(entry.folder.name)
    current = entry.parentId
  }
  return names.join(' / ')
}
