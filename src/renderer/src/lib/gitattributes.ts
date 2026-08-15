/**
 * Reading and rewriting `.gitattributes`, as text.
 *
 * The file is line-oriented and hand-edited, often with comments that explain
 * why a rule exists — so every edit here is surgical: the line for one pattern
 * is replaced or removed, and everything else survives byte-for-byte. A parser
 * that round-trips through a data structure would quietly eat those comments.
 */

/** One `name`, `name=value`, `-name` or `!name` token on an attribute line. */
export interface Attr {
  name: string
  /** `true` = set, `false` = unset (`-name`), `null` = unspecified (`!name`), or a string value. */
  value: string | boolean | null
}

export interface AttrRule {
  pattern: string
  attrs: Attr[]
  /** 0-based line in the file, so an edit can go back exactly where it came from. */
  line: number
  /** The raw line, kept for anything this parser does not model. */
  raw: string
}

/** Split an attribute token into name and value. */
function parseAttr(token: string): Attr {
  if (token.startsWith('-')) return { name: token.slice(1), value: false }
  if (token.startsWith('!')) return { name: token.slice(1), value: null }
  const eq = token.indexOf('=')
  return eq === -1 ? { name: token, value: true } : { name: token.slice(0, eq), value: token.slice(eq + 1) }
}

/** Render one attribute back into git's own syntax. */
export function formatAttr(attr: Attr): string {
  if (attr.value === false) return `-${attr.name}`
  if (attr.value === null) return `!${attr.name}`
  if (attr.value === true) return attr.name
  return `${attr.name}=${attr.value}`
}

/**
 * Every rule in a `.gitattributes` file, in order.
 *
 * Blank lines and comments are skipped — they are not rules — but their line
 * numbers are preserved for everything that follows, which is what makes an
 * in-place edit safe.
 */
export function parseAttributes(content: string): AttrRule[] {
  const rules: AttrRule[] = []
  content.split('\n').forEach((raw, line) => {
    const text = raw.trim()
    if (!text || text.startsWith('#')) return
    // A quoted pattern may contain spaces: "my docs/*.md text".
    const match = /^("(?:[^"\\]|\\.)*"|\S+)\s*(.*)$/.exec(text)
    if (!match) return
    const pattern = match[1]
    const attrs = match[2].split(/\s+/).filter(Boolean).map(parseAttr)
    rules.push({ pattern, attrs, line, raw })
  })
  return rules
}

/** The line a rule would be written as. */
export function formatRule(pattern: string, attrs: Attr[]): string {
  return [pattern, ...attrs.map(formatAttr)].join(' ')
}

/**
 * Add a rule, or replace the one that already matches this exact pattern.
 *
 * Matching on the pattern (not the line) is what makes the UI's "edit" honest:
 * changing the attributes of `*.md` rewrites the `*.md` line wherever it sits,
 * rather than appending a second rule that silently wins by being later.
 */
export function upsertRule(content: string, pattern: string, attrs: Attr[]): string {
  const line = formatRule(pattern, attrs)
  const existing = parseAttributes(content).find((rule) => rule.pattern === pattern)
  const lines = content.split('\n')
  if (existing) {
    lines[existing.line] = line
    return lines.join('\n')
  }
  // Keep exactly one trailing newline, whatever the file arrived with.
  const body = content.replace(/\n+$/, '')
  return body ? `${body}\n${line}\n` : `${line}\n`
}

/** Remove the rule for `pattern`, leaving comments and everything else alone. */
export function removeRule(content: string, pattern: string): string {
  const existing = parseAttributes(content).find((rule) => rule.pattern === pattern)
  if (!existing) return content
  const lines = content.split('\n')
  lines.splice(existing.line, 1)
  return lines.join('\n')
}

/** A ready-made rule: the handful of attributes that solve a real problem. */
export interface AttrPreset {
  id: string
  /** Suggested pattern, which the user is expected to edit. */
  pattern: string
  attrs: Attr[]
}

/**
 * The presets worth offering, in the order they come up in practice.
 *
 * Each one exists because a specific thing goes wrong without it: a changelog
 * that conflicts on every merge, a binary that git tries to three-way merge, a
 * CI directory shipped inside a release tarball, line endings that flip on a
 * Windows checkout.
 */
export const ATTR_PRESETS: AttrPreset[] = [
  { id: 'union', pattern: 'CHANGELOG.md', attrs: [{ name: 'merge', value: 'union' }] },
  { id: 'binary', pattern: '*.png', attrs: [{ name: 'binary', value: true }] },
  { id: 'nomerge', pattern: '*.lock', attrs: [{ name: 'merge', value: false }] },
  { id: 'exportIgnore', pattern: 'test/', attrs: [{ name: 'export-ignore', value: true }] },
  { id: 'lf', pattern: '*', attrs: [{ name: 'text', value: 'auto' }, { name: 'eol', value: 'lf' }] },
  { id: 'lfs', pattern: '*.psd', attrs: [
    { name: 'filter', value: 'lfs' },
    { name: 'diff', value: 'lfs' },
    { name: 'merge', value: 'lfs' },
    { name: 'text', value: false }
  ] },
  { id: 'linguist', pattern: 'vendor/', attrs: [{ name: 'linguist-vendored', value: true }] }
]
