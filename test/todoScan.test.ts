import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseTodoLine, parseGrepOutput, sortTodos, scanTodos, TODO_TAGS } from '../src/main/todoScan'
import {
  countByTag,
  countByOwner,
  filterCodeTodos,
  folderOf,
  groupCodeTodos
} from '../src/renderer/src/lib/codeTodos'
import type { CodeTodo } from '../src/shared/types'

/** The panel's whole promise: five spellings of the same marker, one bucket. */
describe('parseTodoLine', () => {
  it('reads a tag whatever the comment leader and the case', () => {
    for (const line of ['// TODO: ship it', '//TODO ship it', '// todo ship it', '# TODO: ship it', '  * todo: ship it']) {
      const td = parseTodoLine('a.ts', 3, line)
      expect(td?.tag, line).toBe('TODO')
      expect(td?.message, line).toBe('ship it')
      expect(td?.owner, line).toBeUndefined()
    }
  })

  it('unites the owner whether the parens hug the tag or not', () => {
    for (const line of ['// TODO(cgm): ship it', '// TODO (cgm) ship it', '// todo[CGM] ship it', '// TODO: @cgm ship it']) {
      const td = parseTodoLine('a.ts', 1, line)
      expect(td?.owner, line).toBe('cgm')
      expect(td?.message, line).toBe('ship it')
    }
  })

  it('keeps a parenthesised sentence as the message, not as an owner', () => {
    const td = parseTodoLine('a.ts', 1, '// TODO (see the issue) revisit')
    expect(td?.owner).toBeUndefined()
    expect(td?.message).toBe('(see the issue) revisit')
  })

  it('records the column of the tag so the file opens on the marker', () => {
    const td = parseTodoLine('a.ts', 9, 'const x = 1 // FIXME later')
    expect(td?.tag).toBe('FIXME')
    expect(td?.col).toBe('const x = 1 // '.length + 1)
  })

  it('ignores a tag that is not in a comment', () => {
    expect(parseTodoLine('a.ts', 1, "const todos = ['todo']")).toBeNull()
    expect(parseTodoLine('a.ts', 1, 'function reviewNote() {}')).toBeNull()
    // The one that started it: a Python variable named `todo`, indented, is
    // code. Without a comment leader in front there is no marker.
    expect(parseTodoLine('a.py', 4, '        todo = [l for l in lines if UNCHECKED.match(l)]')).toBeNull()
    expect(parseTodoLine('NOTES.md', 1, 'TODO: write the docs')).toBeNull()
  })

  it('drops the closer of a block or markup comment', () => {
    expect(parseTodoLine('a.ts', 1, '/* TODO: wire it up */')?.message).toBe('wire it up')
    expect(parseTodoLine('a.html', 1, '<!-- FIXME: escape this -->')?.message).toBe('escape this')
  })

  it('never splits FIXME into FIX plus a message', () => {
    expect(parseTodoLine('a.ts', 1, '// FIXME')?.tag).toBe('FIXME')
    expect(parseTodoLine('a.ts', 1, '// FIXME')?.message).toBe('')
  })

  it('knows every tag it advertises', () => {
    for (const tag of TODO_TAGS) expect(parseTodoLine('a.ts', 1, `// ${tag}: x`)?.tag).toBe(tag)
  })
})

describe('parseGrepOutput', () => {
  it('parses git grep lines and skips dependency trees', () => {
    const out = parseGrepOutput(
      ['src/a.ts:12:// TODO(cgm): ship', 'node_modules/x/b.js:1:// TODO: theirs', 'src/b.ts:4:const x = 1'].join('\n')
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ file: 'src/a.ts', line: 12, owner: 'cgm' })
  })

  it('survives a path that holds a colon', () => {
    const out = parseGrepOutput('src/we:ird.ts:7:// FIXME: odd name')
    expect(out[0]).toMatchObject({ file: 'src/we:ird.ts', line: 7, tag: 'FIXME' })
  })
})

const td = (file: string, line: number, tag: string, owner?: string): CodeTodo => ({
  file,
  line,
  col: 1,
  tag,
  message: `${tag} in ${file}`,
  text: `// ${tag}`,
  ...(owner ? { owner } : {})
})

