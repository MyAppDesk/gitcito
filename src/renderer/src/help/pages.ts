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
//
// English is eager: it is the default, and it is the fallback for any page a
// translation has not caught up with, so it has to be there synchronously.
const RAW = import.meta.glob('../../../../docs/help/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<
  string,
  string
>

// Translations live one directory down (`docs/help/es/absorb.md`) and load on
// demand. Eager would inline all sixteen handbooks into the bundle — roughly
// 4 MB of Markdown, most of which a given reader never opens.
const RAW_LOCALIZED = import.meta.glob('../../../../docs/help/*/*.md', {
  query: '?raw',
  import: 'default'
}) as Record<string, () => Promise<string>>

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

function toPage(path: string, source: string): HelpPage {
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
}

const byOrder = (a: HelpPage, b: HelpPage): number =>
  a.order - b.order || a.title.localeCompare(b.title)

/** The English handbook — the reference set, and the fallback for every locale. */
export const HELP_PAGES: HelpPage[] = Object.entries(RAW).map(([p, s]) => toPage(p, s)).sort(byOrder)

/** Locale code → its page files, from `docs/help/<locale>/<id>.md`. */
const LOCALIZED = new Map<string, Record<string, () => Promise<string>>>()
for (const [path, load] of Object.entries(RAW_LOCALIZED)) {
  const parts = path.split('/')
  const locale = parts[parts.length - 2]
  const id = (parts[parts.length - 1] ?? '').replace(/\.md$/, '')
  const bucket = LOCALIZED.get(locale) ?? {}
  bucket[id] = load
  LOCALIZED.set(locale, bucket)
}

/** Locales that ship at least one translated page. */
export function translatedHelpLocales(): string[] {
  return [...LOCALIZED.keys()].sort()
}

const cache = new Map<string, HelpPage[]>()

/**
 * The handbook in `lang`, falling back page-by-page to English.
 *
 * Partial is deliberately allowed: a locale that has translated forty of the
 * sixty-one pages should ship those forty rather than wait for the rest, and a
 * reader gets English for the gap instead of a missing page. Ordering comes
 * from the English `order`, so the sidebar keeps one shape in every language.
 */
export async function loadHelpPages(lang: string): Promise<HelpPage[]> {
  const bucket = LOCALIZED.get(lang)
  if (!bucket) return HELP_PAGES
  const hit = cache.get(lang)
  if (hit) return hit

  const translated = new Map<string, HelpPage>()
  await Promise.all(
    Object.entries(bucket).map(async ([id, load]) => {
      try {
        translated.set(id, toPage(`${id}.md`, await load()))
      } catch {
        // A page that fails to load is one the reader sees in English, not an
        // empty handbook.
      }
    })
  )

  const pages = HELP_PAGES.map((en) => {
    const local = translated.get(en.id)
    // `order` is structural, not copy: taking the English one keeps every
    // locale's sidebar in the same sequence even if a translation drifts.
    return local ? { ...local, id: en.id, order: en.order } : en
  }).sort(byOrder)

  cache.set(lang, pages)
  return pages
}

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
