import { readFile } from 'fs/promises'
import { extname } from 'path'

// The formats Gitcito's bundled textconv converter understands. Word and Excel
// reuse the same libraries the preview pane loads; JSON is native. PDF is
// deliberately absent — the app previews PDFs with Chromium's viewer and has
// no text extractor to reuse, so that suggestion still points at pdftotext.

export async function docxToText(buf: Buffer): Promise<string> {
  const mammoth = (await import('mammoth')).default
  const res = await mammoth.extractRawText({ buffer: buf })
  return res.value.endsWith('\n') ? res.value : `${res.value}\n`
}

export async function xlsxToCsv(buf: Buffer): Promise<string> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'buffer' })
  // One CSV block per sheet, labeled, so a diff says which sheet moved.
  const body = wb.SheetNames.map((n) => `## ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n')
  return body.endsWith('\n') ? body : `${body}\n`
}

/** Stable JSON rendering: keys sorted recursively, two-space indent. */
export function jsonToStable(text: string): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, sort((v as Record<string, unknown>)[k])])
      )
    }
    return v
  }
  return `${JSON.stringify(sort(JSON.parse(text)), null, 2)}\n`
}

/**
 * Decode a `.strings` localization file.
 *
 * Git calls these binary and shows no diff at all: Xcode wrote them as UTF-16
 * for most of its life, and UTF-16 is full of NUL bytes. The encoding is
 * per-file — recent Xcode writes UTF-8 — so the BOM is the only reliable
 * teller. Assuming UTF-16 outright would turn every modern file into mojibake,
 * which is worse than the binary marker git shows with no converter at all.
 */
export function stringsToText(buf: Buffer): string {
  let text: string
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    text = buf.subarray(2).toString('utf16le')
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // Node decodes little-endian only. Swap a copy — the caller's buffer is not
    // ours to reverse in place.
    const be = Buffer.from(buf.subarray(2))
    if (be.length % 2 !== 0) throw new Error('gitcito-textconv: truncated UTF-16 .strings')
    text = be.swap16().toString('utf16le')
  } else {
    text = buf.toString('utf-8').replace(/^\uFEFF/, '')
  }
  return text.endsWith('\n') ? text : `${text}\n`
}

/** Convert one file to diffable text, dispatching on its extension. */
export async function convertFile(path: string): Promise<string> {
  const ext = extname(path).toLowerCase()
  // A String Catalog is JSON with an Xcode extension, so it gets the same
  // key-sorted rendering rather than a format of its own.
  if (ext === '.json' || ext === '.xcstrings') return jsonToStable(await readFile(path, 'utf-8'))
  if (ext === '.strings') return stringsToText(await readFile(path))
  if (ext === '.docx') return docxToText(await readFile(path))
  if (ext === '.xlsx' || ext === '.xls') return xlsxToCsv(await readFile(path))
  throw new Error(
    `gitcito-textconv: unsupported file type '${ext || path}' (supported: .docx, .xlsx, .xls, .json, .xcstrings, .strings)`
  )
}
