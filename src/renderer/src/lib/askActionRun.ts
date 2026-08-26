import type {
  AskAction,
  PreparedRepoChatFileAction,
  RepoChatAction,
  RepoChatActionErrorCode,
  RepoChatExecutionResult
} from '../../../shared/types'
import { gitApi, hostingApi } from '../infrastructure/api'
import { askActionSafety } from './askActions'
import { useSettingsStore } from '../stores/settings'
import { submitStackCore, useRepoStore } from '../stores/repo'

export interface AskRunResult {
  applied: number
  /** Action types the model emitted that this app refuses to execute. */
  skipped: string[]
}

/**
 * Runs a validated action list against one repository, in order. The single
 * executor behind both AI surfaces (the Ask tab and chat proposals), so an
 * action behaves identically wherever it was approved. Throws on the first
 * failing git call; the caller owns refresh, toasts and busy state.
 */
export async function executeAskActions(repoPath: string, actions: AskAction[]): Promise<AskRunResult> {
  // Fresh untracked set, so "discard" routes to clean vs checkout correctly.
  const status = await gitApi.status(repoPath)
  const untracked = new Set(
    [...status.unstaged, ...status.staged].filter((file) => file.untracked).map((file) => file.path)
  )
  let applied = 0
  const skipped: string[] = []
  for (const action of actions) {
    if (action.type === 'gitignore') await gitApi.addToGitignore(repoPath, action.patterns)
    else if (action.type === 'stage') await gitApi.stage(repoPath, action.files)
    else if (action.type === 'unstage') await gitApi.unstage(repoPath, action.files)
    else if (action.type === 'commit') {
      if (action.files && action.files.length > 0) await gitApi.stage(repoPath, action.files)
      await gitApi.commit(repoPath, action.message)
    } else if (action.type === 'stash') {
      await gitApi.stashPush(repoPath, action.message, action.files)
    } else if (action.type === 'discard') {
      const tracked = action.files.filter((file) => !untracked.has(file))
      const untrackedFiles = action.files.filter((file) => untracked.has(file))
      if (tracked.length) await gitApi.discard(repoPath, tracked, false)
      if (untrackedFiles.length) await gitApi.discard(repoPath, untrackedFiles, true)
    } else if (action.type === 'branch') {
      await gitApi.createBranch(repoPath, action.name, action.at, action.checkout ?? true)
    } else if (action.type === 'checkout') {
      await gitApi.checkout(repoPath, action.ref)
    } else if (action.type === 'tag') {
      await gitApi.createTag(repoPath, action.name, undefined, action.message ? { message: action.message } : undefined)
    } else {
      // Model emitted a type we don't execute — never claim it was applied.
      skipped.push((action as { type?: string }).type ?? 'unknown')
      continue
    }
    applied++
  }
  return { applied, skipped }
}

const FILE_ACTION_TYPES = new Set(['edit_file', 'write_file', 'delete_file'])
const ERROR_CODES = new Set<RepoChatActionErrorCode>([
  'unsafe_path',
  'git_internal_path',
  'symlink_path',
  'secret_file',
  'ignored_path',
  'generated_path',
  'binary_file',
  'file_too_large',
  'batch_too_large',
  'evidence_required',
  'incomplete_evidence',
  'not_found',
  'already_exists',
  'stale_file',
  'old_text_missing',
  'ambiguous_edit',
  'no_staged_changes',
  'hook_failed',
  'rollback_failed',
  'unknown'
])

function isPreparedFileAction(action: RepoChatAction): action is PreparedRepoChatFileAction {
  return FILE_ACTION_TYPES.has(action.type)
}

function redactedErrorDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@')
    .replace(/\b(?:sk|ghp|lt_llm)_[A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .replace(/\b(api[_ -]?key|token|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
}

/** Convert transport and Git failures into the stable result contract. */
export function classifyRepoChatActionError(
  action: RepoChatAction,
  error: unknown
): { code: RepoChatActionErrorCode; detail?: string; paths?: string[] } {
  const shaped = error as { code?: unknown; detail?: unknown; message?: unknown; paths?: unknown } | null
  const code = typeof shaped?.code === 'string' && ERROR_CODES.has(shaped.code as RepoChatActionErrorCode)
    ? (shaped.code as RepoChatActionErrorCode)
    : action.type === 'commit' && /hook|husky|pre-commit|commit-msg/i.test(redactedErrorDetail(error))
      ? 'hook_failed'
      : 'unknown'
  const detailSource = typeof shaped?.detail === 'string' ? shaped.detail : error
  const detail = redactedErrorDetail(detailSource)
  const paths = Array.isArray(shaped?.paths)
    ? shaped.paths.filter((path): path is string => typeof path === 'string')
    : undefined
  return { code, ...(detail ? { detail } : {}), ...(paths?.length ? { paths } : {}) }
}

function failedResult(
  actions: RepoChatAction[],
  applied: number,
  failedIndex: number,
  error: RepoChatExecutionResult['error'],
  actionResults: RepoChatExecutionResult['actionResults']
): RepoChatExecutionResult {
  actionResults[failedIndex] = {
    index: failedIndex,
    type: actions[failedIndex].type,
    status: 'failed'
  }
  return {
    applied,
    failedIndex,
    failedType: actions[failedIndex].type,
    error,
    remaining: actions.length - failedIndex - 1,
    actionResults
  }
}

/** Execute repository file mutations as one atomic prefix, then Git actions. */
export async function executeRepoChatActions(
  repoPath: string,
  actions: RepoChatAction[]
): Promise<RepoChatExecutionResult> {
  const actionResults: RepoChatExecutionResult['actionResults'] = actions.map((action, index) => ({
    index,
    type: action.type,
    status: 'skipped'
  }))
  const fileActions: PreparedRepoChatFileAction[] = []
  while (fileActions.length < actions.length && isPreparedFileAction(actions[fileActions.length])) {
    fileActions.push(actions[fileActions.length] as PreparedRepoChatFileAction)
  }

  let applied = 0
  if (fileActions.length) {
    try {
      const result = await gitApi.applyRepoFileActions(repoPath, fileActions)
      if (!result.ok) return failedResult(actions, 0, 0, result.error, actionResults)
      for (let i = 0; i < fileActions.length; i++) {
        actionResults[i] = { index: i, type: actions[i].type, status: 'done' }
      }
      applied = fileActions.length
    } catch (error) {
      return failedResult(actions, 0, 0, classifyRepoChatActionError(actions[0], error), actionResults)
    }
  }

  let untracked: Set<string> | null = null
  const prs: NonNullable<RepoChatExecutionResult['prs']> = []
  for (let index = fileActions.length; index < actions.length; index++) {
    const action = actions[index]
    if (isPreparedFileAction(action)) {
      return failedResult(
        actions,
        applied,
        index,
        { code: 'unknown', detail: 'File actions must appear before Git actions.' },
        actionResults
      )
    }
    try {
      if (action.type === 'gitignore') await gitApi.addToGitignore(repoPath, action.patterns)
      else if (action.type === 'stage') await gitApi.stage(repoPath, action.files)
      else if (action.type === 'unstage') await gitApi.unstage(repoPath, action.files)
      else if (action.type === 'commit') {
        if (action.files?.length) await gitApi.stage(repoPath, action.files)
        const status = await gitApi.status(repoPath)
        if (status.staged.length === 0) {
          return failedResult(actions, applied, index, { code: 'no_staged_changes' }, actionResults)
        }
        await gitApi.commit(repoPath, action.message)
      } else if (action.type === 'stash') {
        await gitApi.stashPush(repoPath, action.message, action.files)
      } else if (action.type === 'discard') {
        if (!untracked) {
          const status = await gitApi.status(repoPath)
          untracked = new Set(
            [...status.unstaged, ...status.staged]
              .filter((file) => file.untracked)
              .map((file) => file.path)
          )
        }
        const tracked = action.files.filter((file) => !untracked?.has(file))
        const untrackedFiles = action.files.filter((file) => untracked?.has(file))
        if (tracked.length) await gitApi.discard(repoPath, tracked, false)
        if (untrackedFiles.length) await gitApi.discard(repoPath, untrackedFiles, true)
      } else if (action.type === 'branch') {
        await gitApi.createBranch(repoPath, action.name, action.at, action.checkout ?? true)
      } else if (action.type === 'checkout') {
        await gitApi.checkout(repoPath, action.ref)
      } else if (action.type === 'tag') {
        await gitApi.createTag(
          repoPath,
          action.name,
          undefined,
          action.message ? { message: action.message } : undefined
        )
      } else if (action.type === 'merge') {
        await gitApi.merge(repoPath, action.ref, action.noFf ? { noFf: true } : undefined)
      } else if (action.type === 'rebase') {
        await gitApi.rebase(repoPath, action.onto)
      } else if (action.type === 'revert') {
        // Newest first, as proposed: reverting the tip before the commit under
        // it is the order that applies cleanly.
        for (const hash of action.hashes) await gitApi.revertCommit(repoPath, hash)
      } else if (action.type === 'cherry_pick') {
        // Proposed newest-first, applied oldest-first — the same flip the
        // commit list's own cherry-pick does.
        await gitApi.cherryPickMany(repoPath, [...action.hashes].reverse())
      } else if (action.type === 'fetch') {
        if (action.remote) await gitApi.fetchRemote(repoPath, action.remote)
        else await gitApi.fetchAll(repoPath)
      } else if (action.type === 'pull') {
        await gitApi.pull(repoPath, action.mode ?? 'default')
      } else if (action.type === 'push') {
        const branch = action.branch ?? (await gitApi.status(repoPath)).current
        if (!branch) {
          return failedResult(actions, applied, index, { code: 'unknown', detail: 'No branch to push.' }, actionResults)
        }
        // Force is not in the union: a plan may publish work, never rewrite it.
        await gitApi.push(repoPath, branch, action.remote ? { remote: action.remote } : undefined)
      } else if (action.type === 'open_pr') {
        prs.push(await openProposedPr(repoPath, action))
      } else if (action.type === 'stack_submit') {
        const outcome = await submitStackCore(repoPath, action.leaf)
        for (const entry of outcome.entries) {
          prs.push({ number: entry.number, url: entry.url, branch: entry.branch, base: entry.base, action: entry.action })
        }
      } else {
        // A type this build cannot run must never be reported as applied.
        actionResults[index] = { index, type: (action as { type: RepoChatAction['type'] }).type, status: 'skipped' }
        continue
      }
      actionResults[index] = { index, type: action.type, status: 'done' }
      applied++
    } catch (error) {
      return failedResult(actions, applied, index, classifyRepoChatActionError(action, error), actionResults)
    }
  }

  return { applied, remaining: 0, actionResults, ...(prs.length ? { prs } : {}) }
}

/**
 * Open one pull request from a proposal. The remote is the repository's origin
 * (or its first remote) — the same one the PR list is read from, because a PR
 * opened against a different remote has a head the host cannot see.
 */
async function openProposedPr(
  repoPath: string,
  action: Extract<AskAction, { type: 'open_pr' }>
): Promise<NonNullable<RepoChatExecutionResult['prs']>[number]> {
  const repo = useRepoStore.getState().repos[repoPath]
  const origin = repo?.remotes.find((remote) => remote.name === 'origin') ?? repo?.remotes[0]
  if (!origin) throw new Error('This repository has no remote to open a pull request against.')
  const source = action.source || repo?.branches.current
  if (!source) throw new Error('No branch to open a pull request from.')
  const profile = useSettingsStore.getState().activeProfile()
  const result = await hostingApi.createPR(origin.url, { github: profile.githubToken || undefined }, {
    title: action.title,
    body: action.body ?? '',
    source,
    target: action.target,
    draft: action.draft === true
  })
  return { number: result.number, url: result.url, branch: source, base: action.target, action: 'create' }
}

/**
 * The one photograph a plan gets, taken before its first action.
 *
 * A chat plan is approved as a batch, so it has to be undoable as a batch: the
 * commit tip it started from, plus a WIP snapshot of the working tree. Actions
 * that only read or only stage need neither — nothing they do is worth a
 * snapshot, and a clean tree has nothing to photograph, so both cases return
 * what the caller can safely ignore.
 */
export async function planGuardSnapshot(
  repoPath: string,
  actions: RepoChatAction[]
): Promise<{ sha: string; head: string } | null> {
  if (!actions.some((action) => askActionSafety(action) !== 'safe')) return null
  const head = await gitApi.resolveRev(repoPath, 'HEAD').catch(() => null)
  if (!head) return null
  const snapshot = await gitApi.createSnapshot(repoPath, 'guard').catch(() => null)
  return { sha: snapshot?.sha ?? '', head }
}
