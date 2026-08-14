/**
 * The in-app handbook, loaded straight from the Markdown files in `docs/help/`.
 *
 * One source, two readers: the same file is what someone browses on GitHub and
 * what the Help view renders offline. Nothing is fetched at runtime — Vite
 * inlines the text at build time — so the handbook works on a plane, and a page
 * that stops matching the code shows up in review as a diff next to it.
 */

/** Front-matter every help page carries. */
export interface HelpMeta {
  /** URL-ish id, taken from the file name (`conflict-radar.md` → `conflict-radar`). */
  id: string
  title: string
  /** Section it belongs to in the sidebar. */
  category: string
  /** Sort key inside its category. */
  order: number
  /** One line under the title, and the snippet shown in search results. */
  summary: string
  /** Extra words the search should match (synonyms, old names, shortcuts). */
  keywords: string
}

export interface HelpPage extends HelpMeta {
  /** Markdown body, front matter stripped. */
  body: string
}

// Raw Markdown for every handbook page, and every image they can reference.
const RAW = import.meta.glob('../../../../docs/help/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<
  string,
  string
>
const MEDIA = import.meta.glob('../../../../docs/screenshots/*', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

/** Basename → bundled URL, so Markdown can use repo-relative image paths. */
const mediaByName = new Map<string, string>(
  Object.entries(MEDIA).map(([path, url]) => [path.split('/').pop() ?? path, url])
)

/**
 * Parse the leading `--- key: value ---` block. Deliberately not a YAML parser:
 * the fields are flat strings, and a dependency for that would be silly.
 */
function parseFrontMatter(source: string): { meta: Partial<HelpMeta>; body: string } {
  if (!source.startsWith('---')) return { meta: {}, body: source }
  const end = source.indexOf('\n---', 3)
  if (end === -1) return { meta: {}, body: source }
  const meta: Record<string, string> = {}
  for (const line of source.slice(3, end).split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    meta[line.slice(0, colon).trim()] = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return {
    meta: { ...meta, order: meta.order ? Number(meta.order) : undefined } as Partial<HelpMeta>,
    body: source.slice(end + 4).replace(/^\n+/, '')
  }
}

/**
 * Point image links at the bundled asset. Pages use repo-relative paths
 * (`../screenshots/foo.webp`) so they render on GitHub too; only the basename is
 * matched here, which keeps the two in step without a build step of its own.
 */
export function resolveMedia(markdown: string): string {
  return markdown.replace(/\]\(([^)]*?\/)?([\w.-]+\.(?:png|gif|jpg|jpeg|webp|svg))\)/g, (whole, _dir, file) => {
    const url = mediaByName.get(file)
    return url ? `](${url})` : whole
  })
}

export const HELP_PAGES: HelpPage[] = Object.entries(RAW)
  .map(([path, source]) => {
    const id = (path.split('/').pop() ?? '').replace(/\.md$/, '')
    const { meta, body } = parseFrontMatter(source)
    return {
      id,
      title: meta.title ?? id,
      category: meta.category ?? 'Guide',
      order: meta.order ?? 999,
      summary: meta.summary ?? '',
      keywords: meta.keywords ?? '',
      body
    }
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

/** Pages grouped into sidebar sections, categories in first-appearance order. */
export function helpSections(pages: HelpPage[] = HELP_PAGES): { category: string; pages: HelpPage[] }[] {
  const byCategory = new Map<string, HelpPage[]>()
  for (const page of pages) {
    const list = byCategory.get(page.category)
    if (list) list.push(page)
    else byCategory.set(page.category, [page])
  }
  return [...byCategory.entries()].map(([category, list]) => ({ category, pages: list }))
}

/**
 * Search titles, summaries, keywords and body text, best match first.
 * A title hit beats a keyword hit beats a passing mention in the prose.
 */
export function searchHelp(query: string, pages: HelpPage[] = HELP_PAGES): HelpPage[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored: { page: HelpPage; score: number }[] = []
  for (const page of pages) {
    let score = 0
    if (page.title.toLowerCase().includes(q)) score += 10
    if (page.summary.toLowerCase().includes(q)) score += 5
    if (page.keywords.toLowerCase().includes(q)) score += 4
    const hits = page.body.toLowerCase().split(q).length - 1
    if (hits > 0) score += Math.min(hits, 3)
    if (score > 0) scored.push({ page, score })
  }
  return scored.sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title)).map((s) => s.page)
}

/** The line of context around the first match, for the search result list. */
export function helpExcerpt(page: HelpPage, query: string, max = 140): string {
  const q = query.trim().toLowerCase()
  const source = page.summary || page.body
  if (!q) return source.slice(0, max)
  const at = source.toLowerCase().indexOf(q)
  if (at === -1) return (page.summary || source).slice(0, max)
  const start = Math.max(0, at - 40)
  return `${start > 0 ? '…' : ''}${source.slice(start, start + max).replace(/\n+/g, ' ')}`
}
