import { useEffect, useState } from 'react'
import { X, GitCommitHorizontal, Sparkles, Loader2 } from 'lucide-react'
import hljs from 'highlight.js'
import type { BlameLine, FileHistoryEntry } from '../../../shared/types'
import { gitApi, aiApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type FileViewMode, type FileViewState } from '../stores/ui'
import { useT } from '../i18n'
import { DiffViewer } from './DiffViewer'
import { ImageDiff } from './ImageDiff'
import { PreviewPane } from './PreviewPane'
import { renderMarkdown } from '../preview/markdown'
import { previewKind, isBinaryKind } from '../preview/registry'
import { GRAPH_COLORS } from '../graph/layout'

const MODES: { id: FileViewMode; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'file', label: 'File View' },
  { id: 'diff', label: 'Diff View' },
  { id: 'blame', label: 'Blame' },
  { id: 'history', label: 'History' }
]

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'avif'])

function fileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() || ''
}

function isImage(name: string): boolean {
  return IMAGE_EXTS.has(fileExt(name))
}

function guessLanguage(filename: string): string {
  const ext = fileExt(filename)
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript', py: 'python', rb: 'ruby', go: 'go',
    rs: 'rust', java: 'java', cpp: 'cpp', cc: 'cpp', c: 'c', h: 'cpp',
    cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin', scala: 'scala',
    sh: 'bash', bash: 'bash', zsh: 'bash', json: 'json', xml: 'xml',
    html: 'xml', htm: 'xml', vue: 'xml', css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', markdown: 'markdown', yml: 'yaml', yaml: 'yaml',
    toml: 'ini', ini: 'ini', sql: 'sql', r: 'r', dart: 'dart', lua: 'lua',
    pl: 'perl', dockerfile: 'dockerfile', makefile: 'makefile'
  }
  return map[ext] || ''
}

