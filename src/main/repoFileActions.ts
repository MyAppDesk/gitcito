import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { chmod, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type {
  PreparedRepoChatFileAction,
  RepoChatActionErrorCode,
  RepoChatFileAction
} from '../shared/types'
import { isSecretFile } from '../shared/secretFiles'
import { isSafeRepoPath } from './aiSchemas'

export const REPO_FILE_MAX_BYTES = 512 * 1024
export const REPO_FILE_BATCH_MAX_BYTES = 2 * 1024 * 1024

export interface RepoFileActionContext {
  evidencePaths: Set<string>
  completePaths: Set<string>
  ignoredPaths: Set<string>
}

export interface RepoFileActionFs {
  lstat: typeof lstat
  readFile: typeof readFile
  writeFile: typeof writeFile
  mkdir: typeof mkdir
  rename: typeof rename
  rm: typeof rm
  chmod: typeof chmod
}

export const nodeRepoFileActionFs: RepoFileActionFs = {
  lstat,
  readFile,
  writeFile,
  mkdir,
  rename,
  rm,
  chmod
}

export class RepoFileActionError extends Error {
  constructor(
    readonly code: RepoChatActionErrorCode,
    message: string,
    readonly paths: string[] = []
  ) {
    super(message)
    this.name = 'RepoFileActionError'
  }
}

const GENERATED_PATH = /(^|\/)(generated|gen)(\/|$)|\.generated\.[^/]+$/i

export function isGeneratedRepoPath(path: string): boolean {
  return GENERATED_PATH.test(path)
}

function assertFileActionType(action: { type?: unknown; path?: unknown }): void {
  if (action.type !== 'edit_file' && action.type !== 'write_file' && action.type !== 'delete_file') {
    const path = typeof action.path === 'string' ? action.path : '(unknown)'
    fail('unknown', 'The file action type is not supported.', path)
  }
}

function fail(code: RepoChatActionErrorCode, message: string, path: string): never {
  throw new RepoFileActionError(code, message, [path])
}

function normalizedTarget(repoPath: string, rawPath: string): { path: string; absolute: string } {
  if (!isSafeRepoPath(rawPath)) fail('unsafe_path', 'The target must be a relative repository path.', rawPath)
  const path = rawPath.trim().replace(/\\/g, '/')
  const segments = path.split('/')
  if (segments.some((segment) => segment.toLowerCase() === '.git')) {
    fail('git_internal_path', 'Git internal files cannot be changed by repository chat.', path)
  }
  if (isSecretFile(path)) fail('secret_file', 'Secret-looking files cannot be changed by repository chat.', path)
  if (isGeneratedRepoPath(path)) fail('generated_path', 'Generated files cannot be changed by repository chat.', path)

  const root = resolve(repoPath)
  const absolute = resolve(root, ...segments)
  const inside = relative(root, absolute)
  if (!inside || inside.startsWith('..') || isAbsolute(inside)) {
    fail('unsafe_path', 'The target must stay inside the repository.', path)
  }
  return { path, absolute }
}

async function inspectTarget(
  repoPath: string,
  path: string,
  io: RepoFileActionFs = nodeRepoFileActionFs
): Promise<{ exists: boolean; isFile: boolean; mode?: number }> {
  let current = resolve(repoPath)
  const segments = path.split('/')
  for (let i = 0; i < segments.length; i++) {
    current = join(current, segments[i])
    try {
      const info = await io.lstat(current)
      if (info.isSymbolicLink()) fail('symlink_path', 'Symlink targets and parents are not allowed.', path)
      if (i < segments.length - 1 && !info.isDirectory()) {
        fail('not_found', 'A parent of the target is not a directory.', path)
      }
      if (i === segments.length - 1) return { exists: true, isFile: info.isFile(), mode: info.mode }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { exists: false, isFile: false }
      throw error
    }
  }
  return { exists: false, isFile: false }
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

function occurrences(content: string, exact: string): number {
  if (!exact) return 0
  let count = 0
  let offset = 0
  while (offset <= content.length - exact.length) {
    const found = content.indexOf(exact, offset)
    if (found < 0) break
    count++
    offset = found + exact.length
  }
  return count
}

function localDiff(beforePath: string, afterPath: string): Promise<string> {
  return new Promise((resolveDiff, reject) => {
    execFile(
      'git',
      ['diff', '--no-index', '--no-color', '--', beforePath, afterPath],
      { maxBuffer: REPO_FILE_BATCH_MAX_BYTES * 4 },
      (error, stdout) => {
        const code = (error as (Error & { code?: number | string }) | null)?.code
        if (!error || code === 1) resolveDiff(stdout)
        else reject(error)
      }
    )
  })
}

async function previewFor(path: string, before: string | null, after: string | null): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'gitcito-file-preview-'))
  const beforePath = join(dir, 'before')
  const afterPath = join(dir, 'after')
  try {
    if (before !== null) await writeFile(beforePath, before, 'utf8')
    if (after !== null) await writeFile(afterPath, after, 'utf8')
    const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null'
    const preview = await localDiff(before === null ? nullDevice : beforePath, after === null ? nullDevice : afterPath)
    return preview
      .replace(/^diff --git .*$/m, `diff --git a/${path} b/${path}`)
      .replace(/^--- .*$/m, `--- ${before === null ? '/dev/null' : `a/${path}`}`)
      .replace(/^\+\+\+ .*$/m, `+++ ${after === null ? '/dev/null' : `b/${path}`}`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/**
 * Validate file mutations against the current repository and prepare immutable
 * hashes plus user-visible diffs. No repository file is written here.
 */
export async function prepareRepoFileActions(
  repoPath: string,
  actions: RepoChatFileAction[],
  context: RepoFileActionContext
): Promise<PreparedRepoChatFileAction[]> {
  const simulated = new Map<string, string | null>()
  const prepared: PreparedRepoChatFileAction[] = []
  let batchBytes = 0

  for (const action of actions) {
    assertFileActionType(action)
    const target = normalizedTarget(repoPath, action.path)
    const path = target.path
    if (context.ignoredPaths.has(path)) fail('ignored_path', 'Ignored files cannot be changed by repository chat.', path)

    const needsEvidence = action.type !== 'write_file' || action.mode === 'replace'
    if (needsEvidence && !context.evidencePaths.has(path)) {
      fail('evidence_required', 'The target was not grounded in repository evidence.', path)
    }
    if (action.type === 'write_file' && action.mode === 'replace' && !context.completePaths.has(path)) {
      fail('incomplete_evidence', 'Whole-file replacement requires complete file evidence.', path)
    }

    const inspected = await inspectTarget(repoPath, path)
    if (inspected.exists && !inspected.isFile) fail('unsafe_path', 'The target is not a regular file.', path)

    let before: string | null
    if (simulated.has(path)) {
      before = simulated.get(path) ?? null
    } else {
      if (!inspected.exists) {
        before = null
      } else {
        const bytes = await readFile(target.absolute)
        if (bytes.includes(0)) fail('binary_file', 'Binary files cannot be changed by repository chat.', path)
        if (bytes.byteLength > REPO_FILE_MAX_BYTES) fail('file_too_large', 'The target file is too large.', path)
        before = bytes.toString('utf8')
      }
      simulated.set(path, before)
    }

    let after: string | null
    let expectedOccurrences: number | undefined
    if (action.type === 'edit_file') {
      if (before === null) fail('not_found', 'The file to edit does not exist.', path)
      expectedOccurrences = occurrences(before, action.oldText)
      if (expectedOccurrences === 0) fail('old_text_missing', 'The exact text to edit was not found.', path)
      if (!action.replaceAll && expectedOccurrences !== 1) {
        fail('ambiguous_edit', 'The exact edit matches more than once.', path)
      }
      after = action.replaceAll
        ? before.split(action.oldText).join(action.newText)
        : before.replace(action.oldText, action.newText)
    } else if (action.type === 'write_file') {
      if (action.mode === 'create' && before !== null) fail('already_exists', 'The file to create already exists.', path)
      if (action.mode === 'replace' && before === null) fail('not_found', 'The file to replace does not exist.', path)
      after = action.content
    } else {
      if (before === null) fail('not_found', 'The file to delete does not exist.', path)
      after = null
    }

    if (after?.includes('\0')) fail('binary_file', 'Binary content cannot be written by repository chat.', path)
    const finalBytes = after === null ? 0 : Buffer.byteLength(after, 'utf8')
    if (finalBytes > REPO_FILE_MAX_BYTES) fail('file_too_large', 'The resulting file is too large.', path)
    batchBytes += finalBytes
    if (batchBytes > REPO_FILE_BATCH_MAX_BYTES) {
      fail('batch_too_large', 'The prepared file batch is too large.', path)
    }
    if (after === before) fail('unknown', 'The proposed file action would not change the file.', path)

    let preview: string
    try {
      preview = await previewFor(path, before ?? null, after)
    } catch (error) {
      throw new RepoFileActionError(
        'unknown',
        `Could not generate a local diff preview: ${error instanceof Error ? error.message : String(error)}`,
        [path]
      )
    }

    prepared.push({
      ...action,
      path,
      expectedHash: before === null ? null : sha256(before),
      ...(expectedOccurrences === undefined ? {} : { expectedOccurrences }),
      preview
    })
    simulated.set(path, after)
  }

  return prepared
}

interface ApplyPathState {
  path: string
  absolute: string
  original: string | null
  current: string | null
  mode?: number
  temp?: string
  backup?: string
  backupMoved?: boolean
  installed?: boolean
}

async function ensureParentDirectories(
  repoPath: string,
  target: string,
  io: RepoFileActionFs,
  created: string[]
): Promise<void> {
  const root = resolve(repoPath)
  const parent = dirname(target)
  if (parent === root) return
  const parts = relative(root, parent).split(/[\\/]/).filter(Boolean)
  let current = root
  const missing: string[] = []
  for (const part of parts) {
    current = join(current, part)
    try {
      const info = await io.lstat(current)
      if (info.isSymbolicLink()) fail('symlink_path', 'Symlink targets and parents are not allowed.', relative(root, target))
      if (!info.isDirectory()) fail('unsafe_path', 'A target parent is not a directory.', relative(root, target))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      missing.push(current)
    }
  }
  if (!missing.length) return
  await io.mkdir(parent, { recursive: true })
  created.push(...missing)
}

/**
 * Revalidate and apply a prepared batch. Existing targets move to sibling
 * backups before any final content is installed, allowing a reverse rollback.
 */
export async function applyPreparedRepoFileActions(
  repoPath: string,
  actions: PreparedRepoChatFileAction[],
  ignoredPaths: Set<string>,
  io: RepoFileActionFs = nodeRepoFileActionFs
): Promise<{ applied: number }> {
  const states = new Map<string, ApplyPathState>()
  let batchBytes = 0

  // Full-batch validation and in-memory simulation happen before the first
  // directory, temporary file, backup, or repository target is changed.
  for (const action of actions) {
    assertFileActionType(action)
    const target = normalizedTarget(repoPath, action.path)
    const path = target.path
    if (ignoredPaths.has(path)) fail('ignored_path', 'Ignored files cannot be changed by repository chat.', path)

    let state = states.get(path)
    if (!state) {
      const inspected = await inspectTarget(repoPath, path, io)
      if (inspected.exists && !inspected.isFile) fail('unsafe_path', 'The target is not a regular file.', path)
      let original: string | null = null
      if (inspected.exists) {
        const bytes = await io.readFile(target.absolute)
        if (bytes.includes(0)) fail('binary_file', 'Binary files cannot be changed by repository chat.', path)
        if (bytes.byteLength > REPO_FILE_MAX_BYTES) fail('file_too_large', 'The target file is too large.', path)
        original = bytes.toString('utf8')
      }
      state = {
        path,
        absolute: target.absolute,
        original,
        current: original,
        ...(inspected.mode === undefined ? {} : { mode: inspected.mode })
      }
      states.set(path, state)
    } else {
      await inspectTarget(repoPath, path, io)
    }

    const actualHash = state.current === null ? null : sha256(state.current)
    if (actualHash !== action.expectedHash) {
      fail('stale_file', 'The file changed after its preview was prepared.', path)
    }

    let after: string | null
    if (action.type === 'edit_file') {
      if (state.current === null) fail('stale_file', 'The file to edit no longer exists.', path)
      const count = occurrences(state.current, action.oldText)
      if (count !== action.expectedOccurrences || count === 0 || (!action.replaceAll && count !== 1)) {
        fail('stale_file', 'The exact edit no longer matches its preview.', path)
      }
      after = action.replaceAll
        ? state.current.split(action.oldText).join(action.newText)
        : state.current.replace(action.oldText, action.newText)
    } else if (action.type === 'write_file') {
      if (action.mode === 'create' && state.current !== null) {
        fail('stale_file', 'The file to create now exists.', path)
      }
      if (action.mode === 'replace' && state.current === null) {
        fail('stale_file', 'The file to replace no longer exists.', path)
      }
      after = action.content
    } else {
      if (state.current === null) fail('stale_file', 'The file to delete no longer exists.', path)
      after = null
    }

    if (after?.includes('\0')) fail('binary_file', 'Binary content cannot be written by repository chat.', path)
    const finalBytes = after === null ? 0 : Buffer.byteLength(after, 'utf8')
    if (finalBytes > REPO_FILE_MAX_BYTES) fail('file_too_large', 'The resulting file is too large.', path)
    batchBytes += finalBytes
    if (batchBytes > REPO_FILE_BATCH_MAX_BYTES) fail('batch_too_large', 'The file batch is too large.', path)
    if (after === state.current) fail('unknown', 'The file action would not change the file.', path)
    state.current = after
  }

  const createdDirectories: string[] = []
  const ordered = [...states.values()]
  try {
    for (const state of ordered) {
      if (state.current === null) continue
      await ensureParentDirectories(repoPath, state.absolute, io, createdDirectories)
      state.temp = join(
        dirname(state.absolute),
        `.gitcito-${basename(state.absolute)}.tmp-${randomUUID()}`
      )
      await io.writeFile(state.temp, state.current, { encoding: 'utf8', flag: 'wx' })
      if (state.mode !== undefined) await io.chmod(state.temp, state.mode & 0o777)
    }

    // Move every original aside first. If any later installation fails, all
    // original contents are still available for a complete reverse restore.
    for (const state of ordered) {
      if (state.original === null || state.current === state.original) continue
      state.backup = join(
        dirname(state.absolute),
        `.gitcito-${basename(state.absolute)}.bak-${randomUUID()}`
      )
      await io.rename(state.absolute, state.backup)
      state.backupMoved = true
    }

    for (const state of ordered) {
      if (state.current === state.original || state.current === null) continue
      if (!state.temp) throw new RepoFileActionError('unknown', 'A prepared temporary file is missing.', [state.path])
      await io.rename(state.temp, state.absolute)
      state.temp = undefined
      state.installed = true
    }
  } catch (error) {
    const rollbackPaths: string[] = []
    for (const state of [...ordered].reverse()) {
      try {
        if (state.backupMoved && state.backup) {
          await io.rm(state.absolute, { force: true })
          await io.rename(state.backup, state.absolute)
          state.backupMoved = false
        } else if (state.original === null && state.installed) {
          await io.rm(state.absolute, { force: true })
        }
      } catch {
        rollbackPaths.push(state.path)
      }
      if (state.temp) {
        try {
          await io.rm(state.temp, { force: true })
          state.temp = undefined
        } catch {
          if (!rollbackPaths.includes(state.path)) rollbackPaths.push(state.path)
        }
      }
    }
    for (const directory of [...createdDirectories].reverse()) {
      await io.rm(directory, { force: true }).catch(() => undefined)
    }
    if (rollbackPaths.length) {
      throw new RepoFileActionError(
        'rollback_failed',
        'The file batch failed and one or more original paths could not be restored.',
        rollbackPaths
      )
    }
    if (error instanceof RepoFileActionError) throw error
    throw new RepoFileActionError(
      'unknown',
      error instanceof Error ? error.message : String(error)
    )
  }

  // Backups are no longer needed after every final target is installed.
  for (const state of ordered) {
    if (state.backup) await io.rm(state.backup, { force: true }).catch(() => undefined)
    if (state.temp) await io.rm(state.temp, { force: true }).catch(() => undefined)
  }
  return { applied: actions.length }
}
