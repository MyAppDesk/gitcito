import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  GitPullRequest,
  GitPullRequestArrow,
  GitPullRequestClosed,
  GitPullRequestDraft,
  GitMerge,
  GitBranch,
  GitCommitHorizontal,
  Loader2,
  ExternalLink,
  RefreshCw,
  Check,
  X,
  MessageSquare,
  Clock,
  User,
  Users,
  UserCheck,
  Tag,
  Milestone,
  FileDiff,
  CircleDot,
  CalendarDays
} from 'lucide-react'
import type { PageContent, PrCheck, PrDetail, PrFile, PrMergeMethod, PrReviewEvent } from '../../../shared/types'
import { hostingApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'
import { prRemoteIdentity } from '../lib/hosting'
import { autolink, remoteWebUrl } from '../lib/autolink'
import {
  checkCounts,
  checkState,
  labelColor,
  labelTextColor,
  participants,
  prStatus,
  reviewerStates,
  type ReviewerState
} from '../lib/prSummary'
import { DiffViewer } from './DiffViewer'
import { guessLanguage } from '../lib/highlight'
import { isSecretFile } from '../lib/secrets'
import { useT, interp, type TranslationKey } from '../i18n'

type PrPage = Extract<PageContent, { type: 'pr' }>
type Section = 'conversation' | 'files' | 'checks'

const REVIEW_KEY: Record<ReviewerState, TranslationKey> = {
  APPROVED: 'prPage.reviewApproved',
  CHANGES_REQUESTED: 'prPage.reviewChanges',
  COMMENTED: 'prPage.reviewCommented',
  PENDING: 'prPage.reviewPending'
}

const STATUS_KEY = {
  open: 'prPage.stateOpen',
  draft: 'prDetail.draft',
  merged: 'prDetail.merged',
  closed: 'prPage.stateClosed'
} as const satisfies Record<ReturnType<typeof prStatus>, TranslationKey>

const fmtDate = (iso: string | null | undefined): string => (iso ? new Date(iso).toLocaleString() : '')

/**
 * A pull request as a page of its own: the conversation, files and checks in
 * the main column, and everything *about* the PR — who, when, where it goes,
 * how big it is, who still has to review it — in a sidebar. Replaces the modal,
 * which crammed all of it into one scrolling column.
 */
export function PrDetailPage({ page }: { page: PrPage }): React.JSX.Element {
  const { repoPath, remoteUrl, number } = page
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const profile = useSettingsStore((s) => s.activeProfile())
  const provider = useRepoStore((s) => s.repos[repoPath]?.prProvider)

  const [pr, setPr] = useState<PrDetail | null>(null)
  const [checks, setChecks] = useState<PrCheck[] | null>(null)
  const [files, setFiles] = useState<PrFile[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('conversation')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<PrMergeMethod>('merge')
  // Per-thread reply drafts, keyed by the thread root id (GitHub comment id or
  // GitLab discussion id).
  const [replies, setReplies] = useState<Record<number | string, string>>({})

  // "Viewed" ticks are local and kept per repo + PR: GitHub's own viewed state
  // has no simple REST call. Same key as the modal used, so ticks carry over.
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
      try {
        localStorage.setItem(viewedKey, JSON.stringify([...next]))
      } catch {
        // Storage full or blocked: the tick still shows for this session.
      }
      return next
    })

  const tokens = useMemo(
    () => ({ github: profile.githubToken || undefined, gitlab: profile.gitlabToken || undefined }),
    [profile.githubToken, profile.gitlabToken]
  )

  const load = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      setPr(await hostingApi.prDetail(remoteUrl, tokens, number))
      // Checks and files fill in after the conversation: the page is usable first.
      void hostingApi.prChecks(remoteUrl, tokens, number).then(setChecks).catch(() => setChecks([]))
      void hostingApi.prFiles(remoteUrl, tokens, number).then(setFiles).catch(() => setFiles([]))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [remoteUrl, number, tokens])

  useEffect(() => {
    setLoading(true)
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
    void act(
      () => hostingApi.prComment(remoteUrl, tokens, number, comment.trim()).then(() => setComment('')),
      t('prDetail.commentPosted')
    )
  }
  const review = (event: PrReviewEvent): void =>
    void act(
      () => hostingApi.prReview(remoteUrl, tokens, number, event, comment.trim()).then(() => setComment('')),
      t('prDetail.reviewSubmitted')
    )
  const merge = (): void =>
    void act(() => hostingApi.prMerge(remoteUrl, tokens, number, mergeMethod), t('prDetail.prMerged'))
  const replyToThread = (rootId: number | string): void => {
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

  // Hand the preview modal the remote this PR's repository is actually behind —
  // matching on URL, since a repo may have several remotes configured.
  const previewLocally = (): void => {
    const remotes = useRepoStore.getState().repos[repoPath]?.remotes ?? []
    const stripped = (u: string): string => u.replace(/\.git$/, '').replace(/\/+$/, '')
    const remote = remotes.find((r) => stripped(prRemoteIdentity(r.url)) === stripped(remoteUrl))?.name
    useUIStore.getState().openModal({ kind: 'pr-preview', repoPath, number, remote })
  }

  const web = remoteWebUrl(remoteUrl)
  const status = pr ? prStatus(pr) : null
  const canMerge = !!pr && pr.state === 'open' && !pr.merged
  const counts = checks ? checkCounts(checks) : null
  const reviewers = pr ? reviewerStates(pr) : []
  const people = pr ? participants(pr) : []
  const conversationCount = pr ? pr.comments.length + pr.reviewThreads.length : 0

  return (
    <div className="prp-page">
      <div className="prp-main">
        <header className="prp-head">
          {status && (
            <span className={`prp-state prp-${status}`}>
              <StatusIcon status={status} /> {t(STATUS_KEY[status])}
            </span>
          )}
          <h2>
            {pr?.title ?? page.title} <span className="prp-num">#{number}</span>
          </h2>
          <button className="icon-btn" title={t('prPage.refresh')} onClick={() => void load()} disabled={busy}>
            <RefreshCw size={14} />
          </button>
          <button className="icon-btn" title={t('prPreview.open')} onClick={previewLocally}>
            <GitPullRequestArrow size={14} />
          </button>
          {pr && (
            <button className="icon-btn" title={t('common.openInBrowser')} onClick={() => void shellApi.openExternal(pr.url)}>
              <ExternalLink size={14} />
            </button>
          )}
        </header>
        {pr && (
          <div className="prp-sub">
            {interp(t(status === 'merged' ? 'prPage.headMerged' : status === 'closed' ? 'prPage.headClosed' : 'prPage.wantsToMerge'), {
              author: pr.author,
              source: pr.source,
              target: pr.target
            })}
          </div>
        )}

        <nav className="prp-tabs" role="tablist">
          <SectionTab id="conversation" active={section} onPick={setSection} icon={<MessageSquare size={13} />} label={t('prPage.tabConversation')} count={conversationCount} />
          <SectionTab id="files" active={section} onPick={setSection} icon={<FileDiff size={13} />} label={t('prPage.tabFiles')} count={files?.length ?? pr?.changedFiles} />
          <SectionTab id="checks" active={section} onPick={setSection} icon={<CircleDot size={13} />} label={t('prPage.tabChecks')} count={checks?.length} />
        </nav>

        <div className="prp-body">
          {loading ? (
            <div className="prd-empty">
              <Loader2 size={15} className="spin" /> {t('prDetail.loading')}
            </div>
          ) : error ? (
            <div className="prd-error">{error}</div>
          ) : !pr ? null : section === 'conversation' ? (
            <>
              <article className="prp-card">
                <div className="prp-card-head">
                  <Avatar login={pr.author} avatars={pr.avatars} />
                  <strong>{pr.author}</strong>
                  <span>{fmtDate(pr.createdAt)}</span>
                </div>
                <div className={`prp-card-body ${pr.body.trim() ? '' : 'prp-muted'}`}>
                  {pr.body.trim() ? autolink(pr.body, web) : t('prPage.noDescription')}
                </div>
              </article>

              {pr.comments.map((c, i) => (
                <article key={i} className="prp-card">
                  <div className="prp-card-head">
                    <Avatar login={c.author} avatars={pr.avatars} />
                    <strong>{c.author}</strong>
                    <span>{fmtDate(c.createdAt)}</span>
                  </div>
                  <div className="prp-card-body">{autolink(c.body, web)}</div>
                </article>
              ))}

              {pr.reviewThreads.length > 0 && (
                <div className="prd-section-title">
                  {t('prDetail.reviewThreads')} <span className="prd-count">{pr.reviewThreads.length}</span>
                </div>
              )}
              {pr.reviewThreads.map((th) => (
                <article key={th.rootId} className="prp-card prp-thread">
                  <div className="prd-thread-loc" title={th.path}>
                    {th.path}
                    {th.line != null ? `:${th.line}` : ''}
                  </div>
                  {th.diffHunk && <pre className="prd-thread-hunk">{th.diffHunk.split('\n').slice(-6).join('\n')}</pre>}
                  {th.comments.map((c) => (
                    <div key={c.id} className="prp-thread-comment">
                      <div className="prp-card-head">
                        <Avatar login={c.author} avatars={pr.avatars} />
                        <strong>{c.author}</strong>
                        <span>{fmtDate(c.createdAt)}</span>
                      </div>
                      <div className="prp-card-body">{autolink(c.body, web)}</div>
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
                </article>
              ))}
              {conversationCount === 0 && <p className="prp-muted prp-pad">{t('prDetail.noComments')}</p>}

              <section className="prp-composer">
                <textarea
                  className="prd-input"
                  placeholder={t('prDetail.commentPlaceholder')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="prp-composer-actions">
                  <button className="btn ghost small" onClick={submitComment} disabled={busy || !comment.trim()}>
                    <MessageSquare size={13} /> {t('prDetail.comment')}
                  </button>
                  <button className="btn ghost small prd-approve" onClick={() => review('APPROVE')} disabled={busy}>
                    <Check size={13} /> {t('prDetail.approve')}
                  </button>
                  <button className="btn ghost small prd-reject" onClick={() => review('REQUEST_CHANGES')} disabled={busy}>
                    <X size={13} /> {t('prDetail.requestChanges')}
                  </button>
                </div>
              </section>

              {canMerge && (
                <section className={`prp-merge ${pr.mergeable === false ? 'is-blocked' : ''}`}>
                  <div className="prp-merge-text">
                    <GitMerge size={16} />
                    <span>
                      {pr.mergeable === false
                        ? t('prDetail.notMergeable')
                        : pr.mergeable === true
                          ? t('prPage.mergeable')
                          : t('prPage.mergeUnknown')}
                    </span>
                  </div>
                  <div className="prd-merge">
                    <select value={mergeMethod} onChange={(e) => setMergeMethod(e.target.value as PrMergeMethod)}>
                      <option value="merge">{t('prDetail.mergeCommit')}</option>
                      <option value="squash">{t('prDetail.squash')}</option>
                      {/* GitLab's merge API has no per-request rebase; the project setting decides. */}
                      {provider !== 'gitlab' && <option value="rebase">{t('prDetail.rebase')}</option>}
                    </select>
                    <button className="btn primary small" onClick={merge} disabled={busy || pr.mergeable === false}>
                      {busy ? <Loader2 size={13} className="spin" /> : <GitMerge size={13} />} {t('prDetail.merge')}
                    </button>
                  </div>
                </section>
              )}
            </>
          ) : section === 'files' ? (
            files === null ? (
              <div className="prd-empty">
                <Loader2 size={15} className="spin" /> {t('prDetail.loading')}
              </div>
            ) : files.length === 0 ? (
              <p className="prp-muted prp-pad">{t('prPage.noFiles')}</p>
            ) : (
              <FilesSection
                files={files}
                viewed={viewed}
                onToggleViewed={toggleViewed}
                repoPath={repoPath}
                prUrl={pr.url}
              />
            )
          ) : checks === null ? (
            <div className="prd-empty">
              <Loader2 size={15} className="spin" /> {t('prDetail.loading')}
            </div>
          ) : checks.length === 0 ? (
            <p className="prp-muted prp-pad">{t('prPage.noChecks')}</p>
          ) : (
            <div className="prd-checks prp-checks">
              {checks.map((c, i) => (
                <div key={i} className="prd-check">
                  <span className={`prd-check-dot ${checkState(c)}`} />
                  <span className="prd-check-name">{c.name}</span>
                  <span className="prd-check-state">{c.status === 'completed' ? c.conclusion : c.status}</span>
                  {c.url && (
                    <button className="prd-check-logs" title={t('prDetail.viewLogs')} onClick={() => void shellApi.openExternal(c.url)}>
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="prp-side">
        {pr && (
          <>
            <Field icon={<User size={12} />} label={t('prPage.author')}>
              <span className="prp-person">
                <Avatar login={pr.author} avatars={pr.avatars} />
                {pr.author}
              </span>
              {pr.createdAt && <div className="prp-side-note">{interp(t('prPage.openedOn'), { date: fmtDate(pr.createdAt) })}</div>}
            </Field>

            <Field icon={<GitPullRequest size={12} />} label={t('prPage.status')}>
              <div>{status && t(STATUS_KEY[status])}</div>
              {pr.merged && pr.mergedAt && (
                <div className="prp-side-note">
                  {pr.mergedBy
                    ? interp(t('prPage.mergedByOn'), { who: pr.mergedBy, date: fmtDate(pr.mergedAt) })
                    : interp(t('prPage.mergedOn'), { date: fmtDate(pr.mergedAt) })}
                </div>
              )}
              {!pr.merged && pr.state === 'closed' && pr.closedAt && (
                <div className="prp-side-note">{interp(t('prPage.closedOn'), { date: fmtDate(pr.closedAt) })}</div>
              )}
              {canMerge && pr.mergeable === false && <div className="prp-side-note prp-warn">{t('prPage.conflicts')}</div>}
            </Field>

            <Field icon={<UserCheck size={12} />} label={t('prPage.reviewers')}>
              {reviewers.length === 0 ? (
                <span className="issue-none">{t('prPage.noReviewers')}</span>
              ) : (
                <ul className="prp-list">
                  {reviewers.map((r) => (
                    <li key={r.login} className="prp-person" title={t(REVIEW_KEY[r.state])}>
                      {r.team ? <Users size={14} className="prp-team" /> : <Avatar login={r.login} avatars={pr.avatars} />}
                      <span className="prp-person-name">{r.login}</span>
                      <ReviewIcon state={r.state} />
                    </li>
                  ))}
                </ul>
              )}
            </Field>

            {pr.assignees !== undefined && (
              <Field icon={<User size={12} />} label={t('prPage.assignees')}>
                {pr.assignees.length === 0 ? (
                  <span className="issue-none">{t('common.none')}</span>
                ) : (
                  <ul className="prp-list">
                    {pr.assignees.map((a) => (
                      <li key={a.login} className="prp-person">
                        <Avatar login={a.login} avatars={pr.avatars} />
                        <span className="prp-person-name">{a.login}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            )}

            {pr.labels !== undefined && (
              <Field icon={<Tag size={12} />} label={t('prPage.labels')}>
                {pr.labels.length === 0 ? (
                  <span className="issue-none">{t('common.none')}</span>
                ) : (
                  <span className="issue-labels">
                    {pr.labels.map((l) => {
                      const bg = labelColor(l.color)
                      return (
                        <span
                          key={l.name}
                          className="issue-label"
                          style={bg ? { background: bg, color: labelTextColor(bg) } : undefined}
                        >
                          {l.name}
                        </span>
                      )
                    })}
                  </span>
                )}
              </Field>
            )}

            {pr.milestone !== undefined && (
              <Field icon={<Milestone size={12} />} label={t('prPage.milestone')}>
                {pr.milestone ?? <span className="issue-none">{t('common.none')}</span>}
              </Field>
            )}

            <Field icon={<GitBranch size={12} />} label={t('prPage.branches')}>
              <div className="prp-branches">
                <code title={pr.source}>{pr.source}</code>
                <span className="prp-arrow">→</span>
                <code title={pr.target}>{pr.target}</code>
              </div>
              {pr.sourceRepo && <div className="prp-side-note">{interp(t('prPage.fromFork'), { repo: pr.sourceRepo })}</div>}
            </Field>

            <Field icon={<FileDiff size={12} />} label={t('prPage.changes')}>
              <ChangeSummary pr={pr} files={files} />
            </Field>

            {counts && checks && checks.length > 0 && (
              <Field icon={<CircleDot size={12} />} label={t('prDetail.checks')}>
                <button className="prp-link" onClick={() => setSection('checks')}>
                  {interp(t('prPage.checksSummary'), {
                    pass: String(counts.pass),
                    fail: String(counts.fail),
                    pending: String(counts.pending)
                  })}
                </button>
              </Field>
            )}

            <Field icon={<Users size={12} />} label={t('prPage.participants')}>
              <div className="prp-faces">
                {people.map((p) => (
                  <Avatar key={p} login={p} avatars={pr.avatars} size={22} title={p} />
                ))}
              </div>
            </Field>

            {pr.updatedAt && (
              <Field icon={<CalendarDays size={12} />} label={t('prPage.activity')}>
                <div className="prp-side-note">{interp(t('prPage.openedOn'), { date: fmtDate(pr.createdAt) })}</div>
                <div className="prp-side-note">{interp(t('prPage.updatedOn'), { date: fmtDate(pr.updatedAt) })}</div>
              </Field>
            )}
          </>
        )}
      </aside>
    </div>
  )
}

function SectionTab({
  id,
  active,
  onPick,
  icon,
  label,
  count
}: {
  id: Section
  active: Section
  onPick: (s: Section) => void
  icon: React.ReactNode
  label: string
  count?: number
}): React.JSX.Element {
  return (
    <button role="tab" aria-selected={active === id} className={`prp-tab ${active === id ? 'active' : ''}`} onClick={() => onPick(id)}>
      {icon} {label}
      {count !== undefined && count > 0 && <span className="prp-tab-count">{count}</span>}
    </button>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="issue-field prp-field">
      <div className="issue-field-label">
        {icon} {label}
      </div>
      <div className="issue-field-val">{children}</div>
    </div>
  )
}

/** A face when the host gave one, the initial otherwise. */
function Avatar({
  login,
  avatars,
  size = 18,
  title
}: {
  login: string
  avatars?: Record<string, string>
  size?: number
  title?: string
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  // Only an https picture is drawn; anything else falls back to the initial.
  const raw = avatars?.[login]
  const url = raw && /^https:\/\//i.test(raw) ? raw : undefined
  const style = { width: size, height: size, fontSize: Math.round(size * 0.5) }
  if (url && !failed) {
    return <img className="prp-avatar" src={url} alt="" style={style} title={title} onError={() => setFailed(true)} draggable={false} />
  }
  return (
    <span className="prp-avatar prp-avatar-fallback" style={style} title={title}>
      {login.charAt(0).toUpperCase()}
    </span>
  )
}

function StatusIcon({ status }: { status: ReturnType<typeof prStatus> }): React.JSX.Element {
  if (status === 'merged') return <GitMerge size={13} />
  if (status === 'closed') return <GitPullRequestClosed size={13} />
  if (status === 'draft') return <GitPullRequestDraft size={13} />
  return <GitPullRequest size={13} />
}

function ReviewIcon({ state }: { state: ReviewerState }): React.JSX.Element {
  if (state === 'APPROVED') return <Check size={13} className="prp-rv prp-rv-ok" />
  if (state === 'CHANGES_REQUESTED') return <X size={13} className="prp-rv prp-rv-bad" />
  if (state === 'COMMENTED') return <MessageSquare size={12} className="prp-rv" />
  return <Clock size={12} className="prp-rv prp-rv-wait" />
}

/**
 * Files, lines and commits. GitHub reports the totals with the PR; GitLab gives
 * only a file count, so lines are summed from the file list once it arrives.
 */
function ChangeSummary({ pr, files }: { pr: PrDetail; files: PrFile[] | null }): React.JSX.Element {
  const t = useT()
  const add = pr.additions ?? files?.reduce((n, f) => n + f.additions, 0)
  const del = pr.deletions ?? files?.reduce((n, f) => n + f.deletions, 0)
  const fileCount = pr.changedFiles ?? files?.length
  const total = (add ?? 0) + (del ?? 0)
  return (
    <div className="prp-changes">
      {fileCount !== undefined && (
        <div>{interp(t(fileCount === 1 ? 'prPage.filesOne' : 'prPage.filesMany'), { n: String(fileCount) })}</div>
      )}
      {pr.commits !== undefined && (
        <div className="prp-commits">
          <GitCommitHorizontal size={12} />
          {interp(t(pr.commits === 1 ? 'prPage.commitsOne' : 'prPage.commitsMany'), {
            n: pr.commitsCapped ? `${pr.commits}+` : String(pr.commits)
          })}
        </div>
      )}
      {add !== undefined && del !== undefined && (
        <>
          <div className="prd-file-stat">
            <span className="ins-add">+{add}</span> <span className="ins-del">−{del}</span>
          </div>
          {total > 0 && (
            <div className="prp-bar" aria-hidden>
              <span className="prp-bar-add" style={{ width: `${(add / total) * 100}%` }} />
              <span className="prp-bar-del" style={{ width: `${(del / total) * 100}%` }} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * The changed files with their diffs: a list to pick from and tick off as
 * viewed, and the selected file's changes beside it, drawn by the same viewer
 * as the rest of the app (read-only — no hunk actions on someone else's PR).
 */
function FilesSection({
  files,
  viewed,
  onToggleViewed,
  repoPath,
  prUrl
}: {
  files: PrFile[]
  viewed: Set<string>
  onToggleViewed: (f: string) => void
  repoPath: string
  prUrl: string
}): React.JSX.Element {
  const t = useT()
  const maskSecrets = useSettingsStore((s) => s.settings.maskSecrets)
  const [selected, setSelected] = useState<string>(files[0]?.filename ?? '')
  const file = files.find((f) => f.filename === selected) ?? files[0]

  return (
    <div className="prp-files-split">
      <div className="prp-file-list">
        <div className="prd-section-title">
          {interp(t('prDetail.filesViewed'), { n: `${viewed.size}/${files.length}` })}
        </div>
        {files.map((f) => (
          <div
            key={f.filename}
            className={`prd-file prp-file-row ${f.filename === file?.filename ? 'selected' : ''} ${viewed.has(f.filename) ? 'viewed' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(f.filename)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelected(f.filename)
              }
            }}
          >
            <input
              type="checkbox"
              checked={viewed.has(f.filename)}
              title={t('prPage.markViewed')}
              aria-label={t('prPage.markViewed')}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleViewed(f.filename)}
            />
            <span className={`prd-file-status st-${f.status}`} title={f.status}>
              {f.status === 'added' ? 'A' : f.status === 'removed' ? 'D' : f.status === 'renamed' ? 'R' : 'M'}
            </span>
            <span className="prd-file-name" title={f.filename}>
              {f.filename}
            </span>
            <span className="prd-file-stat">
              <span className="ins-add">+{f.additions}</span> <span className="ins-del">−{f.deletions}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="prp-file-diff">
        {file && (
          <>
            <div className="prp-file-diff-head">
              <code title={file.filename}>{file.filename}</code>
              {file.previousFilename && (
                <span className="prp-side-note">{interp(t('prPage.renamedFrom'), { path: file.previousFilename })}</span>
              )}
              <label className="prp-viewed-toggle">
                <input type="checkbox" checked={viewed.has(file.filename)} onChange={() => onToggleViewed(file.filename)} />
                {t('prPage.markViewed')}
              </label>
            </div>
            {file.patch ? (
              <DiffViewer
                // A fresh viewer per file: its scroll and selection belong to one diff.
                key={file.filename}
                diff={file.patch}
                file={file.filename}
                lang={guessLanguage(file.filename)}
                // Same rule as every other diff in the app: secret-looking files
                // show KEY=•••• while the setting is on.
                maskValues={maskSecrets && isSecretFile(file.filename)}
                repoPath={repoPath}
              />
            ) : (
              <div className="prp-no-patch">
                <p>{t('prPage.noPatch')}</p>
                <button className="btn ghost small" // GitHub lists a PR's files at /files, GitLab an MR's at /diffs.
                  onClick={() => void shellApi.openExternal(`${prUrl}${prUrl.includes('/-/merge_requests/') ? '/diffs' : '/files'}`)}>
                  <ExternalLink size={13} /> {t('common.openInBrowser')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
