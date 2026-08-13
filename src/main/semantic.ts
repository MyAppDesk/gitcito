/**
 * Semantic diff — what *changed*, not which lines moved.
 *
 * Both sides of a file are parsed with tree-sitter, their declarations are
 * extracted, and the two symbol sets are matched: a function whose body is
 * unchanged but whose name differs is a rename, one whose parameters differ is
 * a signature change, one that only moved is a move. That turns a 400-line red
 * /green wall into "renamed start() → boot(), added a `retries` parameter".
 *
 * Grammars are WASM (web-tree-sitter), loaded lazily from resources/tree-sitter
 * and cached for the app's lifetime. A file whose language has no grammar
 * simply reports `language: null` and the UI keeps its line diff.
 */
import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import type { SemanticChange, SemanticDiff, SemanticSymbolKind } from '../shared/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
// web-tree-sitter ships CommonJS with an emscripten runtime; it is required
// lazily so a missing grammar folder can never break app start-up.
type TsNode = any
type TsParser = any

/** Which declaration node types matter, and what to call them in the UI. */
interface LangSpec {
  /** Grammar file name under resources/tree-sitter (tree-sitter-<name>.wasm). */
  grammar: string
  /** Node type → the label shown to the user. */
  nodes: Record<string, SemanticSymbolKind>
}

const TS_NODES: Record<string, SemanticSymbolKind> = {
  function_declaration: 'function',
  generator_function_declaration: 'function',
  class_declaration: 'class',
  abstract_class_declaration: 'class',
  method_definition: 'method',
  interface_declaration: 'interface',
  type_alias_declaration: 'type',
  enum_declaration: 'enum',
  // `const foo = () => …` — the declarator carries the name, the value the body.
  variable_declarator: 'function'
}

const LANGS: Record<string, LangSpec> = {
  ts: { grammar: 'typescript', nodes: TS_NODES },
  mts: { grammar: 'typescript', nodes: TS_NODES },
  cts: { grammar: 'typescript', nodes: TS_NODES },
  tsx: { grammar: 'tsx', nodes: TS_NODES },
  js: { grammar: 'javascript', nodes: TS_NODES },
  mjs: { grammar: 'javascript', nodes: TS_NODES },
  cjs: { grammar: 'javascript', nodes: TS_NODES },
  jsx: { grammar: 'javascript', nodes: TS_NODES },
  py: {
    grammar: 'python',
    nodes: { function_definition: 'function', class_definition: 'class' }
  },
  go: {
    grammar: 'go',
    nodes: {
      function_declaration: 'function',
      method_declaration: 'method',
      type_spec: 'type'
    }
  },
  rs: {
    grammar: 'rust',
    nodes: {
      function_item: 'function',
      struct_item: 'struct',
      enum_item: 'enum',
      trait_item: 'interface',
      mod_item: 'module',
      type_item: 'type'
    }
  },
  java: {
    grammar: 'java',
    nodes: {
      method_declaration: 'method',
      constructor_declaration: 'method',
      class_declaration: 'class',
      interface_declaration: 'interface',
      enum_declaration: 'enum',
      record_declaration: 'struct'
    }
  },
  c: { grammar: 'c', nodes: { function_definition: 'function', struct_specifier: 'struct', enum_specifier: 'enum' } },
  h: { grammar: 'c', nodes: { function_definition: 'function', struct_specifier: 'struct', enum_specifier: 'enum' } },
  cpp: {
    grammar: 'cpp',
    nodes: {
      function_definition: 'function',
      class_specifier: 'class',
      struct_specifier: 'struct',
      enum_specifier: 'enum'
    }
  },
  cc: { grammar: 'cpp', nodes: { function_definition: 'function', class_specifier: 'class', struct_specifier: 'struct' } },
  hpp: { grammar: 'cpp', nodes: { function_definition: 'function', class_specifier: 'class', struct_specifier: 'struct' } },
  cs: {
    grammar: 'c_sharp',
    nodes: {
      method_declaration: 'method',
      constructor_declaration: 'method',
      class_declaration: 'class',
      interface_declaration: 'interface',
      struct_declaration: 'struct',
      enum_declaration: 'enum',
      property_declaration: 'property'
    }
  },
  rb: { grammar: 'ruby', nodes: { method: 'method', singleton_method: 'method', class: 'class', module: 'module' } },
  php: {
    grammar: 'php',
    nodes: {
      function_definition: 'function',
      method_declaration: 'method',
      class_declaration: 'class',
      interface_declaration: 'interface',
      trait_declaration: 'interface'
    }
  },
  swift: {
    grammar: 'swift',
    nodes: {
      function_declaration: 'function',
      class_declaration: 'class',
      protocol_declaration: 'interface'
    }
  },
  kt: {
    grammar: 'kotlin',
    nodes: { function_declaration: 'function', class_declaration: 'class', object_declaration: 'class' }
  },
  // No Dart: the published tree-sitter-dart WASM targets a newer grammar ABI
  // than web-tree-sitter 0.24 accepts, so it would only ever fail to load.
  scala: {
    grammar: 'scala',
    nodes: {
      function_definition: 'function',
      class_definition: 'class',
      object_definition: 'class',
      trait_definition: 'interface'
    }
  },
  lua: {
    grammar: 'lua',
    nodes: { function_definition_statement: 'function', local_function_definition_statement: 'function' }
  },
  sh: { grammar: 'bash', nodes: { function_definition: 'function' } },
  bash: { grammar: 'bash', nodes: { function_definition: 'function' } },
  zig: { grammar: 'zig', nodes: { function_declaration: 'function' } }
}

