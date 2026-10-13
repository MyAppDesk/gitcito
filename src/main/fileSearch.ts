import { spawn } from 'child_process'
import { readFile, stat } from 'fs/promises'
import { resolve, sep } from 'path'
import type { CodeSearchHit } from '../shared/types'

export interface FileSearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
  max?: number
  maxPerFile?: number
  /** Calls sharing a key supersede each other: a newer search stops the older one. */
  searchId?: string
}

// Pathspecs per `git grep` run. Windows caps a whole command line near 32K
// characters, so larger lists are searched in several runs.
const MAX_PATHSPEC_BYTES = 24 * 1024
// Enough of git's complaint to explain a failure; the rest is drained unread.
const MAX_STDERR = 2048
// The JS (regex) path runs in the main process; a huge file there stalls every window.
const REGEX_MAX_FILE_BYTES = 4 * 1024 * 1024
const REGEX_CONCURRENCY = 8

interface Running {
  cancelled: boolean
  kill?: () => void
}

const running = new Map<string, Running>()

// `git grep -m` (stop a file after N matches) arrived in git 2.38; older gits reject it.
let grepHasMaxCount = true

/**
 * Stop the search running under this key, if any. The IPC dispatcher calls it
 * before the new search waits for the repository lock: a write queued behind the
 * old search would otherwise keep both waiting until the old one ran to the end.
 */
export function supersedeSearch(repoPath: string, searchId: string | undefined): void {
  if (!searchId) return
  const prev = running.get(`${repoPath}\0${searchId}`)
  if (!prev) return
  prev.cancelled = true
  prev.kill?.()
}

function claim(repoPath: string, searchId: string | undefined): Running {
  const token: Running = { cancelled: false }
  if (!searchId) return token
  supersedeSearch(repoPath, searchId)
  running.set(`${repoPath}\0${searchId}`, token)
  return token
}

/** `files` in runs whose pathspecs stay under the command-line budget. */
function chunkPaths(files: string[]): string[][] {
  const chunks: string[][] = []
  let current: string[] = []
  let bytes = 0
  for (const f of files) {
    const size = Buffer.byteLength(f) + 1
    if (current.length && bytes + size > MAX_PATHSPEC_BYTES) {
      chunks.push(current)
      current = []
      bytes = 0
    }
    current.push(f)
    bytes += size
  }
  if (current.length) chunks.push(current)
  return chunks
}

function release(repoPath: string, searchId: string | undefined, token: Running): void {
  if (!searchId) return
  const key = `${repoPath}\0${searchId}`
  if (running.get(key) === token) running.delete(key)
}

/**
 * Every matching line of `files` in the working tree. Literal queries go to
 * `git grep` (fast, and off the main process's event loop); regex queries keep
 * JavaScript semantics so results agree with the highlighting, and are scanned
 * a few files at a time with a size cap so the app stays responsive.
 */
export async function searchFileMatches(
  repoPath: string,
  files: string[],
  query: string,
  opts?: FileSearchOptions
): Promise<CodeSearchHit[]> {
  if (!query.trim() || files.length === 0) return []
  const token = claim(repoPath, opts?.searchId)
  try {
    const run = opts?.regex ? scanWithRegExp : grepLiteral
    const hits = await run(repoPath, files, query, opts ?? {}, token)
    return token.cancelled ? [] : hits
  } finally {
    release(repoPath, opts?.searchId, token)
  }
}

async function grepLiteral(
  repoPath: string,
  files: string[],
  query: string,
  opts: FileSearchOptions,
  token: Running
): Promise<CodeSearchHit[]> {
  const max = opts.max ?? 2000
  const hits: CodeSearchHit[] = []
  for (const chunk of chunkPaths(files)) {
    if (token.cancelled || hits.length >= max) break
    const room = { ...opts, max: max - hits.length }
    let res = grepHasMaxCount ? await runGrep(repoPath, chunk, query, room, token, true) : null
    if (res?.code === 129) grepHasMaxCount = false
    if (!res || res.code === 129) {
      if (token.cancelled) break
      res = await runGrep(repoPath, chunk, query, room, token, false)
    }
    // 0: matches, 1: none, null: stopped on purpose (cap reached or superseded).
    if (res.code !== null && res.code > 1 && !token.cancelled) {
      throw new Error(`git grep failed (${res.code})${res.stderr ? `: ${res.stderr.trim()}` : ''}`)
    }
    hits.push(...res.hits)
  }
  return hits
}

