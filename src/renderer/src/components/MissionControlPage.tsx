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
  FileCheck,
  FileEdit,
  FilePlus,
  FolderGit2,
  Gauge,
  GitCommitHorizontal,
  GitPullRequest,
  Loader2,
  RefreshCw,
  Unlink
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
  isFetchStale,
  OP_LABEL,
  staleFetchTargets,
  orderPulses,
  pulseTotals,
  pulseVerdict,
  sparklinePoints,
  type PulseLevel,
  type PulseReason,
  type PulseSort
} from '../lib/missionControl'
import { timeAgo } from '../lib/timeAgo'
import { useT, interp, type TranslationKey } from '../i18n'
import { emojifyGitmoji } from '../../../shared/gitmoji'

/** How often the dashboard re-reads the repos while it is on screen. */
const AUTO_REFRESH_MS = 30_000

interface Row {
  path: string
  /** Group tab this repo belongs to, when it isn't a standalone tab. */
  group: string | null
  tabId: string
}

type Translate = (key: TranslationKey) => string

/** "3h ago", in the active language; null when there is no timestamp. */
function agoLabel(t: Translate, at: number | null): string | null {
  const ago = timeAgo(at, Date.now())
  return ago ? interp(t(ago.key), { n: String(ago.n) }) : null
}

/** A row's reasons as one line — the level icon's tooltip. */
function reasonsLabel(t: Translate, reasons: PulseReason[]): string {
  if (!reasons.length) return t('mission.reason.clean')
  return reasons.map((r) => interp(t(r.key), { n: String(r.n ?? '') })).join(' · ')
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

interface Badge {
  cls: string
  Icon: typeof CircleCheck
  n: number
  /** Tooltip, with `{n}` — the bare number says how many, this says of what. */
  title: TranslationKey
}

/**
 * The row's counts, in a fixed order so a column of rows reads like a table:
 * what blocks, then sync, then the working tree, then the extras.
 */
function rowBadges(p: RepoPulse, prs: number): Badge[] {
  const all: Badge[] = [
    { cls: 'blocked', Icon: AlertTriangle, n: p.conflicted, title: 'mission.badge.conflicted' },
    { cls: 'behind', Icon: ArrowDownToLine, n: p.behind, title: 'mission.badge.behind' },
    { cls: 'ahead', Icon: ArrowUpFromLine, n: p.ahead, title: 'mission.badge.ahead' },
    { cls: 'staged', Icon: FileCheck, n: p.staged, title: 'mission.badge.staged' },
    { cls: 'dirty', Icon: FileEdit, n: p.unstaged, title: 'mission.badge.modified' },
    { cls: 'untracked', Icon: FilePlus, n: p.untracked, title: 'mission.badge.untracked' },
    { cls: 'stash', Icon: Archive, n: p.stashes, title: 'mission.badge.stashes' },
    { cls: 'pr', Icon: GitPullRequest, n: prs, title: 'mission.badge.prs' }
  ]
  return all.filter((b) => b.n > 0)
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
              lastCommit: null,
              lastFetchAt: null,
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
  // Over the visible rows, like "Fetch all": a filter narrows what both act on.
  // Recomputed with every refresh, which is when a fetch age can cross the line.
  const stale = useMemo(() => staleFetchTargets(ordered, Date.now()), [ordered])

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
        {stale.length > 0 && (
          <button
            className="btn ghost small mc-fetch-stale"
            disabled={busy !== null}
            title={t('mission.fetchStaleHint')}
            onClick={() => void run(stale, 'fetch')}
          >
            <Download size={13} /> {interp(t('mission.fetchStaleButton'), { n: String(stale.length) })}
          </button>
        )}
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
          {refreshedAt ? interp(t('mission.updated'), { t: agoLabel(t, refreshedAt) ?? '' }) : ''}
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
            const fetchStale = isFetchStale(p, Date.now())
            const badges = rowBadges(p, prs)
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
                  <span className={`mc-level ${verdict.level}`} title={reasonsLabel(t, verdict.reasons)}>
                    <Icon size={14} />
                  </span>
                  <div className="mc-ident">
                    <span className="mc-line">
                      <span className="mc-name" title={p.path}>
                        {p.name}
                      </span>
                      {row?.group && <span className="mc-group">{row.group}</span>}
                    </span>
                    <span className="mc-where">
                      <span className="mc-branch">{p.branch || t('mission.detached')}</span>
                      {p.upstream ? (
                        <span className="mc-upstream">→ {p.upstream}</span>
                      ) : (
                        p.branch && (
                          <span className="mc-noupstream">
                            <Unlink size={10} /> {t('mission.noUpstream')}
                          </span>
                        )
                      )}
                    </span>
                  </div>

                  {p.error ? (
                    <span className="mc-error" title={p.error}>
                      {p.error}
                    </span>
                  ) : (
                    <>
                      {/* What the repo was last doing: the column that used to be empty space. */}
                      <div className="mc-commit">
                        {p.lastCommit ? (
                          <>
                            <span className="mc-subject" title={emojifyGitmoji(p.lastCommit.subject)}>
                              {emojifyGitmoji(p.lastCommit.subject)}
                            </span>
                            <span className="mc-author">{p.lastCommit.author}</span>
                          </>
                        ) : (
                          <span className="mc-author">{t('mission.noCommits')}</span>
                        )}
                      </div>
                      <div className="mc-badges">
                        {p.operation && <span className="mc-badge blocked">{t(OP_LABEL[p.operation])}</span>}
                        {badges.map((b) => (
                          <span key={b.cls} className={`mc-badge ${b.cls}`} title={interp(t(b.title), { n: String(b.n) })}>
                            <b.Icon size={11} /> {b.n}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <span className={`mc-activity ${verdict.level}`} title={t('mission.activity')}>
                    <Sparkline values={p.activity} />
                    <span className="mc-activity-n">
                      {interp(t('mission.commits14d'), { n: String(activityTotal(p)) })}
                    </span>
                  </span>
                  <span className="mc-times">
                    <span className="mc-age" title={t('mission.lastCommit')}>
                      {agoLabel(t, p.lastCommitAt * 1000) ?? '—'}
                    </span>
                    {p.upstream && !p.error && (
                      <span
                        className={`mc-fetched ${fetchStale ? 'stale' : ''}`}
                        title={fetchStale ? t('mission.fetchStale') : undefined}
                      >
                        {p.lastFetchAt
                          ? interp(t('mission.fetched'), { t: agoLabel(t, p.lastFetchAt) ?? '' })
                          : t('mission.neverFetched')}
                      </span>
                    )}
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
                                <span title={emojifyGitmoji(c.subject)}>{emojifyGitmoji(c.subject)}</span>
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
