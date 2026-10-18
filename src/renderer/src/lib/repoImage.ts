import type { TabRepoLabel } from '../../../shared/types'
import { canonicalRepoPath } from './repoAlias'

// Per-repository tab images. The stored value is a path relative to the
// repository root, keyed by canonical repository path the way aliases are.

/** Slash-separated and without a leading `./`, so `.\a\b.png` and `a/b.png`
 *  are the same setting. */
export function normalizeImagePath(input: string): string {
  return input.trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '')
}

export function lookupRepoImage(path: string, images: Record<string, string> | undefined): string | undefined {
  if (!images) return undefined
  return images[canonicalRepoPath(path)]?.trim() || undefined
}

/** Set or clear (empty / null) a repository's image path. */
export function applyRepoImage(
  images: Record<string, string> | undefined,
  path: string,
  file: string | null
): Record<string, string> {
  const next = { ...(images ?? {}) }
  const key = canonicalRepoPath(path)
  const value = normalizeImagePath(file ?? '')
  if (value) next[key] = value
  else delete next[key]
  return next
}

/** The formats `repoImage` in main can serve as a tab image. */
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif']

export function isImagePath(path: string): boolean {
  const dot = path.lastIndexOf('.')
  return dot > path.lastIndexOf('/') && IMAGE_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase())
}

// Names a repository's own logo tends to have. Matched against the file name
// only, so `icons/arrow.svg` does not outrank `logo.png` on its folder alone.
const ICONISH = /(logo|icon|favicon|avatar|brand|mark|emblem|badge)/

/**
 * The repository's images that match `query`, the likeliest tab image first:
 * logo-ish names, then shallow paths, then shorter ones. Every
 * whitespace-separated query word has to appear in the path, case-insensitive.
 */
export function rankImageCandidates(files: string[], query: string, limit = 40): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const scored: { path: string; score: number }[] = []
  for (const path of files) {
    if (!isImagePath(path)) continue
    const lower = path.toLowerCase()
    if (!words.every((w) => lower.includes(w))) continue
    const name = lower.slice(lower.lastIndexOf('/') + 1)
    let score = path.split('/').length * 10 + path.length / 100
    if (ICONISH.test(name)) score -= 100
    if (words.length && name.startsWith(words[0])) score -= 50
    scored.push({ path, score })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map((s) => s.path)
}

/** Which halves of a repository tab to draw. Without an image the name is the
 *  only thing that identifies the tab, so it always shows. */
export function tabLabelParts(
  mode: TabRepoLabel | undefined,
  hasImage: boolean
): { image: boolean; name: boolean } {
  if (!hasImage) return { image: false, name: true }
  return { image: mode !== 'name', name: mode !== 'image' }
}
