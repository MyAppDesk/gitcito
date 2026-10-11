/**
 * Reading a number a person is typing into a bounded field. Pure, so the rules
 * are pinned by tests — the bug this replaces clamped on every keystroke, which
 * turned the "2" of "2000" into the minimum before the zeros could follow.
 */

export interface NumberBounds {
  min: number
  /** Omitted for an open-ended field. */
  max?: number
}

export type DraftVerdict =
  | { status: 'valid'; value: number }
  /** Nothing typed, or not a number: keep the last good value. */
  | { status: 'empty' }
  /** A number, but outside the bounds; `nearest` is what leaving the field snaps to. */
  | { status: 'out-of-range'; nearest: number }

/** What the current draft means. Whole numbers only — every field using this counts something. */
export function readDraft(draft: string, { min, max }: NumberBounds): DraftVerdict {
  const trimmed = draft.trim()
  if (trimmed === '' || !/^-?\d+$/.test(trimmed)) return { status: 'empty' }
  const value = Number(trimmed)
  if (value < min) return { status: 'out-of-range', nearest: min }
  if (max !== undefined && value > max) return { status: 'out-of-range', nearest: max }
  return { status: 'valid', value }
}

/** The value to keep when the person leaves the field. */
export function settleDraft(draft: string, bounds: NumberBounds, lastGood: number): number {
  const verdict = readDraft(draft, bounds)
  if (verdict.status === 'valid') return verdict.value
  if (verdict.status === 'out-of-range') return verdict.nearest
  return lastGood
}
