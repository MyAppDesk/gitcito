import { ipcMain, dialog } from 'electron'
import { join, resolve, relative, sep, dirname } from 'path'
import { readFile, writeFile, readdir, stat, mkdir, chmod } from 'fs/promises'
import { isSecretFile } from '../shared/secretFiles'
import {
  packBundle,
  unpackBundle,
  readBundleHeader,
  isSafeRelPath,
  BundleError,
  type BundleFile
} from './secureBundle'
import type {
  SecureShareCandidate,
  SecureBundleHeader,
  SecureSharePreviewEntry,
  SecureShareError
} from '../shared/types'

// IPC surface for sharing files as encrypted .gitcito bundles. All filesystem
// and crypto work stays in the main process; the renderer only ever sees
// relative paths, sizes and error codes — never key material.

// Directories that are all bulk/derived content — walking them would drown the
// picker in noise (and node_modules alone can be 100k files).
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'out',
  'build',
  'coverage',
  'target',
  'vendor',
  '.venv',
  'venv',
  '__pycache__',
  '.next',
  '.turbo',
  '.cache',
  'DerivedData',
  'Pods'
])

const MAX_CANDIDATES = 5000
const MAX_FILE_BYTES = 16 * 1024 * 1024 // per-file cap keeps bundles sane (JSON+base64)

function errCode(e: unknown): SecureShareError {
  return e instanceof BundleError ? e.code : 'read-failed'
}

/** Repo-relative resolution that refuses to land outside the repo root. */
function resolveInside(repoPath: string, relPath: string): string | null {
  if (!isSafeRelPath(relPath)) return null
  const root = resolve(repoPath)
  const full = resolve(root, relPath)
  if (full !== root && !full.startsWith(root + sep)) return null
  return full
}

export async function listCandidates(repoPath: string): Promise<SecureShareCandidate[]> {
  const root = resolve(repoPath)
  const found: SecureShareCandidate[] = []
  const walk = async (dir: string): Promise<void> => {
    if (found.length >= MAX_CANDIDATES) return
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (found.length >= MAX_CANDIDATES) return
      const full = join(dir, entry.name)
      if (entry.isSymbolicLink()) continue // never follow links out of the repo
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(full)
      } else if (entry.isFile()) {
        try {
          const s = await stat(full)
          if (s.size > MAX_FILE_BYTES) continue
          const rel = relative(root, full).split(sep).join('/')
          found.push({ path: rel, size: s.size, secret: isSecretFile(rel) })
        } catch {
          // unreadable file — skip
        }
      }
    }
  }
  await walk(root)
  // Secrets first (they're what this feature exists for), then alphabetical.
  return found.sort((a, b) => Number(b.secret) - Number(a.secret) || a.path.localeCompare(b.path))
}

async function exportBundle(
  repoPath: string,
  project: string,
  paths: string[],
  password: string
): Promise<{ path: string } | { canceled: true } | { error: SecureShareError }> {
  const files: BundleFile[] = []
  for (const rel of paths) {
    const full = resolveInside(repoPath, rel)
    if (!full) return { error: 'invalid' }
    try {
      const content = await readFile(full)
      const s = await stat(full)
      files.push({
        path: rel.replace(/\\/g, '/'),
        content,
        ...(s.mode & 0o111 ? { executable: true } : {})
      })
    } catch {
      return { error: 'read-failed' }
    }
  }
  const safeName = (project || 'project').replace(/[^\w.-]+/g, '-')
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export secure bundle',
    defaultPath: `${safeName}.gitcito`,
    filters: [{ name: 'Gitcito bundle', extensions: ['gitcito'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  try {
    await writeFile(filePath, packBundle(project, files, password), { mode: 0o600 })
    return { path: filePath }
  } catch {
    return { error: 'write-failed' }
  }
}

async function pickBundle(): Promise<
  { path: string; header: SecureBundleHeader } | { error: SecureShareError } | null
> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import secure bundle',
    filters: [
      { name: 'Gitcito bundle', extensions: ['gitcito'] },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (canceled || !filePaths[0]) return null
  try {
    const header = readBundleHeader(await readFile(filePaths[0], 'utf-8'))
    if (!header) return { error: 'invalid' }
    return { path: filePaths[0], header }
  } catch (e) {
    return { error: errCode(e) }
  }
}

export async function previewBundle(
  bundlePath: string,
  password: string,
  repoPath: string
): Promise<{ files: SecureSharePreviewEntry[] } | { error: SecureShareError }> {
  try {
    const files = unpackBundle(await readFile(bundlePath, 'utf-8'), password)
    const entries: SecureSharePreviewEntry[] = []
    for (const f of files) {
      const full = resolveInside(repoPath, f.path)
      let exists = false
      if (full) {
        try {
          await stat(full)
          exists = true
        } catch {
          exists = false
        }
      }
      entries.push({ path: f.path, size: f.content.length, exists, safe: full !== null })
    }
    return { files: entries }
  } catch (e) {
    return { error: errCode(e) }
  }
}

export async function applyBundle(
  bundlePath: string,
  password: string,
  repoPath: string,
  selected: string[]
): Promise<{ written: string[] } | { error: SecureShareError }> {
  let files: BundleFile[]
  try {
    files = unpackBundle(await readFile(bundlePath, 'utf-8'), password)
  } catch (e) {
    return { error: errCode(e) }
  }
  const wanted = new Set(selected)
  const written: string[] = []
  for (const f of files) {
    if (!wanted.has(f.path)) continue
    const full = resolveInside(repoPath, f.path)
    if (!full) continue // unsafe path — silently dropped, preview already flagged it
    try {
      await mkdir(dirname(full), { recursive: true })
      // Secrets land owner-only; everything else keeps normal perms.
      const mode = f.executable ? 0o755 : isSecretFile(f.path) ? 0o600 : 0o644
      await writeFile(full, f.content, { mode })
      await chmod(full, mode) // writeFile mode is ignored when the file exists
      written.push(f.path)
    } catch {
      return { error: 'write-failed' }
    }
  }
  return { written }
}

export function registerSecureShareHandlers(): void {
  ipcMain.handle('secure:candidates', (_e, repoPath: string) => listCandidates(repoPath))
  ipcMain.handle(
    'secure:export',
    (_e, repoPath: string, project: string, paths: string[], password: string) =>
      exportBundle(repoPath, project, paths, password)
  )
  ipcMain.handle('secure:pick', () => pickBundle())
  ipcMain.handle('secure:preview', (_e, bundlePath: string, password: string, repoPath: string) =>
    previewBundle(bundlePath, password, repoPath)
  )
  ipcMain.handle(
    'secure:apply',
    (_e, bundlePath: string, password: string, repoPath: string, selected: string[]) =>
      applyBundle(bundlePath, password, repoPath, selected)
  )
}
