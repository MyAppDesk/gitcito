/**
 * `.gitcito.json` on disk: reading it, writing it, checking what it requires,
 * and proposing one for a repository that has none.
 *
 * The renderer never reaches this module directly — everything here is exposed
 * as a `gitService` method so the calls take the same per-repository lock as
 * git itself, and land in the operation log alongside them.
 *
 * The doctor's repairs are a closed set (see `DoctorFix`). The config supplies
 * data for them — a path to copy, a value for `core.hooksPath` — and never a
 * command, so opening a hostile repository cannot make Gitcito run anything it
 * was not already prepared to run.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, copyFile, access } from 'fs/promises'
import { existsSync } from 'fs'
import { join, relative, resolve, sep } from 'path'
import {
  REPO_CONFIG_FILE,
  REPO_CONFIG_VERSION,
  isSafeRepoRelPath,
  parseRepoConfig,
  satisfiesNodeRange,
  serializeRepoConfig,
  validateRepoConfig
} from '../shared/repoConfig'
import type { DoctorCheck, DoctorFix, RepoConfig, RepoConfigResult } from '../shared/types'

const pexecFile = promisify(execFile)

/** Short-lived commands only: a doctor row is not worth hanging the panel over. */
const TIMEOUT = 15_000

async function run(cwd: string, file: string, args: string[]): Promise<string> {
  const { stdout } = await pexecFile(file, args, { cwd, timeout: TIMEOUT, maxBuffer: 4 * 1024 * 1024 })
  return stdout.trim()
}

const git = (repoPath: string, args: string[]): Promise<string> => run(repoPath, 'git', args)

/** Resolve a repo-relative path, refusing anything that escapes the repository.
 *  The validator already rejected these shapes; this is the second lock on the
 *  same door, because this is the point where a string becomes a real path. */
function inside(repoPath: string, rel: string): string {
  if (!isSafeRepoRelPath(rel)) throw new Error(`Unsafe path in ${REPO_CONFIG_FILE}: ${rel}`)
  const root = resolve(repoPath)
  const full = resolve(root, rel)
  if (full !== root && !full.startsWith(root + sep)) throw new Error(`Unsafe path in ${REPO_CONFIG_FILE}: ${rel}`)
  return full
}

/** A configured path expressed relative to the repository, or undefined when it
 *  points outside it — an absolute path from someone else's machine is not
 *  something to write into a shared file. */
function relativeInside(repoPath: string, value: string): string | undefined {
  const root = resolve(repoPath)
  const full = resolve(root, value)
  if (full === root || !full.startsWith(root + sep)) return undefined
  const rel = relative(root, full)
  return isSafeRepoRelPath(rel) ? rel : undefined
}

export async function readRepoConfig(repoPath: string): Promise<RepoConfigResult> {
  const path = join(repoPath, REPO_CONFIG_FILE)
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch {
    return { path, exists: false, config: null, issues: [] }
  }
  const { config, issues } = parseRepoConfig(raw)
  return { path, exists: true, config, issues }
}

/**
 * Write the config file. Validated again here rather than trusted from the
 * renderer: the editor is one caller, and the next one should not be able to
 * introduce a field the loader would reject.
 */
export async function writeRepoConfig(repoPath: string, config: RepoConfig): Promise<RepoConfigResult> {
  const { config: clean, issues } = validateRepoConfig(config)
  if (!clean) throw new Error(`Invalid ${REPO_CONFIG_FILE}`)
  const path = join(repoPath, REPO_CONFIG_FILE)
  await writeFile(path, serializeRepoConfig(clean), 'utf8')
  return { path, exists: true, config: clean, issues }
}

// ─── The doctor ─────────────────────────────────────────────────────────────

async function nodeCheck(spec: string): Promise<DoctorCheck> {
  const base = { id: 'node', kind: 'node' as const, expected: spec }
  let actual: string
  try {
    // PATH was repaired at startup (main/fix-path.ts), so this sees the same
    // node the user's terminal does rather than the one Finder handed us.
    actual = (await run(process.cwd(), 'node', ['--version'])).replace(/^v/, '')
  } catch {
    return { ...base, status: 'fail' }
  }
  return { ...base, actual, status: satisfiesNodeRange(actual, spec) ? 'ok' : 'warn' }
}

