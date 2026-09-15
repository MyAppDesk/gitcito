import type { RegistryRepo, Workspace } from '../../../shared/types'

// Assembling the Repositories page. Pure: the page hands in the registry and
// what it knows about tabs and workspaces, and gets back the sections to draw.

export type SectionKind = 'open' | 'favourites' | 'recent' | 'workspace' | 'all'

export interface RepoRow {
  repo: RegistryRepo
  /** Alias if one is set, else the folder name — what the row displays. */
  label: string
  favourite: boolean
}

export interface RepoSection {
  kind: SectionKind
  /** Set only for `workspace` sections: which workspace this is. */
  workspaceId?: string
  /** Set only for `workspace` sections: its name, which is user data, not copy. */
  workspaceName?: string
  rows: RepoRow[]
}

export interface SectionInput {
  registry: RegistryRepo[]
  /** Paths open in a tab in the active workspace. */
  openPaths: string[]
  favourites: string[]
  workspaces: Workspace[]
  /** Repo paths per workspace id — the caller flattens tabs, since only it
   *  knows how a workspace's tabs are stored. */
  workspaceRepoPaths: Record<string, string[]>
  aliases: Record<string, string>
}

function rowsFor(paths: string[], input: SectionInput): RepoRow[] {
  const byPath = new Map(input.registry.map((r) => [r.path, r]))
  const favourites = new Set(input.favourites)
  const seen = new Set<string>()
  const rows: RepoRow[] = []
  for (const path of paths) {
    if (seen.has(path)) continue // the same folder twice is still one repository
    seen.add(path)
    const repo = byPath.get(path)
    if (!repo) continue // open but never indexed: the next `remember` fixes it
    rows.push({ repo, label: input.aliases[path] || repo.name, favourite: favourites.has(path) })
  }
  return rows
}

function byLabel(a: RepoRow, b: RepoRow): number {
  return a.label.localeCompare(b.label)
}

/**
 * The page's sections, in display order.
 *
 * A repository appears in **every** section it qualifies for — open, starred
 * and in two workspaces means four rows. Each section is then a complete answer
 * to its own question, which is what makes them independently readable; the
 * cost is a longer page, which collapsing and the filter address.
 */
export function buildSections(input: SectionInput): RepoSection[] {
  const sections: RepoSection[] = []

  sections.push({ kind: 'open', rows: rowsFor(input.openPaths, input).sort(byLabel) })
  sections.push({ kind: 'favourites', rows: rowsFor(input.favourites, input).sort(byLabel) })

  // Recent is the registry ordered by when it was last opened. A scanned repo
  // the user has never opened has no place here, however recently it was found.
  const recent = input.registry
    .filter((r) => r.lastOpenedAt > 0)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .map((r) => r.path)
  sections.push({ kind: 'recent', rows: rowsFor(recent, input) })

  for (const ws of input.workspaces) {
    sections.push({
      kind: 'workspace',
      workspaceId: ws.id,
      workspaceName: ws.name,
      rows: rowsFor(input.workspaceRepoPaths[ws.id] ?? [], input).sort(byLabel)
    })
  }

  sections.push({ kind: 'all', rows: rowsFor(input.registry.map((r) => r.path), input).sort(byLabel) })
  return sections
}

/** The page's key for a section — also the key its colour is stored under. */
export function sectionKey(section: RepoSection): string {
  return section.kind === 'workspace' ? `workspace:${section.workspaceId}` : section.kind
}

/** What a section header is currently running, if anything. The operation is
 *  part of the state on purpose: a bare section key cannot tell fetch from
 *  pull, so a shared boolean puts the spinner on whichever button renders it
 *  rather than on the one that was clicked. */
export type SectionSync = { key: string; op: 'fetch' | 'pull' } | null

/** True when this section is running exactly this operation — the spinner. */
export function isSyncing(sync: SectionSync, key: string, op: 'fetch' | 'pull'): boolean {
  return sync !== null && sync.key === key && sync.op === op
}

/** True while this section runs either operation — the disabled state, which
 *  deliberately does not care which one it is. */
export function isSectionBusy(sync: SectionSync, key: string): boolean {
  return sync !== null && sync.key === key
}

/**
 * A colour for every section, so the page arrives looking like a set of
 * labelled shelves rather than a wall of grey. The user recolours any of them;
 * this is only where they start.
 *
 * Deterministic, never `Math.random()`: `filterSections` rebuilds the sections
 * on every keystroke in the search box, and a colour drawn per render would
 * strobe. The same sections always get the same colours, across renders and
 * across launches, with nothing persisted.
 *
 * Built-in sections claim their colours before workspaces do. `buildSections`
 * emits `all` last, after the workspaces, so assigning in list order would
 * recolour "All repositories" every time a workspace was added.
 */
export function defaultSectionColors(sections: RepoSection[], palette: string[]): Record<string, string> {
  if (palette.length === 0) return {}
  const builtIn = sections.filter((s) => s.kind !== 'workspace')
  const workspaces = sections.filter((s) => s.kind === 'workspace')
  const colors: Record<string, string> = {}
  ;[...builtIn, ...workspaces].forEach((section, i) => {
    colors[sectionKey(section)] = palette[i % palette.length]
  })
  return colors
}

/**
 * Apply the search box.
 *
 * A section that matches nothing is **dropped** while a query is active. It
 * used to be kept so its heading could say "no matches", which read well with
 * five sections and became unusable once a scan could produce twenty — the
 * answer ends up buried under a wall of empty headings.
 *
 * With no query the sections are returned untouched, empty ones included:
 * "Favourites 0" is structure, not noise. It tells you the section exists.
 */
export function filterSections(sections: RepoSection[], query: string): RepoSection[] {
  const q = query.trim().toLowerCase()
  if (!q) return sections
  const matches = (row: RepoRow): boolean =>
    row.label.toLowerCase().includes(q) ||
    row.repo.name.toLowerCase().includes(q) ||
    (row.repo.owner?.toLowerCase().includes(q) ?? false) ||
    row.repo.path.toLowerCase().includes(q)
  return sections
    .map((s) => ({ ...s, rows: s.rows.filter(matches) }))
    .filter((s) => s.rows.length > 0)
}
