/**
 * `project.pbxproj` — parsing, and a three-way merge that understands what the
 * file actually is.
 *
 * The format is an OpenStep ASCII property list: one flat `objects` dictionary
 * keyed by 24-hex UUIDs, where every object carries an `isa` naming its class.
 * Two people adding one file each produce four independent edits — a
 * `PBXBuildFile`, a `PBXFileReference`, an entry in the owning group's
 * `children`, an entry in the target's `files` — that git sees as one textual
 * collision because they land on adjacent lines. Semantically there is nothing
 * to resolve; textually there is a conflict every time.
 *
 * The parser is **span-preserving**: every node records where it came from in
 * the source, and merging splices raw source text rather than re-serialising.
 * That is the whole design. A writer that reformats — reorders keys, drops the
 * `/* AppDelegate.swift *​/` annotations Xcode writes, changes tab depth — turns
 * a three-line review into a three-thousand-line one, and is the reason the
 * off-the-shelf libraries are unusable here. Untouched bytes stay untouched.
 */

export type PbxValue = PbxString | PbxDict | PbxArray

interface PbxSpan {
  /** Offset of the first character of this node in the source. */
  start: number
  /** Offset one past the last character. */
  end: number
}

export interface PbxString extends PbxSpan {
  kind: 'string'
  /** Unescaped value — `"a b"` and `a` both yield the text between the quotes. */
  value: string
  /** True when the source wrote it quoted; kept so a rewrite can match. */
  quoted: boolean
}

export interface PbxEntry extends PbxSpan {
  key: string
  value: PbxValue
  /** `/* … *​/` annotation Xcode writes after the key, without the delimiters. */
  keyComment?: string
  /** The same, after the value. */
  valueComment?: string
}

export interface PbxDict extends PbxSpan {
  kind: 'dict'
  entries: PbxEntry[]
}

export interface PbxItem extends PbxSpan {
  value: PbxValue
  valueComment?: string
}

export interface PbxArray extends PbxSpan {
  kind: 'array'
  items: PbxItem[]
}

export interface PbxDoc {
  /** The source, verbatim. Every span indexes into this. */
  text: string
  root: PbxDict
  /** `objects` — uuid → its entry. Absent from a file that has no objects. */
  objects: Map<string, PbxEntry>
}

const isBare = (c: string): boolean => /[A-Za-z0-9_$./\-*@~]/.test(c)

class Parser {
  private i = 0

  constructor(private readonly s: string) {}

  /** Skip whitespace and `/* … *​/` / `//` comments; return the last comment seen. */
  private trivia(): string | undefined {
    let comment: string | undefined
    for (;;) {
      while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++
      if (this.s.startsWith('/*', this.i)) {
        const close = this.s.indexOf('*/', this.i + 2)
        if (close < 0) throw new Error('unterminated comment')
        comment = this.s.slice(this.i + 2, close).trim()
        this.i = close + 2
        continue
      }
      // The `// !$*UTF8*$!` banner, and nothing else in practice.
      if (this.s.startsWith('//', this.i)) {
        const nl = this.s.indexOf('\n', this.i)
        this.i = nl < 0 ? this.s.length : nl + 1
        continue
      }
      return comment
    }
  }

  private expect(ch: string): void {
    if (this.s[this.i] !== ch) {
      throw new Error(`expected ${ch} at ${this.i}, found ${this.s[this.i] ?? 'EOF'}`)
    }
    this.i++
  }

  private string(): PbxString {
    const start = this.i
    if (this.s[this.i] === '"') {
      this.i++
      let out = ''
      while (this.i < this.s.length && this.s[this.i] !== '"') {
        if (this.s[this.i] === '\\') {
          const n = this.s[this.i + 1]
          out += n === 'n' ? '\n' : n === 't' ? '\t' : n
          this.i += 2
          continue
        }
        out += this.s[this.i++]
      }
      this.expect('"')
      return { kind: 'string', value: out, quoted: true, start, end: this.i }
    }
    while (this.i < this.s.length && isBare(this.s[this.i])) this.i++
    if (this.i === start) throw new Error(`expected a value at ${start}`)
    return { kind: 'string', value: this.s.slice(start, this.i), quoted: false, start, end: this.i }
  }

