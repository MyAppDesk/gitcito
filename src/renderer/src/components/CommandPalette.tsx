import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  GitBranch,
  GitCommit,
  FileText,
  Zap,
  Download,
  Upload,
  ArrowDownToLine,
  Archive,
  TerminalSquare,
  Settings,
  History,
  Bug,
  Webhook,
  Boxes,
  FolderTree,
  GitPullRequest,
  SunMoon,
  Plus,
  Search,
  Bell,
  Layers,
  BarChart3,
  Camera,
  KeyRound,
  Keyboard,
  CircleDot,
  Sparkles,
  ArrowLeftRight
} from 'lucide-react'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { gitApi } from '../infrastructure/api'
import { tabActiveRepoPath } from '../../../shared/types'
import { getFrecency, frecencyScore, bumpFrecency } from '../lib/frecency'
import { useT, type TranslationKey } from '../i18n'

// Display label for a group id (groups stay English internally for sorting).
const GROUP_KEYS: Record<string, TranslationKey> = {
  Recent: 'cmdp.group.recent',
  Actions: 'cmdp.group.actions',
  Branches: 'cmdp.group.branches',
  Commits: 'cmdp.group.commits',
  Files: 'cmdp.group.files'
}

interface Command {
  id: string
  title: string
  subtitle?: string
  group: string
  keywords?: string
  icon: ReactNode
  run: () => void
}

/** Lightweight fuzzy scorer: subsequence match, contiguous + word-boundary
 *  bonuses, earlier matches rank higher. Returns null when not all query
 *  characters are found (in order). */
function fuzzyScore(query: string, text: string): number | null {
  if (!query) return 0
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let score = 0
  let ti = 0
  let prevMatch = -2
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]
    const found = t.indexOf(ch, ti)
    if (found === -1) return null
    score += 1
    if (found === prevMatch + 1) score += 4 // contiguous run
    if (found === 0 || /[\s/_\-.]/.test(t[found - 1])) score += 3 // word boundary
    score -= Math.min(found - ti, 3) * 0.3 // penalise gaps
    prevMatch = found
    ti = found + 1
  }
  return score
}

const GROUP_ORDER = ['Recent', 'Actions', 'Branches', 'Commits', 'Files']

