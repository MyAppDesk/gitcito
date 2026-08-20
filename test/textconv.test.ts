import { describe, it, expect } from 'vitest'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { jsonToStable, xlsxToCsv, convertFile } from '../src/main/textconv'
import { bundledTextconvPath, converterAvailable } from '../src/main/git'

describe('jsonToStable', () => {
  it('sorts keys recursively and indents consistently', () => {
    const a = jsonToStable('{"b":1,"a":{"z":2,"y":[{"q":1,"p":2}]}}')
    const b = jsonToStable('{"a":{"y":[{"p":2,"q":1}],"z":2},"b":1}')
    // Two orderings of the same document must produce a byte-identical diff side.
    expect(a).toBe(b)
    expect(a).toBe('{\n  "a": {\n    "y": [\n      {\n        "p": 2,\n        "q": 1\n      }\n    ],\n    "z": 2\n  },\n  "b": 1\n}\n')
  })

  it('keeps array order — arrays are ordered data, not key sets', () => {
    expect(jsonToStable('[3,1,2]')).toBe('[\n  3,\n  1,\n  2\n]\n')
  })

  it('throws on invalid JSON so git shows the raw file instead of lying', () => {
    expect(() => jsonToStable('{nope')).toThrow()
  })
})

describe('xlsxToCsv', () => {
  it('renders every sheet as a labeled CSV block', async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['name', 'qty'], ['ok', 2]]), 'First')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['x'], [1]]), 'Second')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const out = await xlsxToCsv(buf)
    expect(out).toContain('## First')
    expect(out).toContain('name,qty')
    expect(out).toContain('ok,2')
    expect(out).toContain('## Second')
  })
})

describe('convertFile', () => {
  it('dispatches .json end to end from a real file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gitcito-textconv-'))
    try {
      const f = join(dir, 'config.json')
      await writeFile(f, '{"b":1,"a":2}')
      await expect(convertFile(f)).resolves.toBe('{\n  "a": 2,\n  "b": 1\n}\n')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('refuses an extension it does not understand', async () => {
    await expect(convertFile('/tmp/whatever.bin')).rejects.toThrow(/unsupported file type/)
  })

  it('fails loudly on a corrupt document rather than printing garbage', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gitcito-textconv-'))
    try {
      const f = join(dir, 'broken.docx')
      await writeFile(f, 'this is not a zip archive')
      await expect(convertFile(f)).rejects.toThrow()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('bundled converter wiring', () => {
  it('resolves the shipped shim and reports it executable', () => {
    const shim = bundledTextconvPath()
    expect(shim.endsWith('gitcito-textconv')).toBe(true)
    expect(converterAvailable(`"${shim}"`)).toBe(true)
  })

  it('checks a quoted absolute path on disk, not on PATH', () => {
    expect(converterAvailable('"/definitely/not/here/conv" --flag')).toBe(false)
  })

  it('still checks bare commands on PATH', () => {
    expect(converterAvailable('definitely-not-installed --to-text')).toBe(false)
    expect(converterAvailable('git')).toBe(true)
  })
})
