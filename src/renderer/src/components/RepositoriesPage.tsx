import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  FolderGit2,
  Loader2,
  MoreVertical,
  Search,
  X
} from 'lucide-react'
import { GROUP_COLORS, useSettingsStore } from '../stores/settings'
import { useReposStore } from '../stores/repos'
import { repoActions, type PullMode } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import {
  buildSections,
  defaultSectionColors,
  filterSections,
  isSectionBusy,
  isSyncing,
  sectionKey,
  type RepoRow,
  type RepoSection,
  type SectionKind,
  type SectionSync
} from '../lib/repoSections'
import { RepositoryRow } from './RepositoryRow'
import { gitApi, shellApi } from '../infrastructure/api'
import { tabRepos, type RepoPulse } from '../../../shared/types'
import { useT, interp, type TranslationKey } from '../i18n'
import { openRepositoryDialog } from '../appCommands'
import { planWorkspaces } from '../lib/workspacePlan'

/** Section headings live here as keys, not strings: a module-level constant
 *  holding translated text freezes at whatever language was active on import. */
const SECTION_TITLE: Record<Exclude<SectionKind, 'workspace'>, TranslationKey> = {
  open: 'repos.sectionOpen',
  favourites: 'repos.sectionFavourites',
  recent: 'repos.sectionRecent',
  all: 'repos.sectionAll'
}

/** The pull modes, in the order the chooser lists them. Keys, not strings — a
 *  module-level constant holding copy freezes at the language active on import. */
const PULL_MODES: { mode: PullMode; labelKey: TranslationKey }[] = [
  { mode: 'default', labelKey: 'repos.pullModeDefault' },
  { mode: 'ff-only', labelKey: 'repos.pullModeFfOnly' },
  { mode: 'rebase', labelKey: 'repos.pullModeRebase' }
]

/** Uncommitted work of any kind — staged, unstaged or untracked. */
function dirtyCount(pulse: RepoPulse): number {
  return pulse.staged + pulse.unstaged + pulse.untracked
}

/**
 * The Repositories page — every repository Gitcito knows about, whether or not
 * it is open, grouped into sections you can collapse.
 *
 * Rows are deliberately cheap: name, owner and branch come from the registry,
 * which read them from files in `.git`. Nothing here spawns a git process, and
 * nothing refreshes on a timer — this is a page you open to find something.
 */
