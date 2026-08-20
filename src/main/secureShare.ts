import { ipcMain, dialog } from 'electron'
import { join, resolve, relative, sep, dirname } from 'path'
import { readFile, writeFile, readdir, stat, mkdir, chmod } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { isSecretFile } from '../shared/secretFiles'
import {
  packBundle,
  packSections,
  unpackBundle,
  unpackSections,
  readBundleHeader,
  isSafeRelPath,
  BundleError,
  type BundleFile,
  type BundleNote,
  type BundleSection
} from './secureBundle'
import { exportGlobalEntries, importGlobalEntries } from './vault'
import type {
  SecureShareCandidate,
  SecureBundleHeader,
  SecureNotePreviewEntry,
  SecureSharePreviewEntry,
  SecureShareError,
  SecureExportSpec,
  SecureBundleOpened,
  SecureApplyPlan,
  SecureApplyResult
} from '../shared/types'

const pexecFile = promisify(execFile)

// The one notes namespace bundles carry: the user-facing commit notes. The
// app's own refs (e.g. refs/notes/gitcito-ci) stay machine-local on purpose.
const NOTES_REF = 'refs/notes/commits'

const gitOut = (repoPath: string, args: string[]): Promise<string> =>
  pexecFile('git', ['-C', repoPath, ...args], { maxBuffer: 16 * 1024 * 1024 }).then(({ stdout }) => stdout)

/** Every note in the shared notes ref of a repo, bodies included. */
export async function readRepoNotes(repoPath: string): Promise<BundleNote[]> {
  const raw = await gitOut(repoPath, ['notes', `--ref=${NOTES_REF}`, 'list']).catch(() => '')
  const notes: BundleNote[] = []
  for (const line of raw.split('\n')) {
    const [, sha] = line.trim().split(' ')
    if (!sha) continue
    const body = await gitOut(repoPath, ['notes', `--ref=${NOTES_REF}`, 'show', sha]).catch(() => null)
    if (body !== null) notes.push({ sha, body: body.replace(/\n$/, '') })
  }
  return notes
}

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

// ─── v2 multi-section export/import ──────────────────────────────────────────

/** Build a v2 bundle from export specs and write it. Repo files are read here;
 *  the vault section pulls the global vault directly (values never touch the
 *  renderer). Empty vault sections are dropped; an all-empty request errors. */
