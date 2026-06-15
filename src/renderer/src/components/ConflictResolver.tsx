import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, GitMerge, Plus, Sparkles, Loader2, X } from 'lucide-react'
import hljs from 'highlight.js'
import { gitApi, aiApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type ConflictViewState } from '../stores/ui'
import { repoActions, useRepoStore } from '../stores/repo'
import { useT } from '../i18n'
import type { ConflictVersions } from '../../../shared/types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Hunk {
  index: number
  oursStart: number
  theirsStart: number
  ours: string[]
  theirs: string[]
  oursLabel: string
  theirsLabel: string
}

type LineKey = string // `${hunkIndex}:${side}:${lineIdx}`
const lineKey = (hunk: number, side: 'ours' | 'theirs', idx: number): LineKey => `${hunk}:${side}:${idx}`

// ─── Parser ─────────────────────────────────────────────────────────────────

function guessLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift',
    kt: 'kotlin', scala: 'scala', sh: 'bash', json: 'json', xml: 'xml',
    html: 'html', css: 'css', scss: 'scss', md: 'markdown', yml: 'yaml',
    yaml: 'yaml', toml: 'toml', sql: 'sql', r: 'r',
  }
  return map[ext] || 'plaintext'
}

function parseHunks(content: string): { hunks: Hunk[]; oursContent: string; theirsContent: string } {
  const lines = content.split('\n')
  const hunks: Hunk[] = []
  const ourLines: string[] = []
  const theirLines: string[] = []
  let hunkIdx = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('<<<<<<<')) {
      const oursLabel = line.slice(7).trim() || 'ours'
      const ours: string[] = []
      const theirs: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('=======') && !lines[i].startsWith('|||||||')) {
        ours.push(lines[i])
        i++
      }
      if (i < lines.length && lines[i].startsWith('|||||||')) {
        while (i < lines.length && !lines[i].startsWith('=======')) i++
      }
      i++
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
        theirs.push(lines[i])
        i++
      }
      const theirsLabel = i < lines.length ? lines[i].slice(7).trim() || 'theirs' : 'theirs'
      const oursStart = ourLines.length
      const theirsStart = theirLines.length
      ourLines.push(...ours)
      theirLines.push(...theirs)
      hunks.push({
        index: hunkIdx++,
        oursStart,
        theirsStart,
        ours,
        theirs,
        oursLabel,
        theirsLabel,
      })
    } else {
      ourLines.push(line)
      theirLines.push(line)
    }
  }

  return { hunks, oursContent: ourLines.join('\n'), theirsContent: theirLines.join('\n') }
}

/**
 * Reconstruct the output from the per-line selection set. Context lines are
 * always emitted; inside each conflict hunk we emit the chosen ours lines (in
 * order) followed by the chosen theirs lines. Unselected hunks emit nothing.
 */
function assemble(hunks: Hunk[], oursContent: string, selected: Set<LineKey>): string {
  const ourLines = oursContent.split('\n')
  const result: string[] = []
  let cursor = 0

  for (const h of hunks) {
    while (cursor < h.oursStart && cursor < ourLines.length) {
      result.push(ourLines[cursor])
      cursor++
    }
    h.ours.forEach((line, idx) => {
      if (selected.has(lineKey(h.index, 'ours', idx))) result.push(line)
    })
    h.theirs.forEach((line, idx) => {
      if (selected.has(lineKey(h.index, 'theirs', idx))) result.push(line)
    })
    cursor += h.ours.length
  }

  while (cursor < ourLines.length) {
    result.push(ourLines[cursor])
    cursor++
  }

  return result.join('\n')
}

// ─── Main Component ────────────────────────────────────────────────────────

