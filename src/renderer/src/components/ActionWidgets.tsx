import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ExternalLink,
  GitCommitHorizontal,
  GitPullRequest,
  Layers,
  Upload
} from 'lucide-react'
import type { RepoChatAction, RepoChatExecutionResult, StackInfo } from '../../../shared/types'
import { planStackSubmit, type StackPrAction } from '../../../shared/stackPr'
import { gitApi } from '../infrastructure/api'
import { useRepoStore } from '../stores/repo'
import { interp, useT } from '../i18n'

/**
 * The picture half of a proposed action.
 *
 * An action row says what will happen in one line; that is enough for "stage
 * two files" and nowhere near enough for "open four pull requests against a
 * stack". These widgets draw the shape of the change — which branch lands on
 * which base, which commits get replayed, how far ahead the push is — so the
 * approval click is made looking at the thing itself rather than at a sentence
 * describing it.
 *
 * Everything here degrades: a widget that cannot read what it needs renders
 * nothing and leaves the one-line summary standing.
 */
export function ActionWidget({
  action,
  repoPath
}: {
  action: RepoChatAction
  repoPath: string
}): React.JSX.Element | null {
  switch (action.type) {
    case 'open_pr':
      return <PrWidget action={action} repoPath={repoPath} />
    case 'stack_submit':
      return <StackWidget leaf={action.leaf} repoPath={repoPath} />
    case 'push':
      return <PushWidget branch={action.branch} remote={action.remote} repoPath={repoPath} />
    case 'merge':
      return <RefWidget from={action.ref} repoPath={repoPath} noFf={action.noFf} />
    case 'rebase':
      return <RefWidget onto={action.onto} repoPath={repoPath} />
    case 'revert':
    case 'cherry_pick':
      return <CommitsWidget hashes={action.hashes} repoPath={repoPath} />
    default:
      return null
  }
}

/** What a pull request will look like before it exists. */
function PrWidget({
  action,
  repoPath
}: {
  action: Extract<RepoChatAction, { type: 'open_pr' }>
  repoPath: string
}): React.JSX.Element {
  const t = useT()
  const current = useRepoStore((s) => s.repos[repoPath]?.branches.current)
  const source = action.source || current || '?'
  return (
    <div className="action-widget action-widget-pr">
      <div className="action-widget-pr-head">
        <GitPullRequest size={13} />
        <span className="action-widget-pr-title">{action.title}</span>
        {action.draft && <span className="action-widget-badge">{t('chatWidget.draft')}</span>}
      </div>
      <div className="action-widget-refs">
        <span className="action-widget-ref">{source}</span>
        <ArrowRight size={11} />
        <span className="action-widget-ref base">{action.target}</span>
      </div>
      {!!action.body?.trim() && <p className="action-widget-body">{action.body.trim().slice(0, 400)}</p>}
    </div>
  )
}

/**
 * The stack as a ladder, with the plan already applied to it: which level opens
 * a pull request, which one only moves its base, which one is already right.
 * It is the same plan the submit will run — `planStackSubmit` is shared — so
 * what the card shows and what happens cannot drift apart.
 */
function StackWidget({ leaf, repoPath }: { leaf?: string; repoPath: string }): React.JSX.Element | null {
  const t = useT()
  const prs = useRepoStore((s) => s.repos[repoPath]?.prs)
  const locals = useRepoStore((s) => s.repos[repoPath]?.branches.locals)
  const [stack, setStack] = useState<StackInfo | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let live = true
    void gitApi
      .stackInfo(repoPath, leaf)
      .then((info) => {
        if (!live) return
        if (info.branches.length) setStack(info)
        else setMissing(true)
      })
      .catch(() => live && setMissing(true))
    return () => {
      live = false
    }
  }, [repoPath, leaf])

  if (missing) return <p className="action-widget-empty">{t('chatWidget.noStack')}</p>
  if (!stack) return null

  const trunk = stack.trunk || locals?.find((branch) => /^(main|master)$/.test(branch.name))?.name || 'main'
  const plan = planStackSubmit(
    stack,
    (prs ?? []).map((pr) => ({ id: pr.id, sourceBranch: pr.sourceBranch, targetBranch: pr.targetBranch, url: pr.url })),
    trunk
  )
  const labelFor = (entry: StackPrAction): string =>
    t(
      entry.action === 'create'
        ? 'chatWidget.stackCreate'
        : entry.action === 'retarget'
          ? 'chatWidget.stackRetarget'
          : 'chatWidget.stackOk'
    )

  // Top level first: a stack is read the way a pull request list is, newest work
  // at the top, trunk at the bottom.
  return (
    <div className="action-widget action-widget-stack">
      {[...plan].reverse().map((entry) => (
        <div key={entry.branch} className={`action-widget-level ${entry.action}`}>
          <Layers size={11} className="action-widget-level-icon" />
          <span className="action-widget-ref">{entry.branch}</span>
          <ArrowRight size={11} />
          <span className="action-widget-ref base">{entry.base}</span>
          <span className={`action-widget-badge ${entry.action}`}>{labelFor(entry)}</span>
        </div>
      ))}
      <div className="action-widget-trunk">{trunk}</div>
    </div>
  )
}

