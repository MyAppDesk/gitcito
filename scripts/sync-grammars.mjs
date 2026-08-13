#!/usr/bin/env node
/**
 * Copies the tree-sitter WASM grammars the semantic diff needs out of
 * node_modules and into resources/tree-sitter/, which electron-builder ships
 * as extraResources.
 *
 * The grammars are generated artefacts (~25 MB), so they are gitignored and
 * rebuilt from the lockfile on install rather than committed. Only the
 * languages listed here are copied — tree-sitter-wasms ships 49 MB of them and
 * most (TLA+, SystemRDL, ObjC…) are not worth the download.
 */
import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'resources', 'tree-sitter')
const GRAMMAR_DIR = join(ROOT, 'node_modules', 'tree-sitter-wasms', 'out')
const RUNTIME = join(ROOT, 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm')

/** Languages the semantic diff can parse. Keep in sync with src/main/semantic.ts. */
const LANGUAGES = [
  'bash',
  'c',
  'c_sharp',
  'cpp',
  'go',
  'java',
  'javascript',
  'kotlin',
  'lua',
  'php',
  'python',
  'ruby',
  'rust',
  'scala',
  'swift',
  'tsx',
  'typescript',
  'zig'
]

if (!existsSync(GRAMMAR_DIR) || !existsSync(RUNTIME)) {
  // A production install without devDependencies has no grammars to copy;
  // that is fine — the app degrades to line diffs.
  console.log('[grammars] tree-sitter packages not installed, skipping')
  process.exit(0)
}

mkdirSync(OUT, { recursive: true })

// Drop grammars from an earlier list so the folder mirrors LANGUAGES exactly.
const keep = new Set(['tree-sitter.wasm', ...LANGUAGES.map((l) => `tree-sitter-${l}.wasm`)])
for (const f of readdirSync(OUT)) if (!keep.has(f)) rmSync(join(OUT, f))

let bytes = 0
let copied = 0
const copy = (from, to) => {
  if (!existsSync(from)) {
    console.warn(`[grammars] missing ${from}`)
    return
  }
  // Skip rewriting identical files so repeated installs stay fast.
  if (!existsSync(to) || statSync(from).size !== statSync(to).size) copyFileSync(from, to)
  bytes += statSync(to).size
  copied++
}

copy(RUNTIME, join(OUT, 'tree-sitter.wasm'))
for (const lang of LANGUAGES) {
  copy(join(GRAMMAR_DIR, `tree-sitter-${lang}.wasm`), join(OUT, `tree-sitter-${lang}.wasm`))
}

console.log(`[grammars] ${copied} files, ${(bytes / 1024 / 1024).toFixed(1)} MB → resources/tree-sitter`)
