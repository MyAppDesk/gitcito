/**
 * How many refs a sidebar section can hold before it is treated as "huge".
 *
 * Above this, two things change, both aimed at repositories carrying thousands
 * of never-deleted remote branches: the section's rows stop laying out and
 * painting while scrolled out of view (`.sb-body.is-huge` in styles.css), and
 * the section stops opening by default.
 */
export const HUGE_SECTION = 300

/**
 * Whether a section should start open.
 *
 * Sections open by default — except when they hold enough refs that mounting
 * them all is itself what makes the sidebar slow. Below the threshold nothing
 * changes; above it the user opens what they actually want, and that choice is
 * persisted. This picks only the default for a section nobody has touched yet.
 *
 * `base` carries a caller's own reason to stay closed (a non-origin remote),
 * which the size rule can veto but never overrule.
 */
export function openUnlessHuge(count: number, base = true): boolean {
  return base && count <= HUGE_SECTION
}
