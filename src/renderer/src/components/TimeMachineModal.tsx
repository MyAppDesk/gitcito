import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, FileText, Folder, Loader2 } from 'lucide-react'
import type { FileEntry, TreeEntry } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { guessLanguage, highlightLine } from '../lib/highlight'
import { isSecretFile, maskSecretLine } from '../lib/secrets'
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'

/** How long the scrubber waits after the last move before hitting git. */
const SCRUB_DEBOUNCE_MS = 120
/** Files past this are shown truncated — this is a scrubber, not an editor. */
const MAX_PREVIEW_LINES = 2000

function timeAgo(unix: number): string {
  const d = Date.now() / 1000 - unix
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 86400 * 365) return `${Math.floor(d / 86400)}d ago`
  return `${Math.floor(d / 86400 / 365)}y ago`
}

/**
 * Time Machine — drag a slider across the history and watch the repository
 * itself change: the file tree and the file you are reading are rendered from
 * whatever the commit under the handle contains.
 *
 * Everything is read from the object database (`ls-tree` / `show`), so no
 * checkout happens, HEAD never moves and the working tree is never touched —
 * you can scrub through a year of history with uncommitted work in place.
 */
export function TimeMachineModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const repo = useRepoStore((s) => s.repos[repoPath])
  const setFileView = useUIStore((s) => s.setFileView)
  const closeModal = useUIStore((s) => s.closeModal)
  const maskSecrets = useSettingsStore((s) => s.settings.maskSecrets)
  const t = useT()

  const commits = repo?.commits ?? []
  // Slider runs oldest → newest, left to right, the way a timeline reads.
  const [slider, setSlider] = useState(Math.max(0, commits.length - 1))
  const index = Math.max(0, commits.length - 1 - slider)
  const commit = commits[index]

  const [dir, setDir] = useState('')
  const [entries, setEntries] = useState<TreeEntry[] | null>(null)
  const [file, setFile] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The commit actually being read, updated after the scrub settles so dragging
  // the handle doesn't fire one git call per pixel.
  const [ref, setRef] = useState(commit?.hash ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!commit) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => setRef(commit.hash), SCRUB_DEBOUNCE_MS)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [commit?.hash])

  // The tree at this commit, for the folder we're standing in.
  useEffect(() => {
    if (!ref) return
    let cancelled = false
    setLoading(true)
    gitApi
      .listDirAt(repoPath, ref, dir)
      .then((list) => {
        if (cancelled) return
        setEntries(list)
        setError(null)
      })
      .catch((err) => {
        // Showing the real reason beats an empty tree that looks like a repo
        // with no files in it.
        if (cancelled) return
        setEntries([])
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [repoPath, ref, dir])

  // Which files this commit changed, so the tree can mark them.
  useEffect(() => {
    if (!ref) return
    let cancelled = false
    gitApi
      .commitFiles(repoPath, ref)
      .then((files: FileEntry[]) => !cancelled && setTouched(new Set(files.map((f) => f.path))))
      .catch(() => !cancelled && setTouched(new Set()))
    return () => {
      cancelled = true
    }
  }, [repoPath, ref])

  // The selected file, as it was at this commit. Keeping the selection when it
  // doesn't exist yet is deliberate: scrub forward and it comes back.
  useEffect(() => {
    if (!ref || !file) {
      setContent(null)
      setMissing(false)
      return
    }
    let cancelled = false
    gitApi
      .fileContent(repoPath, file, ref)
      .then((text) => {
        if (cancelled) return
        setContent(text)
        setMissing(false)
      })
      .catch(() => {
        if (cancelled) return
        setContent(null)
        setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [repoPath, ref, file])

  const step = useCallback(
    (delta: number) => setSlider((v) => Math.min(commits.length - 1, Math.max(0, v + delta))),
    [commits.length]
  )

  // ←/→ walk one commit, ⇧ jumps ten, Home/End go to the ends.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft') step(e.shiftKey ? -10 : -1)
      else if (e.key === 'ArrowRight') step(e.shiftKey ? 10 : 1)
      else if (e.key === 'Home') setSlider(0)
      else if (e.key === 'End') setSlider(commits.length - 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, commits.length])

  const lines = useMemo(() => {
    if (content === null) return []
    const lang = guessLanguage(file ?? '')
    const mask = maskSecrets && file ? isSecretFile(file) : false
    return content
      .split('\n')
      .slice(0, MAX_PREVIEW_LINES)
      .map((line) => highlightLine(mask ? maskSecretLine(line) : line, lang))
  }, [content, file, maskSecrets])

  const crumbs = dir ? dir.split('/') : []

  if (!commit) {
    return <div className="tm-empty">{t('timeMachine.noHistory')}</div>
  }

  return (
    <div className="tm-root">
      <div className="tm-header">
        <div className="tm-header-top">
          <Clock size={15} className="tm-title-icon" />
          <h3>{t('timeMachine.title')}</h3>
          <span className="tm-position">
            {interp(t('timeMachine.position'), { n: String(index + 1), total: String(commits.length) })}
          </span>
          <div className="tm-header-actions">
            <button
              className="btn ghost small"
              title={t('timeMachine.copySha')}
              onClick={() => void navigator.clipboard.writeText(commit.hash)}
            >
              <Copy size={13} />
            </button>
            <button
              className="btn ghost small"
              disabled={!file || missing}
              onClick={() => {
                if (!file) return
                setFileView({ repoPath, file, source: { type: 'commit', hash: commit.hash }, mode: 'file' })
                closeModal()
              }}
            >
              <ExternalLink size={13} /> {t('timeMachine.openHere')}
            </button>
          </div>
        </div>

        <div className="tm-scrub">
          <button
            className="btn ghost icon-only tm-step"
            title={t('timeMachine.older')}
            disabled={slider === 0}
            onClick={() => step(-1)}
          >
            <ChevronLeft size={14} />
          </button>
          <input
            className="tm-slider"
            type="range"
            min={0}
            max={Math.max(0, commits.length - 1)}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
          />
          <button
            className="btn ghost icon-only tm-step"
            title={t('timeMachine.newer')}
            disabled={slider >= commits.length - 1}
            onClick={() => step(1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="tm-commit">
          <code className="tm-sha">{commit.hash.slice(0, 7)}</code>
          <span className="tm-subject" title={commit.subject}>
            {commit.subject}
          </span>
          <span className="tm-author">{commit.author}</span>
          <span className="tm-date">{timeAgo(commit.date)}</span>
          {touched.size > 0 && (
            <span className="tm-touched">{interp(t('timeMachine.changed'), { n: String(touched.size) })}</span>
          )}
        </div>
      </div>

      <div className="tm-body">
        <div className="tm-tree">
          <div className="tm-crumbs">
            <button className="tm-crumb" onClick={() => setDir('')}>
              {repo?.name ?? '/'}
            </button>
            {crumbs.map((seg, i) => (
              <span key={`${seg}:${i}`} className="tm-crumb-wrap">
                <ChevronRight size={11} className="tm-crumb-sep" />
                <button className="tm-crumb" onClick={() => setDir(crumbs.slice(0, i + 1).join('/'))}>
                  {seg}
                </button>
              </span>
            ))}
          </div>
          <div className="tm-entries">
            {loading && !entries ? (
              <div className="tm-loading">
                <Loader2 size={16} className="spin" />
              </div>
            ) : error ? (
              <div className="tm-error">{error}</div>
            ) : entries && entries.length === 0 ? (
              <div className="tm-empty-dir">{t('timeMachine.emptyDir')}</div>
            ) : (
              entries?.map((e) => (
                <div
                  key={e.path}
                  className={`tm-entry ${e.path === file ? 'active' : ''} ${touched.has(e.path) ? 'touched' : ''}`}
                  onClick={() => (e.dir ? setDir(e.path) : setFile(e.path))}
                  title={e.path}
                >
                  {e.dir ? <Folder size={12} className="tm-entry-icon dir" /> : <FileText size={12} className="tm-entry-icon" />}
                  <span className="tm-entry-name">{e.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="tm-preview">
          {!file ? (
            <div className="tm-hint">{t('timeMachine.pickFile')}</div>
          ) : missing ? (
            <div className="tm-hint">{interp(t('timeMachine.notYet'), { file })}</div>
          ) : content === null ? (
            <div className="tm-loading">
              <Loader2 size={16} className="spin" />
            </div>
          ) : (
            <pre className="tm-code">
              {lines.map((html, i) => (
                <div className="tm-line" key={i}>
                  <span className="tm-line-no">{i + 1}</span>
                  <span className="tm-line-text" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
