import { useCallback, useEffect, useState } from 'react'
import {
  GitPullRequest,
  Loader2,
  ExternalLink,
  Check,
  X,
  MessageSquare,
  GitMerge
} from 'lucide-react'
import type { PrDetail, PrReviewEvent, PrMergeMethod } from '../../../shared/types'
import { hostingApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'

export function PRDetailModal({
  repoPath,
  remoteUrl,
  number
}: {
  repoPath: string
  remoteUrl: string
  number: number
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const profile = useSettingsStore((s) => s.activeProfile())

  const [pr, setPr] = useState<PrDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<PrMergeMethod>('merge')
  // Per-thread reply drafts, keyed by the thread root id.
  const [replies, setReplies] = useState<Record<number, string>>({})

  const tokens = { github: profile.githubToken || undefined }

  const load = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      setPr(await hostingApi.prDetail(remoteUrl, tokens, number))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteUrl, number])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const act = async (fn: () => Promise<void>, ok: string): Promise<void> => {
    setBusy(true)
    try {
      await fn()
      await load()
      void useRepoStore.getState().refreshPRs(repoPath, { silent: true })
      toast('success', ok)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const submitComment = (): void => {
    if (!comment.trim()) return
    void act(() => hostingApi.prComment(remoteUrl, tokens, number, comment.trim()).then(() => setComment('')), 'Comment posted')
  }
  const review = (event: PrReviewEvent): void =>
    void act(() => hostingApi.prReview(remoteUrl, tokens, number, event, comment.trim()).then(() => setComment('')), `Review submitted`)
  const merge = (): void => void act(() => hostingApi.prMerge(remoteUrl, tokens, number, mergeMethod), 'Pull request merged')

  const replyToThread = (rootId: number): void => {
    const body = (replies[rootId] ?? '').trim()
    if (!body) return
    void act(
      () =>
        hostingApi
          .prReplyReviewComment(remoteUrl, tokens, number, rootId, body)
          .then(() => setReplies((r) => ({ ...r, [rootId]: '' }))),
      'Reply posted'
    )
  }

  const approvals = pr?.reviews.filter((r) => r.state === 'APPROVED').length ?? 0
  const changesReq = pr?.reviews.filter((r) => r.state === 'CHANGES_REQUESTED').length ?? 0
  const canMerge = pr && pr.state === 'open' && !pr.merged

  return (
    <>
      <h3>
        <GitPullRequest size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {loading ? `Pull request #${number}` : `#${number} ${pr?.title ?? ''}`}
      </h3>

      {loading ? (
        <div className="prd-empty">
          <Loader2 size={15} className="spin" /> Loading…
        </div>
      ) : error ? (
        <div className="prd-error">{error}</div>
      ) : pr ? (
        <>
          <div className="prd-meta">
            <span className={`prd-state prd-${pr.merged ? 'merged' : pr.state}`}>
              {pr.merged ? 'Merged' : pr.draft ? 'Draft' : pr.state}
            </span>
            <span className="prd-branches">
              <code>{pr.source}</code> → <code>{pr.target}</code>
            </span>
            <span className="prd-author">by {pr.author}</span>
            <button className="icon-btn" title="Open in browser" onClick={() => void window.api.openExternal(pr.url)}>
              <ExternalLink size={13} />
            </button>
          </div>

          {(approvals > 0 || changesReq > 0) && (
            <div className="prd-review-summary">
              {approvals > 0 && (
                <span className="prd-approved">
                  <Check size={12} /> {approvals} approval{approvals === 1 ? '' : 's'}
                </span>
              )}
              {changesReq > 0 && (
                <span className="prd-changes">
                  <X size={12} /> {changesReq} change request{changesReq === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}

          {pr.body.trim() && <div className="prd-body">{pr.body}</div>}

          <div className="prd-section-title">
            Conversation {pr.comments.length > 0 && <span className="prd-count">{pr.comments.length}</span>}
          </div>
          <div className="prd-comments">
            {pr.comments.length === 0 && <div className="prd-no-comments">No comments yet.</div>}
            {pr.comments.map((c, i) => (
              <div key={i} className="prd-comment">
                <div className="prd-comment-head">
                  <strong>{c.author}</strong>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="prd-comment-body">{c.body}</div>
              </div>
            ))}
          </div>

          {pr.reviewThreads.length > 0 && (
            <>
              <div className="prd-section-title">
                Review threads <span className="prd-count">{pr.reviewThreads.length}</span>
              </div>
              <div className="prd-threads">
                {pr.reviewThreads.map((th) => (
                  <div key={th.rootId} className="prd-thread">
                    <div className="prd-thread-loc" title={th.path}>
                      {th.path}
                      {th.line != null ? `:${th.line}` : ''}
                    </div>
                    {th.diffHunk && (
                      <pre className="prd-thread-hunk">
                        {th.diffHunk.split('\n').slice(-4).join('\n')}
                      </pre>
                    )}
                    {th.comments.map((c) => (
                      <div key={c.id} className="prd-comment">
                        <div className="prd-comment-head">
                          <strong>{c.author}</strong>
                          <span>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="prd-comment-body">{c.body}</div>
                      </div>
                    ))}
                    <div className="prd-thread-reply">
                      <input
                        className="prd-reply-input"
                        placeholder="Reply…"
                        value={replies[th.rootId] ?? ''}
                        onChange={(e) => setReplies((r) => ({ ...r, [th.rootId]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') replyToThread(th.rootId)
                        }}
                      />
                      <button
                        className="btn ghost tiny"
                        onClick={() => replyToThread(th.rootId)}
                        disabled={busy || !(replies[th.rootId] ?? '').trim()}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <textarea
            className="prd-input"
            placeholder="Leave a comment…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="modal-actions prd-actions">
            <button className="btn ghost small" onClick={submitComment} disabled={busy || !comment.trim()}>
              <MessageSquare size={13} /> Comment
            </button>
            <button className="btn ghost small prd-approve" onClick={() => review('APPROVE')} disabled={busy}>
              <Check size={13} /> Approve
            </button>
            <button className="btn ghost small prd-reject" onClick={() => review('REQUEST_CHANGES')} disabled={busy}>
              <X size={13} /> Request changes
            </button>
            <span className="pr-actions-spacer" />
            {canMerge && (
              <span className="prd-merge">
                <select value={mergeMethod} onChange={(e) => setMergeMethod(e.target.value as PrMergeMethod)}>
                  <option value="merge">Merge commit</option>
                  <option value="squash">Squash</option>
                  <option value="rebase">Rebase</option>
                </select>
                <button className="btn primary small" onClick={merge} disabled={busy || pr.mergeable === false}>
                  {busy ? <Loader2 size={13} className="spin" /> : <GitMerge size={13} />} Merge
                </button>
              </span>
            )}
            <button className="btn ghost" onClick={closeModal} disabled={busy}>
              Close
            </button>
          </div>
          {canMerge && pr.mergeable === false && <p className="prd-warn">GitHub reports this PR is not mergeable (conflicts).</p>}
        </>
      ) : null}
    </>
  )
}