export function RepositoriesPage(): React.JSX.Element {
  const t = useT()
  const entries = useReposStore((s) => s.entries)
  const loading = useReposStore((s) => s.loading)
  const load = useReposStore((s) => s.load)
  const settings = useSettingsStore((s) => s.settings)
  const openRepoTab = useSettingsStore((s) => s.openRepoTab)
  const closeAllRepoTabs = useSettingsStore((s) => s.closeAllRepoTabs)
  const applyWorkspacePlan = useSettingsStore((s) => s.applyWorkspacePlan)
  const forget = useReposStore((s) => s.forget)
  const locate = useReposStore((s) => s.locate)
  const toggleFavouriteRepo = useSettingsStore((s) => s.toggleFavouriteRepo)
  const repathRepo = useSettingsStore((s) => s.repathRepo)
  const openModal = useUIStore((s) => s.openModal)
  const updateSettings = useSettingsStore((s) => s.update)
  const scanning = useReposStore((s) => s.scanning)
  const scan = useReposStore((s) => s.scan)
  const toast = useUIStore((s) => s.toast)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const setRepoSectionColor = useSettingsStore((s) => s.setRepoSectionColor)
  const chosenColors = settings.repoSectionColors ?? {}

  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [wip, setWip] = useState(false)
  const [pulses, setPulses] = useState<Record<string, RepoPulse>>({})
  // Which section is running which operation. The operation is part of it so
  // the spinner can land on the button that was actually clicked.
  const [syncing, setSyncing] = useState<SectionSync>(null)
  // Paths already fetched, in flight, or tried and failed. A ref rather than
  // state because the effect below both reads and writes it: as a dependency it
  // would retrigger the very effect that filled it, and every batch after the
  // first would be issued twice. Failures are recorded too — otherwise a path
  // whose call rejects is never cached and the effect loops for the whole visit.
  const attempted = useRef<Set<string>>(new Set())

  // "Forget" sits next to a repository name, where it reads as "delete". The
  // confirm says what it does and does not do, rather than relying on the verb.
  const confirmForget = (path: string, label: string): void => {
    openModal({
      kind: 'confirm',
      title: t('repos.forget'),
      message: interp(t('repos.forgetConfirm'), { name: label }),
      danger: true,
      confirmLabel: t('repos.forgetAction'),
      onConfirm: () => void forget(path)
    })
  }

  const runLocate = async (path: string, label: string): Promise<void> => {
    const chosen = await shellApi.selectDirectory(interp(t('repos.locateTitle'), { name: label }))
    if (!chosen) return
    await locate(path, chosen)
    // The registry moved; the star, alias and profile binding are keyed by
    // path in settings and have to move with it.
    repathRepo(path, chosen)
  }

  const runAddScanRoot = async (): Promise<void> => {
    const chosen = await shellApi.selectDirectory()
    if (!chosen) return
    const roots = [...settings.repoScanRoots, { path: chosen, depth: 3 }]
    updateSettings((s) => ({ ...s, repoScanRoots: roots }))
    const found = await scan(roots)
    toast('success', interp(t('repos.scanFound'), { n: found }))

    // Offer the folder tree as workspaces. Read from the store rather than the
    // `entries` in scope: `scan` has just replaced the registry, and this
    // closure still holds the render's stale copy.
    const candidates = planWorkspaces({
      root: chosen,
      repoPaths: useReposStore.getState().entries.map((r) => r.path),
      workspaces: useSettingsStore.getState().settings.workspaces ?? []
    })
    if (candidates.length === 0) return
    openModal({
      kind: 'scan-workspaces',
      root: chosen,
      candidates,
      onConfirm: (picked) => {
        const { created, repos } = applyWorkspacePlan(picked)
        if (repos > 0) toast('success', interp(t('repos.wsDone'), { created, repos }))
      }
    })
  }

  useEffect(() => {
    // Open tabs only, never `recentRepos`: the seed stands in for the `remember`
    // that startup tab restoration skips, and a repository you have open is
    // self-evidently known. A recent-only path has no such claim — re-indexing
    // one every launch would quietly resurrect a repository the user forgot.
    // Read straight from the store: a one-off snapshot taken on the first load,
    // not something that should re-run when a tab opens or closes.
    const seed = useSettingsStore
      .getState()
      .settings.tabs.flatMap((tab) => tabRepos(tab).map((r) => r.path))
    void load(seed)
  }, [load])

  // Kept separate from the filtered list below: a search drops sections, and
  // anything derived from the surviving ones would change as the user types.
  const allSections = useMemo(() => {
    const workspaceRepoPaths: Record<string, string[]> = {}
    for (const ws of settings.workspaces ?? []) {
      workspaceRepoPaths[ws.id] = ws.tabs.flatMap((tab) => tabRepos(tab).map((r) => r.path))
    }
    return buildSections({
      registry: entries,
      openPaths: settings.tabs.flatMap((tab) => tabRepos(tab).map((r) => r.path)),
      favourites: settings.favouriteRepos ?? [],
      workspaces: settings.workspaces ?? [],
      workspaceRepoPaths,
      aliases: settings.repoAliases ?? {}
    })
  }, [entries, settings])

  const sections = useMemo(() => filterSections(allSections, query), [allSections, query])

  // Every section starts coloured; `repoSectionColors` only holds the ones the
  // user has since overridden. Keeping the defaults derived rather than written
  // into settings means a new workspace is coloured the moment it appears.
  // Assigned from the unfiltered list so a section keeps its colour mid-search.
  const defaultColors = useMemo(() => defaultSectionColors(allSections, GROUP_COLORS), [allSections])

  // Status is opt-in because it is expensive: repoPulse spawns roughly five git
  // processes per repository, and this page can list every repo on the machine.
  // Only expanded sections are fetched, only once per visit, and never on a
  // timer — you open this page to find something, not to watch it.
  useEffect(() => {
    if (!wip) return
    let stopped = false
    const tried = attempted.current
    const wanted = [
      ...new Set(
        sections
          .filter((s) => !collapsed.has(sectionKey(s)))
          .flatMap((s) => s.rows)
          .filter((r) => !r.repo.missing)
          .map((r) => r.repo.path)
      )
    ].filter((p) => !tried.has(p))
    if (wanted.length === 0) return

    void (async () => {
      for (let i = 0; i < wanted.length; i += 8) {
        if (stopped) return
        // Claimed one batch at a time, not all at once: a run stopped halfway
        // must leave the paths it never reached free for the next one.
        const batch = wanted.slice(i, i + 8).filter((p) => !tried.has(p))
        if (batch.length === 0) continue
        for (const p of batch) tried.add(p)
        const results = await Promise.all(batch.map((p) => gitApi.repoPulse(p).catch(() => null)))
        // Recorded even when the run was stopped meanwhile: these paths are
        // claimed, so dropping the answer would leave them blank all visit.
        setPulses((prev) => {
          const next = { ...prev }
          batch.forEach((p, n) => {
            const pulse = results[n]
            if (pulse) next[p] = pulse
          })
          return next
        })
      }
    })()

    return () => {
      stopped = true
    }
  }, [wip, sections, collapsed])

  // The handbook offers turning the summary off and on as the way to see
  // current state — which only works if switching it off forgets what was
  // fetched. Handled here rather than in the effect: it is an event, not a
  // consequence of rendering.
  const toggleWip = (on: boolean): void => {
    setWip(on)
    if (on) return
    attempted.current = new Set()
    setPulses({})
  }

  // The colour picker is the same modal group tabs and folders use — it takes
  // a current value and a setter and knows nothing about what it colours.
  const openSectionMenu = (e: React.MouseEvent, key: string, current: string): void => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom, [
      {
        label: t('repos.sectionColor'),
        onClick: () =>
          openModal({
            kind: 'group-color',
            current,
            onSelect: (color) => setRepoSectionColor(key, color)
          })
      },
      // Only offered once a section has been overridden: with no stored colour
      // there is nothing to reset, since the default is what is already showing.
      ...(key in chosenColors
        ? [{ label: t('repos.sectionColorReset'), onClick: () => setRepoSectionColor(key, null) }]
        : [])
    ])
  }

  // Reuses the batch runner group tabs use: it walks the paths sequentially,
  // shows `(3/12)` progress, refreshes each repo it touches and ends with one
  // summary toast rather than a toast per repository. Missing folders are
  // dropped — there is nothing to fetch from a path that is not there.
  const runSection = async (key: string, section: RepoSection, op: 'fetch' | 'pull'): Promise<void> => {
    const paths = [...new Set(section.rows.filter((r) => !r.repo.missing).map((r) => r.repo.path))]
    if (paths.length === 0) return
    setSyncing({ key, op })
    try {
      const mode = settings.pullMode ?? 'default'
      await repoActions.batch(paths, op, op === 'pull' ? mode : 'default')
    } finally {
      setSyncing(null)
    }
  }

  const openPullModeMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const active = settings.pullMode ?? 'default'
    openContextMenu(
      rect.left,
      rect.bottom,
      PULL_MODES.map(({ mode, labelKey }) => ({
        label: t(labelKey),
        // MenuItem has no checked state, so the tick is the icon slot. The
        // inactive entries still reserve it, or the labels would not line up.
        icon: mode === active ? <Check size={13} /> : <span className="repos-menu-tick" />,
        onClick: () => updateSettings((cur) => ({ ...cur, pullMode: mode }))
      }))
    )
  }

  // Only repo-bearing tabs close; page tabs (this one included) stay. One tab
  // is a cheap mistake to undo with ⌘⇧T, so the confirm is reserved for the
  // case where several would go at once.
  const confirmCloseAll = (): void => {
    const count = settings.tabs.filter((tab) => tab.kind !== 'page').length
    if (count === 0) return
    if (count === 1) {
      closeAllRepoTabs()
      return
    }
    openModal({
      kind: 'confirm',
      title: t('repos.closeAll'),
      message: interp(t('repos.closeAllConfirm'), { n: count }),
      confirmLabel: t('repos.closeAllAction'),
      onConfirm: closeAllRepoTabs
    })
  }

  const toggle = (key: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="repos-page">
      <div className="repos-chrome">
      <header className="repos-header">
        <h1 className="repos-title">
          <FolderGit2 size={18} strokeWidth={1.75} /> {t('repos.title')}
        </h1>
        <div className="repos-actions">
          <button className="repos-btn repos-btn-primary" title={t('repos.openFolderTitle')} onClick={openRepositoryDialog}>
            {t('repos.openFolder')}
          </button>
          <button
            className="repos-btn"
            title={t('repos.cloneTitle')}
            onClick={() => openModal({ kind: 'clone', onClone: (repo) => openRepoTab(repo) })}
          >
            {t('repos.clone')}
          </button>
          <button
            className="repos-btn"
            title={t('repos.addScanRootTitle')}
            onClick={() => void runAddScanRoot()}
            disabled={scanning}
          >
            {scanning ? t('repos.scanning') : t('repos.addScanRoot')}
          </button>
        </div>
      </header>

      <div className="repos-toolbar">
        <button
          className="repos-toolbar-btn"
          title={t('repos.collapseAllTitle')}
          onClick={() => setCollapsed(new Set(allSections.map(sectionKey)))}
        >
          <ChevronsDownUp size={13} />
          {t('repos.collapseAll')}
        </button>
        <button
          className="repos-toolbar-btn"
          title={t('repos.expandAllTitle')}
          onClick={() => setCollapsed(new Set())}
        >
          <ChevronsUpDown size={13} />
          {t('repos.expandAll')}
        </button>
        {/* Unboxed and full-width: the search is the toolbar's primary field,
            not one control among several, so it takes the room the others
            leave rather than sitting in a box of its own. */}
        <div className="repos-search">
          <Search size={13} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('repos.search')}
            aria-label={t('repos.search')}
          />
        </div>
        <label className={`repos-wip-toggle${wip ? ' is-on' : ''}`} title={t('repos.wipTitle')}>
          <input type="checkbox" checked={wip} onChange={(e) => toggleWip(e.target.checked)} />
          {t('repos.wip')}
        </label>
      </div>
      </div>

      {!loading && entries.length === 0 ? (
        <div className="repos-empty">
          <FolderGit2 size={28} strokeWidth={1.5} />
          <p>{t('repos.empty')}</p>
        </div>
      ) : query && sections.length === 0 ? (
        <div className="repos-empty">
          <Search size={22} strokeWidth={1.5} />
          <p>{interp(t('repos.noMatchesFor'), { query })}</p>
        </div>
      ) : (
        <div className="repos-sections">
          {sections.map((section) => {
            const key = sectionKey(section)
            const isCollapsed = collapsed.has(key)
            const color = chosenColors[key] ?? defaultColors[key]
            const busy = isSectionBusy(syncing, key)
            const title =
              section.kind === 'workspace'
                ? (section.workspaceName ?? '')
                : t(SECTION_TITLE[section.kind])
            return (
              <section
                className="repos-section"
                key={key}
                style={{ '--repos-section-color': color } as React.CSSProperties}
              >
                {/* The bar is a div, not the toggle button: it carries extra
                    actions, and the tint rides the section so the stripe and
                    row hover share one colour. The hex is mixed down in CSS. */}
                <div className="repos-section-bar">
                  <button
                    className="repos-section-head"
                    title={t('repos.toggleSection')}
                    onClick={() => toggle(key)}
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <span className="repos-section-title">{title}</span>
                    <span className="repos-section-count">{section.rows.length}</span>
                  </button>
                  {section.kind === 'open' && (
                    <button
                      className="repos-toolbar-btn repos-section-close"
                      disabled={section.rows.length === 0}
                      title={t('repos.closeAllTitle')}
                      onClick={confirmCloseAll}
                    >
                      <X size={13} />
                      {section.rows.length === 1 ? t('repos.closeOne') : t('repos.closeAll')}
                    </button>
                  )}
                  <button
                    className="repos-icon-btn"
                    disabled={busy}
                    title={t('repos.fetchSection')}
                    aria-label={t('repos.fetchSection')}
                    onClick={() => void runSection(key, section, 'fetch')}
                  >
                    {isSyncing(syncing, key, 'fetch') ? (
                      <Loader2 size={13} className="spin" />
                    ) : (
                      <Download size={13} />
                    )}
                  </button>
                  {/* A split button: the action and the choice of what the
                      action means, so picking a mode never pulls by accident. */}
                  <span className="repos-split">
                    <button
                      className="repos-icon-btn"
                      disabled={busy}
                      title={t('repos.pullSection')}
                      aria-label={t('repos.pullSection')}
                      onClick={() => void runSection(key, section, 'pull')}
                    >
                      {isSyncing(syncing, key, 'pull') ? (
                        <Loader2 size={13} className="spin" />
                      ) : (
                        <ArrowDownToLine size={13} />
                      )}
                    </button>
                    <button
                      className="repos-icon-btn repos-split-caret"
                      disabled={busy}
                      title={t('repos.pullModeTitle')}
                      aria-label={t('repos.pullModeTitle')}
                      onClick={openPullModeMenu}
                    >
                      <ChevronDown size={11} />
                    </button>
                  </span>
                  <button
                    className="repos-icon-btn"
                    title={t('repos.sectionMenu')}
                    aria-label={t('repos.sectionMenu')}
                    onClick={(e) => openSectionMenu(e, key, color)}
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>
                {!isCollapsed && (
                  <div className="repos-rows">
                    {section.rows.length === 0 ? (
                      <p className="repos-none">{t('repos.emptySection')}</p>
                    ) : (
                      section.rows.map((row) => {
                        const pulse = pulses[row.repo.path]
                        return (
                          <RepositoryRow
                            key={row.repo.path}
                            row={row}
                            onOpen={(r: RepoRow) => openRepoTab({ path: r.repo.path, name: r.repo.name })}
                            onToggleFavourite={toggleFavouriteRepo}
                            onForget={confirmForget}
                            onLocate={(path, label) => void runLocate(path, label)}
                            wipPill={
                              wip && pulse ? (
                                <span className="repos-row-wip">
                                  {/* i18n-ignore git ahead/behind/dirty counts, not copy */}
                                  {pulse.ahead > 0 && <span className="repos-wip-ahead">↑{pulse.ahead}</span>}
                                  {pulse.behind > 0 && <span className="repos-wip-behind">↓{pulse.behind}</span>}
                                  {dirtyCount(pulse) > 0 ? (
                                    <span className="repos-wip-dirty">●{dirtyCount(pulse)}</span>
                                  ) : (
                                    pulse.ahead === 0 &&
                                    pulse.behind === 0 && <span className="repos-wip-clean">{t('repos.clean')}</span>
                                  )}
                                </span>
                              ) : undefined
                            }
                          />
                        )
                      })
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
