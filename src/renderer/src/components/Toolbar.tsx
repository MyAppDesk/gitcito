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
  GitBranch
} from 'lucide-react'
import type { MenuItem } from '../stores/ui'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import gitcitoIcon from '../assets/gitcito_icon.png'

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
  const { undo, redo } = useRepoStore()
  const { openContextMenu, openModal, toggleTerminal, terminalOpen, graphFilter, setGraphFilter, busy } = useUIStore()
  const confirmForcePush = useSettingsStore((s) => s.settings.confirmForcePush)
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
      { label: 'Pull (default)', onClick: () => void repoActions.pull(path, 'default') },
      { label: 'Pull — fast-forward only', onClick: () => void repoActions.pull(path, 'ff-only') },
      { label: 'Pull — rebase', onClick: () => void repoActions.pull(path, 'rebase') },
      { separator: true },
      { label: 'Fetch all & prune', onClick: () => void repoActions.fetchAll(path) }
    ])
  }

  const pushMenu = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom + 6, [
      { label: 'Push', onClick: () => void repoActions.push(path) },
      {
        label: 'Force push (with lease)',
        danger: true,
        onClick: () => {
          if (!confirmForcePush) {
            void repoActions.push(path, true)
            return
          }
          openModal({
            kind: 'confirm',
            title: 'Force push',
            message: `Force push ${repo.branches.current} to its remote? This rewrites remote history.`,
            danger: true,
            confirmLabel: 'Force push',
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
      { label: 'Reflog — recover lost commits', icon: <History size={15} />, onClick: () => openModal({ kind: 'reflog', repoPath: path }) },
      { label: 'Bisect — find a bad commit', icon: <Bug size={15} />, onClick: () => openModal({ kind: 'bisect', repoPath: path }) },
      { separator: true },
      { label: 'Git hooks…', icon: <Webhook size={15} />, onClick: () => openModal({ kind: 'hooks', repoPath: path }) },
      { label: 'Git LFS…', icon: <Boxes size={15} />, onClick: () => openModal({ kind: 'lfs', repoPath: path }) },
      { label: 'Sparse-checkout…', icon: <FolderTree size={15} />, onClick: () => openModal({ kind: 'sparse', repoPath: path }) },
      { separator: true },
      { label: 'Apply patch to working tree…', icon: <FileDiff size={15} />, onClick: () => applyPatchFile(false) },
      { label: 'Apply patch & commit (git am)…', icon: <GitCommit size={15} />, onClick: () => applyPatchFile(true) }
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
      { label: 'Open repository…', icon: <FolderGit2 size={15} />, onClick: () => openModal({ kind: 'launcher' }) }
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
        label: 'New branch…',
        icon: <GitBranchPlus size={15} />,
        onClick: () => openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })
      }
    )
    openContextMenu(rect.left, rect.bottom + 6, items)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="repo-pill" onClick={repoMenu} title="Switch repository">
          <span className="repo-pill-stack">
            <span className="repo-pill-label">repository</span>
            <strong>{repo.name}</strong>
          </span>
          <ChevronDown size={13} />
        </button>
        <ChevronRight size={14} className="repo-pill-arrow" />
        <button className="repo-pill" onClick={branchMenu} title="Switch branch">
          <span className="repo-pill-stack">
            <span className="repo-pill-label">branch</span>
            <strong>
              <GitBranch size={12} /> {repo.branches.current || 'no branch'}
            </strong>
          </span>
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="toolbar-center">
      <div className="toolbar-group">
        <button
          className="tool-btn"
          title="Undo last operation"
          disabled={repo.undoStack.length === 0}
          onClick={() => void undo(path)}
        >
          <Undo2 size={17} />
          <span>Undo</span>
        </button>
        <button
          className="tool-btn"
          title="Redo"
          disabled={repo.redoStack.length === 0}
          onClick={() => void redo(path)}
        >
          <Redo2 size={17} />
          <span>Redo</span>
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button className="tool-btn split" onClick={() => void repoActions.pull(path, 'default')} title="Pull">
          <ArrowDownToLine size={17} />
          <span>
            Pull
            {current && current.behind > 0 && <em className="count-pill">{current.behind}</em>}
          </span>
          <span className="split-arrow" onClick={pullMenu}>
            <ChevronDown size={13} />
          </span>
        </button>
        <button className="tool-btn split" onClick={() => void repoActions.push(path)} title="Push">
          <ArrowUpFromLine size={17} />
          <span>
            Push
            {current && current.ahead > 0 && <em className="count-pill">{current.ahead}</em>}
          </span>
          <span className="split-arrow" onClick={pushMenu}>
            <ChevronDown size={13} />
          </span>
        </button>
        <button
          className="tool-btn"
          title="Create branch at HEAD"
          onClick={() => openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })}
        >
          <GitBranchPlus size={17} />
          <span>Branch</span>
        </button>
        <button
          className="tool-btn"
          title="Stash work in progress"
          onClick={() =>
            openModal({
              kind: 'input',
              title: 'Stash changes',
              label: 'Stash message (optional)',
              placeholder: 'WIP on login form',
              allowEmpty: true,
              submitLabel: 'Stash',
              onSubmit: (msg) => void repoActions.stash(path, msg.trim() || undefined)
            })
          }
        >
          <Archive size={17} />
          <span>Stash</span>
        </button>
        <button
          className="tool-btn"
          title="Pop latest stash"
          disabled={repo.stashes.length === 0}
          onClick={() => void repoActions.stashPop(path, 0)}
        >
          <ArchiveRestore size={17} />
          <span>Pop</span>
        </button>
        <button className="tool-btn split" title="Reflog, bisect, hooks, LFS, patches" onClick={toolsMenu}>
          <Wrench size={16} />
          <span>Tools</span>
          <span className="split-arrow">
            <ChevronDown size={13} />
          </span>
        </button>
      </div>

      </div>

      <div className="toolbar-group right">
        {busy && (
          <span className="busy-indicator" title={`Fetched ${timeSince(repo.lastFetchAt)}`}>
            <Loader2 size={13} className="spin" /> {busy}
          </span>
        )}
        {aiEnabled && (
          <button
            className="tool-btn"
            title="Ask the AI to act on this repo, or generate AI configuration files"
            onClick={() =>
              openModal({
                kind: 'ai-config-wizard',
                repoPath: path,
                repoName: repo.name
              })
            }
          >
            <img src={gitcitoIcon} alt="" className="tool-btn-icon" width={15} height={15} />
            <span>AI Config</span>
          </button>
        )}
        <div className="graph-search">
          <Search size={13} />
          <input
            placeholder="Search commits, authors, SHAs…"
            value={graphFilter}
            onChange={(e) => setGraphFilter(e.target.value)}
          />
        </div>
        <button
          className="tool-btn icon-only"
          title={`Refresh (last refreshed ${timeSince(repo.lastRefreshAt)})`}
          onClick={() => void useRepoStore.getState().refresh(path)}
        >
          <RefreshCw size={16} />
        </button>
        <button
          className={`tool-btn icon-only ${terminalOpen ? 'toggled' : ''}`}
          title="Toggle terminal"
          onClick={toggleTerminal}
        >
          <TerminalSquare size={16} />
        </button>
      </div>
    </div>
  )
}