  private array(): PbxArray {
    const start = this.i
    this.expect('(')
    const items: PbxItem[] = []
    for (;;) {
      this.trivia()
      if (this.s[this.i] === ')') break
      const iStart = this.i
      const value = this.value()
      const valueComment = this.trivia()
      // A trailing comma is optional on the last item.
      if (this.s[this.i] === ',') this.i++
      items.push({ value, valueComment, start: iStart, end: this.i })
    }
    this.expect(')')
    return { kind: 'array', items, start, end: this.i }
  }

  private dict(): PbxDict {
    const start = this.i
    this.expect('{')
    const entries: PbxEntry[] = []
    for (;;) {
      this.trivia()
      if (this.s[this.i] === '}') break
      const eStart = this.i
      const key = this.string()
      const keyComment = this.trivia()
      this.expect('=')
      this.trivia()
      const value = this.value()
      const valueComment = this.trivia()
      this.expect(';')
      entries.push({
        key: key.value,
        value,
        keyComment,
        valueComment,
        start: eStart,
        end: this.i
      })
    }
    this.expect('}')
    return { kind: 'dict', entries, start, end: this.i }
  }

  private value(): PbxValue {
    const c = this.s[this.i]
    if (c === '{') return this.dict()
    if (c === '(') return this.array()
    return this.string()
  }

  parse(): PbxDict {
    this.trivia()
    const root = this.dict()
    this.trivia()
    return root
  }
}

/** Parse a `project.pbxproj`. Returns null when it is not one — a truncated
 *  file, a conflict-markered file, anything the tokenizer chokes on. Callers
 *  fall back to plain text rather than guessing. */
export function parsePbxproj(text: string): PbxDoc | null {
  try {
    const root = new Parser(text).parse()
    const objects = new Map<string, PbxEntry>()
    const objectsEntry = root.entries.find((e) => e.key === 'objects')
    if (objectsEntry && objectsEntry.value.kind === 'dict') {
      for (const e of objectsEntry.value.entries) objects.set(e.key, e)
    }
    return { text, root, objects }
  } catch {
    return null
  }
}

/** The `isa` of an object entry — its class, e.g. `PBXBuildFile`. */
export function isaOf(entry: PbxEntry): string {
  if (entry.value.kind !== 'dict') return ''
  const isa = entry.value.entries.find((e) => e.key === 'isa')
  return isa && isa.value.kind === 'string' ? isa.value.value : ''
}

/** The human name Xcode annotates an object with, when it wrote one. */
export function labelOf(entry: PbxEntry): string {
  return entry.keyComment ?? ''
}

// ─── Three-way merge ────────────────────────────────────────────────────────

/** One thing the merge could not decide for itself. */
export interface PbxConflict {
  uuid: string
  isa: string
  /** Xcode's own annotation for the object — `AppDelegate.swift`, `Debug`, … */
  label: string
  reason: 'both-modified' | 'modified-and-deleted' | 'both-added' | 'setting'
  /** For a `setting` conflict, the build setting or key that diverged. */
  key?: string
  ours?: string
  theirs?: string
}

/** What the two sides did, in terms a person can check against their intent. */
export interface PbxSummary {
  /** Objects added — four per new source file, so not a number to show anyone. */
  added: { ours: number; theirs: number }
  /** Files added. One `PBXFileReference` is one file, which is what a person
   *  counts when they think about what they changed. */
  addedFiles: { ours: number; theirs: number }
  removed: { ours: number; theirs: number }
  modified: { ours: number; theirs: number }
  /** Object labels each side added, for "they added Login.swift, you added Signup.swift". */
  addedLabels: { ours: string[]; theirs: string[] }
}

export interface PbxMergeResult {
  /** The merged file. Present even when `conflicts` is non-empty — everything
   *  that could be resolved is, so a person only decides what is left. */
  text: string
  conflicts: PbxConflict[]
  summary: PbxSummary
}

interface Edit {
  start: number
  end: number
  text: string
}

