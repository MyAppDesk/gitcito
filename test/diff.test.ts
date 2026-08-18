import { describe, it, expect } from 'vitest'
import { parseDiff, wordDiff, wordRangesByLine, buildSplitRows } from '../src/renderer/src/lib/diff'

const SAMPLE = `@@ -1,3 +1,3 @@
 ctx line
-const x = foo(a, b)
+const x = foo(a, c)
 tail`

describe('parseDiff', () => {
  it('types lines and tracks old/new line numbers', () => {
    const lines = parseDiff(SAMPLE)
    expect(lines.map((l) => l.kind)).toEqual(['hunk', 'ctx', 'del', 'add', 'ctx'])
    const del = lines.find((l) => l.kind === 'del')!
    const add = lines.find((l) => l.kind === 'add')!
    expect(del.oldNo).toBe(2)
    expect(del.newNo).toBeNull()
    expect(add.newNo).toBe(2)
  })

  // A new file's header carries `new file mode 100644`, which has no +/- prefix
  // and used to parse as context — an unprefixed line, numbered 0, above the
  // first hunk of every added file.
  it('treats git extended headers as meta', () => {
    const added = `diff --git a/new.md b/new.md
new file mode 100644
index 0000000..0111bd8
--- /dev/null
+++ b/new.md
@@ -0,0 +1,2 @@
+---
+title: hello`
    const lines = parseDiff(added)
    expect(lines.map((l) => l.kind)).toEqual(['meta', 'meta', 'meta', 'meta', 'meta', 'hunk', 'add', 'add'])
    expect(lines.filter((l) => l.kind === 'add').map((l) => l.newNo)).toEqual([1, 2])
  })

  it('treats rename and binary headers as meta', () => {
    const renamed = `diff --git a/a.txt b/b.txt
similarity index 92%
rename from a.txt
rename to b.txt
Binary files a/logo.png and b/logo.png differ`
    expect(parseDiff(renamed).every((l) => l.kind === 'meta')).toBe(true)
  })
})

describe('wordDiff', () => {
  it('isolates only the changed token', () => {
    const { del, add } = wordDiff('const x = foo(a, b)', 'const x = foo(a, c)')
    expect(del.map(([s, e]) => 'const x = foo(a, b)'.slice(s, e))).toEqual(['b'])
    expect(add.map(([s, e]) => 'const x = foo(a, c)'.slice(s, e))).toEqual(['c'])
  })

  it('returns empty ranges for identical lines', () => {
    expect(wordDiff('same', 'same')).toEqual({ del: [], add: [] })
  })
})

describe('wordRangesByLine', () => {
  it('keys ranges by the line index of paired del/add', () => {
    const lines = parseDiff(SAMPLE)
    const map = wordRangesByLine(lines)
    // del at index 2, add at index 3 each get one changed range.
    expect(map.get(2)?.length).toBe(1)
    expect(map.get(3)?.length).toBe(1)
    expect(map.has(1)).toBe(false) // ctx untouched
  })
})

describe('buildSplitRows', () => {
  it('mirrors ctx and zips del/add into the same row', () => {
    const rows = buildSplitRows(parseDiff(SAMPLE))
    expect(rows[0].hunk).toBeDefined()
    const ctx = rows[1]
    expect(ctx.left?.text).toBe('ctx line')
    expect(ctx.right?.text).toBe('ctx line')
    const change = rows[2]
    expect(change.left?.kind).toBe('del')
    expect(change.right?.kind).toBe('add')
  })

  it('emits one-sided rows for unbalanced edits', () => {
    const rows = buildSplitRows(parseDiff(`@@ -1,1 +1,2 @@\n-old\n+new1\n+new2`))
    const changes = rows.filter((r) => r.left || r.right).filter((r) => r.left?.kind !== 'ctx')
    // 2 rows: (old↔new1) then (∅↔new2)
    expect(changes.length).toBe(2)
    expect(changes[1].left).toBeUndefined()
    expect(changes[1].right?.text).toBe('new2')
  })
})
