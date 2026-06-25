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
import type { PrDetail, PrReviewEvent, PrMergeMethod, PrCheck, PrFile } from '../../../shared/types'
import { hostingApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'
import { autolink, remoteWebUrl } from '../lib/autolink'
import { useT, interp } from '../i18n'

export function PRDetailModal({
  repoPath,
  remoteUrl,
  number
}: {
  repoPath: string
  remoteUrl: string
  number: number
}): React.JSX.Element {
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const profile = useSettingsStore((s) => s.activeProfile())

  const [pr, setPr] = useState<PrDetail | null>(null)
  const [checks, setChecks] = useState<PrCheck[]>([])
  const [files, setFiles] = useState<PrFile[]>([])
  // "Viewed" ticks are local + persisted per repo+PR (GitHub's viewed state isn't
  // exposed via a simple REST call).
  const viewedKey = `gitcito-pr-viewed:${remoteUrl}#${number}`
  const [viewed, setViewed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(viewedKey) || '[]') as string[])
    } catch {
      return new Set()
    }
  })
  const toggleViewed = (f: string): void =>
    setViewed((cur) => {
      const next = new Set(cur)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      localStorage.setItem(viewedKey, JSON.stringify([...next]))
      return next
    })
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
      void hostingApi.prChecks(remoteUrl, tokens, number).then(setChecks).catch(() => setChecks([]))
      void hostingApi.prFiles(remoteUrl, tokens, number).then(setFiles).catch(() => setFiles([]))
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
    void act(() => hostingApi.prComment(remoteUrl, tokens, number, comment.trim()).then(() => setComment('')), t('prDetail.commentPosted'))
  }
  const review = (event: PrReviewEvent): void =>
    void act(() => hostingApi.prReview(remoteUrl, tokens, number, event, comment.trim()).then(() => setComment('')), t('prDetail.reviewSubmitted'))
  const merge = (): void => void act(() => hostingApi.prMerge(remoteUrl, tokens, number, mergeMethod), t('prDetail.prMerged'))

  const replyToThread = (rootId: number): void => {
    const body = (replies[rootId] ?? '').trim()
    if (!body) return
    void act(
      () =>
        hostingApi
          .prReplyReviewComment(remoteUrl, tokens, number, rootId, body)
          .then(() => setReplies((r) => ({ ...r, [rootId]: '' }))),
      t('prDetail.replyPosted')
    )
  }

  const approvals = pr?.reviews.filter((r) => r.state === 'APPROVED').length ?? 0
  const changesReq = pr?.reviews.filter((r) => r.state === 'CHANGES_REQUESTED').length ?? 0
  const canMerge = pr && pr.state === 'open' && !pr.merged

  return (
    <>
      <h3>
        <GitPullRequest size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {loading ? interp(t('prDetail.heading'), { n: number }) : `#${number} ${pr?.title ?? ''}`}
      </h3>

      {loading ? (
        <div className="prd-empty">
          <Loader2 size={15} className="spin" /> {t('prDetail.loading')}
        </div>
      ) : error ? (
        <div className="prd-error">{error}</div>
      ) : pr ? (
        <>
          <div className="prd-meta">
            <span className={`prd-state prd-${pr.merged ? 'merged' : pr.state}`}>
              {pr.merged ? t('prDetail.merged') : pr.draft ? t('prDetail.draft') : pr.state}
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
                  <Check size={12} /> {approvals === 1 ? interp(t('prDetail.approvals'), { n: approvals }) : interp(t('prDetail.approvalsPlural'), { n: approvals })}
                </span>
              )}
              {changesReq > 0 && (
                <span className="prd-changes">
                  <X size={12} /> {changesReq === 1 ? interp(t('prDetail.changeRequests'), { n: changesReq }) : interp(t('prDetail.changeRequestsPlural'), { n: changesReq })}
                </span>
              )}
            </div>
          )}

          {checks.length > 0 && (
            <>
              <div className="prd-section-title">
                {t('prDetail.checks')} <span className="prd-count">{checks.length}</span>
              </div>
              <div className="prd-checks">
                {checks.map((c, i) => {
                  const state = c.status !== 'completed' ? 'pending' : c.conclusion === 'success' ? 'pass' : c.conclusion === 'failure' || c.conclusion === 'timed_out' ? 'fail' : 'neutral'
                  return (
                    <div key={i} className="prd-check">
                      <span className={`prd-check-dot ${state}`} />
                      <span className="prd-check-name">{c.name}</span>
                      <span className="prd-check-state">{c.status === 'completed' ? c.conclusion : c.status}</span>
                      {c.url && (
                        <button className="prd-check-logs" title="View logs" onClick={() => void window.api.openExternal(c.url)}>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {pr.body.trim() && <div className="prd-body">{autolink(pr.body, remoteWebUrl(remoteUrl))}</div>}

          {files.length > 0 && (
            <>
              <div className="prd-section-title">
                {interp(t('prDetail.filesViewed'), { n: `${viewed.size}/${files.length}` })}
              </div>
              <div className="prd-files">
                {files.map((f) => (
                  <label key={f.filename} className={`prd-file ${viewed.has(f.filename) ? 'viewed' : ''}`}>
                    <input type="checkbox" checked={viewed.has(f.filename)} onChange={() => toggleViewed(f.filename)} />
                    <span className={`prd-file-status st-${f.status}`} title={f.status}>
                      {f.status === 'added' ? 'A' : f.status === 'removed' ? 'D' : f.status === 'renamed' ? 'R' : 'M'}
                    </span>
                    <span className="prd-file-name" title={f.filename}>{f.filename}</span>
                    <span className="prd-file-stat">
                      <span className="ins-add">+{f.additions}</span> <span className="ins-del">−{f.deletions}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="prd-section-title">
            {t('prDetail.conversation')} {pr.comments.length > 0 && <span className="prd-count">{pr.comments.length}</span>}
          </div>
          <div className="prd-comments">
            {pr.comments.length === 0 && <div className="prd-no-comments">{t('prDetail.noComments')}</div>}
            {pr.comments.map((c, i) => (
              <div key={i} className="prd-comment">
                <div className="prd-comment-head">
                  <strong>{c.author}</strong>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="prd-comment-body">{autolink(c.body, remoteWebUrl(remoteUrl))}</div>
              </div>
            ))}
          </div>

          {(pr.reviewThreads?.length ?? 0) > 0 && (
            <>
              <div className="prd-section-title">
                {t('prDetail.reviewThreads')} <span className="prd-count">{pr.reviewThreads.length}</span>
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
                        <div className="prd-comment-body">{autolink(c.body, remoteWebUrl(remoteUrl))}</div>
                      </div>
                    ))}
                    <div className="prd-thread-reply">
                      <input
                        className="prd-reply-input"
                        placeholder={t('prDetail.replyPlaceholder')}
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
                        {t('prDetail.reply')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <textarea
            className="prd-input"
            placeholder={t('prDetail.commentPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="modal-actions prd-actions">
            <button className="btn ghost small" onClick={submitComment} disabled={busy || !comment.trim()}>
              <MessageSquare size={13} /> {t('prDetail.comment')}
            </button>
            <button className="btn ghost small prd-approve" onClick={() => review('APPROVE')} disabled={busy}>
              <Check size={13} /> {t('prDetail.approve')}
            </button>
            <button className="btn ghost small prd-reject" onClick={() => review('REQUEST_CHANGES')} disabled={busy}>
              <X size={13} /> {t('prDetail.requestChanges')}
            </button>
            <span className="pr-actions-spacer" />
            {canMerge && (
              <span className="prd-merge">
                <select value={mergeMethod} onChange={(e) => setMergeMethod(e.target.value as PrMergeMethod)}>
                  <option value="merge">{t('prDetail.mergeCommit')}</option>
                  <option value="squash">{t('prDetail.squash')}</option>
                  <option value="rebase">{t('prDetail.rebase')}</option>
                </select>
                <button className="btn primary small" onClick={merge} disabled={busy || pr.mergeable === false}>
                  {busy ? <Loader2 size={13} className="spin" /> : <GitMerge size={13} />} {t('prDetail.merge')}
                </button>
              </span>
            )}
            <button className="btn ghost" onClick={closeModal} disabled={busy}>
              {t('common.close')}
            </button>
          </div>
          {canMerge && pr.mergeable === false && <p className="prd-warn">{t('prDetail.notMergeable')}</p>}
        </>
      ) : null}
    </>
  )
}