const raw = (src: string, n: PbxSpan): string => src.slice(n.start, n.end)

/** Whitespace at the start of the line `pos` sits on — the indent to reuse when
 *  inserting a sibling next to it. */
function indentAt(src: string, pos: number): string {
  const nl = src.lastIndexOf('\n', pos - 1)
  const line = src.slice(nl + 1, pos)
  const m = /^[\t ]*/.exec(line)
  return m ? m[0] : ''
}

function applyEdits(src: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => a.start - b.start || a.end - b.end)
  let out = ''
  let at = 0
  for (const e of sorted) {
    // Overlapping edits mean two rules claimed the same span; the first wins so
    // the output stays well-formed rather than interleaved.
    if (e.start < at) continue
    out += src.slice(at, e.start) + e.text
    at = e.end
  }
  return out + src.slice(at)
}

const entryMap = (d: PbxDict): Map<string, PbxEntry> =>
  new Map(d.entries.map((e) => [e.key, e]))

/** Merge two arrays that both grew — the `children` of a group, the `files` of
 *  a build phase. Items are identified by their value (a UUID), so an addition
 *  on each side is a union, not a collision. */
function mergeArray(
  baseA: PbxArray | undefined,
  oursA: PbxArray,
  theirsA: PbxArray,
  oursSrc: string,
  theirsSrc: string,
  edits: Edit[]
): boolean {
  const idOf = (it: PbxItem): string => (it.value.kind === 'string' ? it.value.value : raw(oursSrc, it))
  const baseIds = new Set((baseA?.items ?? []).map((it) => (it.value.kind === 'string' ? it.value.value : '')))
  const oursIds = new Set(oursA.items.map(idOf))

  // Items theirs dropped that were in base and ours still carries: drop them too.
  const theirsIds = new Set(
    theirsA.items.map((it) => (it.value.kind === 'string' ? it.value.value : ''))
  )
  for (const it of oursA.items) {
    const id = idOf(it)
    if (baseIds.has(id) && !theirsIds.has(id)) {
      edits.push({ start: it.start, end: it.end, text: '' })
    }
  }

  // Items theirs added that ours has not got: append after ours' last item, with
  // ours' indentation so the result still looks hand-written.
  const additions = theirsA.items.filter((it) => {
    const id = it.value.kind === 'string' ? it.value.value : ''
    return !baseIds.has(id) && !oursIds.has(id)
  })
  if (additions.length > 0) {
    const last = oursA.items[oursA.items.length - 1]
    const anchor = last ? last.end : oursA.start + 1
    const indent = last ? indentAt(oursSrc, last.start) : indentAt(oursSrc, oursA.start) + '\t'
    const text = additions
      .map((it) => `\n${indent}${theirsSrc.slice(it.start, it.end).replace(/,\s*$/, '')},`)
      .join('')
    edits.push({ start: anchor, end: anchor, text })
  }
  return true
}

/** Merge one dictionary that both sides touched, key by key — recursively, so
 *  a clash inside `buildSettings` is reported as `MARKETING_VERSION` rather
 *  than as "the settings differ", which tells the author nothing. */
