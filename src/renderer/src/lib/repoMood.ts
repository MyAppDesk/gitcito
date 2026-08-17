// The face the title-bar avatar wears, derived from the working tree.
//
// Decoration, not instrumentation: the status bar carries the real counts, and
// this only ever says "something is up" at a glance. It stays deliberately
// coarse — four poses is the whole vocabulary blobatar offers, so a fifth
// distinction would have to borrow a pose and make both readings unreliable.

import type { TranslationKey } from '../i18n'
import type { RepoStatus } from '../../../shared/types'

/** The four poses blobatar draws. `idle` is the neutral face. */
export type Mood = 'idle' | 'happy' | 'sad' | 'mad'

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

/**
 * First match wins, worst first — a repository with conflicts *and* forty
 * unpushed commits has one problem worth a face, and it is the conflicts.
 */
export function repoMood(status: RepoStatus | null): MoodHint {
  if (!status) return { mood: 'idle' }

  const conflicted = status.conflicted.length
  if (conflicted > 0) return { mood: 'mad', key: 'mood.conflicts', vars: { n: conflicted } }

  if (status.ahead >= UNPUSHED_SAD) return { mood: 'sad', key: 'mood.unpushed', vars: { n: status.ahead } }
  if (status.behind >= BEHIND_SAD) return { mood: 'sad', key: 'mood.behind', vars: { n: status.behind } }

  const dirty = status.staged.length + status.unstaged.length
  if (dirty >= UNCOMMITTED_SAD) return { mood: 'sad', key: 'mood.uncommitted', vars: { n: dirty } }

  // Happy is the narrow case: nothing local, nothing waiting, and an upstream
  // to be in sync *with*. A branch that has never been pushed is not "in sync",
  // it is untracked — that stays idle rather than claiming a clean slate.
  if (status.tracking && status.ahead === 0 && status.behind === 0 && dirty === 0)
    return { mood: 'happy', key: 'mood.clean' }

  return { mood: 'idle' }
}
