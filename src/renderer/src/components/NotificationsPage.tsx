import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  RefreshCw,
  CheckCheck,
  Check,
  GitPullRequest,
  CircleDot,
  Tag,
  GitCommit,
  MessagesSquare,
  ExternalLink
} from 'lucide-react'
import { hostingApi, shellApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import type { GitHubNotification } from '../../../shared/types'

/** Friendly label for GitHub's `reason` field. */
const REASON_LABELS: Record<string, string> = {
  assign: 'Assigned',
  author: 'You authored',
  comment: 'New comment',
  ci_activity: 'CI activity',
  invitation: 'Invitation',
  manual: 'Subscribed',
  mention: 'Mentioned',
  push: 'New commits',
  review_requested: 'Review requested',
  security_alert: 'Security alert',
  state_change: 'State changed',
  subscribed: 'Subscribed',
  team_mention: 'Team mentioned'
}

function typeIcon(type: string): React.JSX.Element {
  switch (type) {
    case 'PullRequest':
      return <GitPullRequest size={15} />
    case 'Issue':
      return <CircleDot size={15} />
    case 'Release':
      return <Tag size={15} />
    case 'Commit':
      return <GitCommit size={15} />
    case 'Discussion':
      return <MessagesSquare size={15} />
    default:
      return <Bell size={15} />
  }
}

function timeLabel(sec: number): string {
  const diff = Date.now() - sec * 1000
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(sec * 1000).toLocaleDateString()
}

/** GitHub notifications inbox (token-level, across all repos). Page tab. */
export function NotificationsPage(): React.JSX.Element {
  const toast = useUIStore((s) => s.toast)
  const token = useSettingsStore((s) => s.activeProfile().githubToken) ?? ''

  const [items, setItems] = useState<GitHubNotification[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = async (all = showAll): Promise<void> => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setItems(await hostingApi.listNotifications(token, all))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh(showAll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, showAll])

  const open = (n: GitHubNotification): void => {
    void shellApi.openExternal(n.url)
    if (n.unread) void markRead(n)
  }

  const markRead = async (n: GitHubNotification): Promise<void> => {
    setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
    await hostingApi.markNotificationRead(token, n.id).catch(() => {})
  }

  const markAllRead = async (): Promise<void> => {
    await hostingApi.markAllNotificationsRead(token).catch(() => {})
    setItems((cur) => cur.map((x) => ({ ...x, unread: false })))
    toast('success', 'Marked all as read')
  }

  const unreadCount = useMemo(() => items.filter((i) => i.unread).length, [items])

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
            <Bell size={20} />
            <div>
              <h1>Notifications</h1>
              <span className="settings-hint">
                Your GitHub inbox — review requests, mentions, CI activity and more, across every repo.
              </span>
            </div>
          </div>
        </header>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="codesearch-tabs" style={{ margin: 0 }}>
            <button className={`codesearch-tab ${!showAll ? 'active' : ''}`} onClick={() => setShowAll(false)}>
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
            <button className={`codesearch-tab ${showAll ? 'active' : ''}`} onClick={() => setShowAll(true)}>
              All
            </button>
          </div>
          <button className="btn ghost small" onClick={() => void refresh()} disabled={loading || !token}>
            <RefreshCw size={13} className={loading ? 'spin' : undefined} />
            Refresh
          </button>
          <button
            className="btn ghost small"
            onClick={() => void markAllRead()}
            disabled={!token || unreadCount === 0}
            style={{ marginLeft: 'auto' }}
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        </div>

        {!token ? (
          <p className="settings-hint">
            No GitHub token on this profile. Add one in Settings → Integrations to see your notifications.
          </p>
        ) : items.length === 0 ? (
          <p className="settings-hint">{loading ? 'Loading…' : showAll ? 'No notifications.' : 'No unread notifications. 🎉'}</p>
        ) : (
          <div style={{ border: '1px solid var(--border-soft)', borderRadius: 8, overflow: 'hidden' }}>
            {items.map((n, i) => (
              <div key={n.id} className={`notif-row ${n.unread ? 'unread' : ''}`} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)' }}>
                <span className="notif-dot" />
                <span className="notif-type" title={n.type}>
                  {typeIcon(n.type)}
                </span>
                <button className="notif-main" onClick={() => open(n)}>
                  <span className="notif-title">{n.title}</span>
                  <span className="notif-meta">
                    <span className="notif-reason">{REASON_LABELS[n.reason] ?? n.reason}</span>
                    {' · '}
                    {n.repoFullName}
                    {n.number != null ? ` #${n.number}` : ''}
                    {' · '}
                    {timeLabel(n.updatedAt)}
                  </span>
                </button>
                {n.unread && (
                  <button className="notif-action" title="Mark as read" onClick={() => void markRead(n)}>
                    <Check size={14} />
                  </button>
                )}
                <button className="notif-action" title="Open in browser" onClick={() => open(n)}>
                  <ExternalLink size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
