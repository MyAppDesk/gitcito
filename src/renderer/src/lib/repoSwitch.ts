/** Where the "loading because of a switch" marker lives — the UI store in the app, a variable in tests. */
export interface RepoSwitchSlot {
  get(): string | null
  set(path: string | null): void
}

/**
 * Mark `path` as loading because the user switched to it, for as long as
 * `work` (its refresh or first load) runs.
 *
 * Switching back to a repository shows its last state at once and refreshes it
 * underneath, so without a marker the screen gives no sign that newer data is
 * on the way. Only a switch sets it — background polls stay silent, or the
 * indicator would flicker every few seconds.
 *
 * Only the latest switch clears the marker. Comparing paths is not enough:
 * switching A → B → A quickly would let A's first refresh, finishing while the
 * second is still running, clear the marker the second A set. A failed refresh
 * clears it too; the refresh reports its own error.
 */
let seq = 0

export async function trackRepoSwitch(path: string, work: Promise<unknown>, slot: RepoSwitchSlot): Promise<void> {
  const mine = ++seq
  slot.set(path)
  try {
    await work
  } catch {
    // The refresh toasts its own failure; the marker only has to go away.
  } finally {
    if (mine === seq) slot.set(null)
  }
}
