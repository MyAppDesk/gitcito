/**
 * Contracts for the generated repo wiki.
 *
 * Two stages, both grounded the same way as the rest of the AI features: the
 * planner may only name files that exist in the repo, and each page may only
 * cite files that were put in front of it. Anything else is a validation error
 * that the model is asked to fix, not a plausible-looking invention.
 */

import type { RepoWiki, WikiPage, WikiPagePlan, WikiPlan } from '../shared/types'

/** Bumping this invalidates every stored wiki. */
export const WIKI_PROMPT_VERSION = 'wiki.v1'

export const MAX_PAGES = 12
export const MAX_SECTIONS = 6
export const MAX_CLAIMS = 8

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ARCHETYPES = new Set(['overview', 'module', 'workflow', 'reference'])

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

// ─── Stage 1: the plan ──────────────────────────────────────────────────────

export const WIKI_PLAN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['pages'],
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'title', 'archetype', 'scopePaths'],
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          archetype: { type: 'string', enum: [...ARCHETYPES] },
          scopePaths: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
}

/**
 * A plan is usable when every page is uniquely named, there is exactly one
 * overview, and every path it claims to cover is really in the repo.
 */
export function validateWikiPlan(value: unknown, knownPaths: Set<string>): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  if (!Array.isArray(root.pages)) return ['"pages" must be an array of page plans.']
  if (root.pages.length === 0) return ['"pages" is empty — plan at least an overview page.']

  const errors: string[] = []
  if (root.pages.length > MAX_PAGES) {
    errors.push(`"pages" must have at most ${MAX_PAGES} entries, not ${root.pages.length}.`)
  }

  const seen = new Set<string>()
  let overviews = 0
  root.pages.forEach((raw: unknown, i) => {
    const page = asObject(raw)
    const at = `pages[${i}]`
    if (!page) {
      errors.push(`${at} must be an object.`)
      return
    }
    if (typeof page.slug !== 'string' || !SLUG.test(page.slug)) {
      errors.push(`${at}.slug must be kebab-case, e.g. "data-layer".`)
    } else if (seen.has(page.slug)) {
      errors.push(`${at}.slug "${page.slug}" is used twice — slugs must be unique.`)
    } else {
      seen.add(page.slug)
    }
    if (!nonEmptyString(page.title)) errors.push(`${at}.title must be the page title.`)
    if (typeof page.archetype !== 'string' || !ARCHETYPES.has(page.archetype)) {
      errors.push(`${at}.archetype must be one of: ${[...ARCHETYPES].join(', ')}.`)
    }
    if (page.archetype === 'overview') overviews++

    if (!Array.isArray(page.scopePaths)) {
      errors.push(`${at}.scopePaths must be an array of repo paths.`)
      return
    }
    for (const path of page.scopePaths) {
      if (typeof path !== 'string' || !knownPaths.has(path)) {
        errors.push(`${at}.scopePaths contains ${JSON.stringify(path)}, which is not a file in this repository. Use only paths from the file list.`)
      }
    }
    if (page.archetype !== 'overview' && page.scopePaths.length === 0) {
      errors.push(`${at}.scopePaths must name at least one file this page is about.`)
    }
  })

  if (overviews !== 1) errors.push(`Exactly one page must have archetype "overview"; found ${overviews}.`)
  return errors
}

/**
 * Drops planner paths that were not in its file list. A non-overview page with
 * no evidence left is dropped as well; validation still enforces the remaining
 * plan's slugs, shape and single overview.
 */
export function sanitizeWikiPlan(value: unknown, knownPaths: Set<string>): unknown {
  const root = asObject(value)
  if (!root || !Array.isArray(root.pages)) return value
  const pages = root.pages.flatMap((raw: unknown) => {
    const page = asObject(raw)
    if (!page || !Array.isArray(page.scopePaths)) return [raw]
    const scopePaths = page.scopePaths.filter(
      (path): path is string => typeof path === 'string' && knownPaths.has(path)
    )
    if (page.archetype !== 'overview' && scopePaths.length === 0) return []
    return [{ ...page, scopePaths }]
  })
  return { ...root, pages }
}

// ─── Stage 2: one page ──────────────────────────────────────────────────────

export const WIKI_PAGE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'sections', 'related'],
  properties: {
    summary: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'claims'],
        properties: {
          heading: { type: 'string' },
          claims: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'sourcePaths'],
              properties: {
                text: { type: 'string' },
                sourcePaths: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    },
    related: { type: 'array', items: { type: 'string' } }
  }
}

