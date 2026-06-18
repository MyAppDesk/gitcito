import { useCallback, useEffect, useState } from 'react'
import {
  CircleDot,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Tag,
  User,
  Milestone,
  GitPullRequest,
  GitBranchPlus,
  MessageSquare
} from 'lucide-react'
import type { IssueDetail, PageContent } from '../../../shared/types'
import { hostingApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'

type IssuePage = Extract<PageContent, { type: 'issue' }>

export function IssueDetailPage({ page }: { page: IssuePage }): React.JSX.Element {
  const { repoPath, remoteUrl, issue } = page
  const toast = useUIStore((s) => s.toast)
  const openModal = useUIStore((s) => s.openModal)
  const profile = useSettingsStore((s) => s.activeProfile())
  const tokens = { github: profile.githubToken || undefined }

  const [detail, setDetail] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      setDetail(await hostingApi.issueDetail(remoteUrl, tokens, issue.number))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteUrl, issue.number])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const act = async (fn: () => Promise<void>, ok: string): Promise<void> => {
    setBusy(true)
    try {
      await fn()
      await load()
      void useRepoStore.getState().refreshIssues(repoPath, { silent: true })
      toast('success', ok)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const postComment = (): void => {
    if (!comment.trim()) return
    void act(() => hostingApi.prComment(remoteUrl, tokens, issue.number, comment.trim()).then(() => setComment('')), 'Comment posted')
  }
  const toggleState = (): void => {
    const next = detail?.state === 'open' ? 'closed' : 'open'
    void act(() => hostingApi.setIssueState(remoteUrl, tokens, issue.number, next), next === 'closed' ? 'Issue closed' : 'Issue reopened')
  }
  const createBranch = (): void => {
    openModal({
      kind: 'create-branch',
      path: repoPath,
      currentBranch: useRepoStore.getState().repos[repoPath]?.branches.current,
      description: `${issue.title} (closes #${issue.number})`
    })
  }

  return (
    <div className="issue-page">
      <div className="issue-main">
        <div className="issue-head">
          <span className={`issue-state issue-${detail?.state ?? issue.state}`}>
            {(detail?.state ?? issue.state) === 'closed' ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}
            {(detail?.state ?? issue.state) === 'closed' ? 'Closed' : 'Open'}
          </span>
          <h2>
            {detail?.title ?? issue.title} <span className="issue-num">#{issue.number}</span>
          </h2>
          <button className="icon-btn" title="Open in browser" onClick={() => void window.api.openExternal(issue.url)}>
            <ExternalLink size={15} />
          </button>
        </div>

        {loading ? (
          <div className="issue-loading">
            <Loader2 size={16} className="spin" /> Loading…
          </div>
        ) : error ? (
          <div className="issue-error">{error}</div>
        ) : detail ? (
          <>
            <div className="issue-by">
              {detail.author} opened this · {new Date(detail.createdAt).toLocaleString()}
            </div>
            {detail.body.trim() ? (
              <div className="issue-body">{detail.body}</div>
            ) : (
              <div className="issue-body issue-body-empty">No description provided.</div>
            )}

            <div className="issue-section-title">
              <MessageSquare size={13} /> Conversation
              {detail.comments.length > 0 && <span className="issue-count">{detail.comments.length}</span>}
            </div>
            {detail.comments.map((c, i) => (
              <div key={i} className="issue-comment">
                <div className="issue-comment-head">
                  <strong>{c.author}</strong>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="issue-comment-body">{c.body}</div>
              </div>
            ))}

            <textarea
              className="issue-input"
              placeholder="Leave a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="issue-actions">
              <button className="btn ghost small" onClick={postComment} disabled={busy || !comment.trim()}>
                <MessageSquare size={13} /> Comment
              </button>
              <button className="btn ghost small" onClick={toggleState} disabled={busy}>
                {detail.state === 'open' ? 'Close issue' : 'Reopen issue'}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <aside className="issue-side">
        <button className="btn primary small issue-branch-btn" onClick={createBranch}>
          <GitBranchPlus size={13} /> Create branch for issue
        </button>

        <div className="issue-field">
          <div className="issue-field-label">
            <User size={12} /> Assignees
          </div>
          <div className="issue-field-val">
            {detail?.assignees.length ? detail.assignees.join(', ') : <span className="issue-none">None</span>}
          </div>
        </div>
        <div className="issue-field">
          <div className="issue-field-label">
            <Tag size={12} /> Labels
          </div>
          <div className="issue-field-val">
            {detail?.labels.length ? (
              <span className="issue-labels">
                {detail.labels.map((l) => (
                  <span key={l} className="issue-label">
                    {l}
                  </span>
                ))}
              </span>
            ) : (
              <span className="issue-none">None</span>
            )}
          </div>
        </div>
        <div className="issue-field">
          <div className="issue-field-label">
            <Milestone size={12} /> Milestone
          </div>
          <div className="issue-field-val">{detail?.milestone ?? <span className="issue-none">None</span>}</div>
        </div>
        <div className="issue-field">
          <div className="issue-field-label">
            <GitPullRequest size={12} /> Linked PRs
          </div>
          <div className="issue-field-val">
            {detail?.linkedPrs.length ? (
              detail.linkedPrs.map((pr) => (
                <a
                  key={pr.number}
                  href="#"
                  className="issue-linked-pr"
                  title={pr.title}
                  onClick={(e) => {
                    e.preventDefault()
                    void window.api.openExternal(pr.url)
                  }}
                >
                  #{pr.number} {pr.title}
                </a>
              ))
            ) : (
              <span className="issue-none">None</span>
            )}
          </div>
        </div>
        <p className="issue-side-note">
          Linked branches created via GitHub&apos;s “Create a branch” aren&apos;t exposed by the REST API, so they
          can&apos;t be listed here.
        </p>
      </aside>
    </div>
  )
}