describe('grouping and filtering', () => {
  const todos = [
    td('src/a.ts', 2, 'TODO', 'cgm'),
    td('src/a.ts', 9, 'FIXME'),
    td('src/deep/b.ts', 1, 'TODO', 'cgm'),
    td('README.md', 3, 'NOTE')
  ]

  it('groups by tag, biggest bucket first', () => {
    expect(groupCodeTodos(todos, 'tag').map((g) => [g.key, g.todos.length])).toEqual([
      ['TODO', 2],
      ['FIXME', 1],
      ['NOTE', 1]
    ])
  })

  it('groups by owner and leaves the unclaimed pile last', () => {
    expect(groupCodeTodos(todos, 'owner').map((g) => g.key)).toEqual(['cgm', ''])
  })

  it('groups by folder, alphabetically, with the root as an empty key', () => {
    expect(groupCodeTodos(todos, 'folder').map((g) => g.key)).toEqual(['src', 'src/deep', ''])
  })

  it('sorts owner and tag tallies with the unclaimed pile last', () => {
    expect(countByOwner(todos).map((c) => [c.key, c.n])).toEqual([
      ['cgm', 2],
      ['', 2]
    ])
    expect(countByTag(todos)[0]).toEqual({ key: 'TODO', n: 2 })
  })

  it('filters by tag, owner, changed files and free text', () => {
    const base = { tags: [], owners: [], changedOnly: false, changedFiles: [], query: '' }
    expect(filterCodeTodos(todos, { ...base, tags: ['FIXME'] })).toHaveLength(1)
    expect(filterCodeTodos(todos, { ...base, owners: ['cgm'] })).toHaveLength(2)
    // The empty owner is a real filter value, not "no filter".
    expect(filterCodeTodos(todos, { ...base, owners: [''] })).toHaveLength(2)
    expect(filterCodeTodos(todos, { ...base, changedOnly: true, changedFiles: ['src/a.ts'] })).toHaveLength(2)
    expect(filterCodeTodos(todos, { ...base, query: 'readme' })).toHaveLength(1)
  })

  it('folderOf is empty at the repository root', () => {
    expect(folderOf('README.md')).toBe('')
    expect(folderOf('src/deep/b.ts')).toBe('src/deep')
  })

  it('sorts by file then line', () => {
    expect(sortTodos([td('b.ts', 1, 'TODO'), td('a.ts', 9, 'TODO'), td('a.ts', 2, 'TODO')]).map((x) => `${x.file}:${x.line}`)).toEqual([
      'a.ts:2',
      'a.ts:9',
      'b.ts:1'
    ])
  })
})

/** The scan is `git grep`, so the only honest test runs one against a real repo. */
describe('scanTodos', () => {
  it('finds markers in tracked and untracked files and skips ignored ones', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-todoscan-'))
    try {
      execFileSync('git', ['init', '-q'], { cwd: dir })
      mkdirSync(join(dir, 'src'))
      writeFileSync(join(dir, '.gitignore'), 'build/\n')
      writeFileSync(join(dir, 'src/tracked.ts'), 'const a = 1 // TODO(cgm): ship this\n// fixme lowercase counts\n')
      execFileSync('git', ['add', '-A'], { cwd: dir })
      execFileSync('git', ['-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-qm', 'init'], { cwd: dir })
      writeFileSync(join(dir, 'src/untracked.py'), '# TODO: not committed yet\n')
      mkdirSync(join(dir, 'build'))
      writeFileSync(join(dir, 'build/out.js'), '// TODO: generated, not mine\n')

      const res = await scanTodos(dir)
      const files = res.todos.map((x) => x.file)
      expect(files).toContain('src/tracked.ts')
      expect(files).toContain('src/untracked.py')
      expect(files).not.toContain('build/out.js')
      expect(res.todos.find((x) => x.owner === 'cgm')?.message).toBe('ship this')
      expect(res.todos.find((x) => x.tag === 'FIXME')?.message).toBe('lowercase counts')
      expect(res.truncated).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
