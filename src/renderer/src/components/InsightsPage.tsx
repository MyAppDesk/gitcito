import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, RefreshCw, GitCommit, Users, Flame, FileText } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import type { RepoInsights } from '../../../shared/types'
import { useT } from '../i18n'

const RANGES: { label: string; days: number }[] = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: 0 }
]

const AUTHOR_COLORS = ['#6c5ce7', '#00b894', '#0984e3', '#e17055', '#fdcb6e', '#e84393', '#00cec9', '#a29bfe']

function fmt(n: number): string {
  return n.toLocaleString()
}

export function InsightsPage({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const setFileView = useUIStore((s) => s.setFileView)
  const repoName = useRepoStore((s) => s.repos[repoPath]?.name ?? repoPath.split('/').pop())
  const [days, setDays] = useState(90)
  const [data, setData] = useState<RepoInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    gitApi
      .repoInsights(repoPath, days)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && toast('error', err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [repoPath, days, toast])

  const maxAuthorCommits = useMemo(() => Math.max(1, ...(data?.authors ?? []).map((a) => a.commits)), [data])
  const maxHotspot = useMemo(() => Math.max(1, ...(data?.hotspots ?? []).map((h) => h.commits)), [data])
  const maxChurn = useMemo(
    () => Math.max(1, ...(data?.churn ?? []).map((c) => c.added + c.removed)),
    [data]
  )

  const totalAdded = useMemo(() => (data?.authors ?? []).reduce((s, a) => s + a.added, 0), [data])
  const totalRemoved = useMemo(() => (data?.authors ?? []).reduce((s, a) => s + a.removed, 0), [data])

  const span = data && data.first && data.last ? Math.max(1, Math.round((data.last - data.first) / 86400)) : 0
  const perDay = data && span ? (data.totalCommits / span).toFixed(1) : '0'

  return (
    <div className="changelog-page">
      <motion.div
        className="changelog-inner insights"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <header className="changelog-header">
          <div className="changelog-title">
            <BarChart3 size={20} />
            <div>
              <h1>{t('insights.title')}</h1>
              <span className="settings-hint">{repoName} {t('insights.subtitle')}</span>
            </div>
          </div>
        </header>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <div className="codesearch-tabs" style={{ margin: 0 }}>
            {RANGES.map((r) => (
              <button key={r.days} className={`codesearch-tab ${days === r.days ? 'active' : ''}`} onClick={() => setDays(r.days)}>
                {r.label}
              </button>
            ))}
          </div>
          <button className="btn ghost small" onClick={() => setDays((d) => d)} disabled={loading} style={{ marginLeft: 'auto' }}>
            <RefreshCw size={13} className={loading ? 'spin' : undefined} /> {loading ? t('insights.loading') : t('insights.refresh')}
          </button>
        </div>

        {!data || data.totalCommits === 0 ? (
          <p className="settings-hint">{loading ? t('insights.crunching') : t('insights.noCommits')}</p>
        ) : (
          <>
            {/* ── Summary cards ── */}
            <div className="insights-cards">
              <div className="insights-card">
                <GitCommit size={15} />
                <span className="insights-card-num">{fmt(data.totalCommits)}</span>
                <span className="insights-card-label">{t('insights.commits')} · {perDay}/day</span>
              </div>
              <div className="insights-card">
                <Users size={15} />
                <span className="insights-card-num">{fmt(data.authors.length)}</span>
                <span className="insights-card-label">{t('insights.contributors')}</span>
              </div>
              <div className="insights-card">
                <FileText size={15} />
                <span className="insights-card-num">{fmt(data.filesTouched)}</span>
                <span className="insights-card-label">{t('insights.filesTouched')}</span>
              </div>
              <div className="insights-card">
                <Flame size={15} />
                <span className="insights-card-num">
                  <span className="ins-add">+{fmt(totalAdded)}</span> <span className="ins-del">−{fmt(totalRemoved)}</span>
                </span>
                <span className="insights-card-label">{t('insights.linesChanged')}</span>
              </div>
            </div>

            {/* ── Churn timeline ── */}
            <section className="insights-section">
              <h2>{t('insights.weeklyChurn')}</h2>
              <div className="churn-chart">
                {data.churn.map((c) => {
                  const h = ((c.added + c.removed) / maxChurn) * 100
                  const addRatio = c.added + c.removed > 0 ? c.added / (c.added + c.removed) : 0
                  return (
                    <div
                      key={c.week}
                      className="churn-bar"
                      title={`Week of ${c.week}\n+${fmt(c.added)} −${fmt(c.removed)} · ${c.commits} commit${c.commits === 1 ? '' : 's'}`}
                    >
                      <span className="churn-add" style={{ height: `${h * addRatio}%` }} />
                      <span className="churn-del" style={{ height: `${h * (1 - addRatio)}%` }} />
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="insights-cols">
              {/* ── Top authors ── */}
              <section className="insights-section">
                <h2>{t('insights.topContributors')}</h2>
                <div className="insights-rows">
                  {data.authors.slice(0, 12).map((a, i) => (
                    <div key={a.name} className="insights-row">
                      <span className="insights-row-name" title={a.name}>
                        {a.name}
                      </span>
                      <div className="insights-bar-track">
                        <span
                          className="insights-bar-fill"
                          style={{ width: `${(a.commits / maxAuthorCommits) * 100}%`, background: AUTHOR_COLORS[i % AUTHOR_COLORS.length] }}
                        />
                      </div>
                      <span className="insights-row-val">
                        {fmt(a.commits)} <span className="ins-add">+{fmt(a.added)}</span> <span className="ins-del">−{fmt(a.removed)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Hotspots ── */}
              <section className="insights-section">
                <h2>{t('insights.hotspots')}</h2>
                <div className="insights-rows">
                  {data.hotspots.map((h) => (
                    <button
                      key={h.path}
                      className="insights-row hotspot"
                      title={`${h.path}\n${h.commits} commits · +${fmt(h.added)} −${fmt(h.removed)}`}
                      onClick={() => setFileView({ repoPath, file: h.path, source: { type: 'tree' }, mode: 'history' })}
                    >
                      <span className="insights-row-name mono">{h.path}</span>
                      <div className="insights-bar-track">
                        <span className="insights-bar-fill hot" style={{ width: `${(h.commits / maxHotspot) * 100}%` }} />
                      </div>
                      <span className="insights-row-val">{fmt(h.commits)}×</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
