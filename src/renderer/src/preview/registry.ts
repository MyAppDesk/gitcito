/** Rich-preview support for the file viewer.
 *
 *  To add a new previewable type: add its extension(s) to PREVIEW_KINDS below.
 *  If the new kind needs custom rendering, add a branch in PreviewPane.tsx and
 *  (for binary formats) make sure the extension also has a MIME entry in
 *  src/main/git.ts → fileMime(). Everything else (the Preview button, mode
 *  switching) keys off this map automatically. */

export type PreviewKind = 'markdown' | 'image' | 'pdf' | 'video' | 'audio' | 'sheet' | 'word'

const PREVIEW_KINDS: Record<string, PreviewKind> = {
  // markdown
  md: 'markdown', markdown: 'markdown', mdown: 'markdown', mkd: 'markdown',
  // images
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  bmp: 'image', ico: 'image', svg: 'image', avif: 'image',
  // pdf
  pdf: 'pdf',
  // video
  mp4: 'video', webm: 'video', ogv: 'video', mov: 'video', m4v: 'video',
  // audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio', aac: 'audio',
  // spreadsheets
  xlsx: 'sheet', xls: 'sheet', csv: 'sheet', tsv: 'sheet',
  // word documents
  docx: 'word'
}

function ext(file: string): string {
  return file.split('.').pop()?.toLowerCase() || ''
}

export function previewKind(file: string): PreviewKind | null {
  return PREVIEW_KINDS[ext(file)] ?? null
}

export function canPreview(file: string): boolean {
  return previewKind(file) !== null
}

/** Whether a kind is delivered as binary bytes (needs a data URL / ArrayBuffer)
 *  vs. text content read straight from git. */
export function isBinaryKind(kind: PreviewKind): boolean {
  return kind !== 'markdown'
}
