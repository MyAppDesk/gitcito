import type { PrCheck, PrDetail, PrFile, PrMergeMethod, PrReview, PrReviewEvent, PrReviewThread } from '../shared/types'
import { unifiedDiff } from '../shared/lineDiff'

/**
 * Azure DevOps pull requests on the PR page. Every call goes through `ado`,
 * which hosting.ts builds from adoJson + the credential retry — so this module
 * never sees how auth works, and nothing here imports hosting.
 *
 * One gap the other hosts do not have: Azure lists a PR's changed files but
 * sends no patch. Each file's two versions are fetched and diffed here
 * (shared/lineDiff.ts); a binary or huge file links to the host instead.
 */

export type Ado = <T>(url: string, init?: RequestInit) => Promise<T>

export interface AzureRepo {
  org: string
  project: string
  repo: string
}

const V = 'api-version=7.1'
const repoApi = (r: AzureRepo): string =>
  `https://dev.azure.com/${encodeURIComponent(r.org)}/${encodeURIComponent(r.project)}/_apis/git/repositories/${encodeURIComponent(r.repo)}`
const branchOf = (ref: string | undefined): string => (ref ?? '').replace(/^refs\/heads\//, '')

interface AzIdentity {
  id?: string
  displayName?: string
  uniqueName?: string
  isContainer?: boolean
}

interface AzReviewer extends AzIdentity {
  vote?: number
}

interface AzPr {
  pullRequestId: number
  title: string
  description?: string
  status: 'active' | 'completed' | 'abandoned' | string
  isDraft?: boolean
  createdBy?: AzIdentity
  creationDate?: string
  closedDate?: string
  closedBy?: AzIdentity
  sourceRefName?: string
  targetRefName?: string
  mergeStatus?: string
  reviewers?: AzReviewer[]
  labels?: Array<{ name: string; active?: boolean }>
  lastMergeSourceCommit?: { commitId: string }
}

interface AzComment {
  id: number
  content?: string
  author?: AzIdentity
  publishedDate?: string
  commentType?: string
  isDeleted?: boolean
}

interface AzThread {
  id: number
  isDeleted?: boolean
  comments?: AzComment[]
  threadContext?: {
    filePath?: string
    rightFileStart?: { line?: number }
    leftFileStart?: { line?: number }
  } | null
}

const nameOf = (who: AzIdentity | undefined): string => who?.displayName || who?.uniqueName || 'unknown'

/** Azure's numeric vote → the page's review state; 0 (no vote) is not a review. */
export function azureVoteState(vote: number | undefined): PrReview['state'] | null {
  if (vote === 10 || vote === 5) return 'APPROVED' // approved, approved with suggestions
  if (vote === -10 || vote === -5) return 'CHANGES_REQUESTED' // rejected, waiting for author
  return null
}

const MERGEABLE: Record<string, boolean> = { succeeded: true, conflicts: false, failure: false, rejectedByPolicy: false }

export function mapAzurePr(r: AzureRepo, pr: AzPr, threads: AzThread[]): PrDetail {
  const comments: PrDetail['comments'] = []
  const reviewThreads: PrReviewThread[] = []
  for (const th of threads) {
    if (th.isDeleted) continue
    // System notes ("X voted", "updated the source branch") are not conversation.
    const notes = (th.comments ?? []).filter((c) => !c.isDeleted && c.commentType !== 'system' && c.content?.trim())
    if (!notes.length) continue
    const ctx = th.threadContext
    if (ctx?.filePath) {
      reviewThreads.push({
        path: ctx.filePath.replace(/^\//, ''),
        line: ctx.rightFileStart?.line ?? ctx.leftFileStart?.line ?? null,
        diffHunk: '',
        rootId: th.id,
        comments: notes.map((c) => ({ id: c.id, author: nameOf(c.author), body: c.content ?? '', createdAt: c.publishedDate ?? '' }))
      })
    } else {
      for (const c of notes) comments.push({ author: nameOf(c.author), body: c.content ?? '', createdAt: c.publishedDate ?? '' })
    }
  }
  comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const reviewers = pr.reviewers ?? []
  const completed = pr.status === 'completed'
  return {
    number: pr.pullRequestId,
    title: pr.title,
    body: pr.description ?? '',
    author: nameOf(pr.createdBy),
    source: branchOf(pr.sourceRefName),
    target: branchOf(pr.targetRefName),
    draft: !!pr.isDraft,
    state: pr.status === 'active' ? 'open' : 'closed',
    merged: completed,
    mergeable: pr.mergeStatus && pr.mergeStatus in MERGEABLE ? MERGEABLE[pr.mergeStatus] : null,
    url: `https://dev.azure.com/${encodeURIComponent(r.org)}/${encodeURIComponent(r.project)}/_git/${encodeURIComponent(r.repo)}/pullrequest/${pr.pullRequestId}`,
    comments,
    reviews: reviewers.flatMap((rv) => {
      const state = azureVoteState(rv.vote)
      return state ? [{ author: nameOf(rv), state }] : []
    }),
    reviewThreads,
    createdAt: pr.creationDate,
    closedAt: pr.closedDate ?? null,
    mergedAt: completed ? (pr.closedDate ?? null) : null,
    mergedBy: completed ? (pr.closedBy ? nameOf(pr.closedBy) : null) : null,
    requestedReviewers: reviewers
      .filter((rv) => !rv.vote)
      .map((rv) => ({ login: nameOf(rv), ...(rv.isContainer ? { team: true } : {}) })),
    labels: (pr.labels ?? []).filter((l) => l.active !== false).map((l) => ({ name: l.name })),
    sourceRepo: null
  }
}

export async function azurePrDetail(ado: Ado, r: AzureRepo, id: number): Promise<PrDetail> {
  const base = `${repoApi(r)}/pullrequests/${id}`
  const [pr, threads] = await Promise.all([
    ado<AzPr>(`${base}?${V}`),
    ado<{ value?: AzThread[] }>(`${base}/threads?${V}`).catch(() => ({ value: [] as AzThread[] }))
  ])
  return mapAzurePr(r, pr, threads.value ?? [])
}

/** PR statuses (build validation and external CI report there). */
export async function azurePrChecks(ado: Ado, r: AzureRepo, id: number): Promise<PrCheck[]> {
  const st = await ado<{ value?: Array<{ state?: string; description?: string; context?: { name?: string; genre?: string }; targetUrl?: string }> }>(
    `${repoApi(r)}/pullrequests/${id}/statuses?${V}`
  ).catch(() => ({ value: [] }))
  return (st.value ?? []).map((s) => {
    const name = [s.context?.genre, s.context?.name].filter(Boolean).join('/') || s.description || 'status'
    const pending = !s.state || s.state === 'pending' || s.state === 'notSet'
    return {
      name,
      status: pending ? 'in_progress' : 'completed',
      conclusion: pending ? null : s.state === 'succeeded' ? 'success' : s.state === 'notApplicable' ? 'neutral' : 'failure',
      url: s.targetUrl ?? ''
    }
  })
}

/** Files fetched and diffed at most this many at a time — Azure rate-limits bursts. */
const FILE_CONCURRENCY = 6
/** Beyond this many files the rest are listed without a diff. */
const MAX_DIFFED_FILES = 200

interface AzChange {
  changeType?: string
  item?: { path?: string; gitObjectType?: string; isFolder?: boolean }
  originalPath?: string
}

export function azureChangeStatus(changeType: string | undefined): string {
  const t = (changeType ?? '').toLowerCase()
  if (t.includes('add')) return 'added'
  if (t.includes('delete')) return 'removed'
  if (t.includes('rename')) return 'renamed'
  return 'modified'
}

export async function azurePrFiles(ado: Ado, r: AzureRepo, id: number): Promise<PrFile[]> {
  const base = `${repoApi(r)}/pullrequests/${id}`
  const its = await ado<{ value?: Array<{ id: number; sourceRefCommit?: { commitId: string }; commonRefCommit?: { commitId: string } }> }>(
    `${base}/iterations?${V}`
  )
  const last = (its.value ?? [])[(its.value ?? []).length - 1]
  if (!last) return []
  const head = last.sourceRefCommit?.commitId
  const mergeBase = last.commonRefCommit?.commitId
  const changes = await ado<{ changeEntries?: AzChange[] }>(`${base}/iterations/${last.id}/changes?$top=2000&${V}`)
  const entries = (changes.changeEntries ?? []).filter((c) => c.item?.path && !c.item.isFolder && c.item.gitObjectType !== 'tree')

  const content = async (path: string, commit: string | undefined): Promise<string | null> => {
    if (!commit) return null
    const res = await ado<{ content?: string; contentMetadata?: { isBinary?: boolean } }>(
      `${repoApi(r)}/items?path=${encodeURIComponent(path)}&versionDescriptor.version=${commit}&versionDescriptor.versionType=commit&includeContent=true&${V}`
    ).catch(() => null)
    if (!res || res.contentMetadata?.isBinary) return null
    return res.content ?? ''
  }

  const files: PrFile[] = new Array(entries.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < entries.length) {
      const i = next++
      const c = entries[i]
      const path = c.item!.path!
      const status = azureChangeStatus(c.changeType)
      const oldPath = c.originalPath ?? path
      const file: PrFile = {
        filename: path.replace(/^\//, ''),
        status,
        additions: 0,
        deletions: 0,
        ...(status === 'renamed' && c.originalPath ? { previousFilename: c.originalPath.replace(/^\//, '') } : {})
      }
      if (i < MAX_DIFFED_FILES) {
        const [before, after] = await Promise.all([
          status === 'added' ? '' : content(oldPath, mergeBase),
          status === 'removed' ? '' : content(path, head)
        ])
        const patch = before !== null && after !== null ? unifiedDiff(before, after) : null
        if (patch) {
          file.patch = patch
          for (const line of patch.split('\n')) {
            if (line.startsWith('+')) file.additions++
            else if (line.startsWith('-')) file.deletions++
          }
        }
      }
      files[i] = file
    }
  }
  await Promise.all(Array.from({ length: Math.min(FILE_CONCURRENCY, entries.length) }, worker))
  return files
}

export async function azureComment(ado: Ado, r: AzureRepo, id: number, body: string): Promise<void> {
  await ado(`${repoApi(r)}/pullrequests/${id}/threads?${V}`, {
    method: 'POST',
    // status 1 = active; commentType 1 = text.
    body: JSON.stringify({ comments: [{ parentCommentId: 0, content: body, commentType: 1 }], status: 1 })
  })
}

export async function azureReply(ado: Ado, r: AzureRepo, id: number, threadId: number, body: string): Promise<void> {
  await ado(`${repoApi(r)}/pullrequests/${id}/threads/${threadId}/comments?${V}`, {
    method: 'POST',
    body: JSON.stringify({ content: body, parentCommentId: 1, commentType: 1 })
  })
}

/** Approve = 10; request changes = -5 ("waiting for author"), which is what it asks for. */
const VOTE: Record<Exclude<PrReviewEvent, 'COMMENT'>, number> = { APPROVE: 10, REQUEST_CHANGES: -5 }

export async function azureReview(ado: Ado, r: AzureRepo, id: number, event: PrReviewEvent, body: string): Promise<void> {
  if (event !== 'COMMENT') {
    // A vote is cast as the signed-in identity, whose id the org's connection data names.
    const me = await ado<{ authenticatedUser?: { id?: string } }>(
      `https://dev.azure.com/${encodeURIComponent(r.org)}/_apis/connectionData`
    )
    const myId = me.authenticatedUser?.id
    if (!myId) throw new Error('Azure DevOps did not say who this credential is.')
    await ado(`${repoApi(r)}/pullrequests/${id}/reviewers/${myId}?${V}`, {
      method: 'PUT',
      body: JSON.stringify({ vote: VOTE[event] })
    })
  }
  if (body.trim()) await azureComment(ado, r, id, body)
}

const STRATEGY: Record<PrMergeMethod, string> = { merge: 'noFastForward', squash: 'squash', rebase: 'rebase' }

export async function azureMerge(ado: Ado, r: AzureRepo, id: number, method: PrMergeMethod): Promise<void> {
  const pr = await ado<AzPr>(`${repoApi(r)}/pullrequests/${id}?${V}`)
  // Completing names the source commit it saw, so a push in between is not merged unseen.
  await ado(`${repoApi(r)}/pullrequests/${id}?${V}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'completed',
      lastMergeSourceCommit: pr.lastMergeSourceCommit,
      completionOptions: { mergeStrategy: STRATEGY[method] }
    })
  })
}

/** An Azure Boards work item's title, type and state — for a branch named after it. */
export async function azureWorkItem(
  ado: Ado,
  org: string,
  id: number
): Promise<{ id: number; title: string; type: string; state?: string }> {
  const wi = await ado<{ id: number; fields?: Record<string, unknown> }>(
    `https://dev.azure.com/${encodeURIComponent(org)}/_apis/wit/workitems/${id}?fields=System.Title,System.WorkItemType,System.State&${V}`
  )
  const f = wi.fields ?? {}
  return {
    id: wi.id,
    title: typeof f['System.Title'] === 'string' ? f['System.Title'] : '',
    type: typeof f['System.WorkItemType'] === 'string' ? f['System.WorkItemType'] : '',
    ...(typeof f['System.State'] === 'string' ? { state: f['System.State'] } : {})
  }
}