function highlightLine(text: string, lang: string): string {
  if (!lang || !hljs.getLanguage(lang)) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  try {
    return hljs.highlight(text, { language: lang }).value
  } catch {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}

function shaColor(sha: string): string {
  let h = 0
  for (let i = 0; i < 7; i++) h = (h * 31 + sha.charCodeAt(i)) | 0
  return GRAPH_COLORS[Math.abs(h) % GRAPH_COLORS.length]
}

function sourceRef(view: FileViewState): string | undefined {
  if (view.source.type === 'commit') return view.source.hash
  if (view.source.type === 'stash') return view.source.untracked ? `${view.source.sha}^3` : view.source.sha
  return view.source.staged ? ':0' : undefined
}

function blameRef(view: FileViewState): string | undefined {
  if (view.source.type === 'commit') return view.source.hash
  if (view.source.type === 'stash') return view.source.untracked ? `${view.source.sha}^3` : view.source.sha
  return undefined
}

/** Refs for the before/after sides of an image diff. before === null means the
 *  side does not exist (added file); after === undefined means the working tree. */
function imageDiffRefs(view: FileViewState): { before: string | null; after?: string } {
  const s = view.source
  if (s.type === 'commit') return { before: `${s.hash}^`, after: s.hash }
  if (s.type === 'stash')
    return s.untracked ? { before: null, after: `${s.sha}^3` } : { before: `${s.sha}^1`, after: s.sha }
  if (s.untracked) return { before: null, after: undefined }
  return { before: 'HEAD', after: s.staged ? ':0' : undefined }
}

export function FileViewer({ view }: { view: FileViewState }): React.JSX.Element {
  const setFileView = useUIStore((s) => s.setFileView)
  const toast = useUIStore((s) => s.toast)
  const t = useT()
  const [content, setContent] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imgDiff, setImgDiff] = useState<{ before: string | null; after: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blame, setBlame] = useState<BlameLine[]>([])
  const [history, setHistory] = useState<FileHistoryEntry[]>([])
  const [explain, setExplain] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  const { repoPath, file, mode, source } = view

  // Re-fetch working-tree content when the window regains focus/visibility.
  useEffect(() => {
    if (source.type !== 'wip') return
    const refresh = (): void => setRefreshKey((k) => k + 1)
    const onVisible = (): void => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [source.type])
  const lang = guessLanguage(file)
  const fileIsImage = isImage(file)
  const pvKind = previewKind(file)
  // Image files already render inline in File view, so they don't need a
  // separate Preview tab. Binary docs (pdf/video/audio/sheet/word) have no
  // meaningful text view — they offer Preview + History only.
  const previewable = !!pvKind && !fileIsImage
  const binaryDoc = !!pvKind && isBinaryKind(pvKind) && !fileIsImage
  const canExplain = !fileIsImage && (mode === 'file' || mode === 'diff') && !!content

  const runExplain = async (): Promise<void> => {
    if (!content) return
    // Prefer a highlighted selection; fall back to the whole file/diff.
    const sel = window.getSelection()?.toString().trim()
    const snippet = sel && sel.length > 1 ? sel : content
    setExplaining(true)
    setExplain(null)
    try {
      const text = await aiApi.explainCode(snippet, lang, useSettingsStore.getState().activeProfile().ai)
      setExplain(text || t('explain.empty'))
    } catch (err) {
      setExplain(null)
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setExplaining(false)
    }
  }

  // Drop a stale explanation when the file/source/mode changes.
  useEffect(() => {
    setExplain(null)
    setExplaining(false)
  }, [repoPath, file, mode, source.type])

  // Blame can't run on images or files that don't exist in history (untracked/new).
  const isUntracked =
    (source.type === 'wip' && source.untracked) || (source.type === 'stash' && source.untracked)
  const blameAvailable = !fileIsImage && !isUntracked
  let modes = MODES.filter((m) => m.id !== 'blame' || blameAvailable)
  if (!previewable) modes = modes.filter((m) => m.id !== 'preview')
  if (binaryDoc) modes = modes.filter((m) => m.id === 'preview' || m.id === 'history')
  const modeAvailable = modes.some((m) => m.id === mode)

  // If the active mode isn't available for this file, fall back to the first
  // available one (Preview for binary docs, File view otherwise).
  useEffect(() => {
    if (!modeAvailable && modes[0]) setFileView({ ...view, mode: modes[0].id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, modeAvailable])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !useUIStore.getState().modal) setFileView(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setFileView])

  useEffect(() => {
    let cancelled = false
    setContent(null)
    setImageUrl(null)
    setImgDiff(null)
    setError(null)
    const load = async (): Promise<void> => {
      try {
        if (mode === 'preview') {
          // PreviewPane fetches its own content; just clear the loading spinner.
          if (!cancelled) setContent('')
          return
        }
        if (fileIsImage && mode === 'diff') {
          const refs = imageDiffRefs(view)
          const result = await gitApi.imageDiff(repoPath, file, refs.before, refs.after)
          if (!cancelled) {
            setImgDiff(result)
            setContent('')
          }
          return
        }
        if (fileIsImage && mode === 'file') {
          const url = await gitApi.fileDataUrl(repoPath, file, sourceRef(view))
          if (!cancelled) {
            setImageUrl(url)
            setContent('')
          }
          return
        }
        if (mode === 'diff') {
          const text =
            source.type === 'commit'
              ? await gitApi.commitFileDiff(repoPath, source.hash, file)
              : source.type === 'stash'
                ? await gitApi.stashFileDiff(repoPath, source.sha, file, source.untracked)
                : await gitApi.diffFile(repoPath, file, source.staged, source.untracked)
          if (!cancelled) setContent(text)
        } else if (mode === 'file') {
          const text = await gitApi.fileContent(repoPath, file, sourceRef(view))
          if (!cancelled) setContent(text)
        } else if (mode === 'blame') {
          const lines = await gitApi.blameFile(repoPath, file, blameRef(view))
          if (!cancelled) {
            setBlame(lines)
            setContent('')
          }
        } else {
          const entries = await gitApi.fileHistory(repoPath, file)
          if (!cancelled) {
            setHistory(entries)
            setContent('')
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    repoPath,
    file,
    mode,
    refreshKey,
    source.type,
    source.type === 'commit' ? source.hash : source.type === 'stash' ? source.sha : source.staged
  ])

  const sourceChip =
    source.type === 'commit' ? (
      <span className="fv-chip commit">{source.hash.slice(0, 7)}</span>
    ) : source.type === 'stash' ? (
      <span className="fv-chip stash">Stash</span>
    ) : (
      <span className={`fv-chip ${source.staged ? 'staged' : 'unstaged'}`}>{source.staged ? 'Staged' : 'Unstaged'}</span>
    )

  return (
    <div className="file-viewer">
      <div className="fv-header">
        <span className="fv-path" title={file}>
          {file.includes('/') ? <span className="fv-dir">{file.slice(0, file.lastIndexOf('/') + 1)}</span> : null}
          <strong>{file.split('/').pop()}</strong>
        </span>
        {sourceChip}
        <div className="fv-modes">
          {modes.map((m) => (
            <button
              key={m.id}
              className={`fv-mode ${mode === m.id ? 'active' : ''}`}
              onClick={() => setFileView({ ...view, mode: m.id })}
            >
              {m.label}
            </button>
          ))}
        </div>
        {canExplain && (
          <button
            className="btn ghost small fv-explain-btn"
            disabled={explaining}
            title={t('explain.title')}
            onClick={() => void runExplain()}
          >
            {explaining ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} {t('explain.action')}
          </button>
        )}
        <button className="icon-btn" title="Close (Esc)" onClick={() => setFileView(null)}>
          <X size={15} />
        </button>
      </div>

      <div className="fv-body">
        {error && <div className="fv-error">{error}</div>}
        {!error && content === null && mode !== 'preview' && (
          <div className="graph-empty">
            <div className="spinner" />
          </div>
        )}

        {!error && mode === 'preview' && pvKind && (
          <PreviewPane repoPath={repoPath} file={file} ref={sourceRef(view)} kind={pvKind} />
        )}

        {!error && imgDiff !== null && mode === 'diff' && (
          <ImageDiff before={imgDiff.before} after={imgDiff.after} />
        )}

        {!error && content !== null && imgDiff === null && mode === 'diff' && (
          <DiffViewer diff={content} lang={lang} />
        )}

        {!error && imageUrl !== null && mode === 'file' && (
          <div className="image-preview">
            <img src={imageUrl} alt={file} />
          </div>
        )}

        {!error && content !== null && imageUrl === null && mode === 'file' && (
          <div className="file-content hljs">
            {content.split('\n').map((l, i) => (
              <div className="code-line" key={i}>
                <span className="code-no">{i + 1}</span>
                <span
                  className="code-text"
                  dangerouslySetInnerHTML={{ __html: highlightLine(l, lang) || '&nbsp;' }}
                />
              </div>
            ))}
          </div>
        )}

        {!error && content !== null && mode === 'blame' && (
          <div className="blame-view hljs">
            {blame.map((b) => (
              <div className="blame-line" key={b.lineNo}>
                <button
                  className="blame-meta"
                  style={{ borderLeftColor: shaColor(b.sha) }}
                  title={`${b.sha.slice(0, 10)} — ${new Date(b.date * 1000).toLocaleDateString()}`}
                  onClick={() => setFileView({ ...view, source: { type: 'commit', hash: b.sha }, mode: 'diff' })}
                >
                  <code>{b.sha.slice(0, 7)}</code>
                  <span>{b.author}</span>
                </button>
                <span className="code-no">{b.lineNo}</span>
                <span
                  className="code-text"
                  dangerouslySetInnerHTML={{ __html: highlightLine(b.text, lang) || '&nbsp;' }}
                />
              </div>
            ))}
          </div>
        )}

        {!error && content !== null && mode === 'history' && (
          <div className="history-view">
            {history.map((h) => (
              <button
                key={h.hash}
                className="history-item"
                onClick={() => setFileView({ ...view, source: { type: 'commit', hash: h.hash }, mode: 'diff' })}
              >
                <GitCommitHorizontal size={14} style={{ color: shaColor(h.hash) }} />
                <span className="history-subject">{h.subject}</span>
                <span className="history-author">{h.author}</span>
                <code>{h.hash.slice(0, 7)}</code>
                <span className="history-date">{new Date(h.date * 1000).toLocaleDateString()}</span>
              </button>
            ))}
            {history.length === 0 && <div className="fv-error">No history for this file</div>}
          </div>
        )}

        {explain !== null && (
          <div className="fv-explain-panel">
            <div className="fv-explain-head">
              <span><Sparkles size={13} /> {t('explain.heading')}</span>
              <button className="icon-btn" title={t('common.close')} onClick={() => setExplain(null)}>
                <X size={14} />
              </button>
            </div>
            <div
              className="fv-explain-body md-preview"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(explain) }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
