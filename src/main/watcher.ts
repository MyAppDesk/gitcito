import { ipcMain, type WebContents } from 'electron'
import { execFile } from 'child_process'
import { watch, type FSWatcher } from 'fs'
import { join, posix, resolve } from 'path'

interface RepoWatch {
  path: string
  watchers: FSWatcher[]
  timer: NodeJS.Timeout | null
  /** Whether a `.git` metadata change occurred during the current debounce window. */
  gitChanged: boolean
  /** Epoch ms until which change events are ignored. Set by `watch:mute` right
   *  before the app performs its own git write, so the app's own mutation does
   *  not trigger a second, redundant refresh on top of its post-action one. */
  muteUntil: number
  /** Linux only: the watch on each repo-relative tracked directory, and the
   *  pending re-scan that follows the index across a checkout or pull. */
  dirs: Map<string, FSWatcher>
  rescan: NodeJS.Timeout | null
}

// One active watch per renderer (keyed by webContents id). The app uses a
// single window with repo tabs, so the active repo is re-watched on switch.
const active = new Map<number, RepoWatch>()
// Renderers we've already hooked a cleanup listener onto.
const hooked = new Set<number>()

const DEBOUNCE_MS = 350

/**
 * Where `fs.watch(dir, { recursive: true })` is native and cheap: FSEvents on
 * macOS, ReadDirectoryChangesW on Windows — one handle for the whole tree.
 *
 * Linux has no recursive inotify. Since Node 20 `recursive: true` works there
 * anyway, but implemented in JavaScript: it walks the whole tree and registers
 * every directory, synchronously, ignored ones included. On a repository with a
 * node_modules that blocked the main process for about a second on *every*
 * repository switch (20k directories, 125k files), stalling every IPC call —
 * the refresh the switch had just asked for among them.
 */
const NATIVE_RECURSIVE =
  (process.platform === 'darwin' || process.platform === 'win32') &&
  // The test suite forces the Linux path so it runs on every platform.
  process.env.GITCITO_WATCH_PER_DIR !== '1'

/** More inotify watches than this is a tree we should not watch dir by dir;
 *  `.git` plus the periodic and on-focus refreshes still cover it. */
const MAX_DIR_WATCHES = 4000

/** A checkout writes HEAD, refs and the index in a burst; re-list once it settles. */
const RESCAN_MS = 1000

/**
 * The directories that hold tracked files (the root included), from
 * `git ls-files` output. These are where a change can show up in `git status`
 * for a tracked file; ignored trees (node_modules, build output) are left out,
 * which is what keeps this to a few hundred directories instead of tens of
 * thousands. Paths are repo-relative, '' for the root.
 */
export function trackedDirs(files: string[]): string[] {
  const dirs = new Set<string>([''])
  for (const f of files) {
    let d = posix.dirname(f)
    while (d !== '.' && d !== '' && !dirs.has(d)) {
      dirs.add(d)
      d = posix.dirname(d)
    }
  }
  return [...dirs]
}

function gitOut(repoPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', ['-C', repoPath, ...args], { maxBuffer: 256 * 1024 * 1024 }, (err, stdout) =>
      err ? reject(err) : resolve(stdout)
    )
  })
}

// Paths inside .git that churn constantly without meaningful state changes.
function isNoise(rel: string): boolean {
  // Normalise Windows separators.
  const p = rel.replace(/\\/g, '/')
  if (p.includes('node_modules/')) return true
  // Git object writes & lock files are intermediate; the ref/index update that
  // follows is what we actually care about.
  if (p.includes('.git/objects/')) return true
  if (p.endsWith('.lock')) return true
  return false
}

// A change under `.git` (HEAD, refs, logs, index, MERGE_HEAD…) means branches,
// commits or merge state may have changed → needs a full refresh. A change in
// the working tree only affects status → a cheap "light" refresh is enough.
function isGitMeta(rel: string): boolean {
  const p = rel.replace(/\\/g, '/')
  return p === '.git' || p.startsWith('.git/')
}

export function clearWatch(id: number): void {
  const w = active.get(id)
  if (!w) return
  if (w.timer) clearTimeout(w.timer)
  if (w.rescan) clearTimeout(w.rescan)
  for (const fsw of w.watchers) {
    try {
      fsw.close()
    } catch {
      // ignore
    }
  }
  active.delete(id)
}

