import type {
  PrCheck,
  PrDetail,
  PrFile,
  PrMergeMethod,
  PrReview,
  PrReviewEvent,
  PrReviewThread,
  PrWorkItem
} from '../shared/types'
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
/** A plain-text read (a build log), keeping at most the last `max` bytes. Null
 *  when the server will not give it — no permission, or a sign-in page. */
export type AdoText = (url: string, max: number) => Promise<string | null>

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
  repository?: { project?: { id?: string } }
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

/** `optional` runs the calls that need a scope the token may lack (Work Items):
 *  a refusal there must not be mistaken for a revoked credential. */
export async function azurePrDetail(ado: Ado, r: AzureRepo, id: number, optional: Ado = ado): Promise<PrDetail> {
  const base = `${repoApi(r)}/pullrequests/${id}`
  const [pr, threads, workItems] = await Promise.all([
    ado<AzPr>(`${base}?${V}`),
    ado<{ value?: AzThread[] }>(`${base}/threads?${V}`).catch(() => ({ value: [] as AzThread[] })),
    // A token without Work Items (Read) cannot list them: the row is left out, the PR still opens.
    azurePrWorkItems(optional, r, id).catch(() => undefined)
  ])
  return { ...mapAzurePr(r, pr, threads.value ?? []), ...(workItems ? { workItems } : {}) }
}

interface AzWorkItem {
  id: number
  fields?: Record<string, unknown>
}

/** Where a work item opens in the browser. */
export const azureWorkItemUrl = (org: string, id: number): string =>
  `https://dev.azure.com/${encodeURIComponent(org)}/_workitems/edit/${id}`

/** Work items as the batch endpoint returns them, in the order the PR links them. */
export function mapAzureWorkItems(org: string, ids: readonly number[], items: readonly AzWorkItem[]): PrWorkItem[] {
  const byId = new Map(items.map((w) => [w.id, w]))
  return ids.map((id) => {
    const f = byId.get(id)?.fields ?? {}
    const str = (k: string): string | undefined => (typeof f[k] === 'string' ? (f[k] as string) : undefined)
    const type = str('System.WorkItemType')
    const state = str('System.State')
    return {
      id,
      title: str('System.Title') ?? '',
      ...(type ? { type } : {}),
      ...(state ? { state } : {}),
      url: azureWorkItemUrl(org, id)
    }
  })
}

/** The PR's linked work items: their ids, then title, type and state in one batch read. */
export async function azurePrWorkItems(ado: Ado, r: AzureRepo, id: number): Promise<PrWorkItem[]> {
  const refs = await ado<{ value?: Array<{ id: string | number }> }>(`${repoApi(r)}/pullrequests/${id}/workitems?${V}`)
  // The batch endpoint takes at most 200 ids; a PR linking more is not a real case.
  const ids = [...new Set((refs.value ?? []).map((w) => Number(w.id)).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200)
  if (!ids.length) return []
  const items = await ado<{ value?: AzWorkItem[] }>(
    `https://dev.azure.com/${encodeURIComponent(r.org)}/_apis/wit/workitems?ids=${ids.join(',')}` +
      `&fields=System.Title,System.WorkItemType,System.State&errorPolicy=omit&${V}`
  )
  // errorPolicy=omit puts null in the place of an item this token cannot see.
  return mapAzureWorkItems(r.org, ids, (items.value ?? []).filter((w): w is AzWorkItem => !!w))
}

/** The policy type Azure gives a branch's build validation. */
const BUILD_POLICY = '0609b952-1397-4640-95ec-e00a01b2c241'

interface AzPolicyEvaluation {
  status?: string
  configuration?: {
    isBlocking?: boolean
    type?: { id?: string }
    settings?: { displayName?: string | null; buildDefinitionId?: number }
  }
  context?: { buildId?: number; buildDefinitionName?: string; isExpired?: boolean }
}

/** Where a build opens in the browser — and the link the log reader recognises. */
export const azureBuildUrl = (org: string, project: string, buildId: number): string =>
  `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_build/results?buildId=${buildId}`

/**
 * The build a check links to, when it is an Azure Pipelines run in this PR's own
 * organization: `dev.azure.com/<org>/<project>/_build/results?buildId=N`, or the
 * older `<org>.visualstudio.com/<project>/…`. Anything else — an external CI,
 * another organization, a look-alike host — is null, and no token goes to it.
 */
export function azureBuildRef(org: string, link: string): { project: string; buildId: number } | null {
  let u: URL
  let parts: string[]
  try {
    u = new URL(link)
    parts = u.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part))
  } catch {
    return null
  }
  if (u.protocol !== 'https:') return null
  const host = u.hostname.toLowerCase()
  let rest: string[]
  if (host === 'dev.azure.com') {
    if ((parts[0] ?? '').toLowerCase() !== org.toLowerCase()) return null
    rest = parts.slice(1)
  } else if (host === `${org.toLowerCase()}.visualstudio.com`) {
    rest = parts[0]?.toLowerCase() === 'defaultcollection' ? parts.slice(1) : parts
  } else return null
  const buildId = Number(u.searchParams.get('buildId'))
  if (rest.length !== 3 || rest[1] !== '_build' || rest[2] !== 'results' || !Number.isInteger(buildId) || buildId <= 0) {
    return null
  }
  return { project: rest[0], buildId }
}

