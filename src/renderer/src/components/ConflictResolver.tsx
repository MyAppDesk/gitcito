import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, ExternalLink, GitMerge, Minus, Pencil, Plus, RotateCcw, Sparkles, Loader2, X } from 'lucide-react'
import hljs from 'highlight.js'
import { gitApi, aiApi, diffToolApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type ConflictViewState } from '../stores/ui'
import { repoActions, useRepoStore } from '../stores/repo'
import { interp, useT } from '../i18n'
import { ResizeHandle } from './ResizeHandle'
import {
  assemble,
  lineKey,
  mergePicks,
  parseHunks,
  sideFullyPicked,
  sidePartlyPicked,
  toggleSideEverywhere,
  reconcileOutput,
  toggleSideInHunk,
  type Assembled,
  type Hunk,
  type LineKey,
  type LineOrigin,
  type OutputMark,
  type ConflictLineSide as Side,
} from '../lib/conflict'
import type { ConflictRefInfo, ConflictVersions } from '../../../shared/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

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

/** Live pixel size of an element, so ratio-based splits can drive ResizeHandle. */
function useBoxSize(ref: React.RefObject<HTMLElement>): { w: number; h: number } {
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = (): void => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return box
}

const clampRatio = (r: number): number => Math.min(0.85, Math.max(0.15, r))

// ─── Main Component ────────────────────────────────────────────────────────