/** How much a push would publish, and where. */
function PushWidget({
  branch,
  remote,
  repoPath
}: {
  branch?: string
  remote?: string
  repoPath: string
}): React.JSX.Element | null {
  const t = useT()
  const status = useRepoStore((s) => s.repos[repoPath]?.status)
  const current = useRepoStore((s) => s.repos[repoPath]?.branches.current)
  const remotes = useRepoStore((s) => s.repos[repoPath]?.remotes)
  const target = branch || current
  if (!target) return null
  const targetRemote = remote || remotes?.find((r) => r.name === 'origin')?.name || remotes?.[0]?.name
  // Ahead/behind is the current branch's; showing it for another branch would
  // be a number about the wrong thing.
  const ahead = target === current ? (status?.ahead ?? 0) : null
  return (
    <div className="action-widget action-widget-push">
      <Upload size={12} />
      <span className="action-widget-ref">{target}</span>
      <ArrowRight size={11} />
      <span className="action-widget-ref base">{targetRemote ?? '?'}</span>
      {ahead !== null && ahead > 0 && (
        <span className="action-widget-badge">{interp(t('chatWidget.aheadN'), { n: ahead })}</span>
      )}
    </div>
  )
}

/** Merge and rebase, as the two refs involved. */
function RefWidget({
  from,
  onto,
  noFf,
  repoPath
}: {
  from?: string
  onto?: string
  noFf?: boolean
  repoPath: string
}): React.JSX.Element | null {
  const t = useT()
  const current = useRepoStore((s) => s.repos[repoPath]?.branches.current)
  if (!current) return null
  return (
    <div className="action-widget action-widget-refs">
      {from ? (
        <>
          <span className="action-widget-ref">{from}</span>
          <ArrowRight size={11} />
          <span className="action-widget-ref base">{current}</span>
          {noFf && <span className="action-widget-badge">{t('chatWidget.noFf')}</span>}
        </>
      ) : (
        <>
          <span className="action-widget-ref">{current}</span>
          <ArrowRight size={11} />
          <span className="action-widget-ref base">{onto}</span>
        </>
      )}
    </div>
  )
}

/** The commits a revert or a cherry-pick would replay, by their subjects. */
function CommitsWidget({ hashes, repoPath }: { hashes: string[]; repoPath: string }): React.JSX.Element {
  const commits = useRepoStore((s) => s.repos[repoPath]?.commits)
  return (
    <div className="action-widget action-widget-commits">
      {hashes.slice(0, 8).map((hash) => {
        const found = commits?.find((commit) => commit.hash.startsWith(hash) || hash.startsWith(commit.hash))
        return (
          <div key={hash} className="action-widget-commit">
            <GitCommitHorizontal size={11} />
            {/* i18n-ignore a commit hash */}
            <code>{hash.slice(0, 7)}</code>
            {found && <span className="action-widget-subject">{found.subject}</span>}
          </div>
        )
      })}
    </div>
  )
}

/**
 * What a finished plan produced on the host. Pull requests that open silently
 * are indistinguishable from none, so the card keeps their links.
 */
export function ActionResultLinks({
  prs
}: {
  prs: NonNullable<RepoChatExecutionResult['prs']>
}): React.JSX.Element {
  const t = useT()
  return (
    <div className="action-widget action-widget-results">
      <span className="action-widget-results-title">{t('chatWidget.opened')}</span>
      {prs.map((pr) => (
        <button
          key={pr.number}
          type="button"
          className="action-widget-result"
          onClick={() => pr.url && void window.api.openExternal(pr.url)}
          disabled={!pr.url}
          title={pr.url}
        >
          {/* i18n-ignore GitHub's own PR numbering */}
          <span className="action-widget-result-num">#{pr.number}</span>
          {pr.branch && <span className="action-widget-ref">{pr.branch}</span>}
          {pr.base && (
            <>
              <ArrowRight size={11} />
              <span className="action-widget-ref base">{pr.base}</span>
            </>
          )}
          {pr.url && <ExternalLink size={11} />}
        </button>
      ))}
    </div>
  )
}
