import { useEffect, useMemo, useState } from 'react'
import { gitApi } from '../infrastructure/api'
import { useT } from '../i18n'
import { renderMarkdown, sanitizeHtml } from '../preview/markdown'
import { type PreviewKind } from '../preview/registry'

/** Decode a base64 data URL into an ArrayBuffer for the office/binary parsers. */
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

interface Props {
  repoPath: string
  file: string
  ref?: string
  kind: PreviewKind
}

export function PreviewPane({ repoPath, file, ref, kind }: Props): React.JSX.Element {
  const t = useT()
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [sheets, setSheets] = useState<{ name: string; html: string }[] | null>(null)
  const [sheetIdx, setSheetIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    setText(null)
    setHtml(null)
    setSheets(null)
    setSheetIdx(0)
    setError(null)

    const load = async (): Promise<void> => {
      try {
        if (kind === 'markdown') {
          const src = await gitApi.fileContent(repoPath, file, ref)
          if (!cancelled) setText(src)
          return
        }
        // Everything else is binary: pull a data URL once, then decode per kind.
        const url = await gitApi.fileDataUrl(repoPath, file, ref)
        if (cancelled) return
        if (kind === 'image' || kind === 'pdf' || kind === 'video' || kind === 'audio') {
          setDataUrl(url)
        } else if (kind === 'sheet') {
          // Heavy parser — loaded on demand so it stays out of the initial bundle.
          const XLSX = await import('xlsx')
          const wb = XLSX.read(dataUrlToArrayBuffer(url), { type: 'array' })
          const parsed = wb.SheetNames.map((name) => ({
            name,
            html: XLSX.utils.sheet_to_html(wb.Sheets[name])
          }))
          if (!cancelled) setSheets(parsed)
        } else if (kind === 'word') {
          const mammoth = (await import('mammoth')).default
          const result = await mammoth.convertToHtml({ arrayBuffer: dataUrlToArrayBuffer(url) })
          if (!cancelled) setHtml(sanitizeHtml(result.value))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [repoPath, file, ref, kind])

  const mdHtml = useMemo(() => (text !== null ? renderMarkdown(text) : null), [text])

  if (error) return <div className="fv-error">{error}</div>

  const loading =
    (kind === 'markdown' && text === null) ||
    ((kind === 'image' || kind === 'pdf' || kind === 'video' || kind === 'audio') && dataUrl === null) ||
    (kind === 'sheet' && sheets === null) ||
    (kind === 'word' && html === null)

  if (loading) {
    return (
      <div className="graph-empty">
        <div className="spinner" />
      </div>
    )
  }

  if (kind === 'markdown' && mdHtml !== null) {
    return <div className="md-preview" dangerouslySetInnerHTML={{ __html: mdHtml }} />
  }
  if (kind === 'image' && dataUrl) {
    return (
      <div className="image-preview">
        <img src={dataUrl} alt={file} />
      </div>
    )
  }
  if (kind === 'pdf' && dataUrl) {
    return <iframe className="pdf-preview" title={file} src={dataUrl} />
  }
  if (kind === 'video' && dataUrl) {
    return (
      <div className="media-preview">
        <video src={dataUrl} controls />
      </div>
    )
  }
  if (kind === 'audio' && dataUrl) {
    return (
      <div className="media-preview">
        <audio src={dataUrl} controls />
      </div>
    )
  }
  if (kind === 'sheet' && sheets) {
    if (sheets.length === 0) return <div className="fv-error">{t('preview.empty')}</div>
    return (
      <div className="sheet-preview">
        {sheets.length > 1 && (
          <div className="sheet-tabs">
            {sheets.map((s, i) => (
              <button
                key={s.name}
                className={`sheet-tab ${i === sheetIdx ? 'active' : ''}`}
                onClick={() => setSheetIdx(i)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="sheet-body" dangerouslySetInnerHTML={{ __html: sheets[sheetIdx]?.html ?? '' }} />
      </div>
    )
  }
  if (kind === 'word' && html !== null) {
    return <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
  }

  // Reachable only for a kind with no render branch yet — keeps adding types safe.
  return <div className="fv-error">{t('preview.unsupported')}</div>
}
