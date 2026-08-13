import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Archive,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Download,
  FileEdit,
  FilePlus,
  FolderGit2,
  Gauge,
  GitCommitHorizontal,
  GitPullRequest,
  Loader2,
  RefreshCw
} from 'lucide-react'
import type { RepoDetail, RepoPulse } from '../../../shared/types'
import { tabRepos } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore, repoActions } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import {
  activityTotal,
  bulkTargets,
  orderPulses,
  pulseTotals,
  pulseVerdict,
  sparklinePoints,
  type PulseLevel,
  type PulseSort
} from '../lib/missionControl'
import { useT, interp } from '../i18n'

/** How often the dashboard re-reads the repos while it is on screen. */
const AUTO_REFRESH_MS = 30_000

interface Row {
  path: string
  /** Group tab this repo belongs to, when it isn't a standalone tab. */
  group: string | null
  tabId: string
}

function timeAgo(unix: number): string {
  if (!unix) return '—'
  const d = Date.now() / 1000 - unix
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  if (d < 86400 * 30) return `${Math.floor(d / 86400)}d`
  return `${Math.floor(d / 86400 / 30)}mo`
}

const LEVEL_ICON: Record<PulseLevel, typeof CircleCheck> = {
  blocked: AlertTriangle,
  action: ArrowUpFromLine,
  pending: FileEdit,
  clean: CircleCheck
}

const SORTS: PulseSort[] = ['urgency', 'name', 'activity']

