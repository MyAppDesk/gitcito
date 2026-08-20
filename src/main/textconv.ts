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

/** Convert one file to diffable text, dispatching on its extension. */
export async function convertFile(path: string): Promise<string> {
  const ext = extname(path).toLowerCase()
  if (ext === '.json') return jsonToStable(await readFile(path, 'utf-8'))
  if (ext === '.docx') return docxToText(await readFile(path))
  if (ext === '.xlsx' || ext === '.xls') return xlsxToCsv(await readFile(path))
  throw new Error(`gitcito-textconv: unsupported file type '${ext || path}' (supported: .docx, .xlsx, .xls, .json)`)
}