export function setWatch(sender: WebContents, repoPath: string): void {
  const id = sender.id
  const existing = active.get(id)
  if (existing && existing.path === repoPath) return
  clearWatch(id)
  if (!repoPath) return

  if (!hooked.has(id)) {
    hooked.add(id)
    sender.once('destroyed', () => {
      clearWatch(id)
      hooked.delete(id)
    })
  }

  const state: RepoWatch = {
    path: repoPath,
    watchers: [],
    timer: null,
    gitChanged: false,
    muteUntil: 0,
    dirs: new Map(),
    rescan: null
  }

  const onChange = (rel: string | null): void => {
    if (rel && isNoise(rel)) return
    // Before the mute check: the app's own checkout is muted, and it is exactly
    // what adds tracked directories the Linux watch set does not cover yet.
    if (!NATIVE_RECURSIVE && rel && isGitMeta(rel)) {
      if (state.rescan) clearTimeout(state.rescan)
      state.rescan = setTimeout(() => {
        state.rescan = null
        void watchTrackedDirs(id, state, onChange)
      }, RESCAN_MS)
    }
    // Ignore events during a self-mute window (the app's own git write).
    if (Date.now() < state.muteUntil) return
    if (rel && isGitMeta(rel)) state.gitChanged = true
    if (state.timer) clearTimeout(state.timer)
    state.timer = setTimeout(() => {
      const light = !state.gitChanged
      state.gitChanged = false
      state.timer = null
      if (!sender.isDestroyed()) sender.send('repo:changed', { path: repoPath, light })
    }, DEBOUNCE_MS)
  }

  active.set(id, state)
  if (NATIVE_RECURSIVE) {
    try {
      // One native handle covers both .git metadata and the working tree.
      const w = watch(repoPath, { recursive: true }, (_evt, filename) =>
        onChange(typeof filename === 'string' ? filename : null)
      )
      w.on('error', () => clearWatch(id))
      state.watchers.push(w)
    } catch {
      // Unwatchable (gone, permissions): the polling refreshes still run.
    }
    return
  }
  void watchTrackedTree(id, state, onChange)
}

/**
 * The Linux watch: the git directory recursively (small: refs, HEAD, index,
 * logs, and 256 object fan-out dirs), plus one non-recursive watch per directory
 * holding tracked files. All async, so a switch never stalls the main process.
 * A change in a new untracked directory's contents is not seen until the next
 * switch; creating the directory itself is (its parent is watched), and the
 * focus and periodic refreshes cover the rest.
 */
async function watchTrackedTree(id: number, state: RepoWatch, onChange: (rel: string | null) => void): Promise<void> {
  // The git dir by asking git: in a linked worktree `.git` is a file, and the
  // refs live in the common dir, not the worktree's own.
  const [gitDir, commonDir] = await gitOut(state.path, ['rev-parse', '--absolute-git-dir', '--git-common-dir'])
    .then((out) => out.trim().split('\n'))
    .catch(() => [join(state.path, '.git')])
  if (active.get(id) !== state) return
  // --git-common-dir is relative to the repo outside a worktree and absolute inside one.
  for (const dir of new Set([gitDir, commonDir && resolve(state.path, commonDir)].filter(Boolean) as string[])) {
    addWatch(state, dir, true, (f) => join('.git', f), onChange)
  }
  await watchTrackedDirs(id, state, onChange)
}

/**
 * Bring the per-directory watches in line with the index. Run once on a switch
 * and again after `.git` changes, so directories a checkout or a pull brings in
 * get watched, and ones it removes stop holding an inotify watch.
 */
async function watchTrackedDirs(id: number, state: RepoWatch, onChange: (rel: string | null) => void): Promise<void> {
  const files = await gitOut(state.path, ['ls-files', '-z'])
    .then((out) => out.split('\0').filter(Boolean))
    .catch(() => [] as string[])
  // Superseded by a later switch (or closed) while git was answering.
  if (active.get(id) !== state) return
  const dirs = trackedDirs(files)
  if (dirs.length > MAX_DIR_WATCHES) return
  const wanted = new Set(dirs)
  for (const [dir, w] of state.dirs) if (!wanted.has(dir)) dropWatch(state, w)
  for (const dir of dirs) {
    if (state.dirs.has(dir)) continue
    const w = addWatch(state, join(state.path, dir), false, (f) => (dir ? posix.join(dir, f) : f), onChange)
    if (w) state.dirs.set(dir, w)
  }
}

function dropWatch(state: RepoWatch, w: FSWatcher): void {
  try {
    w.close()
  } catch {
    // already closed
  }
  state.watchers = state.watchers.filter((x) => x !== w)
  for (const [d, dw] of state.dirs) if (dw === w) state.dirs.delete(d)
}

function addWatch(
  state: RepoWatch,
  dir: string,
  recursive: boolean,
  toRel: (f: string) => string,
  onChange: (rel: string | null) => void
): FSWatcher | null {
  try {
    const w = watch(dir, { recursive }, (_evt, filename) => onChange(filename ? toRel(filename.toString()) : null))
    // A directory deleted under us: drop that one watch, keep the rest. The
    // next re-scan watches it again if a checkout brought it back.
    w.on('error', () => dropWatch(state, w))
    state.watchers.push(w)
    return w
  } catch {
    // Gone between ls-files and here, or not watchable: skip it.
    return null
  }
}

export function registerWatcherHandlers(): void {
  ipcMain.handle('watch:repo', (e, repoPath: string | null) => {
    setWatch(e.sender, repoPath ?? '')
  })
  // Mute this renderer's active watch for `ms` — used right before the app's own
  // git write so the resulting FS churn doesn't fire a redundant refresh.
  ipcMain.handle('watch:mute', (e, repoPath: string, ms: number) => {
    const w = active.get(e.sender.id)
    if (w && w.path === repoPath) w.muteUntil = Date.now() + Math.max(0, ms)
  })
}