function runGrep(
  repoPath: string,
  files: string[],
  query: string,
  opts: FileSearchOptions,
  token: Running,
  maxCount: boolean
): Promise<{ hits: CodeSearchHit[]; code: number | null; stderr: string }> {
  const max = opts.max ?? 2000
  const maxPerFile = opts.maxPerFile ?? 100
  // `--untracked` alone applies the ignore rules to tracked files too, dropping a
  // force-added one; the pathspecs already name exactly the files to search.
  const args = ['-C', repoPath, '--literal-pathspecs', 'grep', '-z', '-n', '-I', '--no-color']
  args.push('--untracked', '--no-exclude-standard', '--full-name', '-F')
  if (maxCount) args.push('-m', String(maxPerFile))
  if (!opts.caseSensitive) args.push('-i')
  if (opts.wholeWord) args.push('-w')
  args.push('-e', query, '--', ...files)
  const wanted = new Set(files)

  return new Promise((resolve) => {
    const child = spawn('git', args, {
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    token.kill = () => child.kill()
    const hits: CodeSearchHit[] = []
    const perFile = new Map<string, number>()
    let rest = ''
    let stderr = ''
    let done = false
    const finish = (code: number | null = null): void => {
      if (done) return
      done = true
      resolve({ hits, code, stderr })
    }
    // Read, even when nobody needs it: a full stderr pipe blocks git while it
    // holds the repository's read lock.
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      if (stderr.length < MAX_STDERR) stderr += chunk.slice(0, MAX_STDERR - stderr.length)
    })
    // Output rows are `file\0line\0text\n`; -z keeps unusual file names unquoted.
    const take = (row: string): void => {
      const a = row.indexOf('\0')
      const b = a < 0 ? -1 : row.indexOf('\0', a + 1)
      if (b < 0) return
      const file = row.slice(0, a)
      if (!wanted.has(file)) return
      const seen = perFile.get(file) ?? 0
      if (seen >= maxPerFile) return
      perFile.set(file, seen + 1)
      hits.push({ file, line: Number(row.slice(a + 1, b)), text: row.slice(b + 1, b + 401) })
    }
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      if (done) return
      const rows = (rest + chunk).split('\n')
      rest = rows.pop() ?? ''
      for (const row of rows) {
        take(row)
        if (hits.length >= max) {
          child.kill()
          finish()
          return
        }
      }
    })
    child.on('error', (err) => {
      stderr = err.message
      finish(2)
    })
    child.on('close', (code) => {
      if (!done && rest) take(rest)
      finish(code)
    })
  })
}

async function scanWithRegExp(
  repoPath: string,
  files: string[],
  query: string,
  opts: FileSearchOptions,
  token: Running
): Promise<CodeSearchHit[]> {
  const max = opts.max ?? 2000
  const maxPerFile = opts.maxPerFile ?? 100
  let pattern: RegExp
  try {
    const body = opts.wholeWord ? `\\b${query}\\b` : query
    pattern = new RegExp(body, opts.caseSensitive ? '' : 'i')
  } catch {
    return []
  }
  const root = resolve(repoPath)
  const perFile: CodeSearchHit[][] = new Array(files.length)
  let found = 0
  let next = 0
  const worker = async (): Promise<void> => {
    while (!token.cancelled && found < max && next < files.length) {
      const i = next++
      const f = files[i]
      const full = resolve(root, f)
      // The list comes from the renderer; never read outside the repository.
      if (!full.startsWith(root + sep)) continue
      const size = await stat(full).then((s) => (s.isFile() ? s.size : -1), () => -1)
      if (size < 0 || size > REGEX_MAX_FILE_BYTES) continue
      const content = await readFile(full, 'utf-8').catch(() => null)
      if (content === null || content.includes('\0') || token.cancelled) continue
      const hits: CodeSearchHit[] = []
      const lines = content.split('\n')
      for (let n = 0; n < lines.length && hits.length < maxPerFile; n++) {
        if (pattern.test(lines[n])) hits.push({ file: f, line: n + 1, text: lines[n].slice(0, 400) })
      }
      perFile[i] = hits
      found += hits.length
      // Let IPC and window events through between files.
      await new Promise((r) => setImmediate(r))
    }
  }
  await Promise.all(Array.from({ length: REGEX_CONCURRENCY }, worker))
  return perFile.flat().slice(0, max)
}