/** Files past this size aren't worth parsing twice for a summary. */
const MAX_BYTES = 400_000

/** A symbol has to travel at least this far before it counts as "moved". */
const MOVE_MIN_LINES = 5

function grammarDir(): string {
  return app?.isPackaged
    ? join(process.resourcesPath, 'tree-sitter')
    : join(__dirname, '../../resources/tree-sitter')
}

let parserInit: Promise<TsParser> | null = null
const languages = new Map<string, Promise<unknown | null>>()

/** The web-tree-sitter module, initialised once with our WASM runtime. */
async function getParserClass(): Promise<TsParser> {
  if (!parserInit) {
    parserInit = (async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Parser = require('web-tree-sitter')
      const runtime = join(grammarDir(), 'tree-sitter.wasm')
      await Parser.init({ locateFile: () => runtime })
      return Parser
    })().catch((err) => {
      parserInit = null
      throw err
    })
  }
  return parserInit
}

async function loadLanguage(grammar: string): Promise<unknown | null> {
  let pending = languages.get(grammar)
  if (!pending) {
    pending = (async () => {
      const file = join(grammarDir(), `tree-sitter-${grammar}.wasm`)
      if (!existsSync(file)) return null
      const Parser = await getParserClass()
      return await Parser.Language.load(file)
    })().catch(() => null)
    languages.set(grammar, pending)
  }
  return pending
}

export function langSpecFor(path: string): LangSpec | null {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return LANGS[ext] ?? null
}

export interface Symbol {
  /** Fully qualified: `Class.method`, so two same-named methods stay distinct. */
  key: string
  name: string
  kind: SemanticSymbolKind
  signature: string
  /** Body with whitespace collapsed — the identity used to spot renames/moves. */
  body: string
  line: number
}

/**
 * The declaration's name. Most grammars expose a `name` field; C-family ones
 * bury it inside a declarator, so fall back to the first identifier-ish node
 * that isn't part of the body.
 */
