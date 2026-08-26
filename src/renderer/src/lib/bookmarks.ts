import type { RepoBookmark } from '../../../shared/types'

/**
 * Finding a bookmark again after the file has moved on.
 *
 * `file.ts:42` rots the moment someone inserts a line above it, and a bookmark
 * that quietly opens the wrong line is worse than one that admits it is lost.
 * So the line's text is stored alongside its number, and opening re-locates:
 * the stored line first, then the nearest line with the same text, then the
 * nearest one that matches ignoring whitespace. Failing all three it says so
 * rather than guessing.
 */

export type BookmarkState = 'exact' | 'moved' | 'lost'

export interface Located {
  /** 1-based line to open. For a lost bookmark, the line last recorded. */
  line: number
  state: BookmarkState
}

/** How far from the remembered line to look before giving up. */
const SEARCH_RADIUS = 400

function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** `lines` is the file's current content, split on newlines. */
export function locateBookmark(bookmark: RepoBookmark, lines: string[]): Located {
  const target = bookmark.snippet
  // A bookmark on a blank line has nothing to match on; the number is all there
  // is, and pretending otherwise would land on the first blank line in the file.
  if (!normalise(target)) {
    return { line: Math.min(bookmark.line, Math.max(lines.length, 1)), state: lines.length >= bookmark.line ? 'exact' : 'lost' }
  }
  const at = lines[bookmark.line - 1]
  if (at !== undefined && at === target) return { line: bookmark.line, state: 'exact' }

  // Nearest first, so a line duplicated across the file resolves to the copy
  // closest to where it used to be.
  const nearest = (match: (line: string) => boolean): number | null => {
    for (let d = 0; d <= SEARCH_RADIUS; d++) {
      const before = bookmark.line - 1 - d
      const after = bookmark.line - 1 + d
      if (before >= 0 && before < lines.length && match(lines[before])) return before + 1
      if (d !== 0 && after < lines.length && match(lines[after])) return after + 1
    }
    return null
  }

  const exact = nearest((line) => line === target)
  if (exact !== null) return { line: exact, state: exact === bookmark.line ? 'exact' : 'moved' }

  const loose = normalise(target)
  const fuzzy = nearest((line) => normalise(line) === loose)
  if (fuzzy !== null) return { line: fuzzy, state: fuzzy === bookmark.line ? 'exact' : 'moved' }

  return { line: Math.min(bookmark.line, Math.max(lines.length, 1)), state: 'lost' }
}

/** What the sidebar shows for a bookmark with no note of its own. */
export function bookmarkLabel(bookmark: RepoBookmark): string {
  const note = bookmark.note?.trim()
  if (note) return note
  const snippet = bookmark.snippet.trim()
  return snippet || `${baseName(bookmark.file)}:${bookmark.line}`
}

export function baseName(file: string): string {
  return file.slice(file.lastIndexOf('/') + 1)
}

/** Newest first — a bookmark is a note to self, and the last one still matters most. */
export function sortBookmarks(list: RepoBookmark[]): RepoBookmark[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt)
}
