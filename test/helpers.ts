import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Repo root. */
export const ROOT = resolve(HERE, '..')
/** examples/playground — where setup-playground.sh writes the fixture repos. */
export const PLAYGROUND = resolve(ROOT, 'examples/playground')
/** The setup script that (re)generates the playground. */
export const SETUP_SCRIPT = resolve(ROOT, 'examples/setup-playground.sh')
/** Machine-readable list of scenarios written by the setup script. */
export const MANIFEST = resolve(PLAYGROUND, 'MANIFEST.tsv')

/** Absolute path to a playground repo by its scenario name. */
export const repoPath = (name: string): string => resolve(PLAYGROUND, name)

export interface ManifestEntry {
  name: string
  description: string
}

/** Parse MANIFEST.tsv (one `name<TAB>description` line per scenario). */
export function readManifest(): ManifestEntry[] {
  if (!existsSync(MANIFEST)) return []
  return readFileSync(MANIFEST, 'utf8')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split('\t')
      return { name, description: rest.join('\t') }
    })
}
