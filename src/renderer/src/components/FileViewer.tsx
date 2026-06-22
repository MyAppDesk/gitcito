import { useEffect, useMemo, useRef, useState } from 'react'
import { X, GitCommitHorizontal, Sparkles, Loader2, Search, ChevronUp, ChevronDown, Pencil, Save, Link2 } from 'lucide-react'
import type { BlameLine, FileHistoryEntry } from '../../../shared/types'
import { gitApi, aiApi, shellApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type FileViewMode, type FileViewState } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { filePermalink } from '../lib/autolink'
import { useT } from '../i18n'
import { DiffViewer } from './DiffViewer'
import { buildQueryRegExp, highlightHtml, type HighlightLayer } from './FileSearchBar'
import { fileExt, guessLanguage, highlightLine } from '../lib/highlight'
import { isSecretFile, maskSecretLine } from '../lib/secrets'
import { Eye, EyeOff } from 'lucide-react'
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

function isImage(name: string): boolean {
  return IMAGE_EXTS.has(fileExt(name))
}

function shaColor(sha: string): string {
  let h = 0
  for (let i = 0; i < 7; i++) h = (h * 31 + sha.charCodeAt(i)) | 0
  return GRAPH_COLORS[Math.abs(h) % GRAPH_COLORS.length]
}

function sourceRef(view: FileViewState): string | undefined {
  if (view.source.type === 'commit') return view.source.hash
  if (view.source.type === 'stash') return view.source.untracked ? `${view.source.sha}^3` : view.source.sha
  if (view.source.type === 'tree') return undefined
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
  if (s.type === 'tree') return { before: 'HEAD', after: undefined }
  if (s.untracked) return { before: null, after: undefined }
  return { before: 'HEAD', after: s.staged ? ':0' : undefined }
}

