// Which word the pointer is on, and whether it is worth asking the AI about.
//
// highlight.js only wraps what it recognises, and it highlights one line at a
// time — most identifiers (parameters, locals, user-defined functions) are bare
// text with no span at all. So the token comes from the character offset under
// the caret, not from the markup; the markup is only consulted to rule tokens
// out.

const WORD = /[A-Za-z0-9_$]/

export interface TokenSpan {
  text: string
  /** Character range of the token within the line, for positioning the card. */
  start: number
  end: number
}

/** The identifier straddling `offset`, or null when the caret is not on one. */
export function identifierAt(text: string, offset: number): TokenSpan | null {
  if (offset < 0 || offset > text.length) return null
  // A caret sitting just past the last character still belongs to that word.
  let start = offset
  if (start > 0 && (start === text.length || !WORD.test(text[start]))) start--
  if (start < 0 || !WORD.test(text[start] ?? '')) return null

  let end = start
  while (start > 0 && WORD.test(text[start - 1])) start--
  while (end < text.length - 1 && WORD.test(text[end + 1])) end++
  return { text: text.slice(start, end + 1), start, end: end + 1 }
}

// Highlighted spans that are never worth a request: the answer is either in the
// text already (a literal) or generic (a keyword).
const EXCLUDED_CLASSES = new Set([
  'hljs-string',
  'hljs-comment',
  'hljs-quote',
  'hljs-number',
  'hljs-literal',
  'hljs-keyword',
  'hljs-regexp',
  'hljs-doctag',
  'hljs-meta',
  'hljs-subst'
])

// Bare keywords that no highlighter marked up but that still say nothing.
const STOPWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'const', 'let', 'var', 'function', 'class', 'extends', 'new',
  'this', 'self', 'super', 'null', 'nil', 'none', 'true', 'false', 'void',
  'import', 'export', 'from', 'as', 'default', 'async', 'await', 'yield',
  'try', 'catch', 'finally', 'throw', 'throws', 'def', 'end', 'fn', 'pub',
  'use', 'mod', 'impl', 'struct', 'enum', 'interface', 'type', 'typeof',
  'public', 'private', 'protected', 'static', 'final', 'required', 'in', 'of',
  'and', 'or', 'not', 'is', 'with', 'lambda', 'pass', 'raise', 'elif'
])

const MIN_LENGTH = 2
const MAX_LENGTH = 60

/**
 * True when a token is an identifier worth explaining. `className` is the
 * nearest highlight.js class around it, or '' when the text was not highlighted
 * — unhighlighted words are the common case and are allowed through.
 */
export function isExplainableToken(token: string, className = ''): boolean {
  const word = token.trim()
  if (word.length < MIN_LENGTH || word.length > MAX_LENGTH) return false
  if (!/[A-Za-z_$]/.test(word)) return false
  if (STOPWORDS.has(word.toLowerCase())) return false
  return !className.split(/\s+/).some((c) => EXCLUDED_CLASSES.has(c))
}
