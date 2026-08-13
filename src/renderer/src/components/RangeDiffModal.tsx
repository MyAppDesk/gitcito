import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Equal, History, Loader2, Minus, Pencil, Plus, RefreshCw } from 'lucide-react'
import type { RangeDiffEntry, RangeDiffKind, RefTip } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { RefPicker, type RefOption } from './RefPicker'
import { useT, interp } from '../i18n'

const ICON: Record<RangeDiffKind, typeof Plus> = {
  unchanged: Equal,
  modified: Pencil,
  removed: Minus,
  added: Plus
}

function timeAgo(unix: number): string {
  const d = Date.now() / 1000 - unix
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

/** Colour the interdiff by its leading marker, like a patch. */
function bodyLineClass(line: string): string {
  if (line.startsWith('@@')) return 'rd-hunk'
  if (line.startsWith('+')) return 'rd-add'
  if (line.startsWith('-')) return 'rd-del'
  if (line.startsWith('##')) return 'rd-section'
  return ''
}

/**
 * "What changed since I last looked" — `git range-diff` between two versions of
 * the same branch, with the previous positions read straight out of the reflog
 * so a rebase or a forced fetch needs no bookkeeping to be reviewable.
 */
export function RangeDiffModal({
  repoPath,
  branch,
  initialOld
}: {
  repoPath: string
  /** The ref whose two versions are being compared. Not named `ref`: React
   *  reserves that prop name and would never pass it through. */
  branch: string
  initialOld?: string
}): React.JSX.Element {
  const toast = useUIStore((s) => s.toast)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const t = useT()

  const [newRev, setNewRev] = useState(branch)
  const [oldRev, setOldRev] = useState(initialOld ?? '')
  const [base, setBase] = useState('')
  const [tips, setTips] = useState<RefTip[]>([])
  const [entries, setEntries] = useState<RangeDiffEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const refOptions = useMemo<RefOption[]>(() => {
    const out: RefOption[] = []
    for (const l of repo?.branches.locals ?? []) out.push({ value: l.name, kind: 'local' })
    for (const r of repo?.branches.remotes ?? []) out.push({ value: r.fullName, kind: 'remote' })
    for (const tg of repo?.branches.tags ?? []) out.push({ value: tg.name, kind: 'tag' })
    return out
  }, [repo?.branches])

  // Past positions of the ref being inspected. Entry 0 is where it is now, so
  // the interesting comparison starts at 1.
  useEffect(() => {
    let cancelled = false
    void gitApi.refTips(repoPath, newRev).then((list) => {
      if (cancelled) return
      setTips(list)
      setOldRev((cur) => cur || list[1]?.selector || '')
    })
    return () => {
      cancelled = true
    }
  }, [repoPath, newRev])

  const run = useCallback(
    async (old?: string) => {
      const from = (old ?? oldRev).trim()
      if (!from || !newRev.trim()) return
      setLoading(true)
      try {
        setEntries(await gitApi.rangeDiff(repoPath, from, newRev.trim(), base.trim() || undefined))
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
        setEntries(null)
      } finally {
        setLoading(false)
      }
    },
    [repoPath, oldRev, newRev, base, toast]
  )

  useEffect(() => {
    if (oldRev) void run(oldRev)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oldRev])

  const counts = useMemo(() => {
    const c = { unchanged: 0, modified: 0, removed: 0, added: 0 } as Record<RangeDiffKind, number>
    for (const e of entries ?? []) c[e.kind]++
    return c
  }, [entries])

  const toggle = (key: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="rd-root">
      <div className="rd-header">
        <div className="rd-header-top">
          <History size={15} className="rd-title-icon" />
          <h3>{t('rangeDiff.title')}</h3>
          <div className="rd-header-actions">
            <button className="btn primary small" disabled={loading} onClick={() => void run()}>
              {loading ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
              {t('rangeDiff.compare')}
            </button>
          </div>
        </div>

        <div className="rd-controls">
          <label className="rd-label">{t('rangeDiff.before')}</label>
          <RefPicker className="rd-ref" value={oldRev} options={refOptions} onChange={setOldRev} onCommit={(v) => void run(v)} />
          <ArrowRight size={13} className="rd-arrow" />
          <label className="rd-label">{t('rangeDiff.after')}</label>
          <RefPicker className="rd-ref" value={newRev} options={refOptions} onChange={setNewRev} onCommit={() => void run()} />
        </div>

        {tips.length > 1 && (
          <div className="rd-tips">
            <span className="rd-label">{t('rangeDiff.fromReflog')}</span>
            {tips.slice(1, 6).map((tip) => (
              <button
                key={tip.selector}
                className={`rd-tip ${oldRev === tip.selector ? 'active' : ''}`}
                title={`${tip.sha.slice(0, 10)} — ${tip.reason}`}
                onClick={() => setOldRev(tip.selector)}
              >
                <code>{tip.sha.slice(0, 7)}</code>
                <span className="rd-tip-reason">{tip.reason.replace(/:.*$/, '')}</span>
                <span className="rd-tip-date">{timeAgo(tip.date)}</span>
              </button>
            ))}
          </div>
        )}

        {entries && (
          <div className="rd-summary">
            <span className="rd-pill modified">{interp(t('rangeDiff.countModified'), { n: String(counts.modified) })}</span>
            <span className="rd-pill added">{interp(t('rangeDiff.countAdded'), { n: String(counts.added) })}</span>
            <span className="rd-pill removed">{interp(t('rangeDiff.countRemoved'), { n: String(counts.removed) })}</span>
            <span className="rd-pill unchanged">
              {interp(t('rangeDiff.countUnchanged'), { n: String(counts.unchanged) })}
            </span>
            <input
              className="modal-input rd-base"
              value={base}
              spellCheck={false}
              placeholder={t('rangeDiff.basePlaceholder')}
              onChange={(e) => setBase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void run()
              }}
            />
          </div>
        )}
      </div>

      {loading && !entries ? (
        <div className="rd-loading">
          <Loader2 size={20} className="spin" />
        </div>
      ) : (
        <div className="rd-list">
          {!entries ? null : entries.length === 0 ? (
            <div className="rd-empty">{t('rangeDiff.empty')}</div>
          ) : (
            entries.map((e, i) => {
              const key = `${e.oldSha ?? '-'}:${e.newSha ?? '-'}:${i}`
              const Icon = ICON[e.kind]
              const open = expanded.has(key)
              return (
                <div key={key} className={`rd-row-wrap ${e.kind}`}>
                  <div
                    className="rd-row"
                    onClick={() => e.body && toggle(key)}
                    role={e.body ? 'button' : undefined}
                  >
                    <span className={`rd-icon ${e.kind}`}>
                      <Icon size={12} />
                    </span>
                    <code className={`rd-sha ${e.oldSha ? '' : 'none'}`}>{e.oldSha?.slice(0, 7) ?? '—'}</code>
                    <ArrowRight size={11} className="rd-row-arrow" />
                    <code className={`rd-sha ${e.newSha ? '' : 'none'}`}>{e.newSha?.slice(0, 7) ?? '—'}</code>
                    <span className="rd-subject" title={e.subject}>
                      {e.subject}
                    </span>
                    <span className={`rd-kind ${e.kind}`}>{t(`rangeDiff.kind.${e.kind}` as 'rangeDiff.kind.added')}</span>
                  </div>
                  {open && (
                    <pre className="rd-body">
                      {e.body.split('\n').map((line, li) => (
                        <div key={li} className={bodyLineClass(line)}>
                          {line || ' '}
                        </div>
                      ))}
                    </pre>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
