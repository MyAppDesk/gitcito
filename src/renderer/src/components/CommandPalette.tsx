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
  KeyRound
} from 'lucide-react'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { gitApi } from '../infrastructure/api'
import { tabActiveRepoPath } from '../../../shared/types'

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

const GROUP_ORDER = ['Actions', 'Branches', 'Commits', 'Files']

export function CommandPalette(): React.JSX.Element {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPalette)
  const repos = useRepoStore((s) => s.repos)
  const tabs = useSettingsStore((s) => s.settings.tabs)
  const activeTabId = useSettingsStore((s) => s.settings.activeTabId)

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
      { id: 'fetch', title: 'Fetch all remotes', group: 'Actions', keywords: 'sync remote prune', icon: <Download size={15} />, run: act(() => void repoActions.fetchAll(path)) },
      { id: 'pull', title: 'Pull', group: 'Actions', keywords: 'sync merge', icon: <ArrowDownToLine size={15} />, run: act(() => void repoActions.pull(path, 'default')) },
      { id: 'push', title: 'Push', group: 'Actions', keywords: 'sync upload', icon: <Upload size={15} />, run: act(() => void repoActions.push(path)) },
      { id: 'commit', title: 'Commit changes…', group: 'Actions', keywords: 'wip staging compose', icon: <GitCommit size={15} />, run: act(() => useRepoStore.getState().select(path, { type: 'wip' })) },
      { id: 'stash', title: 'Stash changes', group: 'Actions', keywords: 'save shelve', icon: <Archive size={15} />, run: act(() => void repoActions.stash(path)) },
      { id: 'create-branch', title: 'Create branch…', group: 'Actions', keywords: 'new', icon: <Plus size={15} />, run: act(() => ui.openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })) },
      { id: 'create-pr', title: 'Create pull request…', group: 'Actions', keywords: 'pr github merge request', icon: <GitPullRequest size={15} />, run: act(() => ui.openModal({ kind: 'create-pr', repoPath: path, source: repo.branches.current })) },
      { id: 'stack', title: 'Branch stack…', group: 'Actions', keywords: 'stacked branches graphite restack dependent', icon: <Layers size={15} />, run: act(() => ui.openModal({ kind: 'stack', repoPath: path })) },
      { id: 'insights', title: 'Repository insights', group: 'Actions', keywords: 'stats churn hotspots authors contributors graph analytics', icon: <BarChart3 size={15} />, run: act(() => useSettingsStore.getState().openPageTab({ type: 'insights', repoPath: path })) },
      { id: 'changelog-gen', title: 'Generate changelog…', group: 'Actions', keywords: 'conventional commits release notes changelog', icon: <FileText size={15} />, run: act(() => ui.openModal({ kind: 'changelog-gen', repoPath: path })) },
      { id: 'vault', title: 'Open vault', group: 'Actions', keywords: 'secrets vault credentials keychain env password store', icon: <KeyRound size={15} />, run: act(() => useSettingsStore.getState().openPageTab({ type: 'vault', repoPath: path })) },
      { id: 'code-search', title: 'Search code…', group: 'Actions', keywords: 'grep find text content history pickaxe', icon: <Search size={15} />, run: act(() => ui.openModal({ kind: 'code-search', repoPath: path })) },
      { id: 'terminal', title: 'Toggle integrated terminal', group: 'Actions', keywords: 'shell console pty', icon: <TerminalSquare size={15} />, run: act(() => ui.toggleTerminal()) },
      { id: 'reflog', title: 'Open reflog', group: 'Actions', keywords: 'recovery undo history head', icon: <History size={15} />, run: act(() => ui.openModal({ kind: 'reflog', repoPath: path })) },
      { id: 'snapshots', title: 'WIP snapshots…', group: 'Actions', keywords: 'safety net stash backup auto save recover', icon: <Camera size={15} />, run: act(() => ui.openModal({ kind: 'snapshots', repoPath: path })) },
      { id: 'bisect', title: 'Start bisect', group: 'Actions', keywords: 'debug find bug', icon: <Bug size={15} />, run: act(() => ui.openModal({ kind: 'bisect', repoPath: path })) },
      { id: 'hooks', title: 'Manage git hooks', group: 'Actions', keywords: 'pre-commit', icon: <Webhook size={15} />, run: act(() => ui.openModal({ kind: 'hooks', repoPath: path })) },
      { id: 'lfs', title: 'Manage Git LFS', group: 'Actions', keywords: 'large file storage', icon: <Boxes size={15} />, run: act(() => ui.openModal({ kind: 'lfs', repoPath: path })) },
      { id: 'sparse', title: 'Sparse-checkout…', group: 'Actions', keywords: 'cone partial', icon: <FolderTree size={15} />, run: act(() => ui.openModal({ kind: 'sparse', repoPath: path })) },
      { id: 'theme', title: 'Toggle light / dark theme', group: 'Actions', keywords: 'appearance dark light mode', icon: <SunMoon size={15} />, run: act(() => useSettingsStore.getState().update((s) => ({ ...s, themeMode: s.themeMode === 'dark' ? 'light' : 'dark' }))) },
      { id: 'notifications', title: 'GitHub notifications', group: 'Actions', keywords: 'inbox review mention github bell', icon: <Bell size={15} />, run: act(() => useSettingsStore.getState().openPageTab({ type: 'notifications' })) },
      { id: 'changelog', title: "Open What's new (changelog)", group: 'Actions', keywords: 'release notes version', icon: <FileText size={15} />, run: act(() => useSettingsStore.getState().openPageTab({ type: 'changelog' })) },
      { id: 'settings', title: 'Open settings', group: 'Actions', keywords: 'preferences config', icon: <Settings size={15} />, run: act(() => ui.openModal({ kind: 'settings' })) }
    )

    // ── Branches ── (checkout)
    for (const b of repo.branches.locals) {
      if (b.isCurrent) continue
      list.push({
        id: `branch:${b.name}`,
        title: b.name,
        subtitle: 'Checkout branch',
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
  }, [repo, files, setOpen])

  // Filter + rank. With no query, show actions/branches first (commits & files
  // are huge — they only appear once the user types).
  const results = useMemo(() => {
    if (!query.trim()) {
      return commands.filter((c) => c.group === 'Actions' || c.group === 'Branches').slice(0, 60)
    }
    const scored: { cmd: Command; score: number }[] = []
    for (const cmd of commands) {
      const hay = `${cmd.title} ${cmd.subtitle ?? ''} ${cmd.keywords ?? ''}`
      const s = fuzzyScore(query.trim(), hay)
      if (s !== null) scored.push({ cmd, score: s })
    }
    // Keep groups contiguous (so each header renders once) — rank by group
    // order first, then by match score within the group.
    scored.sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(a.cmd.group)
      const gb = GROUP_ORDER.indexOf(b.cmd.group)
      if (ga !== gb) return ga - gb
      return b.score - a.score
    })
    return scored.slice(0, 60).map((s) => s.cmd)
  }, [commands, query])

  useEffect(() => setActive(0), [query])

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      results[active]?.run()
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
          {cmd.group}
        </div>
      )
    }
    rows.push(
      <button
        key={cmd.id}
        data-idx={idx}
        className={`cmdp-row ${idx === active ? 'active' : ''}`}
        onMouseMove={() => setActive(idx)}
        onClick={() => cmd.run()}
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
                placeholder={repo ? 'Search branches, commits, files, actions…' : 'Open a repository to use the command palette'}
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
                  <span>{repo ? 'No matches' : 'No repository open'}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
