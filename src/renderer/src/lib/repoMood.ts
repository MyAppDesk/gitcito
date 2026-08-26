// The face the title-bar avatar wears, derived from the repository.
//
// Decoration, not instrumentation: the status bar carries the real counts, and
// this only ever says "something is up" at a glance.
//
// The thing that makes a reacting face work or fail is how often it speaks. So
// every reading below is either an *interruption* — an operation git was never
// told how to finish, a HEAD with no branch under it — or a pile past a
// threshold picked so an ordinary day never trips it. A face that is worried
// every day is a face nobody looks at.
//
// Everything it reads is already in the repo store. A face is not worth an
// extra git process, so nothing here is fetched on its behalf.

import type { TranslationKey } from '../i18n'
import type { ConflictOpKind, RepoStatus } from '../../../shared/types'

/** The blobatar poses we use. `idle` is the neutral face. */
export type Mood =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'mad'
  | 'thinking'
  | 'scared'
  | 'unsure'
  | 'sick'
  | 'sleepy'

/** What the face reads. Everything optional is a slice the caller may not have
 *  yet — a repository mid-open has a status before it has a graph. */
export interface MoodInput {
  status: RepoStatus | null
  /** A merge/rebase/cherry-pick/revert git has not been told how to finish. */
  mergeState?: ConflictOpKind | null
  /** How many stashes are parked. */
  stashCount?: number
  /** Unix **seconds** of the newest commit in the graph — the graph's own unit. */
  newestCommitAt?: number | null
  /** Epoch **ms**. Injected rather than read, so the reading stays a pure
   *  function of its inputs and the quiet threshold is testable. */
  now?: number
}

export interface MoodHint {
  mood: Mood
  /** Dictionary key for the tooltip; render with `interp(t(key), vars)`.
   *  Absent for `idle` — an ordinary working tree needs no explanation. */
  key?: TranslationKey
  vars?: Record<string, string | number>
}

/**
 * Where each mood starts.
 *
 * Thresholds rather than "> 0" because a face that turns sad at one unpushed
 * commit is sad permanently, which teaches the reader to stop looking at it.
 * These are the points where a pile stops being normal work in progress.
 */
export const UNPUSHED_SAD = 10
export const BEHIND_SAD = 25
export const UNCOMMITTED_SAD = 25
/** Where a stash stops being a parking space and becomes a drawer nobody opens. */
export const STASH_SICK = 10
/** A repository whose newest commit is older than this is not being worked on. */
export const QUIET_DAYS = 30

const DAY_MS = 86_400_000

/** One key per kind rather than an interpolated noun: the sentence declines
 *  differently around "rebase" and "merge" in most of the locales we ship. */
const OP_KEYS: Record<ConflictOpKind, TranslationKey> = {
  merge: 'mood.opMerge',
  rebase: 'mood.opRebase',
  'cherry-pick': 'mood.opCherryPick',
  revert: 'mood.opRevert'
}

/**
 * First match wins, worst first — a repository with conflicts *and* forty
 * unpushed commits has one problem worth a face, and it is the conflicts.
 */
export function repoMood(input: MoodInput): MoodHint {
  const { status, mergeState = null, stashCount = 0, newestCommitAt = null, now = 0 } = input
  if (!status) return { mood: 'idle' }

  const conflicted = status.conflicted.length
  if (conflicted > 0) return { mood: 'mad', key: 'mood.conflicts', vars: { n: conflicted } }

  // An operation git is still holding open. Conflicts outrank it because they
  // are the reason it stopped; without them this is a rebase somebody walked
  // away from, which is exactly the thing worth being told about.
  if (mergeState) return { mood: 'thinking', key: OP_KEYS[mergeState] }

  const dirty = status.staged.length + status.unstaged.length

  // simple-git reports a detached HEAD as the literal branch name `HEAD`.
  // Uncommitted work on one is the only state in this file where doing the
  // ordinary next thing loses something, so it gets the only alarmed face.
  if (status.current === 'HEAD') {
    if (dirty > 0) return { mood: 'scared', key: 'mood.detachedDirty', vars: { n: dirty } }
    return { mood: 'unsure', key: 'mood.detached' }
  }

  if (status.ahead >= UNPUSHED_SAD) return { mood: 'sad', key: 'mood.unpushed', vars: { n: status.ahead } }
  if (status.behind >= BEHIND_SAD) return { mood: 'sad', key: 'mood.behind', vars: { n: status.behind } }
  if (dirty >= UNCOMMITTED_SAD) return { mood: 'sad', key: 'mood.uncommitted', vars: { n: dirty } }

  // Below the piles, not above them: a stash hoard is a mess rather than an
  // obstacle, and it should never shout over work that is actually blocked.
  if (stashCount >= STASH_SICK) return { mood: 'sick', key: 'mood.stashes', vars: { n: stashCount } }

  // Happy is the narrow case: nothing local, nothing waiting, and an upstream
  // to be in sync *with*. A branch that has never been pushed is not "in sync",
  // it is untracked — that stays idle rather than claiming a clean slate.
  if (status.tracking && status.ahead === 0 && status.behind === 0 && dirty === 0) {
    // Clean *and* nothing has landed in a month: the repository is dormant, not
    // finished. Only reachable from the happy case, so it can never mask work.
    if (now > 0 && newestCommitAt !== null) {
      const days = Math.floor((now - newestCommitAt * 1000) / DAY_MS)
      if (days >= QUIET_DAYS) return { mood: 'sleepy', key: 'mood.quiet', vars: { n: days } }
    }
    return { mood: 'happy', key: 'mood.clean' }
  }

  return { mood: 'idle' }
}
