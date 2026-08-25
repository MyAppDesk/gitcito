import type { GitLockFile } from '../../../shared/types'

/**
 * Git's lock files, from the renderer's side.
 *
 * Git takes a `*.lock` next to whatever it is about to write and removes it on
 * the way out. When a process dies holding one — a crashed editor, a terminal
 * closed mid-`git commit`, a fetch killed while pruning remote refs — the lock
 * survives and every later write fails with the same opaque line:
 *
 * ```
 * cannot lock ref 'refs/remotes/origin/x': Unable to create '…x.lock': File exists.
 * ```
 *
 * The message names the file and then tells the reader to go find a process and
 * delete it by hand. This module turns that into a decision the UI can make.
 */

/** True for the "Unable to create '…lock': File exists" family of failures. */
export function isLockErrorMessage(msg: string): boolean {
  return /\.lock['"]?:\s*File exists/i.test(msg) || /cannot lock ref/i.test(msg)
}

/** Locks younger than this are presumed live — main refuses to delete them. */
export const MIN_LOCK_AGE_SECONDS = 30

export interface LockRepairPlan {
  /** Old enough that no running git can plausibly own them. */
  removable: GitLockFile[]
  /** Too young to touch — a git process is probably still working. */
  young: GitLockFile[]
}

/**
 * Split the locks found into the ones worth offering to remove and the ones
 * that mean "something is running, wait". Removable first and oldest first, so
 * the list reads as strongest evidence down.
 */
export function lockRepairPlan(locks: GitLockFile[], minAgeSeconds = MIN_LOCK_AGE_SECONDS): LockRepairPlan {
  const removable = locks.filter((l) => l.ageSeconds >= minAgeSeconds).sort((a, b) => b.ageSeconds - a.ageSeconds)
  const young = locks.filter((l) => l.ageSeconds < minAgeSeconds)
  return { removable, young }
}