/** A page may only cite the files it was shown and the slugs that exist. */
export function validateWikiPage(
  value: unknown,
  allowed: { paths: Set<string>; slugs: Set<string> }
): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  const errors: string[] = []
  if (!nonEmptyString(root.summary)) errors.push('"summary" must be one or two sentences about this page.')

  if (!Array.isArray(root.sections)) {
    errors.push('"sections" must be an array.')
  } else {
    if (root.sections.length > MAX_SECTIONS) {
      errors.push(`"sections" must have at most ${MAX_SECTIONS} entries, not ${root.sections.length}.`)
    }
    root.sections.forEach((raw: unknown, i) => {
      const section = asObject(raw)
      const at = `sections[${i}]`
      if (!section) {
        errors.push(`${at} must be an object.`)
        return
      }
      if (!nonEmptyString(section.heading)) errors.push(`${at}.heading must be a short heading.`)
      if (!Array.isArray(section.claims)) {
        errors.push(`${at}.claims must be an array.`)
        return
      }
      if (section.claims.length > MAX_CLAIMS) {
        errors.push(`${at}.claims must have at most ${MAX_CLAIMS} entries.`)
      }
      section.claims.forEach((rawClaim: unknown, j) => {
        const claim = asObject(rawClaim)
        const where = `${at}.claims[${j}]`
        if (!claim) {
          errors.push(`${where} must be an object.`)
          return
        }
        if (!nonEmptyString(claim.text)) errors.push(`${where}.text must be a sentence.`)
        if (!Array.isArray(claim.sourcePaths) || claim.sourcePaths.length === 0) {
          errors.push(`${where}.sourcePaths must name at least one file you were shown. Drop the claim if no file supports it.`)
          return
        }
        for (const path of claim.sourcePaths) {
          if (typeof path !== 'string' || !allowed.paths.has(path)) {
            errors.push(`${where}.sourcePaths contains ${JSON.stringify(path)}, which is not one of the files you were given.`)
          }
        }
      })
    })
  }

  if (root.related !== undefined) {
    if (!Array.isArray(root.related)) {
      errors.push('"related" must be an array of page slugs.')
    } else {
      for (const slug of root.related) {
        if (typeof slug !== 'string' || !allowed.slugs.has(slug)) {
          errors.push(`"related" contains ${JSON.stringify(slug)}, which is not another page in the plan.`)
        }
      }
    }
  }
  return errors
}

// ─── Tech stack ─────────────────────────────────────────────────────────────

export const TECH_STACK_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'groups'],
  properties: {
    summary: { type: 'string' },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'items'],
        properties: {
          name: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['dep', 'role'],
              properties: { dep: { type: 'string' }, role: { type: 'string' } }
            }
          }
        }
      }
    }
  }
}

export const MAX_STACK_GROUPS = 6

/**
 * The model groups and explains the stack, but the dependency names come from
 * the manifests: it may only place packages that are really declared, and may
 * not list the same one twice.
 */
export function validateTechStack(value: unknown, declared: Set<string>): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  const errors: string[] = []
  if (!nonEmptyString(root.summary)) errors.push('"summary" must be a sentence or two about the stack.')
  if (!Array.isArray(root.groups)) return [...errors, '"groups" must be an array.']
  if (root.groups.length > MAX_STACK_GROUPS) {
    errors.push(`"groups" must have at most ${MAX_STACK_GROUPS} entries, not ${root.groups.length}.`)
  }

  const seen = new Set<string>()
  root.groups.forEach((raw: unknown, i) => {
    const group = asObject(raw)
    const at = `groups[${i}]`
    if (!group) {
      errors.push(`${at} must be an object.`)
      return
    }
    if (!nonEmptyString(group.name)) errors.push(`${at}.name must be a short category, e.g. "UI" or "Build".`)
    if (!Array.isArray(group.items)) {
      errors.push(`${at}.items must be an array.`)
      return
    }
    group.items.forEach((rawItem: unknown, j) => {
      const item = asObject(rawItem)
      const where = `${at}.items[${j}]`
      if (!item) {
        errors.push(`${where} must be an object.`)
        return
      }
      if (typeof item.dep !== 'string' || !declared.has(item.dep)) {
        errors.push(`${where}.dep ${JSON.stringify(item.dep ?? null)} is not a dependency this project declares. Use only names from the list.`)
      } else if (seen.has(item.dep)) {
        errors.push(`${where}.dep "${item.dep}" appears twice — list each dependency once.`)
      } else {
        seen.add(item.dep)
      }
      if (!nonEmptyString(item.role)) errors.push(`${where}.role must say what it is used for, in a few words.`)
    })
  })
  return errors
}

