import { useEffect, useState } from 'react'
import {
  Undo2,
  Redo2,
  ArrowDownToLine,
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
  FolderGit2,
  GitBranch,
  Bell,
  Layers,
  FileText,
  Camera,
  KeyRound,
  Settings,
  Sparkles,
  ArrowLeftRight
} from 'lucide-react'
import type { MenuItem } from '../stores/ui'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'

/** Short human-readable "time since" label, e.g. "now", "3m ago", "2h ago". */
function timeSince(at: number | null): string {
  if (!at) return 'never'
  const diff = (Date.now() - at) / 1000
  if (diff < 10) return 'just now'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function Toolbar({ repo }: { repo: RepoData }): React.JSX.Element {
  const t = useT()
  const { undo, redo } = useRepoStore()
  const { openContextMenu, openModal, toggleTerminal, terminalOpen, graphFilter, setGraphFilter, busy } = useUIStore()
  const busyOp = useUIStore((s) => s.busyOp)
  const githubUnread = useUIStore((s) => s.githubUnread)
  const confirmForcePush = useSettingsStore((s) => s.settings.confirmForcePush)
  const hasGithubToken = useSettingsStore((s) => !!s.activeProfile().githubToken)
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)
  const path = repo.path
  const current = repo.branches.locals.find((b) => b.isCurrent)

  // Re-render every 15s so the relative "last fetched / refreshed" labels stay current.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15000)
    return () => clearInterval(id)
  }, [])

  const pullMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom + 6, [
      { label: t('pull.default'), onClick: () => void repoActions.pull(path, 'default') },
      { label: t('pull.ffOnly'), onClick: () => void repoActions.pull(path, 'ff-only') },
      { label: t('pull.rebase'), onClick: () => void repoActions.pull(path, 'rebase') },
      { separator: true },
      { label: t('pull.fetchPrune'), onClick: () => void repoActions.fetchAll(path) }
    ])
  }

  const pushMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom + 6, [
      { label: t('toolbar.push'), onClick: () => void repoActions.push(path) },
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

  const toolsMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const applyPatchFile = (am: boolean): void => {
      void window.api.openPatch().then((res) => {
        if (res) void repoActions.applyPatch(path, res.content, am)
      })
    }
    openContextMenu(rect.left, rect.bottom + 6, [
      { label: t('tools.reflog'), icon: <History size={15} />, onClick: () => openModal({ kind: 'reflog', repoPath: path }) },
      { label: t('tools.snapshots'), icon: <Camera size={15} />, onClick: () => openModal({ kind: 'snapshots', repoPath: path }) },
      { label: t('tools.vault'), icon: <KeyRound size={15} />, onClick: () => useSettingsStore.getState().openPageTab({ type: 'vault' }) },
      { label: t('tools.bisect'), icon: <Bug size={15} />, onClick: () => openModal({ kind: 'bisect', repoPath: path }) },
      { separator: true },
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
      { label: t('tools.stack'), icon: <Layers size={15} />, onClick: () => openModal({ kind: 'stack', repoPath: path }) },
      { label: t('tools.hooks'), icon: <Webhook size={15} />, onClick: () => openModal({ kind: 'hooks', repoPath: path }) },
      { label: t('tools.lfs'), icon: <Boxes size={15} />, onClick: () => openModal({ kind: 'lfs', repoPath: path }) },
      { label: t('tools.sparse'), icon: <FolderTree size={15} />, onClick: () => openModal({ kind: 'sparse', repoPath: path }) },
      { separator: true },
      { label: t('tools.changelog'), icon: <FileText size={15} />, onClick: () => openModal({ kind: 'changelog-gen', repoPath: path }) },
      { label: t('tools.applyPatch'), icon: <FileDiff size={15} />, onClick: () => applyPatchFile(false) },
      { label: t('tools.applyPatchAm'), icon: <GitCommit size={15} />, onClick: () => applyPatchFile(true) }
    ])
  }

  // Repository switcher — lists every open repo (standalone tabs + group members).
  const repoMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const s = useSettingsStore.getState()
    const items: MenuItem[] = []
    for (const tab of s.settings.tabs) {
      if (tab.kind !== 'repo' && tab.kind !== 'group') continue
      for (const r of tab.repos) {
        items.push({
          label: `${r.path === path ? '✓ ' : '   '}${r.name}`,
          onClick: () => {
            s.setActiveTab(tab.id)
            if (tab.kind === 'group') s.setGroupActiveRepo(tab.id, r.path)
          }
        })
      }
    }
    items.push(
      { separator: true },
      { label: t('tools.openRepo'), icon: <FolderGit2 size={15} />, onClick: () => openModal({ kind: 'launcher' }) }
    )
    openContextMenu(rect.left, rect.bottom + 6, items)
  }

  // Branch switcher — checkout a local branch, or create a new one.
  const branchMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const items: MenuItem[] = repo.branches.locals.map((b) => ({
      label: `${b.isCurrent ? '✓ ' : '   '}${b.name}`,
      onClick: () => {
        if (!b.isCurrent) void repoActions.checkout(path, b.name)
      }
    }))
    items.push(
      { separator: true },
      {
        label: t('tools.newBranch'),
        icon: <GitBranchPlus size={15} />,
        onClick: () => openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })
      }
    )
    openContextMenu(rect.left, rect.bottom + 6, items)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="repo-pill" onClick={repoMenu} title={t('toolbar.switchRepo')}>
          <span className="repo-pill-stack">
            <span className="repo-pill-label">{t('toolbar.repository')}</span>
            <strong>{repo.name}</strong>
          </span>
          <ChevronDown size={13} />
        </button>
        <ChevronRight size={14} className="repo-pill-arrow" />
        <button className="repo-pill" onClick={branchMenu} title={t('toolbar.switchBranch')}>
          <span className="repo-pill-stack">
            <span className="repo-pill-label">branch</span>
            <strong>
              <GitBranch size={12} /> {repo.branches.current || t('toolbar.noBranch')}
            </strong>
          </span>
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="toolbar-center">
      <div className="toolbar-group">
        <button
          className="tool-btn"
          title={t('toolbar.undoTitle')}
          disabled={repo.undoStack.length === 0}
          onClick={() => void undo(path)}
        >
          <Undo2 size={17} />
          <span>{t('toolbar.undo')}</span>
        </button>
        <button
          className="tool-btn"
          title="Redo"
          disabled={repo.redoStack.length === 0}
          onClick={() => void redo(path)}
        >
          <Redo2 size={17} />
          <span>{t('toolbar.redo')}</span>
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button className="tool-btn split" onClick={() => void repoActions.pull(path, 'default')} title={t('toolbar.pull')}>
          {busyOp === 'pull' || busyOp === 'fetch' ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <ArrowDownToLine size={17} />
          )}
          <span>
            {t('toolbar.pull')}
            {current && current.behind > 0 && <em className="count-pill">{current.behind}</em>}
          </span>
          <span className="split-arrow" onClick={pullMenu}>
            <ChevronDown size={13} />
          </span>
        </button>
        <button className="tool-btn split" onClick={() => void repoActions.push(path)} title={t('toolbar.push')}>
          {busyOp === 'push' ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <ArrowUpFromLine size={17} />
          )}
          <span>
            {t('toolbar.push')}
            {current && current.ahead > 0 && <em className="count-pill">{current.ahead}</em>}
          </span>
          <span className="split-arrow" onClick={pushMenu}>
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
          title="Stash work in progress"
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
          <span>Stash</span>
          <span className="split-arrow" onClick={(e) => {
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
          disabled={repo.stashes.length === 0}
          onClick={() => void repoActions.stashPop(path, 0)}
        >
          <ArchiveRestore size={17} />
          <span>{t('stashPanel.pop')}</span>
        </button>
        {aiEnabled && (
          <button
            className="tool-btn"
            title={t('toolbar.runTitle')}
            onClick={() => openModal({ kind: 'ai-config-wizard', repoPath: path, repoName: repo.name, initialTab: 'ask' })}
          >
            <Sparkles size={16} />
            <span>{t('toolbar.run')}</span>
          </button>
        )}
        <button className="tool-btn split" title={t('toolbar.toolsTitle')} onClick={toolsMenu}>
          <Wrench size={16} />
          <span>{t('toolbar.tools')}</span>
          <span className="split-arrow">
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
          <span className="busy-indicator" title={`Fetched ${timeSince(repo.lastFetchAt)}`}>
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
        {hasGithubToken && (
          <button
            className="tool-btn icon-only notif-bell"
            title={t('toolbar.notifTitle')}
            onClick={() => useSettingsStore.getState().openPageTab({ type: 'notifications' })}
          >
            <Bell size={16} />
            {githubUnread > 0 && <span className="notif-badge">{githubUnread > 99 ? '99+' : githubUnread}</span>}
          </button>
        )}
        <button
          className="tool-btn icon-only"
          title={interp(t('toolbar.refreshTitle'), { time: timeSince(repo.lastRefreshAt) })}
          onClick={() => void useRepoStore.getState().refresh(path)}
        >
          <RefreshCw size={16} />
        </button>
        <button
          className={`tool-btn icon-only ${terminalOpen ? 'toggled' : ''}`}
          title={t('toolbar.terminalTitle')}
          onClick={toggleTerminal}
        >
          <TerminalSquare size={16} />
        </button>
      </div>
    </div>
  )
}
