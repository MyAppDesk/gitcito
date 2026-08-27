/**
 * Apple property lists, for the file preview.
 *
 * A plist ships in three encodings. This reads the XML one — the flavour that
 * lands in a repository, because it is the only one that diffs — and recognises
 * the other two well enough to say so rather than render noise:
 *
 *   - **XML** (`<?xml … <plist><dict>`): `Info.plist`, `*.entitlements`, most
 *     of what Xcode writes into source control.
 *   - **Binary** (`bplist00`): what a built app carries. Detected, not decoded.
 *   - **OpenStep ASCII**: `project.pbxproj`, handled by `shared/pbxproj`.
 *
 * The grammar is small and closed — eight value tags, no attributes worth
 * reading, no namespaces — so this scans tags directly instead of pulling in a
 * DOM. That keeps it pure, and therefore testable without a browser.
 */

export type PlistValue =
  | { kind: 'dict'; entries: { key: string; value: PlistValue }[] }
  | { kind: 'array'; items: PlistValue[] }
  | { kind: 'string'; value: string }
  | { kind: 'integer'; value: string }
  | { kind: 'real'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'date'; value: string }
  | { kind: 'data'; value: string }

/** Why a plist could not be shown as a tree, when it could not. */
export type PlistProblem = 'binary' | 'unreadable'

export type PlistResult =
  | { ok: true; root: PlistValue }
  | { ok: false; problem: PlistProblem }

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'"
}

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m])
}

interface Tag {
  name: string
  /** `<true/>` and friends — no closing tag, no body. */
  selfClosing: boolean
  end: number
}

/** The next element tag at or after `i`, skipping declarations, the doctype,
 *  comments and whitespace. Returns null at the end of the document. */
function nextTag(s: string, i: number): Tag | null {
  for (;;) {
    const lt = s.indexOf('<', i)
    if (lt < 0) return null
    if (s.startsWith('<!--', lt)) {
      const close = s.indexOf('-->', lt)
      if (close < 0) return null
      i = close + 3
      continue
    }
    if (s.startsWith('<?', lt) || s.startsWith('<!', lt)) {
      const close = s.indexOf('>', lt)
      if (close < 0) return null
      i = close + 1
      continue
    }
    const close = s.indexOf('>', lt)
    if (close < 0) return null
    const body = s.slice(lt + 1, close)
    const selfClosing = body.endsWith('/')
    const name = (selfClosing ? body.slice(0, -1) : body).trim().split(/[\s]/)[0]
    return { name, selfClosing, end: close + 1 }
  }
}

class PlistParser {
  private i = 0

  constructor(private readonly s: string) {}

  /** Text up to the matching `</name>`, entity-decoded. */
  private textUntil(name: string): string {
    const close = this.s.indexOf(`</${name}>`, this.i)
    if (close < 0) throw new Error(`unclosed <${name}>`)
    const body = this.s.slice(this.i, close)
    this.i = close + name.length + 3
    return decode(body)
  }

  private value(tag: Tag): PlistValue {
    this.i = tag.end
    switch (tag.name) {
      case 'true':
        return { kind: 'bool', value: true }
      case 'false':
        return { kind: 'bool', value: false }
      case 'string':
        return { kind: 'string', value: this.textUntil('string') }
      case 'integer':
        return { kind: 'integer', value: this.textUntil('integer').trim() }
      case 'real':
        return { kind: 'real', value: this.textUntil('real').trim() }
      case 'date':
        return { kind: 'date', value: this.textUntil('date').trim() }
      case 'data':
        return { kind: 'data', value: this.textUntil('data').replace(/\s+/g, '') }
      case 'dict':
        return this.dict()
      case 'array':
        return this.array()
      default:
        throw new Error(`unknown value tag <${tag.name}>`)
    }
  }

  private dict(): PlistValue {
    const entries: { key: string; value: PlistValue }[] = []
    for (;;) {
      const tag = nextTag(this.s, this.i)
      if (!tag) throw new Error('unclosed <dict>')
      if (tag.name === '/dict') {
        this.i = tag.end
        return { kind: 'dict', entries }
      }
      if (tag.name !== 'key') throw new Error(`expected <key>, found <${tag.name}>`)
      this.i = tag.end
      const key = this.textUntil('key')
      const valueTag = nextTag(this.s, this.i)
      if (!valueTag) throw new Error(`<key>${key}</key> with no value`)
      entries.push({ key, value: this.value(valueTag) })
    }
  }

  private array(): PlistValue {
    const items: PlistValue[] = []
    for (;;) {
      const tag = nextTag(this.s, this.i)
      if (!tag) throw new Error('unclosed <array>')
      if (tag.name === '/array') {
        this.i = tag.end
        return { kind: 'array', items }
      }
      items.push(this.value(tag))
    }
  }

  parse(): PlistValue {
    for (;;) {
      const tag = nextTag(this.s, this.i)
      if (!tag) throw new Error('no plist root')
      if (tag.name === 'plist') {
        this.i = tag.end
        continue
      }
      return this.value(tag)
    }
  }
}

/** Read an XML property list. Never throws — a caller gets a reason instead, so
 *  the preview can explain itself rather than fall back to a blank pane. */
export function parsePlist(text: string): PlistResult {
  // The binary magic survives whatever decoding got us here, and a repository
  // does occasionally carry one — a compiled `.strings`, a fixture.
  if (text.startsWith('bplist00')) return { ok: false, problem: 'binary' }
  try {
    return { ok: true, root: new PlistParser(text).parse() }
  } catch {
    return { ok: false, problem: 'unreadable' }
  }
}

/** How many children a node has, for the "3 items" a collapsed row shows. */
export function plistChildCount(v: PlistValue): number | null {
  if (v.kind === 'dict') return v.entries.length
  if (v.kind === 'array') return v.items.length
  return null
}

/** One-line rendering of a leaf. `data` is elided — a base64 blob tells nobody
 *  anything, and a provisioning profile pasted into a preview is a leak. */
export function plistScalar(v: PlistValue): string {
  switch (v.kind) {
    case 'bool':
      return v.value ? 'YES' : 'NO'
    case 'data':
      return `<${Math.ceil((v.value.length * 3) / 4)} bytes>`
    case 'dict':
    case 'array':
      return ''
    default:
      return v.value
  }
}
