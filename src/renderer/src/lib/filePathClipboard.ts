/** Clipboard payloads for uncommitted-file "Copy File Path" actions.
 *
 *  Pure string logic: the renderer never touches the filesystem. `platform`
 *  is `window.api.platform` (`win32` / `darwin` / `linux`) so Windows gets
 *  native separators in the absolute path without importing Node `path`. */

export type FilePathClipboardPayload = {
  absolute: string
  relative: string
}

const WIN = 'win32'

function isWin(platform: string): boolean {
  return platform === WIN
}

function lineSep(platform: string): string {
  return isWin(platform) ? '\r\n' : '\n'
}

/** Collapse `.` / `..`, strip a leading `./`, and always emit `/` separators. */
export function normalizeRepoRelativePath(rel: string): string {
  let s = rel.replace(/\\/g, '/')
  while (s.startsWith('./')) s = s.slice(2)
  const out: string[] = []
  for (const part of s.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (out.length) out.pop()
      continue
    }
    out.push(part)
  }
  return out.join('/')
}

function uniqueNormalized(paths: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of paths) {
    const rel = normalizeRepoRelativePath(raw)
    if (!rel || seen.has(rel)) continue
    seen.add(rel)
    out.push(rel)
  }
  return out
}

function nativeRepoRoot(repoPath: string, platform: string): string {
  const trimmed = repoPath.replace(/[\\/]+$/, '')
  return isWin(platform) ? trimmed.replace(/\//g, '\\') : trimmed.replace(/\\/g, '/')
}

function joinAbsolute(repoRoot: string, rel: string, platform: string): string {
  const sep = isWin(platform) ? '\\' : '/'
  const nativeRel = isWin(platform) ? rel.replace(/\//g, '\\') : rel
  if (!nativeRel) return repoRoot
  return `${repoRoot}${sep}${nativeRel}`
}

/** Build the two clipboard strings for Copy File Path / Copy Relative File Path.
 *  `selectedRelativePaths` should already be in visible/selection order. */
export function buildFilePathClipboardPayload(
  repoPath: string,
  selectedRelativePaths: readonly string[],
  platform: string
): FilePathClipboardPayload {
  const rels = uniqueNormalized(selectedRelativePaths)
  const root = nativeRepoRoot(repoPath, platform)
  const nl = lineSep(platform)
  return {
    absolute: rels.map((rel) => joinAbsolute(root, rel, platform)).join(nl),
    relative: rels.join(nl)
  }
}
