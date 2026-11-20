import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { promisify } from 'util'
import { readPackageScripts } from './packageScripts'

/**
 * What the terminal can complete after a command, read from where the shell
 * is now. Each kind answers with names and, where there is one, the command
 * behind each name — shown next to it in the list.
 */

export type CompletionKind = 'scripts' | 'composer' | 'make' | 'branches'

export interface Completions {
  /** Name → what it runs ('' when there is nothing to show), in file order. */
  items: Record<string, string>
}

const pexecFile = promisify(execFile)

/** The nearest directory at or above `start` holding `file` — a few levels at most. */
function nearestDirWith(start: string, file: string, maxUp = 8): string | null {
  let dir = start
  for (let i = 0; i <= maxUp; i++) {
    if (existsSync(join(dir, file))) return dir
    const up = dirname(dir)
    if (up === dir) break
    dir = up
  }
  return null
}

const TARGET = /^([A-Za-z0-9_][A-Za-z0-9_./-]*(?:[ \t]+[A-Za-z0-9_][A-Za-z0-9_./-]*)*)[ \t]*:(?![=:])(.*)$/

/**
 * The targets a Makefile declares, with a description: the `## text` after
 * the target (the self-documenting-Makefile convention), else its first
 * recipe line. Special targets (`.PHONY`), pattern rules (`%.o`) and anything
 * built from variables are left out — `make` would not take them as typed.
 */
export function parseMakeTargets(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const m = TARGET.exec(lines[i])
    if (!m) continue
    const doc = /##\s*(.+)$/.exec(m[2])?.[1].trim()
    let recipe = ''
    if (!doc) {
      const next = lines[i + 1] ?? ''
      if (next.startsWith('\t')) recipe = next.trim().replace(/^[@-]+/, '')
    }
    for (const name of m[1].split(/[ \t]+/)) if (!(name in out)) out[name] = doc ?? recipe
  }
  return out
}

/** GNU make reads the first of these in the current directory, and only there. */
const MAKEFILES = ['GNUmakefile', 'makefile', 'Makefile']

export async function readMakeTargets(cwd: string): Promise<Completions | null> {
  const file = MAKEFILES.map((f) => join(cwd, f)).find((f) => existsSync(f))
  if (!file) return null
  try {
    return { items: parseMakeTargets(await readFile(file, 'utf8')) }
  } catch {
    return null
  }
}

/** composer.json scripts: a command, or a list of them run in order. */
export function parseComposerScripts(json: string): Record<string, string> {
  const out: Record<string, string> = {}
  let parsed: { scripts?: Record<string, unknown> }
  try {
    parsed = JSON.parse(json) as typeof parsed
  } catch {
    return out
  }
  for (const [name, v] of Object.entries(parsed.scripts ?? {})) {
    if (typeof v === 'string') out[name] = v
    else if (Array.isArray(v)) out[name] = v.filter((c) => typeof c === 'string').join(' && ')
  }
  return out
}

export async function readComposerScripts(cwd: string): Promise<Completions | null> {
  const dir = nearestDirWith(cwd, 'composer.json')
  if (!dir) return null
  try {
    return { items: parseComposerScripts(await readFile(join(dir, 'composer.json'), 'utf8')) }
  } catch {
    return null
  }
}

/**
 * Branch names to check out, merge or rebase onto: local branches, then
 * remote ones by their short name (`git checkout feat` creates the tracking
 * branch), each name once.
 */
export function branchNames(refs: string): string[] {
  const seen = new Set<string>()
  for (const ref of refs.split('\n').map((r) => r.trim())) {
    if (!ref) continue
    let name = ref
    if (ref.startsWith('refs/heads/')) name = ref.slice('refs/heads/'.length)
    else if (ref.startsWith('refs/remotes/')) {
      const rest = ref.slice('refs/remotes/'.length)
      name = rest.slice(rest.indexOf('/') + 1)
      if (name === 'HEAD') continue
    } else continue
    seen.add(name)
  }
  return [...seen]
}

export async function readBranches(cwd: string): Promise<Completions | null> {
  try {
    const { stdout } = await pexecFile(
      'git',
      ['for-each-ref', '--format=%(refname)', '--sort=-committerdate', 'refs/heads', 'refs/remotes'],
      { cwd, timeout: 2000 }
    )
    return { items: Object.fromEntries(branchNames(stdout).map((b) => [b, ''])) }
  } catch {
    return null // not a repository, or git missing
  }
}

export async function readCompletions(kind: CompletionKind, cwd: string): Promise<Completions | null> {
  switch (kind) {
    case 'scripts': {
      const pkg = await readPackageScripts(cwd)
      return pkg ? { items: pkg.scripts } : null
    }
    case 'composer':
      return readComposerScripts(cwd)
    case 'make':
      return readMakeTargets(cwd)
    case 'branches':
      return readBranches(cwd)
  }
}