export function CommandPalette(): React.JSX.Element {
  const t = useT()
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPalette)
  const repos = useRepoStore((s) => s.repos)
  const tabs = useSettingsStore((s) => s.settings.tabs)
  const activeTabId = useSettingsStore((s) => s.settings.activeTabId)
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null
  const repoPath = activeTab ? tabActiveRepoPath(activeTab) : null
  const repo = repoPath ? repos[repoPath] : null

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [files, setFiles] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset + focus on open; load the tracked-file list lazily (only when a repo
  // is open) so file commands are available without paying the cost up front.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    if (repo) gitApi.listFiles(repo.path).then(setFiles).catch(() => setFiles([]))
    else setFiles([])
    return () => cancelAnimationFrame(id)
  }, [open, repo?.path])

  const commands = useMemo<Command[]>(() => {
    if (!repo) return []
    const path = repo.path
    const close = (): void => setOpen(false)
    const act = (fn: () => void): (() => void) => () => {
      close()
      fn()
    }
    const ui = useUIStore.getState()
    const list: Command[] = []

    // ── Actions ──
    list.push(
      { id: 'fetch', title: t('cmd.fetch'), group: 'Actions', keywords: 'sync remote prune', icon: <Download size={15} />, run: act(() => void repoActions.fetchAll(path)) },
      { id: 'pull', title: t('cmd.pull'), group: 'Actions', keywords: 'sync merge', icon: <ArrowDownToLine size={15} />, run: act(() => void repoActions.pull(path, 'default')) },
      { id: 'push', title: t('cmd.push'), group: 'Actions', keywords: 'sync upload', icon: <Upload size={15} />, run: act(() => void repoActions.push(path)) },
      { id: 'commit', title: t('cmd.commit'), group: 'Actions', keywords: 'wip staging compose', icon: <GitCommit size={15} />, run: act(() => useRepoStore.getState().select(path, { type: 'wip' })) },
      { id: 'stash', title: t('cmd.stash'), group: 'Actions', keywords: 'save shelve', icon: <Archive size={15} />, run: act(() => void repoActions.stash(path)) },
      { id: 'create-branch', title: t('cmd.createBranch'), group: 'Actions', keywords: 'new', icon: <Plus size={15} />, run: act(() => ui.openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })) },
      { id: 'create-pr', title: t('cmd.createPr'), group: 'Actions', keywords: 'pr github merge request', icon: <GitPullRequest size={15} />, run: act(() => ui.openModal({ kind: 'create-pr', repoPath: path, source: repo.branches.current })) },
      ...((): Command[] => {
        const origin = repo.remotes.find((r) => r.name === 'origin') ?? repo.remotes[0]
        return origin
          ? [{ id: 'create-issue', title: t('cmd.createIssue'), group: 'Actions', keywords: 'github issue new bug report', icon: <CircleDot size={15} />, run: act(() => ui.openModal({ kind: 'create-issue', repoPath: path, remoteUrl: origin.url })) } as Command]
          : []
      })(),
      { id: 'stack', title: t('cmd.stack'), group: 'Actions', keywords: 'stacked branches graphite restack dependent', icon: <Layers size={15} />, run: act(() => ui.openModal({ kind: 'stack', repoPath: path })) },
      { id: 'compare-refs', title: t('cmd.compareRefs'), group: 'Actions', keywords: 'compare diff branches refs tags ahead behind range', icon: <ArrowLeftRight size={15} />, run: act(() => {
        const cur = repo.branches.current || 'HEAD'
        const base = repo.branches.locals.find((bb) => /^(main|master)$/.test(bb.name) && bb.name !== cur)?.name
          ?? repo.branches.locals.find((bb) => bb.name !== cur)?.name ?? cur
        ui.openModal({ kind: 'branch-compare', repoPath: path, branchA: cur, branchB: base })
      }) },
      { id: 'insights', title: t('cmd.insights'), group: 'Actions', keywords: 'stats churn hotspots authors contributors graph analytics', icon: <BarChart3 size={15} />, run: act(() => useSettingsStore.getState().openPageTab({ type: 'insights', repoPath: path })) },
      { id: 'changelog-gen', title: t('cmd.changelogGen'), group: 'Actions', keywords: 'conventional commits release notes changelog', icon: <FileText size={15} />, run: act(() => ui.openModal({ kind: 'changelog-gen', repoPath: path })) },
      { id: 'vault', title: t('cmd.vault'), group: 'Actions', keywords: 'secrets vault credentials keychain env password store', icon: <KeyRound size={15} />, run: act(() => useSettingsStore.getState().openPageTab({ type: 'vault', repoPath: path })) },
      { id: 'code-search', title: t('cmd.codeSearch'), group: 'Actions', keywords: 'grep find text content history pickaxe', icon: <Search size={15} />, run: act(() => ui.openModal({ kind: 'code-search', repoPath: path })) },
      { id: 'filter-path', title: t('cmd.filterPath'), group: 'Actions', keywords: 'path file folder history touched commits filter', icon: <FolderTree size={15} />, run: act(() => ui.openModal({ kind: 'input', title: t('cmdp.filterTitle'), label: t('cmdp.filterLabel'), placeholder: 'src/main', submitLabel: t('cmdp.filterSubmit'), onSubmit: (v) => ui.setPathFilter(v.trim() || null) })) },
      ...(aiEnabled ? [{ id: 'ai-assistant', title: t('cmd.aiAssistant'), group: 'Actions', keywords: 'ai config wizard ask actions generate', icon: <Sparkles size={15} />, run: act(() => ui.openModal({ kind: 'ai-config-wizard', repoPath: path, repoName: repo.name })) } as Command] : []),
      { id: 'terminal', title: t('cmd.terminal'), group: 'Actions', keywords: 'shell console pty', icon: <TerminalSquare size={15} />, run: act(() => ui.toggleTerminal()) },
      { id: 'reflog', title: t('cmd.reflog'), group: 'Actions', keywords: 'recovery undo history head', icon: <History size={15} />, run: act(() => ui.openModal({ kind: 'reflog', repoPath: path })) },
      { id: 'snapshots', title: t('cmd.snapshots'), group: 'Actions', keywords: 'safety net stash backup auto save recover', icon: <Camera size={15} />, run: act(() => ui.openModal({ kind: 'snapshots', repoPath: path })) },
      { id: 'bisect', title: t('cmd.bisect'), group: 'Actions', keywords: 'debug find bug', icon: <Bug size={15} />, run: act(() => ui.openModal({ kind: 'bisect', repoPath: path })) },
      { id: 'hooks', title: t('cmd.hooks'), group: 'Actions', keywords: 'pre-commit', icon: <Webhook size={15} />, run: act(() => ui.openModal({ kind: 'hooks', repoPath: path })) },
      { id: 'lfs', title: t('cmd.lfs'), group: 'Actions', keywords: 'large file storage', icon: <Boxes size={15} />, run: act(() => ui.openModal({ kind: 'lfs', repoPath: path })) },
      { id: 'sparse', title: t('cmd.sparse'), group: 'Actions', keywords: 'cone partial', icon: <FolderTree size={15} />, run: act(() => ui.openModal({ kind: 'sparse', repoPath: path })) },
      { id: 'theme', title: t('cmd.theme'), group: 'Actions', keywords: 'appearance dark light mode', icon: <SunMoon size={15} />, run: act(() => useSettingsStore.getState().update((s) => ({ ...s, themeMode: s.themeMode === 'dark' ? 'light' : 'dark' }))) },
      { id: 'notifications', title: t('cmd.notifications'), group: 'Actions', keywords: 'inbox review mention github bell', icon: <Bell size={15} />, run: act(() => useSettingsStore.getState().openPageTab({ type: 'notifications' })) },
      { id: 'changelog', title: t('cmd.changelog'), group: 'Actions', keywords: 'release notes version', icon: <FileText size={15} />, run: act(() => useSettingsStore.getState().openPageTab({ type: 'changelog' })) },
      { id: 'settings', title: t('cmd.settings'), group: 'Actions', keywords: 'preferences config', icon: <Settings size={15} />, run: act(() => ui.openModal({ kind: 'settings' })) },
      { id: 'settings-security', title: t('cmd.settingsSecurity'), group: 'Actions', keywords: 'preferences mask secrets large file protected branch vault', icon: <Settings size={15} />, run: act(() => ui.openModal({ kind: 'settings', page: 'security' })) },
      { id: 'settings-shortcuts', title: t('cmd.settingsShortcuts'), group: 'Actions', keywords: 'preferences keybindings rebind keys', icon: <Settings size={15} />, run: act(() => ui.openModal({ kind: 'settings', page: 'shortcuts' })) },
      { id: 'settings-ai', title: t('cmd.settingsAi'), group: 'Actions', keywords: 'preferences openai model provider', icon: <Settings size={15} />, run: act(() => ui.openModal({ kind: 'settings', page: 'ai' })) },
      { id: 'settings-themes', title: t('cmd.settingsThemes'), group: 'Actions', keywords: 'preferences appearance colors', icon: <Settings size={15} />, run: act(() => ui.openModal({ kind: 'settings', page: 'themes' })) },
      { id: 'cheatsheet', title: t('cmd.cheatsheet'), group: 'Actions', keywords: 'shortcuts keys cheatsheet rebind hotkeys', icon: <Keyboard size={15} />, run: act(() => ui.openModal({ kind: 'cheatsheet' })) }
    )

    // ── Branches ── (checkout)
    for (const b of repo.branches.locals) {
      if (b.isCurrent) continue
      list.push({
        id: `branch:${b.name}`,
        title: b.name,
        subtitle: t('cmdp.checkoutBranch'),
        group: 'Branches',
        keywords: 'checkout switch',
        icon: <GitBranch size={15} />,
        run: act(() => void repoActions.checkout(path, b.name))
      })
    }

    // ── Commits ── (jump to in graph)
    for (const c of repo.commits.slice(0, 300)) {
      list.push({
        id: `commit:${c.hash}`,
        title: c.subject,
        subtitle: `${c.hash.slice(0, 7)} · ${c.author}`,
        group: 'Commits',
        keywords: c.hash,
        icon: <GitCommit size={15} />,
        run: act(() => {
          useUIStore.getState().setFileView(null)
          useRepoStore.getState().select(path, { type: 'commit', hash: c.hash })
          useUIStore.getState().requestScrollTo(c.hash)
        })
      })
    }

    // ── Files ── (open in working tree)
    for (const f of files) {
      list.push({
        id: `file:${f}`,
        title: f.split('/').pop() ?? f,
        subtitle: f,
        group: 'Files',
        keywords: f,
        icon: <FileText size={15} />,
        run: act(() => useUIStore.getState().setFileView({ repoPath: path, file: f, source: { type: 'tree' }, mode: 'file' }))
      })
    }

    return list
  }, [repo, files, setOpen, aiEnabled, t])

  // Usage stats, refreshed each time the palette opens.
  const frec = useMemo(() => (open ? getFrecency() : {}), [open])

  // Filter + rank. With no query, show a Recent group (most-used) then
  // actions/branches; commits & files only appear once the user types.
  const results = useMemo(() => {
    if (!query.trim()) {
      const recents = commands
        .map((c) => ({ c, f: frecencyScore(frec[c.id]) }))
        .filter((x) => x.f > 0)
        .sort((a, b) => b.f - a.f)
        .slice(0, 6)
        .map((x) => ({ ...x.c, group: 'Recent' }))
      const recentIds = new Set(recents.map((r) => r.id))
      const base = commands.filter(
        (c) => (c.group === 'Actions' || c.group === 'Branches') && !recentIds.has(c.id)
      )
      return [...recents, ...base].slice(0, 60)
    }
    const scored: { cmd: Command; score: number }[] = []
    for (const cmd of commands) {
      const hay = `${cmd.title} ${cmd.subtitle ?? ''} ${cmd.keywords ?? ''}`
      const s = fuzzyScore(query.trim(), hay)
      // Nudge frequently-used commands up within their group.
      if (s !== null) scored.push({ cmd, score: s + frecencyScore(frec[cmd.id]) })
    }
    // Keep groups contiguous (so each header renders once) — rank by group
    // order first, then by (score + frecency) within the group.
    scored.sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(a.cmd.group)
      const gb = GROUP_ORDER.indexOf(b.cmd.group)
      if (ga !== gb) return ga - gb
      return b.score - a.score
    })
    return scored.slice(0, 60).map((s) => s.cmd)
  }, [commands, query, frec])

  useEffect(() => setActive(0), [query])

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  // Record usage (frecency), then run.
  const fire = (cmd: Command | undefined): void => {
    if (!cmd) return
    bumpFrecency(cmd.id)
    cmd.run()
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      fire(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  // Render rows with a group header whenever the group changes.
  let lastGroup = ''
  const rows: ReactNode[] = []
  results.forEach((cmd, idx) => {
    if (cmd.group !== lastGroup) {
      lastGroup = cmd.group
      rows.push(
        <div key={`h:${cmd.group}`} className="cmdp-group">
          {GROUP_KEYS[cmd.group] ? t(GROUP_KEYS[cmd.group]) : cmd.group}
        </div>
      )
    }
    rows.push(
      <button
        key={cmd.id}
        data-idx={idx}
        className={`cmdp-row ${idx === active ? 'active' : ''}`}
        onMouseMove={() => setActive(idx)}
        onClick={() => fire(cmd)}
      >
        <span className="cmdp-icon">{cmd.icon}</span>
        <span className="cmdp-text">
          <span className="cmdp-title">{cmd.title}</span>
          {cmd.subtitle && <span className="cmdp-sub">{cmd.subtitle}</span>}
        </span>
      </button>
    )
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdp-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <motion.div
            className="cmdp"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="cmdp-input-row">
              <Search size={16} className="cmdp-search-icon" />
              <input
                ref={inputRef}
                className="cmdp-input"
                placeholder={repo ? t('cmdp.placeholder') : t('cmdp.placeholderNoRepo')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!repo}
              />
              <kbd className="cmdp-kbd">esc</kbd>
            </div>
            <div className="cmdp-list" ref={listRef}>
              {rows.length > 0 ? (
                rows
              ) : (
                <div className="cmdp-empty">
                  <Zap size={18} />
                  <span>{repo ? t('cmdp.noMatches') : t('cmdp.noRepo')}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
