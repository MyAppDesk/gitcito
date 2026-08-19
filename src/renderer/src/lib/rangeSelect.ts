// Shared mechanics for Shift+↑/↓ range selection. Several panels (sidebar
// refs, WIP file lists, stash and commit file lists) each keep their own
// selection state; this module holds the two pieces they all need:
//
//  - `stepRange`, the pure anchor/end arithmetic of one arrow press, and
//  - a "keyboard owner" token, so only the panel the user last clicked in
//    reacts to the keys — every panel listens on `window`, and without a
//    single owner one keypress would grow several selections at once.

export interface RangeStep {
  /** The new selection: every id between the anchor and the new end, inclusive. */
  ids: string[]
  /** The moving end of the range after this step, anchor-side stays fixed. */
  end: string
}

/**
 * One Shift+arrow step of a range selection. `anchor` is the last plainly
 * clicked row (the fixed side), `end` the current moving side (null when the
 * range has not been extended yet). Returns null when the anchor is not in
 * `ordered` — e.g. the list was refiltered under the selection.
 */
export function stepRange(ordered: string[], anchor: string, end: string | null, dir: 1 | -1): RangeStep | null {
  const a = ordered.indexOf(anchor)
  if (a === -1) return null
  let b = end !== null ? ordered.indexOf(end) : a
  if (b === -1) b = a
  b = Math.min(ordered.length - 1, Math.max(0, b + dir))
  return { ids: ordered.slice(Math.min(a, b), Math.max(a, b) + 1), end: ordered[b] }
}

/**
 * Visible row order read from the DOM: the rows matching `selector` inside
 * `container`, in document order. Collapsed folders unmount their rows, so
 * this is exactly what the user sees — unlike the flat data array, whose
 * order diverges from the tree view's grouping.
 */
export function domOrder(container: ParentNode | null, selector: string, attr: string): string[] {
  if (!container) return []
  // Deduped, first occurrence wins — a row rendered twice (a pinned branch is
  // also listed in its normal spot) must not appear twice in the order.
  return [
    ...new Set(
      Array.from(container.querySelectorAll(selector))
        .map((el) => el.getAttribute(attr) ?? '')
        .filter(Boolean)
    )
  ]
}

let owner: symbol | null = null

/** Claim the Shift+arrow keys for a panel — call on every row click. */
export function claimRangeKeys(token: symbol): void {
  owner = token
}

/** Whether `token` was the last panel clicked, i.e. may act on the keys. */
export function ownsRangeKeys(token: symbol): boolean {
  return owner === token
}

/** True when a Shift+↑/↓ press should be left alone: something focusable owns
 *  the keyboard (an input, the graph, a modal) rather than the page body or a
 *  file list — the one focusable container whose arrow keys the panels share. */
export function rangeKeysBlocked(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || el === document.body) return false
  if (el.classList?.contains('file-list')) return false
  return true
}
