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
  Wand2
} from 'lucide-react'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'

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

  return (
    <div className="toolbar">
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
              initial: ' ',
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
      </div>

      <div className="toolbar-center">
        {busy ? (
          <span className="busy-indicator">
            <Loader2 size={13} className="spin" /> {busy}
          </span>
        ) : (
          <span className="repo-indicator">
            {repo.name} <i>·</i> {repo.branches.current || 'no branch'}
            <i>·</i>
            <span className="repo-sync-time" title={`Fetched ${timeSince(repo.lastFetchAt)}`}>
              fetched {timeSince(repo.lastFetchAt)}
            </span>
          </span>
        )}
      </div>

      <div className="toolbar-group right">
        {aiEnabled && (
          <button
            className="tool-btn"
            title="Generate AI configuration files for this repository"
            onClick={() =>
              openModal({
                kind: 'ai-config-wizard',
                repoPath: path,
                repoName: repo.name
              })
            }
          >
            <Wand2 size={15} />
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
