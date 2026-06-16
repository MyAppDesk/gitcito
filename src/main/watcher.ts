import { ipcMain, type WebContents } from 'electron'
import { watch, type FSWatcher } from 'fs'
import { join } from 'path'

interface RepoWatch {
  path: string
  watchers: FSWatcher[]
  timer: NodeJS.Timeout | null
  /** Whether a `.git` metadata change occurred during the current debounce window. */
  gitChanged: boolean
}

// One active watch per renderer (keyed by webContents id). The app uses a
// single window with repo tabs, so the active repo is re-watched on switch.
const active = new Map<number, RepoWatch>()
// Renderers we've already hooked a cleanup listener onto.
const hooked = new Set<number>()

const DEBOUNCE_MS = 350

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

function clearWatch(id: number): void {
  const w = active.get(id)
  if (!w) return
  if (w.timer) clearTimeout(w.timer)
  for (const fsw of w.watchers) {
    try {
      fsw.close()
    } catch {
      // ignore
    }
  }
  active.delete(id)
}

function setWatch(sender: WebContents, repoPath: string): void {
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

  const state: RepoWatch = { path: repoPath, watchers: [], timer: null, gitChanged: false }

  const onChange = (rel: string | null): void => {
    if (rel && isNoise(rel)) return
    if (rel && isGitMeta(rel)) state.gitChanged = true
    if (state.timer) clearTimeout(state.timer)
    state.timer = setTimeout(() => {
      const light = !state.gitChanged
      state.gitChanged = false
      state.timer = null
      if (!sender.isDestroyed()) sender.send('repo:changed', { path: repoPath, light })
    }, DEBOUNCE_MS)
  }

  try {
    // Recursive watch covers both .git metadata and the working tree. Supported
    // on macOS and Windows.
    const w = watch(repoPath, { recursive: true }, (_evt, filename) =>
      onChange(typeof filename === 'string' ? filename : null)
    )
    w.on('error', () => clearWatch(id))
    state.watchers.push(w)
  } catch {
    // Platforms without recursive support (e.g. Linux): fall back to watching
    // the .git directory recursively so branch/commit changes still surface.
    try {
      const gitDir = join(repoPath, '.git')
      const w = watch(gitDir, { recursive: true }, (_evt, filename) =>
        onChange(filename ? join('.git', filename.toString()) : null)
      )
      w.on('error', () => clearWatch(id))
      state.watchers.push(w)
    } catch {
      return
    }
  }

  active.set(id, state)
}

export function registerWatcherHandlers(): void {
  ipcMain.handle('watch:repo', (e, repoPath: string | null) => {
    setWatch(e.sender, repoPath ?? '')
  })
}
