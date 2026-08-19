import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  DownloadCloud,
  Loader2,
  RefreshCw,
  Users
} from 'lucide-react'
import type { MergeRiskKind, TeammateRadarEntry, TeammateRadarResult } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import { useT, t as tr, interp } from '../i18n'

function riskIcon(risk: MergeRiskKind): React.JSX.Element {
  if (risk === 'conflict') return <AlertTriangle size={13} />
  if (risk === 'error') return <CircleSlash size={13} />
  return <Check size={13} />
}

function timeLabel(sec: number): string {
  const diff = Date.now() - sec * 1000
  const m = Math.round(diff / 60000)
  if (m < 1) return tr('time.justNow')
  if (m < 60) return interp(tr('time.minutesAgo'), { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return interp(tr('time.hoursAgo'), { n: h })
  return new Date(sec * 1000).toLocaleDateString()
}

export function TeammateRadarModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const openModal = useUIStore((s) => s.openModal)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const patch = useRepoStore((s) => s.patch)

  const [result, setResult] = useState<TeammateRadarResult | null>(repo?.teammateRadar ?? null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const scan = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const r = await gitApi.teammateRadar(repoPath)
      setResult(r)
      // Kept on the repo so the post-fetch sweep can diff against this scan.
      patch(repoPath, { teammateRadar: r })
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [repoPath, patch, toast])

  // Scan on open: the data is whatever the last fetch brought, so it is cheap
  // and always as fresh as the refs themselves.
  useEffect(() => {
    void scan()
  }, [scan])

  const fetchAndScan = async (): Promise<void> => {
    setFetching(true)
    try {
      await repoActions.fetchAll(repoPath)
      await scan()
    } finally {
      setFetching(false)
    }
  }

  const toggle = (ref: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(ref)) next.delete(ref)
      else next.add(ref)
      return next
    })

  const compare = (e: TeammateRadarEntry): void => {
    const current = repo?.branches.current || 'HEAD'
    openModal({ kind: 'branch-compare', repoPath, branchA: e.ref, branchB: current })
  }

  const entries = result?.entries ?? []
  const busy = loading || fetching

  return (
    <div className="radar-root">
      <div className="radar-header">
        <div className="radar-header-top">
          <Users size={15} className="radar-title-icon" />
          <h3>{t('teamRadar.title')}</h3>
          <div className="radar-header-actions">
            <button className="btn ghost small" onClick={() => void fetchAndScan()} disabled={busy}>
              {fetching ? <Loader2 size={13} className="spin" /> : <DownloadCloud size={13} />}
              {t('teamRadar.fetchScan')}
            </button>
            <button className="btn primary small" onClick={() => void scan()} disabled={busy}>
              {loading ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
              {t('teamRadar.scan')}
            </button>
          </div>
        </div>
        <p className="settings-hint">{t('teamRadar.intro')}</p>
        {result && result.dirtyCount === 0 && <p className="settings-hint">{t('teamRadar.cleanHint')}</p>}
      </div>

      {busy && !result ? (
        <div className="radar-loading">
          <Loader2 size={20} className="spin" />
        </div>
      ) : (
        <div className="radar-body">
          <div className="radar-list">
            {entries.length === 0 ? (
              <div className="radar-empty">{t('teamRadar.empty')}</div>
            ) : (
              entries.map((e) => {
                const open = expanded.has(e.ref)
                const hasDetail = e.overlap.length > 0 || e.conflictFiles.length > 0
                return (
                  <div key={e.ref} className={`radar-row-wrap ${e.risk}`}>
                    <div
                      className="radar-row"
                      onClick={() => hasDetail && toggle(e.ref)}
                      role={hasDetail ? 'button' : undefined}
                    >
                      <span className="radar-chevron">
                        {hasDetail ? open ? <ChevronDown size={12} /> : <ChevronRight size={12} /> : null}
                      </span>
                      <span className={`radar-dot ${e.risk}`}>{riskIcon(e.risk)}</span>
                      <span className="radar-ref" title={e.ref}>
                        {e.ref}
                        <span className="teamradar-meta">
                          {e.author} · {timeLabel(e.time)} ·{' '}
                          {interp(t('teamRadar.ahead'), { n: e.ahead })} ·{' '}
                          {interp(t('teamRadar.touches'), { n: e.filesTouched })}
                        </span>
                      </span>
                      {e.overlap.length > 0 && (
                        <span className="teamradar-overlap" title={e.overlap.join('\n')}>
                          {interp(t('teamRadar.overlap'), { n: e.overlap.length })}
                        </span>
                      )}
                      <span className={`radar-status ${e.risk}`}>
                        {e.risk === 'conflict'
                          ? interp(t('radar.conflictFiles'), { n: String(e.conflictFiles.length) })
                          : t(`radar.status.${e.risk}` as 'radar.status.clean')}
                      </span>
                      <button
                        className="btn ghost small radar-compare"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          compare(e)
                        }}
                      >
                        {t('radar.compare')}
                      </button>
                    </div>
                    {open && (
                      <div className="radar-detail">
                        {e.overlap.length > 0 && (
                          <>
                            <div className="teamradar-detail-title">{t('teamRadar.overlapTitle')}</div>
                            {e.overlap.map((f) => (
                              <div key={f} className="radar-file teamradar-overlap-file" title={f}>
                                {f}
                              </div>
                            ))}
                          </>
                        )}
                        {e.conflictFiles.length > 0 && (
                          <>
                            <div className="teamradar-detail-title">{t('teamRadar.conflictTitle')}</div>
                            {e.conflictFiles.map((f) => (
                              <div key={f} className="radar-file" title={f}>
                                {f}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