// ─── Rendering ──────────────────────────────────────────────────────────────

/**
 * Renders a page to Markdown. The model supplies prose and file names; every
 * heading, bullet and citation is written here, so a page can never contain a
 * link or path the app did not resolve itself.
 */
export function renderWikiPage(page: WikiPage): string {
  const out: string[] = [`# ${page.title}`, '', page.summary, '']
  for (const section of page.sections) {
    out.push(`## ${section.heading}`, '')
    for (const claim of section.claims) {
      const cites = claim.sourcePaths.map((p) => `\`${p}\``).join(', ')
      out.push(`- ${claim.text}${cites ? ` — ${cites}` : ''}`)
    }
    out.push('')
  }
  return out.join('\n').trim() + '\n'
}

/** Where an exported wiki lands in the repo. */
export const WIKI_EXPORT_DIR = 'docs/wiki'

/**
 * The wiki as files to write into the repo: one Markdown page each plus an
 * index. Pure, so what lands on disk is decided (and tested) here rather than
 * inside the writing.
 */
export function wikiExportFiles(
  wiki: RepoWiki,
  repoName: string
): { path: string; content: string }[] {
  const stamp = new Date(wiki.generatedAt).toISOString().slice(0, 10)
  const note = `<!-- Generated by Gitcito from ${wiki.headSha.slice(0, 7) || 'the working tree'} on ${stamp}. Regenerate rather than editing by hand. -->`

  const index = [
    `# ${repoName} wiki`,
    '',
    note,
    '',
    ...wiki.pages.map((page) => `- [${page.title}](${page.slug}.md) — ${page.summary}`),
    ''
  ].join('\n')

  const pages = wiki.pages.map((page) => {
    const related = page.related
      .map((slug) => wiki.pages.find((p) => p.slug === slug))
      .filter((p): p is WikiPage => !!p)
    const tail = related.length
      ? ['', '## See also', '', ...related.map((p) => `- [${p.title}](${p.slug}.md)`), '']
      : []
    return {
      path: `${WIKI_EXPORT_DIR}/${page.slug}.md`,
      content: [note, '', page.markdown.trimEnd(), ...tail, '', '[← Index](README.md)', ''].join('\n')
    }
  })

  return [{ path: `${WIKI_EXPORT_DIR}/README.md`, content: index }, ...pages]
}

/** Every file a page cites, deduplicated, for the "sources" list in the UI. */
export function pageSources(page: WikiPage): string[] {
  const paths = new Set<string>()
  for (const section of page.sections) {
    for (const claim of section.claims) {
      for (const path of claim.sourcePaths) paths.add(path)
    }
  }
  return [...paths].sort()
}

// ─── Freshness ──────────────────────────────────────────────────────────────

export type WikiFreshness = 'current' | 'behind' | 'outdated'

/**
 * Whether a stored wiki still describes the repo: 'behind' when the repo moved
 * on since it was written, 'outdated' when this build would generate it
 * differently (prompt or model changed).
 */
export function wikiFreshness(
  wiki: { headSha: string; promptVersion: string; model: string } | null,
  current: { headSha: string; model: string }
): WikiFreshness {
  if (!wiki) return 'outdated'
  if (wiki.promptVersion !== WIKI_PROMPT_VERSION || wiki.model !== current.model) return 'outdated'
  return wiki.headSha === current.headSha ? 'current' : 'behind'
}

const REDUNDANT_TAIL = /\s+(module|page|overview|reference|workflow|section)$/i

/**
 * Drops the archetype from a title. The kind of page is already shown by its
 * icon, so "Database module" reads as "Database" — unless that is all the title
 * was, as with a page genuinely called "Overview".
 */
export function cleanPageTitle(title: string): string {
  const trimmed = title.trim()
  const stripped = trimmed.replace(REDUNDANT_TAIL, '').trim()
  return stripped.length >= 2 ? stripped : trimmed
}

/** Plans arrive ordered by the model; the overview always reads first. */
export function orderPlan(pages: WikiPagePlan[]): WikiPagePlan[] {
  return [...pages].sort((a, b) => {
    if (a.archetype === 'overview') return -1
    if (b.archetype === 'overview') return 1
    return a.title.localeCompare(b.title)
  })
}

export type { WikiPlan }