function mergeDict(
  ident: { uuid: string; isa: string; label: string },
  baseD: PbxDict | undefined,
  oursD: PbxDict,
  theirsD: PbxDict,
  baseSrc: string,
  oursSrc: string,
  theirsSrc: string,
  edits: Edit[]
): PbxConflict[] {
  const b = baseD ? entryMap(baseD) : new Map<string, PbxEntry>()
  const o = entryMap(oursD)
  const t = entryMap(theirsD)
  const conflicts: PbxConflict[] = []

  for (const [key, te] of t) {
    const be = b.get(key)
    const oe = o.get(key)
    const tRaw = raw(theirsSrc, te)
    const bRaw = be ? raw(baseSrc, be) : undefined
    if (!oe) {
      // Ours has not got this key: theirs added it, or ours deleted it.
      if (bRaw === undefined) {
        const lastO = oursD.entries[oursD.entries.length - 1]
        const anchor = lastO ? lastO.end : oursD.start + 1
        const indent = lastO ? indentAt(oursSrc, lastO.start) : indentAt(oursSrc, oursD.start) + '\t'
        edits.push({ start: anchor, end: anchor, text: `\n${indent}${tRaw}` })
      } else if (bRaw !== tRaw) {
        conflicts.push({ ...ident, reason: 'modified-and-deleted', key })
      }
      continue
    }
    const oRaw = raw(oursSrc, oe)
    if (oRaw === tRaw) continue
    if (bRaw === oRaw) {
      edits.push({ start: oe.start, end: oe.end, text: tRaw }) // only theirs moved
      continue
    }
    if (bRaw === tRaw) continue // only ours moved

    // Both moved. Arrays union, nested dicts recurse, and a scalar that
    // genuinely diverged is a decision only the author can make.
    if (oe.value.kind === 'array' && te.value.kind === 'array') {
      const bv = be && be.value.kind === 'array' ? be.value : undefined
      mergeArray(bv, oe.value, te.value, oursSrc, theirsSrc, edits)
      continue
    }
    if (oe.value.kind === 'dict' && te.value.kind === 'dict') {
      const bv = be && be.value.kind === 'dict' ? be.value : undefined
      conflicts.push(
        ...mergeDict(ident, bv, oe.value, te.value, baseSrc, oursSrc, theirsSrc, edits)
      )
      continue
    }
    conflicts.push({
      ...ident,
      reason: 'setting',
      key,
      ours: oe.value.kind === 'string' ? oe.value.value : oRaw,
      theirs: te.value.kind === 'string' ? te.value.value : tRaw
    })
  }

  // Keys ours still carries that theirs deleted.
  for (const [key, oe] of o) {
    if (t.has(key)) continue
    const be = b.get(key)
    if (!be) continue // ours added it — keep
    if (raw(baseSrc, be) === raw(oursSrc, oe)) edits.push({ start: oe.start, end: oe.end, text: '' })
    else conflicts.push({ ...ident, reason: 'modified-and-deleted', key })
  }

  return conflicts
}

/** Merge one object both sides touched. An object with any unresolved clash is
 *  left exactly as ours wrote it, so a half-applied edit never reaches disk. */
function mergeObject(
  uuid: string,
  isa: string,
  label: string,
  baseE: PbxEntry,
  oursE: PbxEntry,
  theirsE: PbxEntry,
  baseSrc: string,
  oursSrc: string,
  theirsSrc: string,
  edits: Edit[]
): PbxConflict[] {
  if (baseE.value.kind !== 'dict' || oursE.value.kind !== 'dict' || theirsE.value.kind !== 'dict') {
    return [{ uuid, isa, label, reason: 'both-modified' }]
  }
  const local: Edit[] = []
  const conflicts = mergeDict(
    { uuid, isa, label },
    baseE.value,
    oursE.value,
    theirsE.value,
    baseSrc,
    oursSrc,
    theirsSrc,
    local
  )
  if (conflicts.length === 0) edits.push(...local)
  return conflicts
}

/** Where a new object of this class belongs in ours: beside its own kind, so
 *  Xcode's `/* Begin … section *​/` banners keep meaning what they say. */
function insertionFor(
  ours: PbxDoc,
  isa: string,
  objectsDict: PbxDict
): { at: number; prefix: string; suffix: string } {
  let last: PbxEntry | undefined
  for (const e of objectsDict.entries) if (isaOf(e) === isa) last = e
  if (last) return { at: last.end, prefix: `\n${indentAt(ours.text, last.start)}`, suffix: '' }
  // No section for this class yet — open one at the end, banners and all.
  const tail = objectsDict.entries[objectsDict.entries.length - 1]
  const at = tail ? tail.end : objectsDict.start + 1
  const indent = tail ? indentAt(ours.text, tail.start) : '\t\t'
  return {
    at,
    prefix: `\n\n/* Begin ${isa} section */\n${indent}`,
    suffix: `\n/* End ${isa} section */\n`
  }
}