function nameOf(node: TsNode): string {
  const named = node.childForFieldName?.('name')
  if (named) return named.text
  const declarator = node.childForFieldName?.('declarator')
  if (declarator) {
    const inner = declarator.childForFieldName?.('declarator')
    if (inner?.text) return inner.text
    if (declarator.text) return declarator.text.replace(/\(.*$/s, '').trim()
  }
  for (const child of node.namedChildren ?? []) {
    if (/identifier$/.test(child.type)) return child.text
  }
  return ''
}

function signatureOf(node: TsNode): string {
  const params =
    node.childForFieldName?.('parameters') ??
    node.childForFieldName?.('parameter_list') ??
    node.childForFieldName?.('type_parameters')
  const ret = node.childForFieldName?.('return_type') ?? node.childForFieldName?.('result')
  const sig = (params?.text ?? '') + (ret ? `: ${ret.text}` : '')
  return sig.replace(/\s+/g, ' ').trim()
}

function bodyOf(node: TsNode): string {
  let body = node.childForFieldName?.('body') ?? node.childForFieldName?.('value')
  // Some grammars (Kotlin, Zig…) expose no `body` field; take the block-ish
  // child instead, so a pure rename doesn't read as a rewritten body.
  if (!body) {
    for (const child of node.namedChildren ?? []) {
      if (/(body|block|statements)$/.test(child.type)) body = child
    }
  }
  return (body?.text ?? node.text ?? '').replace(/\s+/g, ' ').trim()
}

/** Walks the tree collecting every declaration the language spec cares about. */
export function collectSymbols(root: TsNode, spec: LangSpec): Symbol[] {
  const out: Symbol[] = []
  const seen = new Map<string, number>()

  const visit = (node: TsNode, scope: string): void => {
    let nextScope = scope
    const kind = spec.nodes[node.type]
    if (kind) {
      const name = nameOf(node)
      // `const x = 1` is a variable_declarator too — only keep the ones that
      // actually declare a callable, or the summary fills with noise.
      const isFnDeclarator =
        node.type !== 'variable_declarator' ||
        /^(arrow_function|function|function_expression|generator_function)$/.test(
          node.childForFieldName?.('value')?.type ?? ''
        )
      if (name && isFnDeclarator) {
        const base = scope ? `${scope}.${name}` : name
        const dup = seen.get(base) ?? 0
        seen.set(base, dup + 1)
        out.push({
          key: dup ? `${base}#${dup + 1}` : base,
          name,
          // A function declared inside a class is a method, whatever the
          // grammar calls the node (Python uses function_definition for both).
          kind: kind === 'function' && scope ? 'method' : kind,
          signature: signatureOf(node),
          body: bodyOf(node),
          line: node.startPosition.row + 1
        })
        if (kind === 'class' || kind === 'module' || kind === 'interface' || kind === 'struct') nextScope = base
      }
    }
    for (const child of node.namedChildren ?? []) visit(child, nextScope)
  }

  visit(root, '')
  return out
}

/** Word-boundary occurrences of an identifier — used to size a rename. */
function countSites(text: string, name: string): number {
  if (!name) return 0
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
  return text.match(re)?.length ?? 0
}

/** Sørensen–Dice over character bigrams — stable on short bodies. */
function diceBigrams(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0
  const counts = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const g = a.slice(i, i + 2)
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  let shared = 0
  for (let i = 0; i < b.length - 1; i++) {
    const g = b.slice(i, i + 2)
    const left = counts.get(g) ?? 0
    if (left > 0) {
      counts.set(g, left - 1)
      shared++
    }
  }
  return (2 * shared) / (a.length - 1 + (b.length - 1))
}

/**
 * How alike two bodies are, for pairing a renamed symbol whose body also
 * changed. Token overlap catches reordered code; bigrams catch the one-word
 * edits ("v1" → "v2") that leave a tiny function almost unchanged.
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1
  const ta = new Set(a.split(/\W+/).filter(Boolean))
  const tb = new Set(b.split(/\W+/).filter(Boolean))
  if (!ta.size || !tb.size) return diceBigrams(a, b)
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  const jaccard = shared / (ta.size + tb.size - shared)
  return Math.max(jaccard, diceBigrams(a, b))
}

/**
 * Matches two symbol tables and describes the differences.
 * Exported separately from the parsing so it can be unit-tested without WASM.
 */
export function diffSymbols(
  oldSymbols: Symbol[],
  newSymbols: Symbol[],
  oldText = '',
  newText = ''
): SemanticChange[] {
  const oldByKey = new Map(oldSymbols.map((s) => [s.key, s]))
  const newByKey = new Map(newSymbols.map((s) => [s.key, s]))
  const changes: SemanticChange[] = []
  const removed: Symbol[] = []
  const added: Symbol[] = []

  for (const o of oldSymbols) {
    const n = newByKey.get(o.key)
    if (!n) {
      removed.push(o)
      continue
    }
    if (o.signature !== n.signature) {
      changes.push({
        kind: 'signature',
        symbol: n.key,
        symbolKind: n.kind,
        line: n.line,
        oldSignature: o.signature,
        newSignature: n.signature,
        bodyChanged: o.body !== n.body
      })
    } else if (o.body !== n.body) {
      changes.push({ kind: 'changed', symbol: n.key, symbolKind: n.kind, line: n.line })
    } else if (Math.abs(n.line - o.line) >= MOVE_MIN_LINES) {
      // Small shifts are just the neighbours above growing or shrinking —
      // reporting them would bury the real moves in noise.
      changes.push({
        kind: 'moved',
        symbol: n.key,
        symbolKind: n.kind,
        line: n.line,
        detail: `${n.line > o.line ? '+' : ''}${n.line - o.line}`
      })
    }
  }
  for (const n of newSymbols) if (!oldByKey.has(n.key)) added.push(n)

  // Pair what vanished with what appeared: an identical (or near-identical)
  // body under a different name is a rename, not a delete plus an add.
  const takenNew = new Set<string>()
  for (const o of removed) {
    let best: { sym: Symbol; score: number } | null = null
    for (const n of added) {
      if (takenNew.has(n.key) || n.kind !== o.kind) continue
      const score = similarity(o.body, n.body)
      // Short bodies look alike by accident (`return "pong"` vs `return true`
      // share most of their bigrams), so they have to match far more closely
      // before we call two functions the same one under a new name.
      const needed = Math.min(o.body.length, n.body.length) >= 80 ? 0.6 : 0.8
      if (score >= needed && (!best || score > best.score)) best = { sym: n, score }
    }
    if (!best) {
      changes.push({ kind: 'removed', symbol: o.key, symbolKind: o.kind, line: o.line })
      continue
    }
    takenNew.add(best.sym.key)
    const sites = Math.max(countSites(newText, best.sym.name), countSites(oldText, o.name))
    changes.push({
      kind: 'renamed',
      symbol: best.sym.key,
      oldName: o.key,
      symbolKind: best.sym.kind,
      line: best.sym.line,
      bodyChanged: best.score < 1,
      oldSignature: o.signature !== best.sym.signature ? o.signature : undefined,
      newSignature: o.signature !== best.sym.signature ? best.sym.signature : undefined,
      detail: sites > 1 ? String(sites) : undefined
    })
  }
  for (const n of added) {
    if (!takenNew.has(n.key)) changes.push({ kind: 'added', symbol: n.key, symbolKind: n.kind, line: n.line })
  }

  // A class only ever reports "changed" because something inside it changed —
  // and that something is already its own row. Drop the redundant container.
  const explained = new Set<string>()
  for (const c of changes) {
    const dot = c.symbol.lastIndexOf('.')
    if (dot > 0) explained.add(c.symbol.slice(0, dot))
    if (c.oldName) {
      const oldDot = c.oldName.lastIndexOf('.')
      if (oldDot > 0) explained.add(c.oldName.slice(0, oldDot))
    }
  }
  const pruned = changes.filter((c) => !(c.kind === 'changed' && explained.has(c.symbol)))

  // Renames and signature breaks first — they are what a reviewer must not miss.
  const rank: Record<SemanticChange['kind'], number> = {
    renamed: 0,
    signature: 1,
    removed: 2,
    added: 3,
    changed: 4,
    moved: 5
  }
  return pruned.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.line ?? 0) - (b.line ?? 0))
}