function statusCheck(r: AzureRepo, s: { state?: string; description?: string; context?: { name?: string; genre?: string }; targetUrl?: string }): PrCheck {
  const name = [s.context?.genre, s.context?.name].filter(Boolean).join('/') || s.description || 'status'
  const pending = !s.state || s.state === 'pending' || s.state === 'notSet'
  const url = s.targetUrl ?? ''
  return {
    name,
    status: pending ? 'in_progress' : 'completed',
    conclusion: pending ? null : s.state === 'succeeded' ? 'success' : s.state === 'notApplicable' ? 'neutral' : 'failure',
    url,
    ...(azureBuildRef(r.org, url) ? { hasLog: true } : {})
  }
}

/**
 * A branch's build validation as a check. Azure records it as a policy
 * evaluation, not as a PR status, so a PR whose only CI is the required
 * pipeline used to show no check at all. `notApplicable` (the policy does not
 * cover this PR's files) is left out, like GitHub leaves out a skipped workflow.
 */
export function mapAzureBuildPolicies(r: AzureRepo, evaluations: readonly AzPolicyEvaluation[]): PrCheck[] {
  return evaluations
    .filter((e) => e.configuration?.type?.id === BUILD_POLICY && e.status !== 'notApplicable')
    .map((e) => {
      const buildId = e.context?.buildId
      const name =
        e.configuration?.settings?.displayName ||
        e.context?.buildDefinitionName ||
        `Build ${e.configuration?.settings?.buildDefinitionId ?? ''}`.trim()
      const st = e.status ?? 'queued'
      const done = st === 'approved' || st === 'rejected' || st === 'broken'
      // An expired build passed once but no longer counts — say so rather than show green.
      const conclusion = !done ? null : st === 'approved' && !e.context?.isExpired ? 'success' : st === 'approved' ? 'neutral' : 'failure'
      return {
        name,
        status: done ? 'completed' : st === 'queued' ? 'queued' : 'in_progress',
        conclusion,
        url: buildId ? azureBuildUrl(r.org, r.project, buildId) : '',
        ...(buildId ? { hasLog: true } : {})
      }
    })
}

/** PR statuses (external CI and pipelines that post one) and build-validation
 *  policies. Policies go through `optional`: reading them may need more scope. */