/**
 * Merge `project.pbxproj` the way its structure says it should be merged.
 *
 * Returns null when any of the three sides will not parse — a caller that gets
 * null falls back to the ordinary text conflict rather than guessing, which is
 * the only safe answer for a file Xcode refuses to open if we get it wrong.
 */
export function mergePbxproj(
  baseText: string,
  oursText: string,
  theirsText: string
): PbxMergeResult | null {
  const base = parsePbxproj(baseText)
  const ours = parsePbxproj(oursText)
  const theirs = parsePbxproj(theirsText)
  if (!base || !ours || !theirs) return null

  const oursObjects = ours.root.entries.find((e) => e.key === 'objects')
  if (!oursObjects || oursObjects.value.kind !== 'dict') return null
  const objectsDict = oursObjects.value

  const edits: Edit[] = []
  const conflicts: PbxConflict[] = []
  const summary: PbxSummary = {
    added: { ours: 0, theirs: 0 },
    addedFiles: { ours: 0, theirs: 0 },
    removed: { ours: 0, theirs: 0 },
    modified: { ours: 0, theirs: 0 },
    addedLabels: { ours: [], theirs: [] }
  }

  for (const [uuid, oe] of ours.objects) {
    const be = base.objects.get(uuid)
    if (!be) {
      summary.added.ours++
      if (isaOf(oe) === 'PBXFileReference') summary.addedFiles.ours++
      summary.addedLabels.ours.push(labelOf(oe) || uuid)
    } else if (raw(baseText, be) !== raw(oursText, oe)) {
      summary.modified.ours++
    }
  }
  for (const [uuid] of base.objects) {
    if (!ours.objects.has(uuid)) summary.removed.ours++
    if (!theirs.objects.has(uuid)) summary.removed.theirs++
  }

  for (const [uuid, te] of theirs.objects) {
    const be = base.objects.get(uuid)
    const oe = ours.objects.get(uuid)
    const isa = isaOf(te)
    const label = labelOf(te) || uuid
    const tRaw = raw(theirsText, te)

    if (!be) {
      summary.added.theirs++
      if (isa === 'PBXFileReference') summary.addedFiles.theirs++
      summary.addedLabels.theirs.push(label)
      if (!oe) {
        const { at, prefix, suffix } = insertionFor(ours, isa, objectsDict)
        edits.push({ start: at, end: at, text: `${prefix}${tRaw}${suffix}` })
      } else if (raw(oursText, oe) !== tRaw) {
        // Same UUID minted for two different objects — rare, and silently
        // taking either side would drop one person's file from the project.
        conflicts.push({ uuid, isa, label, reason: 'both-added' })
      }
      continue
    }

    const bRaw = raw(baseText, be)
    if (bRaw !== tRaw) summary.modified.theirs++

    if (!oe) {
      if (bRaw !== tRaw) conflicts.push({ uuid, isa, label, reason: 'modified-and-deleted' })
      continue
    }
    const oRaw = raw(oursText, oe)
    if (oRaw === tRaw || bRaw === tRaw) continue
    if (bRaw === oRaw) {
      edits.push({ start: oe.start, end: oe.end, text: tRaw })
      continue
    }
    conflicts.push(
      ...mergeObject(uuid, isa, label, be, oe, te, baseText, oursText, theirsText, edits)
    )
  }

  // Objects theirs deleted. Ours keeps anything it changed — a delete that
  // silently discards the other side's edit is the one outcome nobody wants.
  for (const [uuid, be] of base.objects) {
    if (theirs.objects.has(uuid)) continue
    const oe = ours.objects.get(uuid)
    if (!oe) continue
    const bRaw = raw(baseText, be)
    if (bRaw === raw(oursText, oe)) edits.push({ start: oe.start, end: oe.end, text: '' })
    else {
      conflicts.push({
        uuid,
        isa: isaOf(oe),
        label: labelOf(oe) || uuid,
        reason: 'modified-and-deleted'
      })
    }
  }

  return { text: applyEdits(oursText, edits), conflicts, summary }
}

/** True for a path git would hand us as a conflicted Xcode project file. */
export function isPbxprojPath(path: string): boolean {
  return /(^|\/)project\.pbxproj$/.test(path)
}