/** Parse one file's text, or null when its language has no grammar installed. */
export async function parseSymbols(path: string, text: string): Promise<Symbol[] | null> {
  const spec = langSpecFor(path)
  if (!spec) return null
  const language = await loadLanguage(spec.grammar)
  if (!language) return null
  const Parser = await getParserClass()
  const parser = new Parser()
  try {
    parser.setLanguage(language)
    const tree = parser.parse(text)
    const symbols = collectSymbols(tree.rootNode, spec)
    tree.delete?.()
    return symbols
  } finally {
    parser.delete?.()
  }
}

/**
 * Compare two versions of the same file. `null` language means "no grammar for
 * this file", which the UI reads as "stay on the line diff".
 */
export async function semanticCompare(path: string, oldText: string, newText: string): Promise<SemanticDiff> {
  const spec = langSpecFor(path)
  if (!spec) return { language: null, changes: [] }
  if (oldText.length > MAX_BYTES || newText.length > MAX_BYTES) {
    return { language: spec.grammar, changes: [], truncated: true }
  }
  try {
    const [oldSymbols, newSymbols] = await Promise.all([
      parseSymbols(path, oldText),
      parseSymbols(path, newText)
    ])
    if (!oldSymbols || !newSymbols) return { language: null, changes: [] }
    return { language: spec.grammar, changes: diffSymbols(oldSymbols, newSymbols, oldText, newText) }
  } catch {
    // A grammar that fails to load must never take the diff view with it.
    return { language: null, changes: [] }
  }
}