async function submodulesCheck(repoPath: string): Promise<DoctorCheck | null> {
  if (!existsSync(join(repoPath, '.gitmodules'))) return null
  const base = { id: 'submodules', kind: 'submodules' as const }
  const out = await git(repoPath, ['submodule', 'status', '--recursive']).catch(() => '')
  // `git submodule status` prefixes a line with `-` for a submodule that has
  // never been checked out — the state that makes a fresh clone fail to build.
  const missing = out.split('\n').filter((l) => l.startsWith('-')).length
  if (missing === 0) return { ...base, status: 'ok' }
  return { ...base, status: 'fail', actual: String(missing), fix: { kind: 'submodules' } }
}

async function lfsCheck(repoPath: string): Promise<DoctorCheck> {
  const base = { id: 'lfs', kind: 'lfs' as const }
  try {
    await run(repoPath, 'git', ['lfs', 'version'])
  } catch {
    // git-lfs is not installed at all — nothing Gitcito can repair from here.
    return { ...base, status: 'fail' }
  }
  const names = (await git(repoPath, ['lfs', 'ls-files', '-n']).catch(() => '')).split('\n').filter(Boolean)
  if (!names.length) return { ...base, status: 'ok' }
  // A tracked file still holding its pointer text was cloned without the
  // objects: the build reads 130 bytes of metadata where an asset should be.
  const first = names[0]
  try {
    const head = await readFile(inside(repoPath, first), 'utf8')
    if (head.startsWith('version https://git-lfs')) {
      return { ...base, status: 'warn', actual: first, fix: { kind: 'lfsPull' } }
    }
  } catch {
    // Unreadable or binary — binary is the healthy case.
  }
  return { ...base, status: 'ok' }
}

async function hooksCheck(repoPath: string, expected: string): Promise<DoctorCheck> {
  const raw = (await git(repoPath, ['config', '--get', 'core.hooksPath']).catch(() => '')).trim()
  // husky's installer writes an absolute path; the config can only say a
  // relative one. Compare them in the same terms, or a perfectly wired clone
  // wears a red row forever.
  const actual = raw ? (relativeInside(repoPath, raw) ?? raw) : ''
  return {
    id: 'hooks',
    kind: 'hooks',
    expected,
    ...(actual ? { actual } : {}),
    status: actual === expected ? 'ok' : 'fail',
    ...(actual === expected ? {} : { fix: { kind: 'hooksPath' as const, value: expected } })
  }
}

async function fileCheck(repoPath: string, req: { path: string; from?: string; why?: string }): Promise<DoctorCheck> {
  const base = {
    id: `file:${req.path}`,
    kind: 'file' as const,
    expected: req.path,
    ...(req.why ? { why: req.why } : {})
  }
  try {
    await access(inside(repoPath, req.path))
    return { ...base, status: 'ok' }
  } catch {
    const canCopy = req.from ? existsSync(inside(repoPath, req.from)) : false
    return {
      ...base,
      status: 'fail',
      ...(canCopy && req.from ? { fix: { kind: 'copyFile' as const, from: req.from, to: req.path } } : {})
    }
  }
}

/**
 * Run every check the repository's config asks for.
 *
 * Reads the config itself rather than taking it from the caller, so a doctor
 * run always reflects what is on disk right now — the file is a tracked file
 * and a branch switch can change it underneath the panel.
 */
export async function runRepoDoctor(repoPath: string): Promise<DoctorCheck[]> {
  const { config } = await readRepoConfig(repoPath)
  const req = config?.requires
  if (!req) return []
  const checks: Promise<DoctorCheck | null>[] = []
  if (req.node) checks.push(nodeCheck(req.node))
  if (req.submodules) checks.push(submodulesCheck(repoPath))
  if (req.lfs) checks.push(lfsCheck(repoPath))
  if (req.hooksPath) checks.push(hooksCheck(repoPath, req.hooksPath))
  for (const f of req.files ?? []) checks.push(fileCheck(repoPath, f))
  const settled = await Promise.all(
    // One check that throws must not take the panel down with it.
    checks.map((p) => p.catch(() => null))
  )
  return settled.filter((c): c is DoctorCheck => c !== null)
}

/** Perform one of the doctor's repairs. The union is closed on purpose. */
export async function applyDoctorFix(repoPath: string, fix: DoctorFix): Promise<void> {
  switch (fix.kind) {
    case 'submodules':
      await git(repoPath, ['submodule', 'update', '--init', '--recursive'])
      return
    case 'lfsPull':
      await git(repoPath, ['lfs', 'pull'])
      return
    case 'hooksPath':
      // Re-validated: this value came from a file in the repository.
      if (!isSafeRepoRelPath(fix.value)) throw new Error(`Unsafe hooksPath: ${fix.value}`)
      await git(repoPath, ['config', 'core.hooksPath', fix.value])
      return
    case 'copyFile': {
      const from = inside(repoPath, fix.from)
      const to = inside(repoPath, fix.to)
      // Never clobber: the file being absent is the whole reason we are here,
      // and a config that could overwrite one would be a way to destroy work.
      if (existsSync(to)) throw new Error(`${fix.to} already exists`)
      await copyFile(from, to)
      return
    }
  }
}

