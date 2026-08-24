import { useEffect, useState } from 'react'
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

  const pullMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom + 6, [
      { label: t('pull.default'), onClick: () => void repoActions.pull(path, 'default') },
      { label: t('pull.ffOnly'), onClick: () => void repoActions.pull(path, 'ff-only') },
      { label: t('pull.rebase'), onClick: () => void repoActions.pull(path, 'rebase') }
    ])
  }

  const pushMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom + 6, [
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
    ])
  }

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

  const toolsMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const applyPatchFile = (am: boolean): void => {
      void window.api.openPatch().then((res) => {
        if (res) void repoActions.applyPatch(path, res.content, am)
      })
    }
    // The dropdown mirrors the command palette: everything reachable by ⌘K that
    // belongs to a repository is here too, with the rarely-used two thirds
    // folded into groups so the list stays readable.
    openContextMenu(rect.left, rect.bottom + 6, [
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
    ])
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

      <div className="toolbar-center">
      <div className="toolbar-group">
        <button
          className="tool-btn"
          title={t('toolbar.undoTitle')}
          disabled={repo.undoStack.length === 0 || inflight}
          onClick={() => void undo(path)}
        >
          <Undo2 size={17} />
          <span>{t('toolbar.undo')}</span>
        </button>
        <button
          className="tool-btn"
          title={t('toolbar.redo')}
          disabled={repo.redoStack.length === 0 || inflight}
          onClick={() => void redo(path)}
        >
          <Redo2 size={17} />
          <span>{t('toolbar.redo')}</span>
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        {/* The age answers a question you only ask while reaching for the
            button, so it lives under it on hover rather than in the layout. */}
        <div
          className="fetch-wrap"
          onMouseEnter={() => setFetchHover(true)}
          onMouseLeave={() => setFetchHover(false)}
        >
          <button
            className="tool-btn"
            disabled={inflight}
            onClick={() => void repoActions.fetchAll(path)}
            title={t('toolbar.fetchTitle')}
          >
            {busyOp === 'fetch' ? <Loader2 size={17} className="spin" /> : <Download size={17} />}
            <span>{t('toolbar.fetch')}</span>
          </button>
          <AnimatePresence>
            {fetchHover && repo.lastFetchAt !== null && (
              <motion.span
                className={`age-hint${fetchStale ? ' stale' : ''}`}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
              >
                {since(repo.lastFetchAt)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button className="tool-btn split" disabled={inflight} onClick={() => void repoActions.pull(path, 'default')} title={t('toolbar.pull')}>
          {busyOp === 'pull' ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <ArrowDownToLine size={17} />
          )}
          <span>
            {t('toolbar.pull')}
            {current && current.behind > 0 && <em className="count-pill">{current.behind}</em>}
          </span>
          <span
            className="split-arrow"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-label={t('a11y.moreOptions')}
            onClick={pullMenu}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                pullMenu(e as unknown as React.MouseEvent)
              }
            }}
          >
            <ChevronDown size={13} />
          </span>
        </button>
        <button className="tool-btn split" disabled={inflight} onClick={() => void repoActions.push(path)} title={t('toolbar.push')}>
          {busyOp === 'push' ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <ArrowUpFromLine size={17} />
          )}
          <span>
            {t('toolbar.push')}
            {current && current.ahead > 0 && <em className="count-pill">{current.ahead}</em>}
          </span>
          <span
            className="split-arrow"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-label={t('a11y.moreOptions')}
            onClick={pushMenu}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                pushMenu(e as unknown as React.MouseEvent)
              }
            }}
          >
            <ChevronDown size={13} />
          </span>
        </button>
        <button
          className="tool-btn"
          title={t('toolbar.branchTitle')}
          onClick={() => openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })}
        >
          <GitBranchPlus size={17} />
          <span>{t('toolbar.branch')}</span>
        </button>
        <button
          className="tool-btn split"
          title={t('toolbar.stashWip')}
          disabled={inflight}
          onClick={() =>
            openModal({
              kind: 'input',
              title: t('stash.title'),
              label: t('stash.msgLabel'),
              placeholder: t('stash.msgPlaceholder'),
              allowEmpty: true,
              submitLabel: t('stash.submit'),
              onSubmit: (msg) => void repoActions.stash(path, msg.trim() || undefined)
            })
          }
        >
          <Archive size={17} />
          <span>{t('toolbar.stash')}</span>
          <span
            className="split-arrow"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-label={t('a11y.moreOptions')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                ;(e.currentTarget as HTMLElement).click()
              }
            }}
            onClick={(e) => {
              e.stopPropagation()
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              openContextMenu(rect.left, rect.bottom + 6, [
                {
                  label: t('stash.allChanges'),
                  icon: <Archive size={15} />,
                  onClick: () =>
                    openModal({
                      kind: 'input',
                      title: t('stash.title'),
                      label: t('stash.msgLabel'),
                      placeholder: t('stash.msgPlaceholder'),
                      allowEmpty: true,
                      submitLabel: t('stash.submit'),
                      onSubmit: (msg) => void repoActions.stash(path, msg.trim() || undefined)
                    })
                },
                {
                  label: t('stash.selectedFiles'),
                  icon: <Archive size={15} />,
                  onClick: () => openModal({ kind: 'stash-partial', repoPath: path })
                }
              ])
            }}
          >
            <ChevronDown size={13} />
          </span>
        </button>
        <button
          className="tool-btn"
          title={t('toolbar.popTitle')}
          disabled={repo.stashes.length === 0 || inflight}
          onClick={() => void repoActions.stashPop(path, 0)}
        >
          <ArchiveRestore size={17} />
          <span>{t('stashPanel.pop')}</span>
        </button>
        <button className="tool-btn split" title={t('toolbar.toolsTitle')} onClick={toolsMenu}>
          <Wrench size={16} />
          <span>{t('toolbar.tools')}</span>
          <span className="split-arrow" aria-hidden="true">
            <ChevronDown size={13} />
          </span>
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button
          className="tool-btn"
          title={t('toolbar.settingsTitle')}
          onClick={() => openModal({ kind: 'repo-settings', repoPath: path })}
        >
          <Settings size={16} />
          <span>{t('toolbar.settings')}</span>
        </button>
      </div>

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