export function ConflictResolver({ view }: { view: ConflictViewState }): React.JSX.Element {
  const setConflictView = useUIStore((s) => s.setConflictView)
  const toast = useUIStore((s) => s.toast)
  const refresh = useRepoStore((s) => s.refresh)
  const t = useT()
  const [content, setContent] = useState<string | null>(null)
  const [versions, setVersions] = useState<ConflictVersions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hunks, setHunks] = useState<Hunk[]>([])
  const [oursContent, setOursContent] = useState('')
  const [theirsContent, setTheirsContent] = useState('')
  const [selected, setSelected] = useState<Set<LineKey>>(new Set())
  const [touched, setTouched] = useState<Set<number>>(new Set())
  const [editOutput, setEditOutput] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiResolving, setAiResolving] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)

  const { repoPath, file } = view
  const lang = guessLanguage(file)

  const outputHtml = useMemo(() => {
    let html: string
    try {
      html = hljs.highlight(editOutput, { language: lang }).value
    } catch {
      html = editOutput.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
    }
    // Trailing newline keeps the highlighted layer aligned with the textarea.
    return html + '\n'
  }, [editOutput, lang])

  useEffect(() => {
    let cancelled = false
    setContent(null)
    setVersions(null)
    setError(null)
    setHunks([])
    setSelected(new Set())
    setTouched(new Set())
    void gitApi
      .conflictVersions(repoPath, file)
      .then((v) => {
        if (cancelled) return
        setVersions(v)
        setContent(v.content)
        const { hunks: parsed, oursContent: oc, theirsContent: tc } = parseHunks(v.content)
        setHunks(parsed)
        setOursContent(oc)
        setTheirsContent(tc)
        setEditOutput(assemble(parsed, oc, new Set()))
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
    return () => {
      cancelled = true
    }
  }, [repoPath, file])

  const resolvedCount = touched.size
  const allResolved = hunks.length > 0 && resolvedCount === hunks.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !useUIStore.getState().modal) setConflictView(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setConflictView])

  const commit = (nextSelected: Set<LineKey>, nextTouched: Set<number>): void => {
    setSelected(nextSelected)
    setTouched(nextTouched)
    setEditOutput(assemble(hunks, oursContent, nextSelected))
  }

  const toggleLine = (hunkIdx: number, side: 'ours' | 'theirs', lineIdx: number): void => {
    const key = lineKey(hunkIdx, side, lineIdx)
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    commit(next, new Set(touched).add(hunkIdx))
  }

  const toggleChunkSide = (hunk: Hunk, side: 'ours' | 'theirs'): void => {
    const lines = side === 'ours' ? hunk.ours : hunk.theirs
    const allOn = lines.length > 0 && lines.every((_, i) => selected.has(lineKey(hunk.index, side, i)))
    const next = new Set(selected)
    lines.forEach((_, i) => {
      const key = lineKey(hunk.index, side, i)
      if (allOn) next.delete(key)
      else next.add(key)
    })
    commit(next, new Set(touched).add(hunk.index))
  }

  const setAll = (side: 'ours' | 'theirs' | null): void => {
    const next = new Set<LineKey>()
    const nextTouched = new Set<number>()
    for (const h of hunks) {
      nextTouched.add(h.index)
      if (side === 'ours') h.ours.forEach((_, i) => next.add(lineKey(h.index, 'ours', i)))
      else if (side === 'theirs') h.theirs.forEach((_, i) => next.add(lineKey(h.index, 'theirs', i)))
    }
    commit(next, nextTouched)
  }

  const handleEditChange = (val: string): void => {
    setEditOutput(val)
  }

  // Ask the AI for a merged proposal. It lands in the editable output pane for review —
  // it is never saved automatically.
  const aiResolve = async (): Promise<void> => {
    if (content === null) return
    setAiResolving(true)
    try {
      const merged = await aiApi.resolveConflict(file, content, useSettingsStore.getState().activeProfile().ai)
      setEditOutput(merged)
      setTouched(new Set(hunks.map((h) => h.index))) // enable Save; user still reviews
      toast('info', t('conflict.aiProposed'))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setAiResolving(false)
    }
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await gitApi.resolveConflict(repoPath, file, editOutput)
      toast('success', `Resolved ${file}`)
      setConflictView(null)
      await refresh(repoPath)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const takeSide = async (side: 'ours' | 'theirs' | 'delete'): Promise<void> => {
    setSaving(true)
    try {
      await repoActions.conflictTakeSide(repoPath, file, side)
      setConflictView(null)
      await refresh(repoPath)
    } finally {
      setSaving(false)
    }
  }

  if (content === null) {
    return (
      <div className="file-viewer conflict-resolver">
        <div className="fv-header">
          <span className="fv-path" title={file}>
            <GitMerge size={14} style={{ marginRight: 6, flexShrink: 0 }} />
            {file.includes('/') ? <span className="fv-dir">{file.slice(0, file.lastIndexOf('/') + 1)}</span> : null}
            <strong>{file.split('/').pop()}</strong>
          </span>
          <button className="icon-btn" title="Close (Esc)" onClick={() => setConflictView(null)}>
            <X size={15} />
          </button>
        </div>
        <div className="fv-body">
          {error && <div className="fv-error">{error}</div>}
          {!error && <div className="graph-empty"><div className="spinner" /></div>}
        </div>
      </div>
    )
  }

  if (hunks.length === 0) {
    return (
      <div className="file-viewer conflict-resolver">
        <div className="fv-header">
          <span className="fv-path" title={file}>
            <GitMerge size={14} style={{ marginRight: 6, flexShrink: 0 }} />
            {file.includes('/') ? <span className="fv-dir">{file.slice(0, file.lastIndexOf('/') + 1)}</span> : null}
            <strong>{file.split('/').pop()}</strong>
          </span>
          <button className="icon-btn" title="Close (Esc)" onClick={() => setConflictView(null)}>
            <X size={15} />
          </button>
        </div>
        <div className="fv-body">
          <div className="graph-empty">
            <GitMerge size={36} strokeWidth={1.2} />
            <span>{t('conflict.noMarkers')}</span>
            <div className="conflict-empty-actions">
              <button className="btn ghost small" disabled={saving || !versions?.ours} onClick={() => void takeSide('ours')}>
                {t('conflict.keepOurs')}
              </button>
              <button className="btn ghost small" disabled={saving || !versions?.theirs} onClick={() => void takeSide('theirs')}>
                {t('conflict.keepTheirs')}
              </button>
              <button className="btn danger small" disabled={saving} onClick={() => void takeSide('delete')}>
                {t('conflict.deleteFile')}
              </button>
              <button className="btn primary small" disabled={saving} onClick={() => void save()}>
                {t('conflict.stageAsIs')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="file-viewer conflict-resolver conflict-editor">
      <div className="fv-header">
        <span className="fv-path" title={file}>
          <GitMerge size={14} style={{ marginRight: 6, flexShrink: 0 }} />
          {file.includes('/') ? <span className="fv-dir">{file.slice(0, file.lastIndexOf('/') + 1)}</span> : null}
          <strong>{file.split('/').pop()}</strong>
        </span>
        <span className="fv-chip conflict">
          {resolvedCount}/{hunks.length} {t('conflict.resolved')}
        </span>
        <div className="conflict-global-actions">
          <button className="btn ghost tiny" onClick={() => setAll('ours')}>
            {t('conflict.allOurs')}
          </button>
          <button className="btn ghost tiny" onClick={() => setAll('theirs')}>
            {t('conflict.allTheirs')}
          </button>
          <button className="btn ghost tiny" onClick={() => setAll(null)}>
            {t('conflict.none')}
          </button>
          <button
            className="btn ghost tiny"
            disabled={aiResolving || saving}
            title={t('conflict.aiResolveHint')}
            onClick={() => void aiResolve()}
          >
            {aiResolving ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} {t('conflict.aiResolve')}
          </button>
          <button className="btn primary small" disabled={!allResolved || saving} onClick={() => void save()}>
            <Check size={13} /> {t('conflict.saveResolution')}
          </button>
        </div>
        <button className="icon-btn" title={t('common.close')} onClick={() => setConflictView(null)}>
          <X size={15} />
        </button>
      </div>

      <div className="conflict-split">
        <div className="conflict-files">
          <SideFile
            label={`OURS · ${versions?.ours ? hunks[0]?.oursLabel ?? 'ours' : 'ours'}`}
            side="ours"
            content={oursContent}
            hunks={hunks}
            lang={lang}
            selected={selected}
            onToggleLine={toggleLine}
            onToggleSide={toggleChunkSide}
            takeWholeSideLabel={t('conflict.takeWholeSide')}
          />
          <SideFile
            label={`THEIRS · ${hunks[0]?.theirsLabel ?? 'theirs'}`}
            side="theirs"
            content={theirsContent}
            hunks={hunks}
            lang={lang}
            selected={selected}
            onToggleLine={toggleLine}
            onToggleSide={toggleChunkSide}
            takeWholeSideLabel={t('conflict.takeWholeSide')}
          />
        </div>

        <div className="conflict-output-pane">
          <div className="conflict-output-header">
            <span>{t('conflict.output')}</span>
            <span className="text-2">
              {editOutput.split('\n').length} {t('conflict.lines')}
            </span>
          </div>
          <div className="conflict-output-code">
            <pre ref={highlightRef} className="conflict-output-highlight hljs" aria-hidden="true">
              <code dangerouslySetInnerHTML={{ __html: outputHtml }} />
            </pre>
            <textarea
              ref={editRef}
              className="conflict-output-editor"
              value={editOutput}
              onChange={(e) => handleEditChange(e.target.value)}
              onScroll={(e) => {
                if (highlightRef.current) {
                  highlightRef.current.scrollTop = e.currentTarget.scrollTop
                  highlightRef.current.scrollLeft = e.currentTarget.scrollLeft
                }
              }}
              spellCheck={false}
              placeholder={t('conflict.outputPlaceholder')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Side file viewer with per-line and per-chunk selection ──────────────────

function SideFile({
  label,
  side,
  content,
  hunks,
  lang,
  selected,
  onToggleLine,
  onToggleSide,
  takeWholeSideLabel,
}: {
  label: string
  side: 'ours' | 'theirs'
  content: string
  hunks: Hunk[]
  lang: string
  selected: Set<LineKey>
  onToggleLine: (hunkIdx: number, side: 'ours' | 'theirs', lineIdx: number) => void
  onToggleSide: (hunk: Hunk, side: 'ours' | 'theirs') => void
  takeWholeSideLabel: string
}): React.JSX.Element {
  const lines = content.split('\n')

  // Map each global line index → { hunk, lineIdx within the hunk side }.
  const lineMeta = useMemo(() => {
    const map = new Map<number, { hunk: Hunk; lineIdx: number }>()
    for (const h of hunks) {
      const start = side === 'ours' ? h.oursStart : h.theirsStart
      const arr = side === 'ours' ? h.ours : h.theirs
      for (let k = 0; k < arr.length; k++) map.set(start + k, { hunk: h, lineIdx: k })
    }
    return map
  }, [hunks, side])

  const highlight = (text: string): string => {
    try {
      if (lang === 'plaintext') return escapeHtml(text)
      return hljs.highlight(text, { language: lang }).value
    } catch {
      return escapeHtml(text)
    }
  }

  const chunkAllOn = (h: Hunk): boolean => {
    const arr = side === 'ours' ? h.ours : h.theirs
    return arr.length > 0 && arr.every((_, i) => selected.has(lineKey(h.index, side, i)))
  }

  return (
    <div className={`conflict-file ${side}`}>
      <div className="conflict-file-head">
        <span className={`conflict-tag ${side}-tag`}>{label}</span>
      </div>
      <div className="conflict-file-body">
        <pre className="conflict-code hljs">
          {lines.map((line, i) => {
            const meta = lineMeta.get(i)
            if (!meta) {
              return (
                <div key={i} className="conflict-code-line">
                  <span className="conflict-code-gutter" />
                  <span className="conflict-code-no">{i + 1}</span>
                  <span
                    className="conflict-code-text"
                    dangerouslySetInnerHTML={{ __html: highlight(line) || '&nbsp;' }}
                  />
                </div>
              )
            }
            const { hunk, lineIdx } = meta
            const isFirst = lineIdx === 0
            const picked = selected.has(lineKey(hunk.index, side, lineIdx))
            return (
              <div key={i}>
                {isFirst && (
                  <label className="conflict-chunk-head" title={takeWholeSideLabel}>
                    <input
                      type="checkbox"
                      checked={chunkAllOn(hunk)}
                      onChange={() => onToggleSide(hunk, side)}
                    />
                    <span>{takeWholeSideLabel}</span>
                  </label>
                )}
                <div className={`conflict-code-line conflict ${picked ? 'picked' : ''}`}>
                  <button
                    className={`conflict-code-add ${picked ? 'on' : ''}`}
                    title={picked ? '✓' : '+'}
                    onClick={() => onToggleLine(hunk.index, side, lineIdx)}
                  >
                    {picked ? <Check size={11} /> : <Plus size={11} />}
                  </button>
                  <span className="conflict-code-no">{i + 1}</span>
                  <span
                    className="conflict-code-text"
                    dangerouslySetInnerHTML={{ __html: highlight(line) || '&nbsp;' }}
                  />
                </div>
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
