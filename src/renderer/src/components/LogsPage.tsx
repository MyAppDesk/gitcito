import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react'
import { logApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import type { ActivityEvent, LogEntry } from '../../../shared/types'

/** Singular, verb-style labels for an operation log row. */
const EVENT_LOG_LABELS: Record<ActivityEvent, string> = {
  commit: 'Committed',
  amend: 'Amended commit',
  push: 'Pushed',
  pull: 'Pulled',
  fetch: 'Fetched',
  branchCreate: 'Created branch',
  branchDelete: 'Deleted branch',
  merge: 'Merged',
  rebase: 'Rebased',
  stash: 'Stashed',
  stashPop: 'Popped stash',
  conflictResolved: 'Resolved conflict',
  tagCreate: 'Created tag',
  cherryPick: 'Cherry-picked',
  revert: 'Reverted',
  repoOpen: 'Opened repo',
  clone: 'Cloned',
  init: 'Initialized repo'
}

function logTimeLabel(ms: number): string {
  const diff = Date.now() - ms
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(ms).toLocaleDateString()
}

/** Full-page operation log: a chronological, append-only record of git
 *  operations gitcito ran, filterable by repository. Opened as a page tab. */
export function LogsPage(): React.JSX.Element {
  const toast = useUIStore((s) => s.toast)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [repoFilter, setRepoFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    try {
      setEntries(await logApi.get())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const clear = async (): Promise<void> => {
    setEntries(await logApi.clear())
    setRepoFilter('all')
    toast('success', 'Log cleared')
  }

  // Distinct repos seen in the log, for the filter dropdown.
  const repos = useMemo(
    () =>
      Array.from(
        new Map(
          entries.filter((e) => e.repoPath).map((e) => [e.repoPath, e.repoName || e.repoPath] as const)
        )
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [entries]
  )

  const filtered = useMemo(
    () =>
      entries
        .filter((e) => repoFilter === 'all' || e.repoPath === repoFilter)
        .slice()
        .reverse(),
    [entries, repoFilter]
  )

  return (
    <div className="changelog-page">
      <motion.div
        className="changelog-inner"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <header className="changelog-header">
          <div className="changelog-title">
            <ScrollText size={20} />
            <div>
              <h1>Operation log</h1>
              <span className="settings-hint">
                Git operations gitcito ran, newest first. Stored locally on this machine.
              </span>
            </div>
          </div>
        </header>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <label className="settings-field" style={{ maxWidth: 280 }}>
            <span className="settings-field-label">Repository</span>
            <select value={repoFilter} onChange={(e) => setRepoFilter(e.target.value)}>
              <option value="all">All repositories</option>
              {repos.map(([path, name]) => (
                <option key={path} value={path}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn ghost small" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : undefined} />
            Refresh
          </button>
          <button
            className="btn ghost small"
            onClick={() => void clear()}
            disabled={entries.length === 0}
            style={{ marginLeft: 'auto' }}
          >
            <Trash2 size={13} />
            Clear log
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="settings-hint">
            {loading ? 'Loading…' : 'No operations recorded yet.'}
          </p>
        ) : (
          <div
            style={{
              border: '1px solid var(--border-soft)',
              borderRadius: 8,
              overflow: 'hidden'
            }}
          >
            {filtered.map((e, i) => (
              <div
                key={`${e.ts}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  fontSize: 13,
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)'
                }}
              >
                {e.ok ? (
                  <CheckCircle2 size={14} color="var(--green)" style={{ flexShrink: 0 }} />
                ) : (
                  <XCircle size={14} color="var(--red)" style={{ flexShrink: 0 }} />
                )}
                <span style={{ color: 'var(--text-1)', flexShrink: 0, minWidth: 130 }}>
                  {EVENT_LOG_LABELS[e.event] ?? e.event}
                </span>
                <span
                  style={{
                    color: 'var(--text-2)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={e.repoPath || 'app'}
                >
                  {e.repoName || 'app'}
                  {!e.ok && e.error ? ` — ${e.error}` : ''}
                </span>
                <span style={{ color: 'var(--text-2)', flexShrink: 0 }} title={new Date(e.ts).toLocaleString()}>
                  {logTimeLabel(e.ts)}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