export async function exportSectionsV2(
  specs: SecureExportSpec[],
  project: string,
  password: string
): Promise<{ path: string } | { canceled: true } | { error: SecureShareError }> {
  const sections: BundleSection[] = []
  for (const spec of specs) {
    if (spec.kind === 'vault') {
      const entries = await exportGlobalEntries()
      if (entries.length > 0) sections.push({ kind: 'vault', entries })
      continue
    }
    if (spec.kind === 'workspace') {
      // The renderer owns the settings store, so it hands over the already
      // portable tab shape; only sanity-shape it here.
      if (typeof spec.name === 'string' && Array.isArray(spec.tabs)) {
        sections.push({ kind: 'workspace', name: spec.name, tabs: spec.tabs })
      }
      continue
    }
    if (spec.kind === 'notes') {
      const notes = await readRepoNotes(spec.repoPath).catch(() => [] as BundleNote[])
      if (notes.length > 0) {
        sections.push({
          kind: 'notes',
          folder: spec.folder,
          ...(spec.remote ? { remote: spec.remote } : {}),
          ref: NOTES_REF,
          notes
        })
      }
      continue
    }
    const files: BundleFile[] = []
    for (const rel of spec.paths) {
      const full = resolveInside(spec.repoPath, rel)
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
    if (files.length > 0) {
      sections.push({
        kind: 'repo',
        project: spec.project,
        folder: spec.folder,
        ...(spec.remote ? { remote: spec.remote } : {}),
        files
      })
    }
  }
  if (sections.length === 0) return { error: 'read-failed' }
  const safeName = (project || 'workspace').replace(/[^\w.-]+/g, '-')
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export secure bundle',
    defaultPath: `${safeName}.gitcito`,
    filters: [{ name: 'Gitcito bundle', extensions: ['gitcito'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  try {
    await writeFile(filePath, packSections(project, sections, password), { mode: 0o600 })
    return { path: filePath }
  } catch {
    return { error: 'write-failed' }
  }
}

/** Decrypt a bundle to a renderer-safe shape: repo file lists (path/size) and
 *  vault keys — never file contents or secret values. */
export async function openBundleV2(
  bundlePath: string,
  password: string
): Promise<SecureBundleOpened | { error: SecureShareError }> {
  try {
    const sections = unpackSections(await readFile(bundlePath, 'utf-8'), password)
    return {
      version: 2,
      sections: sections.map((s) => {
        if (s.kind === 'vault') {
          return { kind: 'vault' as const, entries: s.entries.map((e) => ({ key: e.key, ...(e.note ? { note: e.note } : {}) })) }
        }
        if (s.kind === 'workspace') return { kind: 'workspace' as const, name: s.name, tabs: s.tabs }
        if (s.kind === 'notes') {
          // Note bodies stay in main until apply; the renderer needs only counts.
          return {
            kind: 'notes' as const,
            folder: s.folder,
            ...(s.remote ? { remote: s.remote } : {}),
            ref: s.ref,
            noteCount: s.notes.length
          }
        }
        return {
          kind: 'repo' as const,
          project: s.project,
          folder: s.folder,
          ...(s.remote ? { remote: s.remote } : {}),
          files: s.files.map((f) => ({
            path: f.path,
            size: f.content.length,
            ...(f.executable ? { executable: true } : {})
          }))
        }
      })
    }
  } catch (e) {
    return { error: errCode(e) }
  }
}

/** Per-file exists/safe check for one repo section against a chosen target repo. */
async function previewRepoSectionV2(
  bundlePath: string,
  password: string,
  sectionIndex: number,
  repoPath: string
): Promise<{ files: SecureSharePreviewEntry[] } | { error: SecureShareError }> {
  try {
    const sections = unpackSections(await readFile(bundlePath, 'utf-8'), password)
    const section = sections[sectionIndex]
    if (!section || section.kind !== 'repo') return { error: 'invalid' }
    const entries: SecureSharePreviewEntry[] = []
    for (const f of section.files) {
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

/** Per-note new/same/different check for one notes section against a target repo. */
export async function previewNotesSectionV2(
  bundlePath: string,
  password: string,
  sectionIndex: number,
  repoPath: string
): Promise<{ notes: SecureNotePreviewEntry[] } | { error: SecureShareError }> {
  try {
    const sections = unpackSections(await readFile(bundlePath, 'utf-8'), password)
    const section = sections[sectionIndex]
    if (!section || section.kind !== 'notes') return { error: 'invalid' }
    const entries: SecureNotePreviewEntry[] = []
    for (const n of section.notes) {
      const commitExists = await gitOut(repoPath, ['cat-file', '-e', `${n.sha}^{commit}`])
        .then(() => true)
        .catch(() => false)
      let state: SecureNotePreviewEntry['state'] = 'new'
      if (commitExists) {
        const existing = await gitOut(repoPath, ['notes', `--ref=${section.ref}`, 'show', n.sha]).catch(() => null)
        if (existing !== null) state = existing.replace(/\n$/, '') === n.body ? 'same' : 'different'
      }
      entries.push({ sha: n.sha, commitExists, state })
    }
    return { notes: entries }
  } catch (e) {
    return { error: errCode(e) }
  }
}

/** Apply a decrypted bundle per the plan: repo sections write files into their
 *  chosen target repos; a vault section merges into the global vault. */
export async function applyV2(
  bundlePath: string,
  password: string,
  plan: SecureApplyPlan[]
): Promise<SecureApplyResult | { error: SecureShareError }> {
  let sections: BundleSection[]
  try {
    sections = unpackSections(await readFile(bundlePath, 'utf-8'), password)
  } catch (e) {
    return { error: errCode(e) }
  }
  let filesWritten = 0
  let secretsWritten = 0
  let notesWritten = 0
  let notesSkipped = 0
  for (const step of plan) {
    const section = sections[step.sectionIndex]
    if (!section) return { error: 'invalid' }
    if (step.kind === 'vault') {
      if (section.kind !== 'vault') return { error: 'invalid' }
      const wanted = new Set(step.keys)
      const picked = section.entries.filter((e) => wanted.has(e.key))
      secretsWritten += await importGlobalEntries(picked)
    } else if (step.kind === 'notes') {
      if (section.kind !== 'notes') return { error: 'invalid' }
      for (const n of section.notes) {
        if (!/^[0-9a-f]{4,64}$/.test(n.sha)) continue
        const commitExists = await gitOut(step.targetRepoPath, ['cat-file', '-e', `${n.sha}^{commit}`])
          .then(() => true)
          .catch(() => false)
        if (!commitExists) {
          notesSkipped++
          continue
        }
        const existing = await gitOut(step.targetRepoPath, ['notes', `--ref=${section.ref}`, 'show', n.sha]).catch(
          () => null
        )
        if (existing !== null) {
          if (existing.replace(/\n$/, '') === n.body) continue // identical — nothing to do, nothing skipped
          if (!step.overwrite) {
            notesSkipped++
            continue
          }
        }
        try {
          await gitOut(step.targetRepoPath, ['notes', `--ref=${section.ref}`, 'add', '-f', '-m', n.body, n.sha])
          notesWritten++
        } catch {
          return { error: 'write-failed' }
        }
      }
    } else {
      if (section.kind !== 'repo') return { error: 'invalid' }
      const wanted = new Set(step.paths)
      for (const f of section.files) {
        if (!wanted.has(f.path)) continue
        const full = resolveInside(step.targetRepoPath, f.path)
        if (!full) continue // unsafe path — silently dropped, preview flagged it
        try {
          await mkdir(dirname(full), { recursive: true })
          const mode = f.executable ? 0o755 : isSecretFile(f.path) ? 0o600 : 0o644
          await writeFile(full, f.content, { mode })
          await chmod(full, mode) // writeFile mode is ignored when the file exists
          filesWritten++
        } catch {
          return { error: 'write-failed' }
        }
      }
    }
  }
  return { filesWritten, secretsWritten, notesWritten, notesSkipped }
}

export function registerSecureShareHandlers(): void {
  ipcMain.handle('secure:candidates', (_e, repoPath: string) => listCandidates(repoPath))
  ipcMain.handle(
    'secure:exportV2',
    (_e, specs: SecureExportSpec[], project: string, password: string) =>
      exportSectionsV2(specs, project, password)
  )
  ipcMain.handle('secure:openV2', (_e, bundlePath: string, password: string) =>
    openBundleV2(bundlePath, password)
  )
  ipcMain.handle(
    'secure:previewRepoV2',
    (_e, bundlePath: string, password: string, sectionIndex: number, repoPath: string) =>
      previewRepoSectionV2(bundlePath, password, sectionIndex, repoPath)
  )
  ipcMain.handle('secure:applyV2', (_e, bundlePath: string, password: string, plan: SecureApplyPlan[]) =>
    applyV2(bundlePath, password, plan)
  )
  ipcMain.handle(
    'secure:previewNotesV2',
    (_e, bundlePath: string, password: string, sectionIndex: number, repoPath: string) =>
      previewNotesSectionV2(bundlePath, password, sectionIndex, repoPath)
  )
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