export async function azurePrChecks(ado: Ado, r: AzureRepo, id: number, optional: Ado = ado): Promise<PrCheck[]> {
  const [st, pr] = await Promise.all([
    ado<{ value?: Array<{ state?: string; description?: string; context?: { name?: string; genre?: string }; targetUrl?: string }> }>(
      `${repoApi(r)}/pullrequests/${id}/statuses?${V}`
    ).catch(() => ({ value: [] })),
    ado<AzPr>(`${repoApi(r)}/pullrequests/${id}?${V}`).catch(() => null)
  ])
  const statuses = (st.value ?? []).map((s) => statusCheck(r, s))
  // Policies are listed by the project's id, which only the PR carries.
  const projectId = pr?.repository?.project?.id
  const ev = projectId
    ? await optional<{ value?: AzPolicyEvaluation[] }>(
        `https://dev.azure.com/${encodeURIComponent(r.org)}/${encodeURIComponent(r.project)}/_apis/policy/evaluations` +
          `?artifactId=${encodeURIComponent(`vstfs:///CodeReview/CodeReviewId/${projectId}/${id}`)}&api-version=7.1-preview.1`
      ).catch(() => ({ value: [] as AzPolicyEvaluation[] }))
    : { value: [] as AzPolicyEvaluation[] }
  const builds = mapAzureBuildPolicies(r, ev.value ?? [])
  // A pipeline that also posts a status would show twice; keep the policy row.
  const seen = new Set(builds.map((b) => b.url.toLowerCase()).filter(Boolean))
  return [...builds, ...statuses.filter((check) => {
    const ref = azureBuildRef(r.org, check.url)
    const url = ref ? azureBuildUrl(r.org, ref.project, ref.buildId) : check.url
    return !url || !seen.has(url.toLowerCase())
  })]
}

interface AzTimelineRecord {
  type?: string
  name?: string
  result?: string | null
  order?: number
  log?: { id?: number } | null
}

/**
 * Which logs of a build to show, in order: the tasks that failed — where the
 * reason is — or, when nothing failed, each job's whole log. At most `max`.
 */
export function pickBuildLogs(records: readonly AzTimelineRecord[], max = 3): { name: string; logId: number }[] {
  const withLog = records
    .filter((r): r is AzTimelineRecord & { log: { id: number } } => typeof r.log?.id === 'number')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const failed = withLog.filter((r) => r.type === 'Task' && r.result === 'failed')
  const pick = failed.length ? failed : withLog.filter((r) => r.type === 'Job')
  return pick.slice(0, max).map((r) => ({ name: r.name ?? '', logId: r.log.id }))
}

/** How much of a build's log the page shows, across every part read: the end, where a failure is. */
const LOG_TAIL_BYTES = 512 * 1024

/**
 * The log of an Azure Pipelines build a check links to, or null when the link
 * is not one of this organization's builds or the token cannot read builds
 * (*Build: Read*). Several failed tasks are shown one after another, each under
 * its name, sharing the same budget.
 */
export async function azureBuildLog(ado: Ado, text: AdoText, r: AzureRepo, link: string): Promise<string | null> {
  const ref = azureBuildRef(r.org, link)
  if (!ref) return null
  const build = `https://dev.azure.com/${encodeURIComponent(r.org)}/${encodeURIComponent(ref.project)}/_apis/build/builds/${ref.buildId}`
  const timeline = await ado<{ records?: AzTimelineRecord[] }>(`${build}/timeline?${V}`).catch(() => null)
  const parts = pickBuildLogs(timeline?.records ?? [])
  if (!parts.length) return null
  const per = Math.floor(LOG_TAIL_BYTES / parts.length)
  const logs = await Promise.all(parts.map((p) => text(`${build}/logs/${p.logId}?${V}`, per).catch(() => null)))
  const shown = parts.flatMap((p, i) => (logs[i] === null ? [] : [parts.length > 1 ? `── ${p.name} ──\n${logs[i]}` : (logs[i] as string)]))
  return shown.length ? shown.join('\n') : null
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
