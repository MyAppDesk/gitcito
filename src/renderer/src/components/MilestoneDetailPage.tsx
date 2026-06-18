import { useEffect, useState } from 'react'
import { Milestone, Loader2, ExternalLink, CircleDot, CheckCircle2, CalendarClock } from 'lucide-react'
import type { IssueInfo, PageContent } from '../../../shared/types'
import { hostingApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'

type MilestonePage = Extract<PageContent, { type: 'milestone' }>

export function MilestoneDetailPage({ page }: { page: MilestonePage }): React.JSX.Element {
  const { repoPath, remoteUrl, milestone } = page
  const profile = useSettingsStore((s) => s.activeProfile())
  const openPageTab = useSettingsStore((s) => s.openPageTab)
  const tokens = { github: profile.githubToken || undefined }

  const [issues, setIssues] = useState<IssueInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    hostingApi
      .milestoneIssues(remoteUrl, tokens, milestone.number)
      .then((is) => !cancelled && setIssues(is))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteUrl, milestone.number])

  const total = milestone.openIssues + milestone.closedIssues
  const pct = total > 0 ? Math.round((milestone.closedIssues / total) * 100) : 0

  return (
    <div className="ms-page">
      <div className="ms-head">
        <span className={`issue-state issue-${milestone.state}`}>
          <Milestone size={14} />
          {milestone.state === 'closed' ? 'Closed' : 'Open'}
        </span>
        <h2>{milestone.title}</h2>
        <button className="icon-btn" title="Open in browser" onClick={() => void window.api.openExternal(milestone.url)}>
          <ExternalLink size={15} />
        </button>
      </div>

      <div className="ms-meta">
        {milestone.dueOn && (
          <span className="ms-due">
            <CalendarClock size={13} /> Due {new Date(milestone.dueOn).toLocaleDateString()}
          </span>
        )}
        <span className="ms-counts">
          {milestone.openIssues} open · {milestone.closedIssues} closed
        </span>
      </div>

      <div className="ms-progress">
        <div className="ms-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="ms-progress-label">{pct}% complete</div>

      {milestone.description.trim() && <div className="issue-body">{milestone.description}</div>}

      <div className="issue-section-title">Issues</div>
      {loading ? (
        <div className="issue-loading">
          <Loader2 size={16} className="spin" /> Loading…
        </div>
      ) : error ? (
        <div className="issue-error">{error}</div>
      ) : issues.length === 0 ? (
        <div className="ms-empty">No issues in this milestone.</div>
      ) : (
        <div className="ms-issues">
          {issues.map((i) => (
            <div
              key={i.number}
              className="ms-issue"
              onClick={() => openPageTab({ type: 'issue', issue: i, repoPath, remoteUrl })}
              title={i.title}
            >
              {i.state === 'closed' ? (
                <CheckCircle2 size={13} className="ms-issue-closed" />
              ) : (
                <CircleDot size={13} className="ms-issue-open" />
              )}
              <span className="ms-issue-title">
                #{i.number} {i.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
