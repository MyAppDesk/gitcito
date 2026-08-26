import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Undo2,
  Redo2,
  ArrowDownToLine,
  Download,
  ArrowUpFromLine,
  GitBranchPlus,
  Archive,
  ArchiveRestore,
  ChevronDown,
  TerminalSquare,
  Search,
  RefreshCw,
  Loader2,
  Wrench,
  History,
  Bug,
  Webhook,
  Boxes,
  FileDiff,
  GitCommit,
  FolderTree,
  ChevronRight,
  GitBranch,
  Layers,
  StickyNote,
  FileText,
  Camera,
  KeyRound,
  Settings,
  ArrowLeftRight,
  PanelLeft,
  PanelRight,
  BookOpen,
  Radar,
  Magnet,
  Clock,
  Film,
  MoreHorizontal,
  Boxes as ObjectsIcon,
  Trash2,
  Package,
  HardDrive,
  FileCog,
  GitMerge,
  Eraser,
  FolderInput,
  GitGraph,
  BarChart3,
  GitPullRequestArrow,
  Lock,
  MessageSquare,
  Users,
  FlaskConical
} from 'lucide-react'
import type { MenuItem } from '../stores/ui'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { repoChatAvailable } from '../lib/repoChatUI'
import { useT, interp } from '../i18n'
import { timeAgo, isStale } from '../lib/timeAgo'
import { BranchStatusPicker } from './BranchStatusPicker'
import { RepoStatusPicker } from './RepoStatusPicker'

/**
 * One slot on the action bar. Everything between the repo pill and the search
 * box is described as data rather than markup, because a narrow window has to
 * be able to move the tail of it into a dropdown — see `useOverflow` below.
 */
type BarItem =
  | { id: string; sep: true }
  | {
      id: string
      sep?: false
      label: string
      title: string
      icon: React.JSX.Element
      /** The same action drawn small, for the overflow menu. */
      menuIcon: React.JSX.Element
      disabled?: boolean
      /** Primary click. Absent means the button only opens `menu`. */
      run?: () => void
      /** Split-button dropdown; the overflow menu nests the same entries. */
      menu?: () => MenuItem[]
      badge?: number
      /** Fetch alone hangs its age label under the button. */
      age?: boolean
    }

/** Gap between bar items, and the width the "More" button needs for itself. */
const ITEM_GAP = 2
const MORE_WIDTH = 64