export function ConflictResolver({ view }: { view: ConflictViewState }): React.JSX.Element {
  const setConflictView = useUIStore((s) => s.setConflictView)
  const toast = useUIStore((s) => s.toast)
  const layout = useUIStore((s) => s.layout)
  const setLayout = useUIStore((s) => s.setLayout)
  const refresh = useRepoStore((s) => s.refresh)
  const ctx = useRepoStore((s) => s.repos[view.repoPath]?.conflictContext ?? null)
  const t = useT()
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)
  const [mergeTool, setMergeTool] = useState('')
  const [toolRunning, setToolRunning] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [versions, setVersions] = useState<ConflictVersions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hunks, setHunks] = useState<Hunk[]>([])
  const [oursContent, setOursContent] = useState('')
  const [theirsContent, setTheirsContent] = useState('')
  const [selected, setSelected] = useState<Set<LineKey>>(new Set())
  const [touched, setTouched] = useState<Set<number>>(new Set())
  const [editOutput, setEditOutput] = useState('')
  // Last assembled output, kept so the pane can attribute each line to a side.
  // Once the user hand-edits the text the attribution no longer applies.
  const [assembled, setAssembled] = useState<Assembled>({ text: '', starts: [], origins: [], keys: [] })
  const [activeHunk, setActiveHunk] = useState(0)
  const [saving, setSaving] = useState(false)
  const [aiResolving, setAiResolving] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef<HTMLDivElement>(null)
  const oursPaneRef = useRef<HTMLDivElement>(null)
  const theirsPaneRef = useRef<HTMLDivElement>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  const filesRef = useRef<HTMLDivElement>(null)
  const splitBox = useBoxSize(splitRef)
  const filesBox = useBoxSize(filesRef)

  const { repoPath, file } = view
  const lang = guessLanguage(file)
  const sideRatio = clampRatio(layout.conflictSideRatio)
  const filesRatio = clampRatio(layout.conflictFilesRatio)

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

  const outputLineCount = useMemo(() => editOutput.split('\n').length, [editOutput])

  // Per-output-line badge: the side a line came from, or 'edited' for anything
  // the user typed (or an AI proposal) that no longer matches what we assembled.
  const marks = useMemo<OutputMark[]>(
    () => reconcileOutput(assembled.text, assembled.origins, editOutput),
    [editOutput, assembled]
  )

  // Only offer the external tool when git has one configured — the button is
  // meaningless otherwise, and `git mergetool` would just error.
  useEffect(() => {
    void diffToolApi
      .config(repoPath)
      .then((cfg) => setMergeTool(cfg.mergeTool))
      .catch(() => setMergeTool(''))
  }, [repoPath])

  /** Hand the conflict to `git mergetool`. On a clean exit git stages the file
   *  itself, so the resolver closes and the repo view refreshes. */
  const runMergeTool = async (): Promise<void> => {
    setToolRunning(true)
    try {
      const error = await diffToolApi.merge(repoPath, file)
      if (error) {
        toast('error', error)
      } else {
        toast('success', interp(t('difftool.merged'), { file }))
        setConflictView(null)
        await refresh(repoPath)
      }
    } finally {
      setToolRunning(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setContent(null)
    setVersions(null)
    setError(null)
    setHunks([])
    setSelected(new Set())
    setTouched(new Set())
    setActiveHunk(0)
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
        const fresh = assemble(parsed, oc, new Set())
        setEditOutput(fresh.text)
        setAssembled(fresh)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
    return () => {
      cancelled = true
    }
  }, [repoPath, file])

  const resolvedCount = touched.size
  const allResolved = hunks.length > 0 && resolvedCount === hunks.length

  // Keep the highlighted layer and the line-number gutter glued to the textarea.
  const syncOutputScroll = (top: number, left: number): void => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = top
      highlightRef.current.scrollLeft = left
    }
    if (gutterRef.current) gutterRef.current.scrollTop = top
    if (rowsRef.current) rowsRef.current.scrollTop = top
  }

  // Scroll both side panes and the output to a given conflict. Wraps around, so
  // ⌃ on the first conflict lands on the last and ⌄ on the last on the first.
  const goToHunk = (idx: number): void => {
    if (hunks.length === 0) return
    const next = ((idx % hunks.length) + hunks.length) % hunks.length
    setActiveHunk(next)
    for (const pane of [oursPaneRef.current, theirsPaneRef.current]) {
      const el = pane?.querySelector<HTMLElement>(`[data-hunk="${next}"]`)
      if (!pane || !el) continue
      const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop
      pane.scrollTop = Math.max(0, top - pane.clientHeight / 3)
    }
    const ta = editRef.current
    const start = assembled.starts[next]
    if (ta && start != null && outputLineCount > 0) {
      const lineHeight = ta.scrollHeight / outputLineCount
      ta.scrollTop = Math.max(0, start * lineHeight - ta.clientHeight / 3)
      syncOutputScroll(ta.scrollTop, ta.scrollLeft)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !useUIStore.getState().modal) {
        setConflictView(null)
        return
      }
      // Alt+↑/↓ jumps between conflicts, except while editing the output.
      if (!e.altKey || document.activeElement === editRef.current) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        goToHunk(activeHunk + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        goToHunk(activeHunk - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // Re-bound every render on purpose: the handler reads the current
    // activeHunk / hunk list, and (re)binding one listener is free.
  })

  const commit = (nextSelected: Set<LineKey>, nextTouched: Set<number>): void => {
    setSelected(nextSelected)
    setTouched(nextTouched)
    const next = assemble(hunks, oursContent, nextSelected)
    // Fold the pick change into whatever is in the pane, so hand edits survive.
    setEditOutput(mergePicks(assembled, editOutput, next))
    setAssembled(next)
  }

  const toggleLine = (hunkIdx: number, side: Side, lineIdx: number): void => {
    const key = lineKey(hunkIdx, side, lineIdx)
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    commit(next, new Set(touched).add(hunkIdx))
    setActiveHunk(hunkIdx)
  }

  /** Remove a line straight from the output: unpick it on its own side. */
  const dropOutputLine = (origin: NonNullable<LineOrigin>): void => {
    const next = new Set(selected)
    next.delete(lineKey(origin.hunk, origin.side, origin.line))
    commit(next, new Set(touched).add(origin.hunk))
    setActiveHunk(origin.hunk)
  }

  /** Per-chunk checkbox: add or drop every line of one side of one chunk. The
   *  other side is left alone, so both sides (or neither) can be taken. */
  const toggleChunkSide = (hunk: Hunk, side: Side): void => {
    commit(toggleSideInHunk(hunk, side, selected), new Set(touched).add(hunk.index))
    setActiveHunk(hunk.index)
  }

  /** Pane checkbox: take (or drop) that whole side across every chunk. Either
   *  way the user has now made a call on every chunk. */
  const toggleWholeSide = (side: Side): void => {
    const on = !sideFullyPicked(hunks, side, selected)
    commit(toggleSideEverywhere(hunks, side, selected, on), new Set(hunks.map((h) => h.index)))
  }

  /** Back to square one: no picks, no hand edits. */
  const reset = (): void => {
    const fresh = assemble(hunks, oursContent, new Set())
    setSelected(new Set())
    setTouched(new Set())
    setEditOutput(fresh.text)
    setAssembled(fresh)
    setActiveHunk(0)
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

  const header = (
    <span className="fv-path" title={file}>
      <GitMerge size={14} style={{ marginRight: 6, flexShrink: 0 }} />
      {file.includes('/') ? <span className="fv-dir">{file.slice(0, file.lastIndexOf('/') + 1)}</span> : null}
      <strong>{file.split('/').pop()}</strong>
    </span>
  )

  if (content === null) {
    return (
      <div className="file-viewer conflict-resolver">
        <div className="fv-header">
          {header}
          <button className="icon-btn" title={t('common.close')} onClick={() => setConflictView(null)}>
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
          {header}
          <button className="icon-btn" title={t('common.close')} onClick={() => setConflictView(null)}>
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

  const commitLabel = (info: ConflictRefInfo | null): string | null => {
    if (!info?.sha) return null
    return info.branch
      ? interp(t('conflict.commitOn'), { sha: info.sha, branch: info.branch })
      : interp(t('conflict.commitOnly'), { sha: info.sha })
  }
  // `ours` is always the side you are on (rebase included: HEAD sits on the
  // target there), `theirs` the incoming branch/commit.
  const oursName = ctx?.target || hunks[0].oursLabel
  const theirsName = ctx?.source || hunks[0].theirsLabel

  return (
    <div className="file-viewer conflict-resolver conflict-editor">
      <div className="fv-header">
        {header}
        <span className="fv-chip conflict">
          {resolvedCount}/{hunks.length} {t('conflict.resolved')}
        </span>
        <div className="conflict-global-actions">
          {mergeTool && (
            <button
              className="btn ghost tiny"
              disabled={toolRunning || saving}
              title={interp(t('difftool.mergeHint'), { tool: mergeTool })}
              onClick={() => void runMergeTool()}
            >
              {toolRunning ? <Loader2 size={12} className="spin" /> : <ExternalLink size={12} />}{' '}
              {interp(t('difftool.openMerge'), { tool: mergeTool })}
            </button>
          )}
          {aiEnabled && (
            <button
              className="btn ghost tiny"
              disabled={aiResolving || saving}
              title={t('conflict.aiResolveHint')}
              onClick={() => void aiResolve()}
            >
              {aiResolving ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} {t('conflict.aiResolve')}
            </button>
          )}
          <button className="btn primary small" disabled={!allResolved || saving} onClick={() => void save()}>
            <Check size={13} /> {t('conflict.saveResolution')}
          </button>
        </div>
        <button className="icon-btn" title={t('common.close')} onClick={() => setConflictView(null)}>
          <X size={15} />
        </button>
      </div>

      <div className="conflict-split" ref={splitRef}>
        <div className="conflict-files" ref={filesRef} style={{ flex: `${filesRatio} 1 0` }}>
          <SideFile
            letter="A"
            name={oursName}
            commitLabel={commitLabel(ctx?.ours ?? null)}
            side="ours"
            content={oursContent}
            hunks={hunks}
            lang={lang}
            selected={selected}
            activeHunk={activeHunk}
            allPicked={sideFullyPicked(hunks, 'ours', selected)}
            somePicked={sidePartlyPicked(hunks, 'ours', selected)}
            bodyRef={oursPaneRef}
            style={{ flex: `${sideRatio} 1 0` }}
            onToggleLine={toggleLine}
            onToggleSide={toggleChunkSide}
            onToggleWholeSide={toggleWholeSide}
            chunkLabel={t('conflict.takeWholeSide')}
            sideLabel={t('conflict.takeAllOfSide')}
          />
          <ResizeHandle
            axis="x"
            value={Math.round((filesBox.w || 900) * sideRatio)}
            min={140}
            max={Math.max(200, (filesBox.w || 900) - 140)}
            onChange={(px) => setLayout({ conflictSideRatio: clampRatio(px / (filesBox.w || 900)) })}
          />
          <SideFile
            letter="B"
            name={theirsName}
            commitLabel={commitLabel(ctx?.theirs ?? null)}
            side="theirs"
            content={theirsContent}
            hunks={hunks}
            lang={lang}
            selected={selected}
            activeHunk={activeHunk}
            allPicked={sideFullyPicked(hunks, 'theirs', selected)}
            somePicked={sidePartlyPicked(hunks, 'theirs', selected)}
            bodyRef={theirsPaneRef}
            style={{ flex: `${1 - sideRatio} 1 0` }}
            onToggleLine={toggleLine}
            onToggleSide={toggleChunkSide}
            onToggleWholeSide={toggleWholeSide}
            chunkLabel={t('conflict.takeWholeSide')}
            sideLabel={t('conflict.takeAllOfSide')}
          />
        </div>

        <ResizeHandle
          axis="y"
          value={Math.round((splitBox.h || 600) * filesRatio)}
          min={120}
          max={Math.max(200, (splitBox.h || 600) - 120)}
          onChange={(px) => setLayout({ conflictFilesRatio: clampRatio(px / (splitBox.h || 600)) })}
        />

        <div className="conflict-output-pane" style={{ flex: `${1 - filesRatio} 1 0` }}>
          <div className="conflict-output-header">
            <span>{t('conflict.output')}</span>
            <div className="conflict-nav">
              <button
                className="icon-btn tiny"
                title={t('conflict.prevConflict')}
                disabled={hunks.length < 2}
                onClick={() => goToHunk(activeHunk - 1)}
              >
                <ChevronUp size={13} />
              </button>
              <span className="conflict-nav-label">
                {t('conflict.conflict')} {activeHunk + 1}/{hunks.length}
              </span>
              <button
                className="icon-btn tiny"
                title={t('conflict.nextConflict')}
                disabled={hunks.length < 2}
                onClick={() => goToHunk(activeHunk + 1)}
              >
                <ChevronDown size={13} />
              </button>
            </div>
            <span className="text-2 conflict-output-count">
              {outputLineCount} {t('conflict.lines')}
            </span>
            <button className="btn ghost tiny" title={t('conflict.resetHint')} onClick={reset}>
              <RotateCcw size={12} /> {t('conflict.reset')}
            </button>
          </div>
          <div className="conflict-output-code">
            <div ref={rowsRef} className="conflict-output-rows" aria-hidden="true">
              {Array.from({ length: outputLineCount }, (_, i) => {
                const m = marks[i]
                return <div key={i} className={m ? `cor ${m === 'edited' ? 'edited' : m.side}` : 'cor'} />
              })}
            </div>
            <div ref={gutterRef} className="conflict-output-gutter">
              {Array.from({ length: outputLineCount }, (_, i) => {
                const m = marks[i]
                const o = m === 'edited' ? null : m
                return (
                  <div key={i} className={m ? `cog ${m === 'edited' ? 'edited' : m.side}` : 'cog'}>
                    {m === 'edited' ? (
                      <span className="cog-side" title={t('conflict.editedLine')}>
                        <Pencil size={9} />
                      </span>
                    ) : o ? (
                      // The side letter doubles as "drop this line from the output".
                      <button
                        className="cog-side cog-drop"
                        title={t('conflict.dropLine')}
                        aria-label={t('conflict.dropLine')}
                        onClick={() => dropOutputLine(o)}
                      >
                        <span className="cog-letter">{o.side === 'ours' ? 'A' : 'B'}</span>
                        <Minus className="cog-x" size={11} />
                      </button>
                    ) : (
                      <span className="cog-side" />
                    )}
                    <span className="cog-no" aria-hidden="true">
                      {i + 1}
                    </span>
                  </div>
                )
              })}
            </div>
            <pre ref={highlightRef} className="conflict-output-highlight hljs" aria-hidden="true">
              <code dangerouslySetInnerHTML={{ __html: outputHtml }} />
            </pre>
            <textarea
              ref={editRef}
              className="conflict-output-editor"
              value={editOutput}
              onChange={(e) => handleEditChange(e.target.value)}
              onScroll={(e) => syncOutputScroll(e.currentTarget.scrollTop, e.currentTarget.scrollLeft)}
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
  letter,
  name,
  commitLabel,
  side,
  content,
  hunks,
  lang,
  selected,
  activeHunk,
  allPicked,
  somePicked,
  bodyRef,
  style,
  onToggleLine,
  onToggleSide,
  onToggleWholeSide,
  chunkLabel,
  sideLabel,
}: {
  letter: string
  name: string
  commitLabel: string | null
  side: Side
  content: string
  hunks: Hunk[]
  lang: string
  selected: Set<LineKey>
  activeHunk: number
  allPicked: boolean
  somePicked: boolean
  bodyRef: React.RefObject<HTMLDivElement>
  style?: React.CSSProperties
  onToggleLine: (hunkIdx: number, side: Side, lineIdx: number) => void
  onToggleSide: (hunk: Hunk, side: Side) => void
  onToggleWholeSide: (side: Side) => void
  chunkLabel: string
  sideLabel: string
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
    <div className={`conflict-file ${side}`} style={style}>
      <div className="conflict-file-head">
        <input
          type="checkbox"
          className="conflict-side-check"
          checked={allPicked}
          title={sideLabel}
          aria-label={sideLabel}
          ref={(el) => {
            if (el) el.indeterminate = somePicked && !allPicked
          }}
          onChange={() => onToggleWholeSide(side)}
        />
        <span className={`conflict-side-letter ${side}`}>{letter}</span>
        <span className="conflict-side-name" title={name}>
          {name}
        </span>
        {commitLabel && <span className="conflict-side-commit">{commitLabel}</span>}
      </div>
      <div className="conflict-file-body" ref={bodyRef}>
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
            const active = hunk.index === activeHunk
            return (
              <div key={i} className={active ? 'conflict-chunk active' : 'conflict-chunk'}>
                {isFirst && (
                  <div className="conflict-chunk-head" data-hunk={hunk.index}>
                    <input
                      type="checkbox"
                      checked={chunkAllOn(hunk)}
                      title={chunkLabel}
                      aria-label={chunkLabel}
                      onChange={() => onToggleSide(hunk, side)}
                    />
                  </div>
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
