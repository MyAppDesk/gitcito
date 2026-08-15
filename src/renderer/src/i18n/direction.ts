import type { Language } from '../../../shared/types'

/** Locales written right-to-left. */
const RTL: ReadonlySet<Language> = new Set<Language>(['ar', 'he'])

export function isRtl(lang: Language): boolean {
  return RTL.has(lang)
}

/**
 * Mirrors the whole UI for RTL locales by flipping `dir` on the root element:
 * every CSS logical property (`margin-inline-start`, `inset-inline-end`, …)
 * resolves against it, so layout follows without per-component work.
 *
 * `lang` is set alongside because it drives font fallback and hyphenation —
 * Chromium picks a different default face for Arabic than for Latin text.
 * Islands that must stay left-to-right (the commit graph, diffs, terminals,
 * paths) opt out with `direction: ltr` in styles.css rather than here.
 */
export function applyDirection(lang: Language): void {
  const r = document.documentElement
  r.dir = isRtl(lang) ? 'rtl' : 'ltr'
  r.lang = lang
}