export function FileViewer({ view }: { view: FileViewState }): React.JSX.Element {
  const setFileView = useUIStore((s) => s.setFileView)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const setEditorDirty = useUIStore((s) => s.setEditorDirty)
  const openModal = useUIStore((s) => s.openModal)
  const toast = useUIStore((s) => s.toast)
  const fileSearch = useUIStore((s) => s.fileSearch)
  const searchRe = useMemo(() => (fileSearch ? buildQueryRegExp(fileSearch, true) : null), [fileSearch])
  const bodyRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  // ─── In-file find (Ctrl/Cmd+F) — layers on top of the right-panel filter ───
  const [findOpen, setFindOpen] = useState(false)
  const [find, setFind] = useState({ query: '', caseSensitive: false, wholeWord: false, regex: false })
  const [hitCount, setHitCount] = useState(0)
  const [activeHit, setActiveHit] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)
  const findRe = useMemo(
    () => (find.query ? buildQueryRegExp(find, true) : null),
    [find.query, find.caseSensitive, find.wholeWord, find.regex]
  )
  // Find layer first so it wins overlaps and is the navigable one; the filter
  // layer from the right panel stays as a secondary highlight ("more matches").
  const layers = useMemo<HighlightLayer[]>(() => {
    const ls: HighlightLayer[] = []
    if (findRe) ls.push({ re: findRe, className: 'find-hit' })
    if (searchRe) ls.push({ re: searchRe, className: 'search-hit' })
    return ls
  }, [findRe, searchRe])

  const openFind = (): void => {
    setFindOpen(true)
    setFind((f) =>
      f.query
        ? f
        : {
            query: fileSearch?.query ?? '',
            caseSensitive: fileSearch?.caseSensitive ?? false,
            wholeWord: fileSearch?.wholeWord ?? false,
            regex: fileSearch?.regex ?? false
          }
    )
    requestAnimationFrame(() => {
      findInputRef.current?.focus()
      findInputRef.current?.select()
    })
  }
  const closeFind = (): void => setFindOpen(false)
  const goHit = (delta: number): void =>
    setActiveHit((i) => (hitCount ? (i + delta + hitCount) % hitCount : 0))
  const t = useT()
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)
  const [content, setContent] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imgDiff, setImgDiff] = useState<{ before: string | null; after: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blame, setBlame] = useState<BlameLine[]>([])
  // When set, blame is computed at this ref instead of the view's ref — lets you
  // walk a line's history backwards via "reblame at parent".
  const [blameOverrideRef, setBlameOverrideRef] = useState<string | null>(null)
  const [history, setHistory] = useState<FileHistoryEntry[]>([])
  const [explain, setExplain] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)
  const [ignoreWs, setIgnoreWs] = useState(false)

  // ─── In-app editing (project-tree files only) ───
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const { repoPath, file, mode, source } = view

  // Clear any blame "rewind" when switching files/repos.
  useEffect(() => setBlameOverrideRef(null), [file, repoPath])

  // Secret masking: KEY=•••• in .env/key files, on by default, per-view reveal.
  const maskSecretsSetting = useSettingsStore((s) => s.settings.maskSecrets)
  const [revealSecrets, setRevealSecrets] = useState(false)
  const fileIsSecret = isSecretFile(file)
  const maskOn = fileIsSecret && maskSecretsSetting && !revealSecrets
  const maybeMask = (l: string): string => (maskOn ? maskSecretLine(l) : l)

  // Re-fetch working-tree content when the window regains focus/visibility.
  // Suspended while editing so a window-focus reload can't discard the buffer.
  useEffect(() => {
    if (source.type !== 'wip' || editing) return
    const refresh = (): void => setRefreshKey((k) => k + 1)
    const onVisible = (): void => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [source.type, editing])
  const lang = guessLanguage(file)
  const fileIsImage = isImage(file)
  const pvKind = previewKind(file)
  // Image files already render inline in File view, so they don't need a
  // separate Preview tab. Binary docs (pdf/video/audio/sheet/word) have no
  // meaningful text view — they offer Preview + History only.
  const previewable = !!pvKind && !fileIsImage
  const binaryDoc = !!pvKind && isBinaryKind(pvKind) && !fileIsImage
  const canExplain = !fileIsImage && (mode === 'file' || mode === 'diff') && !!content
  // Host permalink to this file at the viewed commit (commit source + a remote).
  const repoData = useRepoStore((s) => s.repos[repoPath])
  const originUrl = repoData?.remotes.find((r) => r.name === 'origin')?.url ?? repoData?.remotes[0]?.url
  const permalink = source.type === 'commit' ? filePermalink(originUrl, source.hash, file) : undefined

  // A real on-disk working-tree file (project tree, or any WIP entry). These can
  // be edited; the editor always reads/writes the working copy even when the
  // File view is otherwise showing the staged (':0') version.
  const onDiskFile = source.type === 'tree' || source.type === 'wip'
  // The file can be edited at all (drives the Edit button, shown from any mode).
  const editableFile = onDiskFile && !fileIsImage && !binaryDoc
  // The editor is actually mounted (File view + editing toggled on).
  const editable = editableFile && mode === 'file' && content !== null
  const dirty = editing && content !== null && draft !== content

  // Mirror the dirty flag to the store so navigation guards can see it; leaving
  // the viewer (or the file) always clears it.
  useEffect(() => {
    setEditorDirty(dirty)
  }, [dirty, setEditorDirty])
  useEffect(() => {
    setEditing(false)
  }, [file, repoPath])
  useEffect(() => () => setEditorDirty(false), [setEditorDirty])

  const saveDraft = async (): Promise<void> => {
    if (!dirty || saving) return
    setSaving(true)
    try {
      await shellApi.writeFiles(repoPath, [{ path: file, content: draft }])
      setContent(draft)
      setEditorDirty(false)
      toast('success', `Saved ${file.split('/').pop()}`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  // Syntax-highlighted backdrop for the editor. A trailing newline keeps the
  // last (possibly empty) line rendered so the textarea and backdrop align.
  const editorHtml = useMemo(
    () => draft.split('\n').map((l) => highlightLine(l, lang) || '&nbsp;').join('\n') + '\n',
    [draft, lang]
  )
  const syncEditorScroll = (): void => {
    if (preRef.current && editorRef.current) {
      preRef.current.scrollTop = editorRef.current.scrollTop
      preRef.current.scrollLeft = editorRef.current.scrollLeft
    }
  }

  // Enter edit mode — switch to File view first (the editor only lives there).
  const startEditing = (): void => {
    if (mode !== 'file') setFileView({ ...view, mode: 'file' })
    setEditing(true)
  }

  // Guarded close — prompt before throwing away unsaved edits.
  const requestClose = (): void => {
    if (dirty) {
      openModal({
        kind: 'confirm',
        title: 'Discard changes',
        message: `Discard unsaved changes to ${file.split('/').pop()}?`,
        danger: true,
        confirmLabel: 'Discard',
        onConfirm: () => {
          setEditorDirty(false)
          setFileView(null)
        }
      })
    } else {
      setFileView(null)
    }
  }

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
  // A plain working-tree file has no commit/stash to diff against here.
  if (source.type === 'tree') modes = modes.filter((m) => m.id !== 'diff')
  const modeAvailable = modes.some((m) => m.id === mode)

  // If the active mode isn't available for this file, fall back to the first
  // available one (Preview for binary docs, File view otherwise).
  useEffect(() => {
    if (!modeAvailable && modes[0]) setFileView({ ...view, mode: modes[0].id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, modeAvailable])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && editable) {
        e.preventDefault()
        void saveDraft()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openFind()
        return
      }
      if (e.key === 'Escape' && !useUIStore.getState().modal) {
        if (findOpen) closeFind()
        else requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFileView, findOpen, fileSearch, editable, dirty, draft, content, saving])

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
              ? await gitApi.commitFileDiff(repoPath, source.hash, file, ignoreWs)
              : source.type === 'stash'
                ? await gitApi.stashFileDiff(repoPath, source.sha, file, source.untracked, ignoreWs)
                : source.type === 'wip'
                  ? await gitApi.diffFile(repoPath, file, source.staged, source.untracked, ignoreWs)
                  : ''
          if (!cancelled) setContent(text)
        } else if (mode === 'file') {
          // While editing, always read the on-disk working copy (ignore the
          // staged ':0' ref) so edits and saves target the real file.
          const ref = editing && onDiskFile ? undefined : sourceRef(view)
          const text = await gitApi.fileContent(repoPath, file, ref)
          if (!cancelled) {
            setContent(text)
            // Seed the editor buffer from this authoritative load (entering edit
            // or switching file/mode). User keystrokes never trigger a reload, so
            // this can't clobber unsaved typing.
            if (editing) setDraft(text)
          }
        } else if (mode === 'blame') {
          const lines = await gitApi.blameFile(repoPath, file, blameOverrideRef ?? blameRef(view))
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
    blameOverrideRef,
    editing,
    ignoreWs,
    source.type,
    source.type === 'commit' ? source.hash : source.type === 'stash' ? source.sha : source.type === 'wip' ? source.staged : ''
  ])

  // Recount find hits whenever the query/content/layers change; clamp active.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const marks = bodyRef.current?.querySelectorAll('mark.find-hit')
      const n = marks?.length ?? 0
      setHitCount(n)
      setActiveHit((i) => (n ? Math.min(i, n - 1) : 0))
    })
    return () => cancelAnimationFrame(id)
  }, [findRe, searchRe, content, mode, file])

  // Mark the active find hit and scroll it into view.
  useEffect(() => {
    const marks = bodyRef.current?.querySelectorAll('mark.find-hit')
    if (!marks || marks.length === 0) return
    marks.forEach((m, i) => m.classList.toggle('active', i === activeHit))
    marks[activeHit]?.scrollIntoView({ block: 'center' })
  }, [activeHit, hitCount, findRe])

  // When only the right-panel filter is active (no find open), scroll to its
  // first match so the user sees why the file matched.
  useEffect(() => {
    if (findOpen || !searchRe || content === null) return
    const id = requestAnimationFrame(() => {
      bodyRef.current?.querySelector('mark.search-hit')?.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [searchRe, content, mode, file, findOpen])

  const sourceChip =
    source.type === 'commit' ? (
      <span className="fv-chip commit">{source.hash.slice(0, 7)}</span>
    ) : source.type === 'stash' ? (
      <span className="fv-chip stash">Stash</span>
    ) : source.type === 'tree' ? (
      <span className={`fv-chip working${dirty ? ' dirty' : ''}`}>{dirty ? 'Unsaved' : 'Working tree'}</span>
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
        {fileIsSecret && maskSecretsSetting && (
          <button
            className="btn ghost small"
            title={revealSecrets ? 'Hide secret values' : 'Secret values are masked — click to reveal'}
            onClick={() => setRevealSecrets((v) => !v)}
          >
            {revealSecrets ? <EyeOff size={13} /> : <Eye size={13} />} {revealSecrets ? 'Hide' : 'Reveal'}
          </button>
        )}
        {canExplain && aiEnabled && (
          <button
            className="btn ghost small fv-explain-btn"
            disabled={explaining}
            title={t('explain.title')}
            onClick={() => void runExplain()}
          >
            {explaining ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} {t('explain.action')}
          </button>
        )}
        {permalink && (
          <button
            className="btn ghost small"
            title="Copy a host link to this file at this commit"
            onClick={() => {
              void navigator.clipboard.writeText(permalink)
              toast('success', 'Permalink copied')
            }}
          >
            <Link2 size={13} /> Link
          </button>
        )}
        {editableFile && !(editable && editing) && (
          <button className="btn ghost small" title="Edit file" onClick={startEditing}>
            <Pencil size={13} /> Edit
          </button>
        )}
        {editable && editing && (
          <button
            className="btn small fv-save-btn"
            disabled={!dirty || saving}
            title="Save (⌘S)"
            onClick={() => void saveDraft()}
          >
            {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />} Save
          </button>
        )}
        <button className="icon-btn" title="Close (Esc)" onClick={requestClose}>
          <X size={15} />
        </button>
      </div>

      <div className="fv-body" ref={bodyRef}>
        {findOpen && (
          <div className="fv-find">
            <Search size={13} className="fv-find-icon" />
            <input
              ref={findInputRef}
              className="fv-find-input"
              placeholder="Find in file"
              value={find.query}
              spellCheck={false}
              onChange={(e) => setFind((f) => ({ ...f, query: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  goHit(e.shiftKey ? -1 : 1)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  closeFind()
                }
              }}
            />
            <div className="fv-find-toggles">
              <button
                className={`fs-toggle${find.caseSensitive ? ' active' : ''}`}
                title="Match Case"
                onClick={() => setFind((f) => ({ ...f, caseSensitive: !f.caseSensitive }))}
              >
                Aa
              </button>
              <button
                className={`fs-toggle${find.wholeWord ? ' active' : ''}`}
                title="Match Whole Word"
                onClick={() => setFind((f) => ({ ...f, wholeWord: !f.wholeWord }))}
              >
                ab
              </button>
              <button
                className={`fs-toggle${find.regex ? ' active' : ''}`}
                title="Use Regular Expression"
                onClick={() => setFind((f) => ({ ...f, regex: !f.regex }))}
              >
                .*
              </button>
            </div>
            <span className="fv-find-count">{hitCount ? `${activeHit + 1}/${hitCount}` : '0/0'}</span>
            <button className="icon-btn" title="Previous (Shift+Enter)" disabled={!hitCount} onClick={() => goHit(-1)}>
              <ChevronUp size={14} />
            </button>
            <button className="icon-btn" title="Next (Enter)" disabled={!hitCount} onClick={() => goHit(1)}>
              <ChevronDown size={14} />
            </button>
            <button className="icon-btn" title="Close (Esc)" onClick={closeFind}>
              <X size={14} />
            </button>
          </div>
        )}
        {error && <div className="fv-error">{error}</div>}
        {!error && content === null && mode !== 'preview' && (
          <div className="graph-empty">
            <div className="spinner" />
          </div>
        )}

        {!error && mode === 'preview' && pvKind && (
          <PreviewPane repoPath={repoPath} file={file} gitRef={sourceRef(view)} kind={pvKind} />
        )}

        {!error && imgDiff !== null && mode === 'diff' && (
          <ImageDiff before={imgDiff.before} after={imgDiff.after} />
        )}

        {!error && content !== null && imgDiff === null && mode === 'diff' && (
          <DiffViewer
            diff={content}
            lang={lang}
            highlightLayers={layers}
            maskValues={maskOn}
            ignoreWs={ignoreWs}
            onToggleIgnoreWs={() => setIgnoreWs((v) => !v)}
            onStageHunk={
              source.type === 'wip' && !source.staged && !source.untracked
                ? async (patch) => {
                    try {
                      await gitApi.stagePatch(repoPath, patch)
                      setRefreshKey((k) => k + 1)
                    } catch (err) {
                      toast('error', err instanceof Error ? err.message : String(err))
                    }
                  }
                : undefined
            }
          />
        )}

        {!error && imageUrl !== null && mode === 'file' && (
          <div className="image-preview">
            <img src={imageUrl} alt={file} />
          </div>
        )}

        {!error && content !== null && imageUrl === null && mode === 'file' && editing && (
          <div className="code-editor">
            <pre
              ref={preRef}
              className="code-editor-pre hljs"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: editorHtml }}
            />
            <textarea
              ref={editorRef}
              className="code-editor-area"
              value={draft}
              spellCheck={false}
              autoFocus
              onScroll={syncEditorScroll}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Insert a real tab instead of moving focus.
                if (e.key === 'Tab') {
                  e.preventDefault()
                  const ta = e.currentTarget
                  const { selectionStart: s, selectionEnd: en } = ta
                  const next = draft.slice(0, s) + '  ' + draft.slice(en)
                  setDraft(next)
                  requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2))
                }
              }}
            />
          </div>
        )}

        {!error && content !== null && imageUrl === null && mode === 'file' && !editing && (
          <div className="file-content hljs">
            {content.split('\n').map((l, i) => (
              <div className="code-line" key={i}>
                <span className="code-no">{i + 1}</span>
                <span
                  className="code-text"
                  dangerouslySetInnerHTML={{ __html: highlightHtml(highlightLine(maybeMask(l), lang), layers) || '&nbsp;' }}
                />
              </div>
            ))}
          </div>
        )}

        {!error && content !== null && mode === 'blame' && (
          <div className="blame-view hljs">
            {blameOverrideRef && (
              <div className="blame-rewind-bar">
                <span>Blaming at <code>{blameOverrideRef}</code></span>
                <button className="btn ghost tiny" onClick={() => setBlameOverrideRef(null)}>
                  Back to latest
                </button>
              </div>
            )}
            {blame.map((b) => (
              <div className="blame-line" key={b.lineNo}>
                <button
                  className="blame-meta"
                  style={{ borderLeftColor: shaColor(b.sha) }}
                  title={`${b.sha.slice(0, 10)} — ${new Date(b.date * 1000).toLocaleDateString()}\nRight-click for more`}
                  onClick={() => setFileView({ ...view, source: { type: 'commit', hash: b.sha }, mode: 'diff' })}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    openContextMenu(e.clientX, e.clientY, [
                      { label: `Open ${b.sha.slice(0, 7)} diff`, onClick: () => setFileView({ ...view, source: { type: 'commit', hash: b.sha }, mode: 'diff' }) },
                      { label: 'Reblame before this commit', onClick: () => setBlameOverrideRef(`${b.sha}^`) },
                      { label: 'Copy SHA', onClick: () => void navigator.clipboard.writeText(b.sha) }
                    ])
                  }}
                >
                  <code>{b.sha.slice(0, 7)}</code>
                  <span>{b.author}</span>
                </button>
                <span className="code-no">{b.lineNo}</span>
                <span
                  className="code-text"
                  dangerouslySetInnerHTML={{ __html: highlightHtml(highlightLine(maybeMask(b.text), lang), layers) || '&nbsp;' }}
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