export function Toolbar({ repo }: { repo: RepoData }): React.JSX.Element {
  const t = useT()
  const { undo, redo } = useRepoStore()
  const { openContextMenu, openModal, toggleTerminal, toggleSidebar, graphFilter, setGraphFilter, busy } = useUIStore()
  const terminalOpen = useUIStore((s) => !!s.terminalOpenByRepo[repo.path])
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const busyOp = useUIStore((s) => s.busyOp)
  const chatAvailable = useSettingsStore((s) => repoChatAvailable(s.activeProfile().ai))
  const chatPanelOpen = useUIStore((s) => s.chatPanelOpen)
  const rightPanelTab = useUIStore((s) => s.rightPanelTab)
  const openChatPanel = useUIStore((s) => s.openChatPanel)
  const closeChatPanel = useUIStore((s) => s.closeChatPanel)
  // Any mutating git op queued/running gates the action buttons — the user
  // can't fire a second action until the first has fully settled.
  const inflight = useUIStore((s) => s.inflight > 0)
  const confirmForcePush = useSettingsStore((s) => s.settings.confirmForcePush)
  const sidebarSide = useSettingsStore((s) => s.settings.sidebarSide)
  const language = useSettingsStore((s) => s.settings.language ?? 'en')
  const path = repo.path
  const current = repo.branches.locals.find((b) => b.isCurrent)

  // Re-render every 15s so the relative "last fetched / refreshed" labels stay current.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15000)
    return () => clearInterval(id)
  }, [])

  /** Renders a timeAgo through the dictionary — "never" when there is nothing. */
  const since = (at: number | null): string => {
    const ago = timeAgo(at, Date.now())
    return ago ? interp(t(ago.key), { n: ago.n }) : t('time.never')
  }
  const fetchStale = isStale(repo.lastFetchAt, Date.now())
  const [fetchHover, setFetchHover] = useState(false)

  /** Drops a menu under whatever was clicked — a split arrow or a whole button. */
  const openAt = (e: React.MouseEvent, items: MenuItem[]): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom + 6, items)
  }

  const pullItems = (): MenuItem[] => [
    { label: t('pull.default'), onClick: () => void repoActions.pull(path, 'default') },
    { label: t('pull.ffOnly'), onClick: () => void repoActions.pull(path, 'ff-only') },
    { label: t('pull.rebase'), onClick: () => void repoActions.pull(path, 'rebase') }
  ]

  const pushItems = (): MenuItem[] => [
    { label: t('toolbar.push'), onClick: () => void repoActions.push(path) },
    // Per-remote entries only earn their place once there is more than one.
    ...(repo.remotes.length > 1
      ? [
          {
            label: t('push.toRemote'),
            submenu: repo.remotes.map((r) => ({
              label: r.name,
              onClick: () => void repoActions.pushToRemotes(path, [r.name])
            }))
          },
          {
            label: interp(t('push.allRemotes'), { n: String(repo.remotes.length) }),
            onClick: () => void repoActions.pushToRemotes(path, repo.remotes.map((r) => r.name))
          }
        ]
      : []),
    {
      label: t('push.tags'),
      submenu: repo.remotes.map((r) => ({
        label: r.name,
        onClick: () => void repoActions.pushAllTags(path, r.name)
      }))
    },
    { separator: true },
    {
      label: t('push.force'),
      danger: true,
      onClick: () => {
        if (!confirmForcePush) {
          void repoActions.push(path, true)
          return
        }
        openModal({
          kind: 'confirm',
          title: t('push.forceTitle'),
          message: interp(t('push.forceMsg'), { branch: repo.branches.current }),
          danger: true,
          confirmLabel: t('push.forceConfirm'),
          onConfirm: () => void repoActions.push(path, true)
        })
      }
    }
  ]

  const stashPrompt = (): void =>
    openModal({
      kind: 'input',
      title: t('stash.title'),
      label: t('stash.msgLabel'),
      placeholder: t('stash.msgPlaceholder'),
      allowEmpty: true,
      submitLabel: t('stash.submit'),
      onSubmit: (msg) => void repoActions.stash(path, msg.trim() || undefined)
    })

  const stashItems = (): MenuItem[] => [
    { label: t('stash.allChanges'), icon: <Archive size={15} />, onClick: stashPrompt },
    {
      label: t('stash.selectedFiles'),
      icon: <Archive size={15} />,
      onClick: () => openModal({ kind: 'stash-partial', repoPath: path })
    }
  ]

  /** Notes ride on refs/notes, which normal fetch/push ignore entirely. */
  const notesMenu = (): MenuItem[] => {
    const remotes = repo.remotes.map((r) => r.name)
    if (!remotes.length) return []
    return [
      {
        label: t('notes.fetch'),
        submenu: remotes.map((r) => ({ label: r, onClick: () => void repoActions.fetchNotes(path, r) }))
      },
      {
        label: t('notes.push'),
        submenu: remotes.map((r) => ({ label: r, onClick: () => void repoActions.pushNotes(path, r) }))
      }
    ]
  }

  const toolsItems = (): MenuItem[] => {
    const applyPatchFile = (am: boolean): void => {
      void window.api.openPatch().then((res) => {
        if (res) void repoActions.applyPatch(path, res.content, am)
      })
    }
    // The dropdown mirrors the command palette: everything reachable by ⌘K that
    // belongs to a repository is here too, with the rarely-used two thirds
    // folded into groups so the list stays readable.
    return [
      { label: t('tools.reflog'), icon: <History size={15} />, onClick: () => openModal({ kind: 'reflog', repoPath: path }) },
      { label: t('tools.snapshots'), icon: <Camera size={15} />, onClick: () => openModal({ kind: 'snapshots', repoPath: path }) },
      { label: t('timeMachine.open'), icon: <Clock size={15} />, onClick: () => openModal({ kind: 'time-machine', repoPath: path }) },
      { label: t('tools.bisect'), icon: <Bug size={15} />, onClick: () => openModal({ kind: 'bisect', repoPath: path }) },
      { separator: true },
      { label: t('absorb.open'), icon: <Magnet size={15} />, onClick: () => openModal({ kind: 'absorb', repoPath: path }) },
      {
        label: t('radar.open'),
        icon: <Radar size={15} />,
        onClick: () => openModal({ kind: 'conflict-radar', repoPath: path, base: repo.branches.current || 'HEAD' })
      },
      {
        label: t('teamRadar.open'),
        icon: <Users size={15} />,
        onClick: () => openModal({ kind: 'teammate-radar', repoPath: path })
      },
      {
        label: t('localCi.open'),
        icon: <FlaskConical size={15} />,
        onClick: () => openModal({ kind: 'local-ci', repoPath: path })
      },
      {
        label: t('tools.compareRefs'),
        icon: <ArrowLeftRight size={15} />,
        onClick: () => {
          const cur = repo.branches.current || 'HEAD'
          const base =
            repo.branches.locals.find((b) => /^(main|master)$/.test(b.name) && b.name !== cur)?.name ??
            repo.branches.locals.find((b) => b.name !== cur)?.name ??
            cur
          openModal({ kind: 'branch-compare', repoPath: path, branchA: cur, branchB: base })
        }
      },
      {
        label: t('rangeDiff.open'),
        icon: <History size={15} />,
        onClick: () =>
          openModal({ kind: 'range-diff', repoPath: path, branch: repo.branches.current || 'HEAD' })
      },
      ...(notesMenu().length
        ? [{ label: t('notes.title'), icon: <StickyNote size={15} />, submenu: notesMenu() }]
        : []),
      { separator: true },
      {
        label: t('tools.groupInspect'),
        icon: <Search size={15} />,
        submenu: [
          { label: t('cmd.objects'), icon: <ObjectsIcon size={15} />, onClick: () => openModal({ kind: 'objects', repoPath: path }) },
          { label: t('cmd.codeSearch'), icon: <Search size={15} />, onClick: () => openModal({ kind: 'code-search', repoPath: path }) },
          { label: t('cmd.insights'), icon: <BarChart3 size={15} />, onClick: () => openModal({ kind: 'repo-settings', repoPath: path, tab: 'insights' }) },
          { label: t('timelapse.open'), icon: <Film size={15} />, onClick: () => openModal({ kind: 'timelapse', repoPath: path }) },
          { label: t('prPreview.open'), icon: <GitPullRequestArrow size={15} />, onClick: () => openModal({ kind: 'pr-preview', repoPath: path }) }
        ]
      },
      {
        label: t('tools.groupHistory'),
        icon: <GitMerge size={15} />,
        submenu: [
          { label: t('cmd.mergeOptions'), icon: <GitMerge size={15} />, onClick: () => openModal({ kind: 'merge-options', repoPath: path }) },
          { label: t('tools.stack'), icon: <Layers size={15} />, onClick: () => openModal({ kind: 'stack', repoPath: path }) },
          { label: t('cmd.gitflow'), icon: <GitBranch size={15} />, onClick: () => openModal({ kind: 'gitflow', repoPath: path }) },
          { label: t('cmd.subtree'), icon: <FolderInput size={15} />, onClick: () => openModal({ kind: 'subtree', repoPath: path }) },
          { label: t('cmd.historyPurge'), icon: <Eraser size={15} />, onClick: () => openModal({ kind: 'history-purge', repoPath: path }) },
          { label: t('cmd.replace'), icon: <GitGraph size={15} />, onClick: () => openModal({ kind: 'replace', repoPath: path }) }
        ]
      },
      {
        label: t('tools.groupFiles'),
        icon: <FileCog size={15} />,
        submenu: [
          { label: t('cmd.attributes'), icon: <FileCog size={15} />, onClick: () => openModal({ kind: 'attributes', repoPath: path }) },
          { label: t('tools.hooks'), icon: <Webhook size={15} />, onClick: () => openModal({ kind: 'hooks', repoPath: path }) },
          { label: t('tools.lfs'), icon: <Boxes size={15} />, onClick: () => openModal({ kind: 'lfs', repoPath: path }) },
          { label: t('tools.sparse'), icon: <FolderTree size={15} />, onClick: () => openModal({ kind: 'sparse', repoPath: path }) },
          { label: t('cmd.clean'), icon: <Trash2 size={15} />, onClick: () => openModal({ kind: 'clean', repoPath: path }) },
          { label: t('tools.applyPatch'), icon: <FileDiff size={15} />, onClick: () => applyPatchFile(false) },
          { label: t('tools.applyPatchAm'), icon: <GitCommit size={15} />, onClick: () => applyPatchFile(true) }
        ]
      },
      {
        label: t('tools.groupRepo'),
        icon: <HardDrive size={15} />,
        submenu: [
          { label: t('cmd.maintenance'), icon: <HardDrive size={15} />, onClick: () => openModal({ kind: 'maintenance', repoPath: path }) },
          { label: t('cmd.bundle'), icon: <Package size={15} />, onClick: () => openModal({ kind: 'export', repoPath: path, tab: 'bundle' }) },
          { label: t('cmd.archive'), icon: <Archive size={15} />, onClick: () => openModal({ kind: 'export', repoPath: path, tab: 'archive' }) },
          { label: t('tools.changelog'), icon: <FileText size={15} />, onClick: () => openModal({ kind: 'changelog-gen', repoPath: path }) },
          { label: t('tools.wiki'), icon: <BookOpen size={15} />, onClick: () => useSettingsStore.getState().openPageTab({ type: 'wiki', repoPath: path }) }
        ]
      },
      {
        label: t('tools.groupSecurity'),
        icon: <KeyRound size={15} />,
        submenu: [
          { label: t('tools.vault'), icon: <KeyRound size={15} />, onClick: () => useSettingsStore.getState().openPageTab({ type: 'vault' }) },
          { label: t('cmd.credentials'), icon: <KeyRound size={15} />, onClick: () => openModal({ kind: 'credentials', repoPath: path }) },
          { label: t('cmd.sshKeys'), icon: <KeyRound size={15} />, onClick: () => openModal({ kind: 'settings', page: 'security' }) },
          { label: t('cmd.secureExport'), icon: <Lock size={15} />, onClick: () => openModal({ kind: 'secure-share', repoPath: path, initialMode: 'export' }) },
          { label: t('cmd.secureImport'), icon: <Lock size={15} />, onClick: () => openModal({ kind: 'secure-share', repoPath: path, initialMode: 'import' }) }
        ]
      }
    ]
  }

  const items: BarItem[] = [
    {
      id: 'undo',
      label: t('toolbar.undo'),
      title: t('toolbar.undoTitle'),
      icon: <Undo2 size={17} />,
      menuIcon: <Undo2 size={15} />,
      disabled: repo.undoStack.length === 0 || inflight,
      run: () => void undo(path)
    },
    {
      id: 'redo',
      label: t('toolbar.redo'),
      title: t('toolbar.redo'),
      icon: <Redo2 size={17} />,
      menuIcon: <Redo2 size={15} />,
      disabled: repo.redoStack.length === 0 || inflight,
      run: () => void redo(path)
    },
    { id: 'sep-1', sep: true },
    {
      id: 'fetch',
      label: t('toolbar.fetch'),
      title: t('toolbar.fetchTitle'),
      icon: busyOp === 'fetch' ? <Loader2 size={17} className="spin" /> : <Download size={17} />,
      menuIcon: <Download size={15} />,
      disabled: inflight,
      run: () => void repoActions.fetchAll(path),
      age: true
    },
    {
      id: 'pull',
      label: t('toolbar.pull'),
      title: t('toolbar.pull'),
      icon: busyOp === 'pull' ? <Loader2 size={17} className="spin" /> : <ArrowDownToLine size={17} />,
      menuIcon: <ArrowDownToLine size={15} />,
      disabled: inflight,
      run: () => void repoActions.pull(path, 'default'),
      menu: pullItems,
      badge: current?.behind
    },
    {
      id: 'push',
      label: t('toolbar.push'),
      title: t('toolbar.push'),
      icon: busyOp === 'push' ? <Loader2 size={17} className="spin" /> : <ArrowUpFromLine size={17} />,
      menuIcon: <ArrowUpFromLine size={15} />,
      disabled: inflight,
      run: () => void repoActions.push(path),
      menu: pushItems,
      badge: current?.ahead
    },
    {
      id: 'branch',
      label: t('toolbar.branch'),
      title: t('toolbar.branchTitle'),
      icon: <GitBranchPlus size={17} />,
      menuIcon: <GitBranchPlus size={15} />,
      run: () => openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })
    },
    {
      id: 'stash',
      label: t('toolbar.stash'),
      title: t('toolbar.stashWip'),
      icon: <Archive size={17} />,
      menuIcon: <Archive size={15} />,
      disabled: inflight,
      run: stashPrompt,
      menu: stashItems
    },
    {
      id: 'pop',
      label: t('stashPanel.pop'),
      title: t('toolbar.popTitle'),
      icon: <ArchiveRestore size={17} />,
      menuIcon: <ArchiveRestore size={15} />,
      disabled: repo.stashes.length === 0 || inflight,
      run: () => void repoActions.stashPop(path, 0)
    },
    {
      id: 'tools',
      label: t('toolbar.tools'),
      title: t('toolbar.toolsTitle'),
      icon: <Wrench size={16} />,
      menuIcon: <Wrench size={15} />,
      menu: toolsItems
    },
    { id: 'sep-2', sep: true },
    {
      id: 'settings',
      label: t('toolbar.settings'),
      title: t('toolbar.settingsTitle'),
      icon: <Settings size={16} />,
      menuIcon: <Settings size={15} />,
      run: () => openModal({ kind: 'repo-settings', repoPath: path })
    }
  ]

  // ── Overflow ────────────────────────────────────────────────────────────
  // A narrow window used to let the action bar run under the search box. Now
  // the tail of it folds into a "More" dropdown instead: every item's natural
  // width is measured while it is on the bar and cached, so a later resize can
  // decide how many still fit without rendering them first.
  const centerRef = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLElement>())
  const widths = useRef(new Map<string, number>())
  const [shown, setShown] = useState(items.length)
  const [avail, setAvail] = useState(0)

  const measureRef = (id: string) => (node: HTMLElement | null): void => {
    if (node) nodes.current.set(id, node)
    else nodes.current.delete(id)
  }

  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setAvail(el.clientWidth))
    ro.observe(el)
    setAvail(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Labels change length with the language, so every cached width is stale the
  // moment it switches — put everything back on the bar and measure again.
  useEffect(() => {
    widths.current.clear()
    setShown(items.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  useLayoutEffect(() => {
    nodes.current.forEach((node, id) => widths.current.set(id, node.offsetWidth))
    const room = centerRef.current?.clientWidth ?? avail
    if (!room) return
    const width = (it: BarItem): number => (widths.current.get(it.id) ?? 0) + ITEM_GAP
    const total = items.reduce((sum, it) => sum + width(it), 0)
    let next = items.length
    if (total > room) {
      let used = MORE_WIDTH
      next = 0
      for (const it of items) {
        if (used + width(it) > room) break
        used += width(it)
        next++
      }
      // A separator with nothing behind it is a stray line, not a divider.
      while (next > 0 && items[next - 1].sep) next--
    }
    if (next !== shown) setShown(next)
  })

  const hidden = items.slice(shown).filter((it): it is Extract<BarItem, { sep?: false }> => !it.sep)

  const moreMenu = (e: React.MouseEvent): void =>
    openAt(
      e,
      hidden.map((it) =>
        it.menu
          ? { label: it.label, icon: it.menuIcon, submenu: it.menu() }
          : { label: it.label, icon: it.menuIcon, disabled: it.disabled, onClick: it.run }
      )
    )

  const renderItem = (item: BarItem): React.JSX.Element => {
    if (item.sep) return <div key={item.id} ref={measureRef(item.id)} className="toolbar-sep" />
    const button = (
      <button
        className={`tool-btn${item.menu ? ' split' : ''}`}
        title={item.title}
        disabled={item.disabled}
        onClick={(e) => (item.run ? item.run() : item.menu && openAt(e, item.menu()))}
      >
        {item.icon}
        <span>
          {item.label}
          {item.badge ? <em className="count-pill">{item.badge}</em> : null}
        </span>
        {item.menu && (
          <span
            className="split-arrow"
            // A button that already opens the menu needs no second control.
            {...(item.run
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-haspopup': 'menu' as const,
                  'aria-label': t('a11y.moreOptions'),
                  onClick: (e: React.MouseEvent) => openAt(e, item.menu!()),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      openAt(e as unknown as React.MouseEvent, item.menu!())
                    }
                  }
                }
              : { 'aria-hidden': true })}
          >
            <ChevronDown size={13} />
          </span>
        )}
      </button>
    )
    if (!item.age) return <div key={item.id} ref={measureRef(item.id)} className="bar-item">{button}</div>
    // The age answers a question you only ask while reaching for the button, so
    // it lives under it on hover rather than in the layout.
    return (
      <div
        key={item.id}
        ref={measureRef(item.id)}
        className="fetch-wrap bar-item"
        onMouseEnter={() => setFetchHover(true)}
        onMouseLeave={() => setFetchHover(false)}
      >
        {button}
        <AnimatePresence>
          {fetchHover && repo.lastFetchAt !== null && (
            <motion.span
              className={`age-hint${fetchStale ? ' stale' : ''}`}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
            >
              <span>{since(repo.lastFetchAt)}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // The sidebar toggle lives on the same edge as the sidebar itself: leftmost
  // when docked left, and after the terminal button when docked right.
  const sidebarToggle = (
    <button
      className={`tool-btn icon-only ${!sidebarCollapsed ? 'toggled' : ''}`}
      title={t('toolbar.sidebarTitle')}
      onClick={toggleSidebar}
    >
      {sidebarSide === 'right' ? <PanelRight size={16} /> : <PanelLeft size={16} />}
    </button>
  )

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {sidebarSide === 'left' && sidebarToggle}
        <RepoStatusPicker repo={repo} />
        <ChevronRight size={14} className="repo-pill-arrow" />
        <BranchStatusPicker repo={repo} />
      </div>

      <div className="toolbar-center" ref={centerRef}>
        {items.slice(0, shown).map(renderItem)}
        {hidden.length > 0 && (
          <button className="tool-btn split" title={t('toolbar.moreTitle')} onClick={moreMenu}>
            <MoreHorizontal size={17} />
            <span>{t('toolbar.more')}</span>
            <span className="split-arrow" aria-hidden="true">
              <ChevronDown size={13} />
            </span>
          </button>
        )}
      </div>

      <div className="toolbar-group right">
        {busy && !busyOp && (
          <span
            className="busy-indicator"
            role="status"
            aria-live="polite"
            title={interp(t('toolbar.fetchedAgo'), { when: since(repo.lastFetchAt) })}
          >
            <Loader2 size={13} className="spin" /> {busy}
          </span>
        )}
        <div className="graph-search">
          <Search size={13} />
          <input
            placeholder={t('toolbar.searchPlaceholder')}
            value={graphFilter}
            onChange={(e) => setGraphFilter(e.target.value)}
          />
        </div>
        <button
          className="tool-btn icon-only"
          title={interp(t('toolbar.refreshTitle'), { time: since(repo.lastRefreshAt) })}
          onClick={() => void useRepoStore.getState().refresh(path)}
        >
          <RefreshCw size={16} />
        </button>
        <button
          className={`tool-btn icon-only ${terminalOpen ? 'toggled' : ''}`}
          title={t('toolbar.terminalTitle')}
          onClick={() => toggleTerminal(repo.path)}
        >
          <TerminalSquare size={16} />
        </button>
        {chatAvailable && (
          <button
            className={`tool-btn icon-only ${chatPanelOpen && rightPanelTab === 'chat' ? 'toggled' : ''}`}
            title={t('chat.toolbarTitle')}
            aria-label={t('chat.toolbarTitle')}
            onClick={() => {
              if (chatPanelOpen && rightPanelTab === 'chat') closeChatPanel()
              else openChatPanel()
            }}
          >
            <MessageSquare size={16} />
          </button>
        )}
        {sidebarSide === 'right' && sidebarToggle}
      </div>
    </div>
  )
}