// ─── Proposing a config ─────────────────────────────────────────────────────

/**
 * Read a repository and propose the config it evidently wants.
 *
 * The point is that nobody writes this file from a blank page. Everything here
 * is inferred from something already in the repository — `.gitmodules`,
 * `.nvmrc`, a husky directory, an `.env.example` sitting next to no `.env`.
 *
 * It deliberately proposes nothing it cannot see evidence for: ticket links
 * need a tracker URL only a human knows, so they are left for the editor.
 */
export async function suggestRepoConfig(repoPath: string): Promise<RepoConfig> {
  const config: RepoConfig = { version: REPO_CONFIG_VERSION }

  const branches = await git(repoPath, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']).catch(() => '')
  const locals = branches.split('\n').filter(Boolean)
  const defaults = ['main', 'master', 'develop'].filter((b) => locals.includes(b))
  // Existing protection is per-clone (git config); lifting it into the file is
  // how it stops being something each teammate has to rediscover.
  const configured = (await git(repoPath, ['config', '--get', 'gitcito.protectedbranches']).catch(() => ''))
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean)
  const protect = [...new Set([...defaults, ...configured])]
  if (protect.length) config.protect = protect

  const requires: NonNullable<RepoConfig['requires']> = {}
  if (existsSync(join(repoPath, '.gitmodules'))) requires.submodules = true

  const attrs = await readFile(join(repoPath, '.gitattributes'), 'utf8').catch(() => '')
  if (attrs.includes('filter=lfs')) requires.lfs = true

  const nvmrc = (await readFile(join(repoPath, '.nvmrc'), 'utf8').catch(() => '')).trim()
  if (nvmrc) requires.node = nvmrc.replace(/^v/, '')
  else {
    const pkg = await readFile(join(repoPath, 'package.json'), 'utf8').catch(() => '')
    const engines = pkg ? (JSON.parse(pkg) as { engines?: { node?: string } }).engines?.node : undefined
    if (engines) requires.node = engines
  }

  // Prefer what the clone is actually configured with over what the directory
  // layout suggests: husky v9 points core.hooksPath at `.husky/_`, and its
  // installer writes an absolute path. Proposing `.husky` from the directory
  // alone would hand every teammate a doctor row that "fixes" a working setup
  // into a broken one.
  const hooksPath = (await git(repoPath, ['config', '--get', 'core.hooksPath']).catch(() => '')).trim()
  const relHooks = hooksPath ? relativeInside(repoPath, hooksPath) : undefined
  if (relHooks) requires.hooksPath = relHooks
  else if (!hooksPath && existsSync(join(repoPath, '.husky'))) requires.hooksPath = '.husky'

  // An example file with no counterpart is the single most common reason a
  // fresh clone does not run.
  const files: NonNullable<RepoConfig['requires']>['files'] = []
  for (const example of ['.env.example', '.env.sample', '.env.template']) {
    if (existsSync(join(repoPath, example)) && !existsSync(join(repoPath, '.env'))) {
      files.push({ path: '.env', from: example })
      break
    }
  }
  if (files.length) requires.files = files
  if (Object.keys(requires).length) config.requires = requires

  // Scopes: the ones this repository's own history has been using.
  const subjects = await git(repoPath, ['log', '-500', '--format=%s']).catch(() => '')
  const scopes = new Map<string, number>()
  let tickets = 0
  for (const line of subjects.split('\n')) {
    const scope = /^\w+\(([^)]{1,40})\)!?:/.exec(line)?.[1]
    if (scope) scopes.set(scope, (scopes.get(scope) ?? 0) + 1)
    if (/\b[A-Z][A-Z0-9]+-\d+\b/.test(line)) tickets++
  }
  const commit: NonNullable<RepoConfig['commit']> = {}
  const common = [...scopes.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([s]) => s)
    .sort()
  if (common.length) commit.scopes = common
  // A tenth of recent commits carrying a ticket key is a convention, not a coincidence.
  if (tickets >= 5) commit.ticketFromBranch = true
  if (Object.keys(commit).length) config.commit = commit

  return config
}