/** A fortnight of commits as a tiny line — drawn inline, so it costs no library. */
function Sparkline({ values }: { values: number[] }): React.JSX.Element | null {
  const points = sparklinePoints(values, 54, 14)
  if (!points) return null
  return (
    <svg className="mc-spark" viewBox="0 0 54 14" width={54} height={14} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Mission Control — every repository of the active workspace at a glance,
 * ordered by what needs you: something stuck mid-rebase first, then work to
 * pull or push, then dirty trees, then the quiet ones.
 *
 * Reading is local only (one `git status` per repo, no network), so opening
 * this never authenticates or hits a host. Fetching is always an explicit act.
 */
export function MissionControlPage(): React.JSX.Element {
  const tabs = useSettingsStore((s) => s.settings.tabs)
  const setActiveTab = useSettingsStore((s) => s.setActiveTab)
  const setGroupActiveRepo = useSettingsStore((s) => s.setGroupActiveRepo)
  // Tabs belong to the active workspace, so this dashboard is inherently
  // per-workspace: switching workspaces swaps the whole tab strip, this view
  // included. Naming it makes that obvious rather than implicit.
  const workspace = useSettingsStore(
    (s) => (s.settings.workspaces ?? []).find((w) => w.id === s.settings.activeWorkspaceId)?.name ?? ''
  )
  const repos = useRepoStore((s) => s.repos)
  const toast = useUIStore((s) => s.toast)
  const setMissionOpen = useUIStore((s) => s.setMissionOpen)
  const t = useT()

  const [pulses, setPulses] = useState<Record<string, RepoPulse>>({})
  const [details, setDetails] = useState<Record<string, RepoDetail>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [level, setLevel] = useState<PulseLevel | null>(null)
  const [sort, setSort] = useState<PulseSort>('urgency')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)
  const [refreshedAt, setRefreshedAt] = useState(0)
  const filterRef = useRef<HTMLInputElement>(null)

  // Every repository across standalone tabs and groups, de-duplicated: the same
  // folder opened twice is still one repository.
  const rows = useMemo<Row[]>(() => {
    const seen = new Set<string>()
    const out: Row[] = []
    for (const tab of tabs) {
      if (tab.kind === 'page') continue
      for (const r of tabRepos(tab)) {
        if (seen.has(r.path)) continue
        seen.add(r.path)
        out.push({ path: r.path, group: tab.kind === 'group' ? tab.name : null, tabId: tab.id })
      }
    }
    return out
  }, [tabs])

  const refresh = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      const results = await Promise.all(
        rows.map((r) =>
          gitApi.repoPulse(r.path).catch(
            (err): RepoPulse => ({
              path: r.path,
              name: r.path.split('/').pop() ?? r.path,
              branch: '',
              upstream: null,
              ahead: 0,
              behind: 0,
              staged: 0,
              unstaged: 0,
              untracked: 0,
              conflicted: 0,
              stashes: 0,
              lastCommitAt: 0,
              operation: null,
              activity: [],
              error: err instanceof Error ? err.message : String(err)
            })
          )
        )
      )
      setPulses(Object.fromEntries(results.map((p) => [p.path, p])))
      setRefreshedAt(Date.now())
      setLoading(false)
    },
    [rows]
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Keep it live while it is on screen: a dashboard that goes stale while you
  // work in another window is worse than no dashboard.
  useEffect(() => {
    const id = setInterval(() => void refresh({ silent: true }), AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const ordered = useMemo(() => {
    const list = rows.map((r) => pulses[r.path]).filter(Boolean)
    const q = filter.trim().toLowerCase()
    const matched = list.filter((p) => {
      if (level && pulseVerdict(p).level !== level) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q) || p.branch.toLowerCase().includes(q)
    })
    return orderPulses(matched, sort)
  }, [rows, pulses, filter, level, sort])

  const totals = useMemo(() => pulseTotals(Object.values(pulses)), [pulses])
  const grand = useMemo(() => {
    const all = Object.values(pulses)
    return {
      ahead: all.reduce((n, p) => n + p.ahead, 0),
      behind: all.reduce((n, p) => n + p.behind, 0),
      dirty: all.filter((p) => p.staged + p.unstaged + p.untracked > 0).length,
      commits: all.reduce((n, p) => n + activityTotal(p), 0)
    }
  }, [pulses])

  const open = useCallback(
    (path: string): void => {
      const row = rows.find((r) => r.path === path)
      if (!row) return
      setActiveTab(row.tabId)
      if (row.group) setGroupActiveRepo(row.tabId, path)
      setMissionOpen(false)
    },
    [rows, setActiveTab, setGroupActiveRepo, setMissionOpen]
  )

  const run = useCallback(
    async (paths: string[], op: 'fetch' | 'pull'): Promise<void> => {
      if (!paths.length) return
      setBusy(paths.length === 1 ? paths[0] : '*')
      try {
        if (paths.length > 1) {
          await repoActions.batch(paths, op)
        } else {
          // A repo listed here may never have been opened this session.
          await useRepoStore.getState().ensure(paths[0])
          if (op === 'fetch') await repoActions.fetchAll(paths[0])
          else await repoActions.pull(paths[0], 'default')
        }
        await refresh({ silent: true })
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    },
    [refresh, toast]
  )

  const toggleExpanded = useCallback(
    (path: string): void => {
      setExpanded((cur) => {
        const next = cur === path ? null : path
        // Detail is fetched only for the row actually opened, and kept after.
        if (next && !details[next]) {
          void gitApi
            .repoDetail(next)
            .then((d) => setDetails((prev) => ({ ...prev, [next]: d })))
            .catch(() => undefined)
        }
        return next
      })
    },
    [details]
  )

  const toggleSelected = (path: string): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  // ── Keyboard: walk the list, act on the focused row ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if (e.key === '/' && !typing) {
        e.preventDefault()
        filterRef.current?.focus()
        return
      }
      if (typing) return
      const row = ordered[cursor]
      if (e.key === 'ArrowDown' || e.key === 'j') setCursor((c) => Math.min(ordered.length - 1, c + 1))
      else if (e.key === 'ArrowUp' || e.key === 'k') setCursor((c) => Math.max(0, c - 1))
      else if (e.key === 'Enter' && row) open(row.path)
      else if (e.key === 'f' && row) void run([row.path], 'fetch')
      else if (e.key === 'p' && row) void run([row.path], 'pull')
      else if (e.key === ' ' && row) toggleExpanded(row.path)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ordered, cursor, open, run, toggleExpanded])

  useEffect(() => {
    if (cursor > ordered.length - 1) setCursor(Math.max(0, ordered.length - 1))
  }, [ordered.length, cursor])

  const bulk = useMemo(() => bulkTargets(ordered.filter((p) => selected.has(p.path))), [ordered, selected])

  const levelChip = (kind: PulseLevel, label: string): React.JSX.Element | null =>
    totals[kind] === 0 && kind !== 'clean' ? null : (
      <button
        className={`mc-pill ${kind} ${level === kind ? 'on' : ''}`}
        onClick={() => setLevel((cur) => (cur === kind ? null : kind))}
      >
        {interp(label, { n: String(totals[kind]) })}
      </button>
    )

  return (
    <div className="mc-root">
      <div className="mc-header">
        <Gauge size={16} className="mc-title-icon" />
        <h2>{t('mission.title')}</h2>
        {workspace && <span className="mc-workspace">{workspace}</span>}
        <span className="mc-repos">{interp(t('mission.repos'), { n: String(rows.length) })}</span>
        <span className="mc-summary">
          {levelChip('blocked', t('mission.blocked'))}
          {levelChip('action', t('mission.action'))}
          {levelChip('pending', t('mission.pending'))}
          {levelChip('clean', t('mission.clean'))}
        </span>
        <input
          ref={filterRef}
          className="modal-input mc-filter"
          value={filter}
          placeholder={t('mission.filter')}
          spellCheck={false}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setFilter('')
              e.currentTarget.blur()
            }
          }}
        />
        <div className="mc-sorts">
          {SORTS.map((s) => (
            <button key={s} className={`mc-sort ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>
              {t(`mission.sort.${s}` as 'mission.sort.urgency')}
            </button>
          ))}
        </div>
        <button
          className="btn ghost small"
          disabled={busy !== null}
          onClick={() => void run(bulkTargets(ordered).fetchable, 'fetch')}
        >
          {busy === '*' ? <Loader2 size={13} className="spin" /> : <Download size={13} />} {t('mission.fetchAll')}
        </button>
        <button className="btn ghost small" disabled={loading} onClick={() => void refresh()}>
          <RefreshCw size={13} /> {t('mission.refresh')}
        </button>
      </div>

      <div className="mc-stats">
        <span className="mc-stat">
          <ArrowUpFromLine size={11} /> {interp(t('mission.totalAhead'), { n: String(grand.ahead) })}
        </span>
        <span className="mc-stat">
          <ArrowDownToLine size={11} /> {interp(t('mission.totalBehind'), { n: String(grand.behind) })}
        </span>
        <span className="mc-stat">
          <FileEdit size={11} /> {interp(t('mission.totalDirty'), { n: String(grand.dirty) })}
        </span>
        <span className="mc-stat">
          <GitCommitHorizontal size={11} /> {interp(t('mission.totalCommits'), { n: String(grand.commits) })}
        </span>
        <span className="mc-stat mc-stat-right">
          {refreshedAt ? interp(t('mission.updated'), { t: timeAgo(refreshedAt / 1000) }) : ''}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="mc-bulk">
          <span className="mc-bulk-count">{interp(t('mission.selected'), { n: String(selected.size) })}</span>
          <button className="btn ghost small" disabled={busy !== null} onClick={() => void run(bulk.fetchable, 'fetch')}>
            <Download size={12} /> {t('mission.fetchSelected')}
          </button>
          <button
            className="btn ghost small"
            disabled={busy !== null || bulk.pullable.length === 0}
            onClick={() => void run(bulk.pullable, 'pull')}
          >
            <ArrowDownToLine size={12} /> {interp(t('mission.pullSelected'), { n: String(bulk.pullable.length) })}
          </button>
          <button className="btn ghost small" onClick={() => setSelected(new Set())}>
            {t('mission.clearSelection')}
          </button>
        </div>
      )}

      {loading && ordered.length === 0 ? (
        <div className="mc-loading">
          <Loader2 size={22} className="spin" />
        </div>
      ) : ordered.length === 0 ? (
        <div className="mc-empty">{filter.trim() || level ? t('mission.noMatch') : t('mission.empty')}</div>
      ) : (
        <div className="mc-list">
          {ordered.map((p, i) => {
            const verdict = pulseVerdict(p)
            const Icon = LEVEL_ICON[verdict.level]
            const row = rows.find((r) => r.path === p.path)
            const prs = repos[p.path]?.prs?.length ?? 0
            const isOpen = expanded === p.path
            const detail = details[p.path]
            return (
              <div key={p.path} className={`mc-row-wrap ${i === cursor ? 'cursor' : ''}`}>
                <div
                  className={`mc-row ${verdict.level}`}
                  onClick={() => setCursor(i)}
                  onDoubleClick={() => open(p.path)}
                >
                  <input
                    type="checkbox"
                    className="mc-check"
                    checked={selected.has(p.path)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelected(p.path)}
                  />
                  <button
                    className="mc-expand"
                    title={t('mission.details')}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(p.path)
                    }}
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <span className={`mc-level ${verdict.level}`}>
                    <Icon size={14} />
                  </span>
                  <div className="mc-ident">
                    <span className="mc-name" title={p.path}>
                      {p.name}
                    </span>
                    <span className="mc-where">
                      {row?.group && <span className="mc-group">{row.group}</span>}
                      <span className="mc-branch">{p.branch || t('mission.detached')}</span>
                      {p.upstream && <span className="mc-upstream">→ {p.upstream}</span>}
                    </span>
                  </div>

                  {p.error ? (
                    <span className="mc-error" title={p.error}>
                      {p.error}
                    </span>
                  ) : (
                    <div className="mc-badges">
                      {p.operation && <span className="mc-badge blocked">{p.operation}</span>}
                      {p.conflicted > 0 && (
                        <span className="mc-badge blocked">
                          <AlertTriangle size={11} /> {p.conflicted}
                        </span>
                      )}
                      {p.behind > 0 && (
                        <span className="mc-badge behind">
                          <ArrowDownToLine size={11} /> {p.behind}
                        </span>
                      )}
                      {p.ahead > 0 && (
                        <span className="mc-badge ahead">
                          <ArrowUpFromLine size={11} /> {p.ahead}
                        </span>
                      )}
                      {p.staged + p.unstaged > 0 && (
                        <span className="mc-badge dirty">
                          <FileEdit size={11} /> {p.staged + p.unstaged}
                        </span>
                      )}
                      {p.untracked > 0 && (
                        <span className="mc-badge untracked">
                          <FilePlus size={11} /> {p.untracked}
                        </span>
                      )}
                      {p.stashes > 0 && (
                        <span className="mc-badge stash">
                          <Archive size={11} /> {p.stashes}
                        </span>
                      )}
                      {prs > 0 && (
                        <span className="mc-badge pr">
                          <GitPullRequest size={11} /> {prs}
                        </span>
                      )}
                    </div>
                  )}

                  <span className={`mc-sparkwrap ${verdict.level}`} title={t('mission.activity')}>
                    <Sparkline values={p.activity} />
                  </span>
                  <span className="mc-age" title={t('mission.lastCommit')}>
                    {timeAgo(p.lastCommitAt)}
                  </span>
                  <div className="mc-actions">
                    <button
                      className="btn ghost small"
                      title={t('mission.fetch')}
                      disabled={busy !== null}
                      onClick={(e) => {
                        e.stopPropagation()
                        void run([p.path], 'fetch')
                      }}
                    >
                      {busy === p.path ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
                    </button>
                    <button
                      className="btn ghost small"
                      disabled={busy !== null || !p.upstream}
                      title={t('mission.pull')}
                      onClick={(e) => {
                        e.stopPropagation()
                        void run([p.path], 'pull')
                      }}
                    >
                      <ArrowDownToLine size={12} />
                    </button>
                    <button
                      className="btn ghost small"
                      onClick={(e) => {
                        e.stopPropagation()
                        open(p.path)
                      }}
                    >
                      <FolderGit2 size={12} /> {t('mission.open.row')}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mc-detail">
                    {!detail ? (
                      <Loader2 size={14} className="spin" />
                    ) : detail.files.length === 0 && detail.commits.length === 0 ? (
                      <span className="mc-detail-empty">{t('mission.nothingPending')}</span>
                    ) : (
                      <>
                        {detail.commits.length > 0 && (
                          <div className="mc-detail-col">
                            <span className="mc-detail-title">{t('mission.unpushed')}</span>
                            {detail.commits.map((c) => (
                              <div key={c.hash} className="mc-detail-item">
                                <code>{c.hash}</code>
                                <span title={c.subject}>{c.subject}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {detail.files.length > 0 && (
                          <div className="mc-detail-col">
                            <span className="mc-detail-title">{t('mission.working')}</span>
                            {detail.files.map((f) => (
                              <div key={f.path} className="mc-detail-item">
                                <code className={`mc-status ${f.status}`}>{f.status}</code>
                                <span title={f.path}>{f.path}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
