import { describe, it, expect } from 'vitest'
import { parseRemoteUrl } from '../src/main/hosting'
import { commitHookFailureHint, lintCommit, subjectCounterLevel, parseCcPrefix, applyCcType, parseGitmojiPrefix, applyGitmoji, parseTicketPrefix, applyTicket, ticketFromBranch } from '../src/renderer/src/lib/commitLint'
import { isSecretFile, maskSecretLine } from '../src/renderer/src/lib/secrets'
import { comboFromEvent, formatCombo, effectiveBindings, matchShortcut } from '../src/renderer/src/lib/shortcuts'
import { autolink, remoteWebUrl, filePermalink } from '../src/renderer/src/lib/autolink'
import { frecencyScore } from '../src/renderer/src/lib/frecency'
import { togglePin, selectPinned } from '../src/renderer/src/lib/pinnedBranches'
import { parseMergeTreeSingle, parseMergeTreeStdin } from '../src/shared/mergeTree'
import {
  deleteFolder,
  detachPath,
  findFolder,
  flattenFolders,
  folderCount,
  folderPaths,
  folderRepos,
  folderTrail,
  insertFolder,
  isSelfOrDescendant,
  moveFolder,
  movePathToFolder,
  pruneFolders,
  reorderInFolder,
  rootRepos,
  subtreePaths,
  updateFolder
} from '../src/renderer/src/lib/repoFolders'
import type { RepoFolder, RepoRef } from '../src/shared/types'
import {
  buildDiffEvidence,
  serializeEvidence,
  evidenceIndex,
  groundFindings,
  renderFindings,
  validateReview,
  validateAskPlan,
  parseLooseJson,
  buildLineWindow,
  buildWindowFromLines,
  validateHoverExplain
} from '../src/main/grounding'
import { identifierAt, isExplainableToken } from '../src/renderer/src/lib/hoverToken'
import { stepPath, visiblePaths, type NavNode } from '../src/renderer/src/lib/fileNav'
import {
  APP_THEME_KEYS,
  isSafeRepoPath,
  validateArtifactSuggestions,
  validateBranchName,
  validateCommitMessage,
  validateGeneratedFiles,
  validateGraphPalette,
  validatePRDescription,
  validateResolvedFile,
  validateSmartStage,
  validateTheme
} from '../src/main/aiSchemas'
import {
  validateWikiPlan,
  validateWikiPage,
  renderWikiPage,
  pageSources,
  wikiFreshness,
  orderPlan,
  cleanPageTitle,
  validateTechStack,
  wikiExportFiles,
  WIKI_PROMPT_VERSION
} from '../src/main/wikiSchemas'
import { isReadableSource, rankPlanFiles, buildPagePack, serializePack } from '../src/main/wikiPack'
import {
  languageOf,
  languageBreakdown,
  topLanguages,
  findManifests,
  parseManifest,
  isNoiseDependency,
  meaningfulDependencies,
  detectFrameworks
} from '../src/shared/repoFacts'
import { layoutPageGraph, layoutArcGraph, layoutLayeredGraph } from '../src/renderer/src/lib/wikiGraph'
import {
  extractImports,
  resolveImport,
  buildImportGraph,
  entryPoints,
  foundations,
  pickDepth,
  commonPrefix,
  shortLabel,
  layerNodes
} from '../src/shared/importGraph'
import {
  hasSettingsSecrets,
  stripSettingsSecrets,
  extractSecrets,
  applySecrets,
  pruneSecrets
} from '../src/shared/secrets'
import { defaultSettings, type AppSettings, type Profile } from '../src/shared/types'

// Minimal KeyboardEvent stand-in for the pure shortcut helpers.
const ev = (key: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): KeyboardEvent =>
  ({ key, metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt }) as KeyboardEvent

// Pure-function unit tests — no git, no DOM.

describe('parseRemoteUrl', () => {
  it('parses GitHub https + ssh', () => {
    expect(parseRemoteUrl('https://github.com/o/r.git')).toMatchObject({ provider: 'github', owner: 'o', repo: 'r' })
    expect(parseRemoteUrl('git@github.com:o/r.git')).toMatchObject({ provider: 'github', owner: 'o', repo: 'r' })
  })

  it('parses GitLab, including multi-level subgroups (https + ssh)', () => {
    expect(parseRemoteUrl('https://gitlab.com/group/repo.git')).toMatchObject({ provider: 'gitlab', owner: 'group', repo: 'repo' })
    expect(parseRemoteUrl('git@gitlab.com:group/sub/repo.git')).toMatchObject({ provider: 'gitlab', owner: 'group/sub', repo: 'repo' })
    expect(parseRemoteUrl('https://gitlab.com/group/sub/repo')).toMatchObject({ provider: 'gitlab', owner: 'group/sub', repo: 'repo' })
  })

  it('parses Bitbucket https + ssh', () => {
    expect(parseRemoteUrl('https://bitbucket.org/team/repo.git')).toMatchObject({ provider: 'bitbucket', owner: 'team', repo: 'repo' })
    expect(parseRemoteUrl('git@bitbucket.org:team/repo.git')).toMatchObject({ provider: 'bitbucket', owner: 'team', repo: 'repo' })
  })

  it('parses Azure DevOps', () => {
    expect(parseRemoteUrl('https://dev.azure.com/org/proj/_git/repo')).toMatchObject({ provider: 'azure', owner: 'org', project: 'proj', repo: 'repo' })
  })

  it('returns null for unknown hosts', () => {
    expect(parseRemoteUrl('https://example.com/x/y.git')).toBeNull()
  })
})

describe('commit lint', () => {
  it('clean conventional subject yields no hints', () => {
    expect(lintCommit('feat(api): add endpoint', '')).toEqual([])
  })

  it('flags trailing period and non-imperative mood', () => {
    const h = lintCommit('Fixed the bug.', '')
    expect(h.some((x) => /period/i.test(x.text))).toBe(true)
    expect(h.some((x) => /imperative/i.test(x.text))).toBe(true)
  })

  it('flags an over-long subject as an error', () => {
    const long = 'x'.repeat(80)
    const h = lintCommit(long, '')
    expect(h.some((x) => x.level === 'error')).toBe(true)
  })

  it('nudges to capitalize a lowercase non-conventional subject', () => {
    expect(lintCommit('add stuff', '').some((x) => /capitalize/i.test(x.text))).toBe(true)
  })

  it('flags over-wide body lines', () => {
    expect(lintCommit('Add caching', 'x'.repeat(90)).some((x) => /wrap/i.test(x.text))).toBe(true)
  })

  it('subject counter level bands', () => {
    expect(subjectCounterLevel(10)).toBe('')
    expect(subjectCounterLevel(60)).toBe('warn')
    expect(subjectCounterLevel(80)).toBe('error')
  })
})

describe('commit hook failure hint', () => {
  it('explains how to fix a missing Conventional Commit type', () => {
    expect(commitHookFailureHint('subject may not be empty [subject-empty]\ntype may not be empty [type-empty]'))
      .toContain('chore: tmp')
  })

  it('ignores unrelated git failures', () => {
    expect(commitHookFailureHint('fatal: unable to write new index file')).toBeNull()
  })
})

describe('conventional-commit type prefix', () => {
  it('parses an existing type, scope and breaking marker', () => {
    expect(parseCcPrefix('feat(api)!: add x')).toEqual({ type: 'feat', scope: '(api)', bang: '!', rest: 'add x' })
  })

  it('treats a non-conventional subject as having no type', () => {
    expect(parseCcPrefix('add x').type).toBe('')
  })

  it('adds a type to a bare subject', () => {
    expect(applyCcType('add endpoint', 'feat')).toBe('feat: add endpoint')
  })

  it('swaps the type while preserving scope, marker and subject', () => {
    expect(applyCcType('feat(api)!: add x', 'fix')).toBe('fix(api)!: add x')
  })

  it('strips the type when cleared', () => {
    expect(applyCcType('fix: bug', '')).toBe('bug')
  })
})

describe('gitmoji prefix', () => {
  it('detects a leading gitmoji', () => {
    expect(parseGitmojiPrefix('✨ add thing')).toEqual({ emoji: '✨', rest: 'add thing' })
  })

  it('treats a plain subject as having no gitmoji', () => {
    expect(parseGitmojiPrefix('add thing').emoji).toBe('')
  })

  it('adds, swaps and strips the leading gitmoji', () => {
    expect(applyGitmoji('add thing', '✨')).toBe('✨ add thing')
    expect(applyGitmoji('✨ add thing', '🐛')).toBe('🐛 add thing')
    expect(applyGitmoji('✨ add thing', '')).toBe('add thing')
  })
})

describe('ticket prefix', () => {
  it('parses a KEY-123 prefix and ignores plain subjects', () => {
    expect(parseTicketPrefix('ABC-12: do x')).toEqual({ ticket: 'ABC-12', rest: 'do x' })
    expect(parseTicketPrefix('do x').ticket).toBe('')
  })

  it('adds, swaps (uppercased) and strips the ticket prefix', () => {
    expect(applyTicket('do x', 'abc-12')).toBe('ABC-12: do x')
    expect(applyTicket('ABC-12: do x', 'DEF-9')).toBe('DEF-9: do x')
    expect(applyTicket('ABC-12: do x', '')).toBe('do x')
  })

  it('extracts a ticket key from a branch name', () => {
    expect(ticketFromBranch('feature/ABC-123-login')).toBe('ABC-123')
    expect(ticketFromBranch('main')).toBe('')
  })
})

describe('secret masking', () => {
  it('recognizes secret-bearing files', () => {
    for (const f of ['.env', 'config/.env.production', 'key.pem', 'id_rsa', 'deploy/credentials.json']) {
      expect(isSecretFile(f)).toBe(true)
    }
    for (const f of ['src/app.ts', 'README.md', 'environment.ts', '.env.example', '.env.sample', 'config/.env.template']) {
      expect(isSecretFile(f)).toBe(false)
    }
  })

  it('masks assignment values but keeps keys, comments and plain lines', () => {
    expect(maskSecretLine('API_KEY=sk-12345')).toBe('API_KEY=••••••')
    expect(maskSecretLine('export DB_URL="postgres://u:p@h/db"')).toBe('export DB_URL=••••••')
    expect(maskSecretLine('TOKEN: abc123')).toBe('TOKEN: ••••••')
    expect(maskSecretLine('# a comment')).toBe('# a comment')
    expect(maskSecretLine('not an assignment')).toBe('not an assignment')
  })
})

describe('keyboard shortcuts', () => {
  it('normalizes events to combos (mod for meta/ctrl), ignoring modifier-only', () => {
    expect(comboFromEvent(ev('k', { meta: true }))).toBe('mod+k')
    expect(comboFromEvent(ev('F', { ctrl: true, shift: true }))).toBe('mod+shift+f')
    expect(comboFromEvent(ev('Shift'))).toBeNull()
  })

  it('formats combos for display (platform-aware)', () => {
    expect(formatCombo('mod+shift+f')).toMatch(/(⌘⇧F|Ctrl\+Shift\+F)/)
    expect(formatCombo('mod+k')).toMatch(/(⌘K|Ctrl\+K)/)
  })

  it('effective bindings apply overrides over defaults', () => {
    const b = effectiveBindings({ 'command-palette': 'mod+p' })
    expect(b['command-palette']).toBe('mod+p')
    expect(b['code-search']).toBe('mod+shift+f') // untouched default
  })

  it('matchShortcut resolves the bound id', () => {
    const b = effectiveBindings(undefined)
    expect(matchShortcut(ev('k', { meta: true }), b)).toBe('command-palette')
    expect(matchShortcut(ev('v', { ctrl: true, shift: true }), b)).toBe('vault')
    expect(matchShortcut(ev('x', { meta: true }), b)).toBeNull()
  })
})

describe('autolink', () => {
  it('derives the web URL from ssh + https remotes', () => {
    expect(remoteWebUrl('git@github.com:o/r.git')).toBe('https://github.com/o/r')
    expect(remoteWebUrl('https://gitlab.com/g/s/r.git')).toBe('https://gitlab.com/g/s/r')
    expect(remoteWebUrl(undefined)).toBeUndefined()
  })

  it('returns plain text when no repo URL, and nodes when refs present', () => {
    expect(autolink('fix #12 by @ana', undefined)).toBe('fix #12 by @ana')
    const out = autolink('fix #12 by @ana', 'https://github.com/o/r')
    expect(Array.isArray(out)).toBe(true) // split into text + anchor nodes
    expect((out as unknown[]).length).toBeGreaterThan(1)
  })

  it('builds host-specific file permalinks', () => {
    expect(filePermalink('git@github.com:o/r.git', 'abc123', 'src/a.ts')).toBe('https://github.com/o/r/blob/abc123/src/a.ts')
    expect(filePermalink('https://gitlab.com/g/s/r.git', 'abc', 'x.ts')).toBe('https://gitlab.com/g/s/r/-/blob/abc/x.ts')
    expect(filePermalink('git@bitbucket.org:o/r.git', 'abc', 'x.ts')).toBe('https://bitbucket.org/o/r/src/abc/x.ts')
    expect(filePermalink(undefined, 'abc', 'x.ts')).toBeUndefined()
  })
})

describe('frecency score', () => {
  const now = 1_000 * 86_400_000 // a fixed "now"
  it('is 0 for unknown entries', () => {
    expect(frecencyScore(undefined, now)).toBe(0)
  })
  it('rewards recent + frequent over old + rare', () => {
    const recentFreq = frecencyScore({ n: 8, t: now }, now)
    const oldRare = frecencyScore({ n: 1, t: now - 60 * 86_400_000 }, now)
    expect(recentFreq).toBeGreaterThan(oldRare)
  })
  it('caps the count contribution', () => {
    expect(frecencyScore({ n: 999, t: now }, now)).toBe(frecencyScore({ n: 10, t: now }, now))
  })
})

import {
  GRAPH_PALETTES,
  allGraphPalettes,
  findGraphPalette,
  colorForPalette,
  edgePath,
  edgeCorner,
  spurPath,
  DENSITY_ROW_H,
  LINE_WIDTH_PX
} from '../src/renderer/src/graph/style'
import { layoutGraph } from '../src/renderer/src/graph/layout'
import { defaultGraphStyle } from '../src/shared/types'

describe('graph style', () => {
  it('default style references the classic palette', () => {
    const s = defaultGraphStyle()
    expect(s.paletteId).toBe('classic')
    expect(findGraphPalette(s.paletteId, []).id).toBe('classic')
  })

  it('findGraphPalette falls back to the first built-in for unknown ids', () => {
    expect(findGraphPalette('does-not-exist', []).id).toBe(GRAPH_PALETTES[0].id)
  })

  it('findGraphPalette resolves custom palettes', () => {
    const custom = [{ id: 'mine', name: 'Mine', colors: ['#111111', '#222222'] }]
    expect(findGraphPalette('mine', custom).name).toBe('Mine')
    expect(allGraphPalettes(custom).length).toBe(GRAPH_PALETTES.length + 1)
  })

  it('colorForPalette wraps round-robin and handles negative indices', () => {
    const cf = colorForPalette(['#a', '#b', '#c'])
    expect(cf(0)).toBe('#a')
    expect(cf(3)).toBe('#a')
    expect(cf(4)).toBe('#b')
    expect(cf(-1)).toBe('#c')
  })

  it('colorForPalette tolerates an empty palette', () => {
    expect(typeof colorForPalette([])(0)).toBe('string')
  })

  it('edgePath honours each corner style', () => {
    const straight = edgePath(0, 0, 10, 20, 'straight')
    expect(straight).toBe('M 0 0 L 10 20')

    const curved = edgePath(0, 0, 10, 20, 'curved')
    expect(curved).toContain('C')

    const sharp = edgePath(0, 0, 10, 20, 'sharp')
    expect(sharp).not.toContain('Q')
    expect(sharp).toContain('L')

    const rounded = edgePath(0, 0, 10, 20, 'rounded')
    expect(rounded).toContain('Q')
  })

  it('edgePath draws a plain vertical when lanes match', () => {
    expect(edgePath(5, 0, 5, 30, 'curved')).toBe('M 5 0 L 5 30')
  })

  it('geometry maps cover every option', () => {
    expect(DENSITY_ROW_H.compact).toBeLessThan(DENSITY_ROW_H.comfortable)
    expect(DENSITY_ROW_H.comfortable).toBeLessThan(DENSITY_ROW_H.spacious)
    expect(LINE_WIDTH_PX.thin).toBeLessThan(LINE_WIDTH_PX.thick)
  })

  it('edgeCorner marks the L-shape hand-off point, and nothing for diagonals', () => {
    // Merge (parent lane to the right) turns down at the child's row.
    expect(edgeCorner(0, 0, 10, 20, 'rounded')).toEqual({ x: 10, y: 0 })
    // Branch (parent lane to the left) turns out at the parent's row.
    expect(edgeCorner(10, 0, 0, 20, 'sharp')).toEqual({ x: 10, y: 20 })
    // Same lane / diagonal styles have no discrete corner.
    expect(edgeCorner(5, 0, 5, 20, 'rounded')).toBeNull()
    expect(edgeCorner(0, 0, 10, 20, 'curved')).toBeNull()
    expect(edgeCorner(0, 0, 10, 20, 'straight')).toBeNull()
  })

  it('spurPath hooks a stash into its parent and stays vertical when aligned', () => {
    expect(spurPath(20, 0, 0, 40)).toContain('Q')
    expect(spurPath(5, 0, 5, 40)).toBe('M 5 0 L 5 40')
  })
})

describe('graph layout', () => {
  const c = (hash: string, parents: string[] = []) => ({
    hash,
    parents,
    author: '',
    email: '',
    date: 0,
    refs: [] as string[],
    subject: hash
  })

  it('tags each edge with its topological kind', () => {
    // a → b (trunk), x is a side-branch tip whose first parent is b (branch),
    // and m merges x into the trunk (merge).
    const graph = layoutGraph([
      c('m', ['a', 'x']),
      c('a', ['b']),
      c('x', ['b']),
      c('b', [])
    ])
    const kinds = Object.fromEntries(graph.edges.map((e) => [`${e.fromHash}->${e.toHash}`, e.kind]))
    expect(kinds['a->b']).toBe('normal')
    expect(kinds['m->a']).toBe('normal')
    expect(kinds['m->x']).toBe('merge')
    expect(kinds['x->b']).toBe('branch')
  })

  it('keeps the trunk on lane 0 when the merged branch is newer than the trunk side', () => {
    // Date-order can place the merged branch's commits above the trunk's own
    // first-parent side: m merges x (newer) into a (older), both meeting at b.
    // The trunk (m → a → b) must stay on lane 0; x bends in from lane 1.
    const graph = layoutGraph([
      c('m', ['a', 'x']),
      c('x', ['b']),
      c('a', ['b']),
      c('b', ['r']),
      c('r', [])
    ])
    expect(graph.nodes.get('m')!.lane).toBe(0)
    expect(graph.nodes.get('a')!.lane).toBe(0)
    expect(graph.nodes.get('b')!.lane).toBe(0)
    expect(graph.nodes.get('r')!.lane).toBe(0)
    expect(graph.nodes.get('x')!.lane).toBe(1)
    const xb = graph.edges.find((e) => e.fromHash === 'x' && e.toHash === 'b')
    expect(xb?.kind).toBe('branch')
  })

  it('routes stashes as spurs with a spur-kind edge to their parent', () => {
    const commits = [c('base', []), c('stash', ['base'])]
    const graph = layoutGraph(commits, new Set(['stash']))
    const spur = graph.edges.find((e) => e.fromHash === 'stash')
    expect(spur?.kind).toBe('spur')
    expect(spur?.toHash).toBe('base')
    // The spur sits on its own lane, clear of the trunk.
    expect(graph.nodes.get('stash')!.lane).toBeGreaterThan(graph.nodes.get('base')!.lane)
  })

  // Two stashes whose dashed connectors span overlapping rows: `full` must keep
  // them on distinct lanes, `simple` may collapse them onto one, and `minimal`
  // pins each onto its parent's own lane.
  const overlappingStashes = () => [
    c('tip', ['root']),
    c('s1', ['root']), // long connector: row 1 → root (row 5)
    c('s2', ['mid']), //  connector: row 2 → mid (row 3), overlaps s1's rows
    c('mid', ['root']),
    c('base', ['root']),
    c('root', [])
  ]
  const spurs = new Set(['s1', 's2'])

  it('full topology keeps overlapping stash connectors on distinct lanes', () => {
    const g = layoutGraph(overlappingStashes(), spurs, 'full')
    expect(g.nodes.get('s1')!.lane).not.toBe(g.nodes.get('s2')!.lane)
  })

  it('simple topology lets overlapping stash connectors share a lane', () => {
    const g = layoutGraph(overlappingStashes(), spurs, 'simple')
    expect(g.nodes.get('s1')!.lane).toBe(g.nodes.get('s2')!.lane)
  })

  it('minimal topology places each stash inline on its parent lane', () => {
    const g = layoutGraph(overlappingStashes(), spurs, 'minimal')
    expect(g.nodes.get('s1')!.lane).toBe(g.nodes.get('root')!.lane)
    expect(g.nodes.get('s2')!.lane).toBe(g.nodes.get('mid')!.lane)
  })

  it('defaults to full topology when none is given', () => {
    const g = layoutGraph(overlappingStashes(), spurs)
    expect(g.nodes.get('s1')!.lane).not.toBe(g.nodes.get('s2')!.lane)
  })
})

describe('pinnedBranches', () => {
  const branch = (name: string): { name: string } => ({ name })

  it('togglePin adds a missing name at the end', () => {
    expect(togglePin([], 'main')).toEqual(['main'])
    expect(togglePin(['main'], 'develop')).toEqual(['main', 'develop'])
  })

  it('togglePin removes an existing name keeping the rest in order', () => {
    expect(togglePin(['main', 'develop', 'release/1.x'], 'develop')).toEqual(['main', 'release/1.x'])
  })

  it('selectPinned returns branches in pin order, not list order', () => {
    const locals = [branch('develop'), branch('main'), branch('feature/x')]
    expect(selectPinned(locals, ['main', 'develop'], (b) => b.name).map((b) => b.name)).toEqual(['main', 'develop'])
  })

  it('selectPinned drops pins whose branch no longer exists', () => {
    const locals = [branch('main')]
    expect(selectPinned(locals, ['gone', 'main'], (b) => b.name).map((b) => b.name)).toEqual(['main'])
  })

  it('selectPinned is empty when nothing is pinned', () => {
    expect(selectPinned([branch('main')], [], (b) => b.name)).toEqual([])
  })
})

describe('AI grounding — diff evidence', () => {
  const diff = `diff --git a/src/app.ts b/src/app.ts
index 1111111..2222222 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -10,3 +10,4 @@ function main() {
   const a = 1
-  return a
+  const b = 2
+  return a + b
 }
diff --git a/README.md b/README.md
index 3333333..4444444 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,2 @@
-# Old
+# New
 body
`

  it('splits a diff into one evidence item per hunk with sequential ids', () => {
    const set = buildDiffEvidence(diff)
    expect(set.items.map((e) => e.id)).toEqual(['E1', 'E2'])
    expect(set.items.map((e) => e.path)).toEqual(['src/app.ts', 'README.md'])
    expect(set.omitted).toBe(0)
  })

  it('anchors each hunk to its new-file line range', () => {
    const [first, second] = buildDiffEvidence(diff).items
    expect(first.startLine).toBe(10)
    expect(first.endLine).toBeGreaterThanOrEqual(12)
    expect(second.startLine).toBe(1)
  })

  it('keeps the hunk body so the model can read the change', () => {
    const [first] = buildDiffEvidence(diff).items
    expect(first.text).toContain('const b = 2')
    expect(first.text.startsWith('@@')).toBe(true)
  })

  it('drops trailing hunks that do not fit the byte budget and reports them', () => {
    const set = buildDiffEvidence(diff, { maxBytes: 60 })
    expect(set.items.length).toBe(1)
    expect(set.omitted).toBe(1)
    expect(serializeEvidence(set)).toContain('1 further hunk(s) omitted')
  })

  it('labels every hunk with its id and location in the prompt block', () => {
    expect(serializeEvidence(buildDiffEvidence(diff))).toContain('[E1] src/app.ts:10-')
  })

  it('returns nothing for a diff with no hunks', () => {
    expect(buildDiffEvidence('diff --git a/x.png b/x.png\nBinary files differ\n').items).toEqual([])
  })
})

describe('AI grounding — review validation', () => {
  const allowed = new Set(['E1', 'E2'])
  const finding = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    kind: 'risk',
    severity: 'high',
    evidenceId: 'E1',
    claim: 'Null is dereferenced.',
    suggestion: 'Guard it.',
    ...over
  })

  it('accepts a well-formed grounded review', () => {
    expect(validateReview({ summary: 'Adds a helper.', findings: [finding()] }, allowed)).toEqual([])
  })

  it('rejects a finding citing evidence that was never sent', () => {
    const errors = validateReview({ summary: 'x', findings: [finding({ evidenceId: 'E9' })] }, allowed)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('E9')
    expect(errors[0]).toContain('E1, E2')
  })

  it('rejects unknown kinds, severities and empty claims', () => {
    const errors = validateReview(
      { summary: 'x', findings: [finding({ kind: 'nit', severity: 'critical', claim: '  ' })] },
      allowed
    )
    expect(errors).toHaveLength(3)
  })

  it('requires a summary and an actions-style array', () => {
    expect(validateReview({ findings: [] }, allowed)[0]).toContain('summary')
    expect(validateReview({ summary: 'x' }, allowed)[0]).toContain('findings')
  })

  it('treats an empty findings list as valid', () => {
    expect(validateReview({ summary: 'Looks fine.', findings: [] }, allowed)).toEqual([])
  })
})

describe('AI grounding — resolving findings to real locations', () => {
  const set = buildDiffEvidence(`diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -10,2 +10,3 @@
   const a = 1
+  const b = 2
`)
  const index = evidenceIndex(set)

  it('replaces the evidence id with the path and line from the diff', () => {
    const [f] = groundFindings([{ kind: 'risk', severity: 'high', evidenceId: 'E1', claim: 'c', suggestion: 's' }], index)
    expect(f.path).toBe('src/app.ts')
    expect(f.line).toBe(10)
  })

  it('drops a finding whose evidence id cannot be resolved', () => {
    expect(groundFindings([{ kind: 'risk', evidenceId: 'E7', claim: 'c' }], index)).toEqual([])
  })

  it('falls back to medium severity when the model omits it', () => {
    const [f] = groundFindings([{ kind: 'risk', evidenceId: 'E1', claim: 'c' }], index)
    expect(f.severity).toBe('medium')
    expect(f.suggestion).toBe('')
  })

  it('renders only the requested kind, with app-written locations', () => {
    const findings = groundFindings(
      [
        { kind: 'risk', severity: 'high', evidenceId: 'E1', claim: 'Leaks a handle.', suggestion: 'Close it.' },
        { kind: 'suggestion', severity: 'low', evidenceId: 'E1', claim: 'Naming.', suggestion: 'Rename b.' }
      ],
      index
    )
    expect(renderFindings(findings, 'risk')).toBe('- `src/app.ts:10` Leaks a handle. — Close it.')
    expect(renderFindings(findings, 'suggestion')).toBe('- `src/app.ts:10` Rename b.')
  })
})

describe('AI grounding — ask plan validation', () => {
  const known = new Set(['a.ts', 'docs/b.md'])

  it('accepts actions that only touch listed files', () => {
    const plan = { summary: 'Stage a.ts', actions: [{ type: 'stage', files: ['a.ts'], description: 'Stage a.ts' }] }
    expect(validateAskPlan(plan, known)).toEqual([])
  })

  it('rejects an invented file path', () => {
    const plan = { summary: 'x', actions: [{ type: 'stage', files: ['ghost.ts'], description: 'Stage ghost' }] }
    expect(validateAskPlan(plan, known)[0]).toContain('ghost.ts')
  })

  it('rejects action types the app cannot execute', () => {
    const plan = { summary: 'x', actions: [{ type: 'push', description: 'Push it' }] }
    expect(validateAskPlan(plan, known)[0]).toContain('push')
  })

  it('lets gitignore patterns through — they are globs, not existing paths', () => {
    const plan = { summary: 'x', actions: [{ type: 'gitignore', patterns: ['*.tsx'], description: 'Ignore tsx' }] }
    expect(validateAskPlan(plan, known)).toEqual([])
  })

  it('requires a message on commit and a name on branch', () => {
    expect(validateAskPlan({ summary: 'x', actions: [{ type: 'commit', description: 'Commit' }] }, known)[0]).toContain('message')
    expect(validateAskPlan({ summary: 'x', actions: [{ type: 'branch', description: 'Branch' }] }, known)[0]).toContain('name')
  })

  it('accepts an empty plan', () => {
    expect(validateAskPlan({ summary: '', actions: [], note: 'Nothing to do.' }, known)).toEqual([])
  })
})

describe('AI grounding — loose JSON parsing', () => {
  it('parses a fenced JSON reply', () => {
    expect(parseLooseJson<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('returns null instead of throwing on prose', () => {
    expect(parseLooseJson('Sure! Here is the answer.')).toBeNull()
  })
})

describe('profile secrets — keeping credentials out of settings.json', () => {
  const profile = (id: string, over: Record<string, unknown> = {}): Profile => ({
    id,
    name: id,
    gitName: 'Dev',
    gitEmail: 'dev@example.com',
    githubToken: '',
    azureToken: '',
    gitlabToken: '',
    bitbucketToken: '',
    ai: { ...defaultSettings().profiles[0].ai },
    ...over
  })
  const withProfiles = (...profiles: Profile[]): AppSettings => ({ ...defaultSettings(), profiles })

  const loaded = withProfiles(
    profile('p1', { githubToken: 'ghp_secret', ai: { ...defaultSettings().profiles[0].ai, apiKey: 'sk-secret' } }),
    profile('p2', { gitlabToken: 'glpat_secret' })
  )

  it('detects credentials sitting in a settings object', () => {
    expect(hasSettingsSecrets(loaded)).toBe(true)
    expect(hasSettingsSecrets(stripSettingsSecrets(loaded))).toBe(false)
    expect(hasSettingsSecrets(defaultSettings())).toBe(false)
  })

  it('strips every credential while leaving the rest of the profile intact', () => {
    const stripped = stripSettingsSecrets(loaded)
    expect(stripped.profiles[0].githubToken).toBe('')
    expect(stripped.profiles[0].ai.apiKey).toBe('')
    expect(stripped.profiles[1].gitlabToken).toBe('')
    expect(stripped.profiles[0].gitEmail).toBe('dev@example.com')
    expect(stripped.profiles[0].ai.provider).toBe(loaded.profiles[0].ai.provider)
  })

  it('extracts only non-empty credentials, keyed by profile', () => {
    expect(extractSecrets(loaded)).toEqual({
      p1: { githubToken: 'ghp_secret', aiApiKey: 'sk-secret' },
      p2: { gitlabToken: 'glpat_secret' }
    })
    expect(extractSecrets(stripSettingsSecrets(loaded))).toEqual({})
  })

  it('round-trips: strip to disk, re-apply from the store, nothing lost', () => {
    const onDisk = stripSettingsSecrets(loaded)
    const restored = applySecrets(onDisk, extractSecrets(loaded))
    expect(restored).toEqual(loaded)
  })

  it('leaves a profile alone when the store has nothing for it', () => {
    const restored = applySecrets(stripSettingsSecrets(loaded), { p1: { githubToken: 'ghp_secret' } })
    expect(restored.profiles[0].githubToken).toBe('ghp_secret')
    expect(restored.profiles[0].ai.apiKey).toBe('')
    expect(restored.profiles[1].gitlabToken).toBe('')
  })

  it('drops stored secrets for profiles that no longer exist', () => {
    const store = extractSecrets(loaded)
    expect(pruneSecrets(store, ['p1'])).toEqual({ p1: { githubToken: 'ghp_secret', aiApiKey: 'sk-secret' } })
    expect(pruneSecrets(store, [])).toEqual({})
  })

  it('migration keeps plaintext values as the winner over an older store', () => {
    const older = { p1: { githubToken: 'ghp_stale' } }
    const merged = pruneSecrets({ ...older, ...extractSecrets(loaded) }, ['p1', 'p2'])
    expect(merged.p1.githubToken).toBe('ghp_secret')
    expect(merged.p2.gitlabToken).toBe('glpat_secret')
  })
})

describe('hover explain — context window', () => {
  const file = Array.from({ length: 200 }, (_, i) => `line ${i + 1} content`).join('\n')

  it('centres the window on the hovered line', () => {
    const w = buildLineWindow(file, 100, { radius: 5 })
    expect(w.startLine).toBe(95)
    expect(w.endLine).toBe(105)
    expect(w.text.split('\n')).toHaveLength(11)
  })

  it('numbers every line so the model can cite one', () => {
    expect(buildLineWindow(file, 3, { radius: 1 }).text).toBe(
      '2 | line 2 content\n3 | line 3 content\n4 | line 4 content'
    )
  })

  it('clamps at the start and end of the file', () => {
    expect(buildLineWindow(file, 1, { radius: 10 }).startLine).toBe(1)
    expect(buildLineWindow(file, 200, { radius: 10 }).endLine).toBe(200)
    expect(buildLineWindow(file, 999, { radius: 2 }).endLine).toBe(200)
  })

  it('shrinks to the byte budget but always keeps the hovered line', () => {
    const w = buildLineWindow(file, 100, { radius: 50, maxBytes: 120 })
    expect(w.text.length).toBeLessThanOrEqual(120)
    expect(w.startLine).toBeLessThanOrEqual(100)
    expect(w.endLine).toBeGreaterThanOrEqual(100)
    expect(w.text).toContain('100 | line 100 content')
  })

  it('handles a single-line file', () => {
    expect(buildLineWindow('only line', 1)).toEqual({
      startLine: 1,
      endLine: 1,
      numbers: [1],
      text: '1 | only line'
    })
  })
})

describe('hover explain — output validation', () => {
  const window = buildLineWindow(Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n'), 15, {
    radius: 5
  })

  it('accepts a brief explanation citing lines from the window', () => {
    expect(validateHoverExplain({ summary: 'A helper.', bullets: ['Used twice.'], lines: [10, 20] }, window)).toEqual([])
  })

  it('rejects a citation outside the window', () => {
    const errors = validateHoverExplain({ summary: 'A helper.', lines: [42] }, window)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('between 10 and 20')
  })

  it('rejects an empty summary and an over-long bullet list', () => {
    expect(validateHoverExplain({ summary: '   ' }, window)[0]).toContain('summary')
    expect(validateHoverExplain({ summary: 'x', bullets: ['a', 'b', 'c', 'd'] }, window)[0]).toContain('at most 3')
  })

  it('treats bullets and lines as optional', () => {
    expect(validateHoverExplain({ summary: 'Defined elsewhere.' }, window)).toEqual([])
  })
})

describe('hover explain — which tokens are worth asking about', () => {
  it('accepts identifiers, functions and types', () => {
    expect(isExplainableToken('buildReport', 'hljs-title function_')).toBe(true)
    expect(isExplainableToken('Promise', 'hljs-built_in')).toBe(true)
    expect(isExplainableToken('profile', 'hljs-property')).toBe(true)
  })

  it('skips literals, strings, numbers and comments', () => {
    expect(isExplainableToken('hello', 'hljs-string')).toBe(false)
    expect(isExplainableToken('42', 'hljs-number')).toBe(false)
    expect(isExplainableToken('wire', 'hljs-comment')).toBe(false)
    expect(isExplainableToken('const', 'hljs-keyword')).toBe(false)
  })

  it('allows unhighlighted words — most identifiers get no span at all', () => {
    expect(isExplainableToken('properties')).toBe(true)
    expect(isExplainableToken('_defaultAnalyticsTracker')).toBe(true)
  })

  it('skips bare keywords even when nothing highlighted them', () => {
    expect(isExplainableToken('required')).toBe(false)
    expect(isExplainableToken('final')).toBe(false)
    expect(isExplainableToken('return')).toBe(false)
  })

  it('skips punctuation and tokens too short or too long to be worth a request', () => {
    expect(isExplainableToken('=>', 'hljs-title')).toBe(false)
    expect(isExplainableToken('x', 'hljs-variable')).toBe(false)
    expect(isExplainableToken('a'.repeat(61), 'hljs-variable')).toBe(false)
  })
})

describe('hover explain — the word under the caret', () => {
  // highlight.js leaves most identifiers unwrapped, so the token comes from the
  // character offset, not the markup.
  const line = '  final Map<String, dynamic>? properties,'

  it('finds the identifier straddling the offset', () => {
    expect(identifierAt(line, line.indexOf('properties') + 3)?.text).toBe('properties')
    expect(identifierAt(line, line.indexOf('dynamic'))?.text).toBe('dynamic')
  })

  it('reports the token range so the card can be placed on it', () => {
    const span = identifierAt(line, line.indexOf('properties'))
    expect(line.slice(span!.start, span!.end)).toBe('properties')
  })

  it('claims the word when the caret sits just past its last character', () => {
    expect(identifierAt('foo bar', 3)?.text).toBe('foo')
    expect(identifierAt('foo', 3)?.text).toBe('foo')
  })

  it('handles the first and last character of a line', () => {
    expect(identifierAt('name = 1', 0)?.text).toBe('name')
    expect(identifierAt('x = value', 8)?.text).toBe('value')
  })

  it('returns null when the caret is not on a word', () => {
    expect(identifierAt('a + b', 2)).toBeNull()
    expect(identifierAt('', 0)).toBeNull()
    expect(identifierAt('abc', 99)).toBeNull()
  })

  it('treats $ and _ as part of an identifier', () => {
    expect(identifierAt('const _private$ = 1', 8)?.text).toBe('_private$')
  })
})

describe('hover explain — windows over a sparse diff', () => {
  // A diff view only has the hunks, so the numbering has gaps.
  const hunkLines = [
    { no: 10, text: 'function a() {' },
    { no: 11, text: '  return 1' },
    { no: 12, text: '}' },
    { no: 80, text: 'function b() {' },
    { no: 81, text: '  return 2' }
  ]

  it('keeps the real line numbers, gaps and all', () => {
    const w = buildWindowFromLines(hunkLines, 11, { radius: 1 })
    expect(w.numbers).toEqual([10, 11, 12])
    expect(w.text).toBe('10 | function a() {\n11 |   return 1\n12 | }')
  })

  it('snaps to the nearest line it actually has', () => {
    expect(buildWindowFromLines(hunkLines, 30, { radius: 0 }).numbers).toEqual([12])
    expect(buildWindowFromLines(hunkLines, 70, { radius: 0 }).numbers).toEqual([80])
  })

  it('rejects a citation of a line inside a gap', () => {
    const w = buildWindowFromLines(hunkLines, 11, { radius: 1 })
    expect(validateHoverExplain({ summary: 'x', lines: [12] }, w)).toEqual([])
    expect(validateHoverExplain({ summary: 'x', lines: [40] }, w)[0]).toContain('not a line you were shown')
  })

  it('returns an empty window when there are no lines at all', () => {
    expect(buildWindowFromLines([], 5).text).toBe('')
  })
})

describe('AI contracts — commit messages', () => {
  it('accepts a one-line subject with or without a body', () => {
    expect(validateCommitMessage({ summary: 'feat: add login', description: '' })).toEqual([])
    expect(validateCommitMessage({ summary: 'fix: guard null', description: '- checks the token' })).toEqual([])
  })

  it('rejects an empty or multi-line subject', () => {
    expect(validateCommitMessage({ summary: '  ', description: '' })[0]).toContain('summary')
    expect(validateCommitMessage({ summary: 'one\ntwo', description: '' })[0]).toContain('single line')
  })

  it('rejects prose instead of an object', () => {
    expect(validateCommitMessage('Sure! Here is your commit')[0]).toContain('JSON object')
  })
})

describe('AI contracts — generated config files', () => {
  const requested = ['CLAUDE.md', '.cursor/rules/project.mdc']

  it('accepts the files that were asked for', () => {
    const value = { files: [{ path: 'CLAUDE.md', content: '# Project' }] }
    expect(validateGeneratedFiles(value, requested)).toEqual([])
  })

  it('refuses paths that escape the repo', () => {
    for (const path of ['../../etc/passwd', '/etc/passwd', 'C:\\Windows\\system.ini', 'a/../../b']) {
      const errors = validateGeneratedFiles({ files: [{ path, content: 'x' }] }, requested)
      expect(errors[0], path).toContain('inside the repo')
    }
  })

  it('accepts ordinary nested paths', () => {
    expect(isSafeRepoPath('.cursor/rules/project.mdc')).toBe(true)
    expect(isSafeRepoPath('.git/hooks/pre-commit')).toBe(true)
    expect(isSafeRepoPath('a/..b/c')).toBe(true)
  })

  it('refuses files nobody asked for, and empty content', () => {
    expect(validateGeneratedFiles({ files: [{ path: 'sneaky.sh', content: 'x' }] }, requested)[0]).toContain('was not requested')
    expect(validateGeneratedFiles({ files: [{ path: 'CLAUDE.md', content: '' }] }, requested)[0]).toContain('content')
  })

  it('rejects an empty file list', () => {
    expect(validateGeneratedFiles({ files: [] }, requested)[0]).toContain('empty')
  })
})

describe('AI contracts — smart staging', () => {
  const known = new Set(['src/app.ts', 'package-lock.json'])

  it('accepts a subset of the files it was shown', () => {
    expect(validateSmartStage({ toStage: ['src/app.ts'], reason: 'source only' }, known)).toEqual([])
    expect(validateSmartStage({ toStage: [], reason: 'nothing worth staging' }, known)).toEqual([])
  })

  it('rejects a path that was never offered', () => {
    expect(validateSmartStage({ toStage: ['src/ghost.ts'], reason: '' }, known)[0]).toContain('ghost')
  })
})

describe('AI contracts — themes and palettes', () => {
  const colors = (hex: string): Record<string, string> =>
    Object.fromEntries(APP_THEME_KEYS.map((k) => [k, hex]))

  it('accepts a theme with every colour present and hex', () => {
    expect(validateTheme({ name: 'Dusk', light: colors('#ffffff'), dark: colors('#101010') }, APP_THEME_KEYS)).toEqual([])
  })

  it('names the missing keys and the malformed colours', () => {
    const partial = { ...colors('#ffffff') }
    delete partial.accent
    expect(validateTheme({ name: 'X', light: partial, dark: colors('#101010') }, APP_THEME_KEYS)[0]).toContain('accent')

    const bad = { ...colors('#ffffff'), red: 'crimson' }
    expect(validateTheme({ name: 'X', light: bad, dark: colors('#101010') }, APP_THEME_KEYS)[0]).toContain('red')
  })

  it('requires exactly 8 hex lane colours in a graph palette', () => {
    const eight = Array.from({ length: 8 }, () => '#123456')
    expect(validateGraphPalette({ name: 'Neon', colors: eight })).toEqual([])
    expect(validateGraphPalette({ name: 'Neon', colors: eight.slice(0, 6) })[0]).toContain('exactly 8')
    expect(validateGraphPalette({ name: 'Neon', colors: [...eight.slice(1), 'red'] })[0]).toContain('hex')
  })
})

describe('AI contracts — branch names and PR descriptions', () => {
  it('accepts a conventional branch name', () => {
    expect(validateBranchName({ name: 'feature/CMS-12-add-login' })).toEqual([])
  })

  it('rejects names git would refuse', () => {
    expect(validateBranchName({ name: 'my branch' })[0]).toContain('spaces')
    expect(validateBranchName({ name: 'feature//x' })[0]).toContain('/')
    expect(validateBranchName({ name: 'feature/x.lock' })[0]).toContain('.lock')
    expect(validateBranchName({ name: 'a..b' })[0]).toContain('..')
    expect(validateBranchName({ name: 'feature/¡hola!' })[0]).toContain('may only use')
  })

  it('requires a single-line title and a body for a PR description', () => {
    expect(validatePRDescription({ title: 'Add login', body: '## Changes\n- x' })).toEqual([])
    expect(validatePRDescription({ title: 'a\nb', body: 'x' })[0]).toContain('single line')
    expect(validatePRDescription({ title: 'Add login', body: '' })[0]).toContain('body')
  })
})

describe('AI contracts — resolved merge conflicts', () => {
  it('accepts a clean merged file', () => {
    expect(validateResolvedFile('const a = 1\nconst b = 2\n')).toEqual([])
  })

  it('rejects a result that still has conflict markers', () => {
    const unresolved = 'a\n<<<<<<< HEAD\nb\n=======\nc\n>>>>>>> theirs\n'
    expect(validateResolvedFile(unresolved)[0]).toContain('conflict markers')
  })

  it('rejects an empty result', () => {
    expect(validateResolvedFile('   ')[0]).toContain('empty')
  })
})

describe('AI contracts — suggested artifacts', () => {
  const already = ['CLAUDE.md']

  it('accepts well-formed suggestions', () => {
    const value = {
      suggestions: [{ path: '.editorconfig', description: 'Editor defaults', reason: 'Mixed indentation in the repo' }]
    }
    expect(validateArtifactSuggestions(value, already)).toEqual([])
  })

  it('rejects re-suggesting something already selected', () => {
    const value = { suggestions: [{ path: 'CLAUDE.md', description: 'd', reason: 'r' }] }
    expect(validateArtifactSuggestions(value, already)[0]).toContain('already selected')
  })

  it('rejects escaping paths and missing prose', () => {
    expect(validateArtifactSuggestions({ suggestions: [{ path: '../x', description: 'd', reason: 'r' }] }, already)[0])
      .toContain('inside the repo')
    expect(validateArtifactSuggestions({ suggestions: [{ path: 'a.md', description: '', reason: '' }] }, already))
      .toHaveLength(2)
  })

  it('treats no suggestions as valid', () => {
    expect(validateArtifactSuggestions({ suggestions: [] }, already)).toEqual([])
  })
})

describe('repo wiki — the plan', () => {
  const known = new Set(['README.md', 'src/app.ts', 'src/db.ts', 'src/ui/panel.tsx'])
  const page = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    slug: 'data-layer',
    title: 'Data layer',
    archetype: 'module',
    scopePaths: ['src/db.ts'],
    ...over
  })
  const overview = page({ slug: 'overview', title: 'Overview', archetype: 'overview', scopePaths: ['README.md'] })

  it('accepts a plan whose pages all cover real files', () => {
    expect(validateWikiPlan({ pages: [overview, page()] }, known)).toEqual([])
  })

  it('rejects a page scoped to a file that is not in the repo', () => {
    const errors = validateWikiPlan({ pages: [overview, page({ scopePaths: ['src/ghost.ts'] })] }, known)
    expect(errors[0]).toContain('src/ghost.ts')
  })

  it('requires exactly one overview page', () => {
    expect(validateWikiPlan({ pages: [page()] }, known)[0]).toContain('overview')
    expect(validateWikiPlan({ pages: [overview, page({ slug: 'o2', archetype: 'overview' })] }, known)[0]).toContain('found 2')
  })

  it('rejects duplicate or non-kebab slugs', () => {
    expect(validateWikiPlan({ pages: [overview, page(), page()] }, known).join(' ')).toContain('used twice')
    expect(validateWikiPlan({ pages: [overview, page({ slug: 'Data Layer' })] }, known)[0]).toContain('kebab-case')
  })

  it('requires non-overview pages to name at least one file', () => {
    expect(validateWikiPlan({ pages: [overview, page({ scopePaths: [] })] }, known)[0]).toContain('at least one file')
  })

  it('caps the number of pages', () => {
    const many = Array.from({ length: 20 }, (_, i) => page({ slug: `page-${i}` }))
    expect(validateWikiPlan({ pages: [overview, ...many] }, known)[0]).toContain('at most 12')
  })

  it('puts the overview first regardless of the order the model used', () => {
    const plan = [
      { slug: 'ui', title: 'UI', archetype: 'module' as const, scopePaths: [] },
      { slug: 'overview', title: 'Overview', archetype: 'overview' as const, scopePaths: [] },
      { slug: 'data', title: 'Data', archetype: 'module' as const, scopePaths: [] }
    ]
    expect(orderPlan(plan).map((p) => p.slug)).toEqual(['overview', 'data', 'ui'])
  })
})

describe('repo wiki — one page', () => {
  const allowed = { paths: new Set(['src/db.ts', 'README.md']), slugs: new Set(['overview', 'ui']) }
  const good = {
    summary: 'How data is read.',
    sections: [{ heading: 'Queries', claims: [{ text: 'Queries go through a pool.', sourcePaths: ['src/db.ts'] }] }],
    related: ['overview']
  }

  it('accepts a page citing only the files it was given', () => {
    expect(validateWikiPage(good, allowed)).toEqual([])
  })

  it('rejects a citation of a file that was not in the pack', () => {
    const bad = { ...good, sections: [{ heading: 'x', claims: [{ text: 'y', sourcePaths: ['src/secret.ts'] }] }] }
    expect(validateWikiPage(bad, allowed)[0]).toContain('src/secret.ts')
  })

  it('rejects an uncited claim rather than letting it through', () => {
    const bad = { ...good, sections: [{ heading: 'x', claims: [{ text: 'trust me', sourcePaths: [] }] }] }
    expect(validateWikiPage(bad, allowed)[0]).toContain('at least one file')
  })

  it('rejects links to pages that do not exist', () => {
    expect(validateWikiPage({ ...good, related: ['ghost'] }, allowed)[0]).toContain('ghost')
  })

  it('caps sections and claims', () => {
    const sections = Array.from({ length: 9 }, () => ({ heading: 'h', claims: [] }))
    expect(validateWikiPage({ ...good, sections }, allowed)[0]).toContain('at most 6')
  })
})

describe('repo wiki — rendering and freshness', () => {
  const page = {
    slug: 'data',
    title: 'Data layer',
    archetype: 'module' as const,
    summary: 'How data is read.',
    sections: [
      {
        heading: 'Queries',
        claims: [
          { text: 'Queries go through a pool.', sourcePaths: ['src/db.ts'] },
          { text: 'Search is separate.', sourcePaths: ['src/db.ts', 'src/search.ts'] }
        ]
      }
    ],
    related: [],
    markdown: ''
  }

  it('writes the markdown itself, citing the paths the model named', () => {
    const md = renderWikiPage(page)
    expect(md).toContain('# Data layer')
    expect(md).toContain('## Queries')
    expect(md).toContain('- Queries go through a pool. — `src/db.ts`')
    expect(md).toContain('`src/db.ts`, `src/search.ts`')
  })

  it('lists every cited file once, sorted', () => {
    expect(pageSources(page)).toEqual(['src/db.ts', 'src/search.ts'])
  })

  it('is current only at the commit it was generated from', () => {
    const stored = { headSha: 'abc', promptVersion: WIKI_PROMPT_VERSION, model: 'gpt-4o-mini' }
    expect(wikiFreshness(stored, { headSha: 'abc', model: 'gpt-4o-mini' })).toBe('current')
    expect(wikiFreshness(stored, { headSha: 'def', model: 'gpt-4o-mini' })).toBe('behind')
  })

  it('is outdated when the prompt version or the model changed', () => {
    expect(wikiFreshness({ headSha: 'abc', promptVersion: 'wiki.v0', model: 'm' }, { headSha: 'abc', model: 'm' })).toBe('outdated')
    expect(wikiFreshness({ headSha: 'abc', promptVersion: WIKI_PROMPT_VERSION, model: 'old' }, { headSha: 'abc', model: 'new' })).toBe('outdated')
    expect(wikiFreshness(null, { headSha: 'abc', model: 'm' })).toBe('outdated')
  })
})

describe('repo wiki — choosing what to read', () => {
  it('skips build output, binaries and lock files', () => {
    for (const path of [
      'node_modules/react/index.js', 'dist/bundle.js', 'src/assets/logo.png',
      'package-lock.json', 'target/debug/app', 'a/vendor/lib.rb', 'app.min.js'
    ]) {
      expect(isReadableSource(path), path).toBe(false)
    }
  })

  it('keeps ordinary source and docs', () => {
    for (const path of ['src/app.ts', 'README.md', 'lib/db/pool.rb', 'Dockerfile']) {
      expect(isReadableSource(path), path).toBe(true)
    }
  })

  it('puts root docs and manifests first, then churn hotspots', () => {
    const paths = ['src/z.ts', 'package.json', 'src/hot.ts', 'README.md', 'src/a/b/c/deep.ts']
    expect(rankPlanFiles(paths, ['src/hot.ts'])).toEqual([
      'README.md',
      'package.json',
      'src/hot.ts',
      'src/z.ts',
      'src/a/b/c/deep.ts'
    ])
  })

  it('drops unreadable files and honours the limit', () => {
    const paths = ['README.md', 'dist/x.js', 'src/a.ts', 'src/b.ts']
    expect(rankPlanFiles(paths, [], 2)).toEqual(['README.md', 'src/a.ts'])
  })
})

describe('repo wiki — packing a page', () => {
  const file = (path: string, size: number): { path: string; content: string } => ({
    path,
    content: 'x'.repeat(size)
  })

  it('clips a long file rather than dropping it', () => {
    const pack = buildPagePack([file('a.ts', 500)], { maxFileBytes: 100 })
    expect(pack.files[0].content).toContain('…(truncated)')
    expect(pack.files[0].content.length).toBeLessThan(200)
  })

  it('drops whole files once the budget is spent, and counts them', () => {
    const pack = buildPagePack([file('a.ts', 80), file('b.ts', 80), file('c.ts', 80)], { maxBytes: 170 })
    expect(pack.files.map((f) => f.path)).toEqual(['a.ts', 'b.ts'])
    expect(pack.dropped).toBe(1)
  })

  it('always keeps the first file even when it alone busts the budget', () => {
    const pack = buildPagePack([file('big.ts', 500)], { maxBytes: 10, maxFileBytes: 500 })
    expect(pack.files).toHaveLength(1)
  })

  it('skips empty files — an unreadable file is not evidence', () => {
    const pack = buildPagePack([{ path: 'a.ts', content: '   ' }, file('b.ts', 10)])
    expect(pack.files.map((f) => f.path)).toEqual(['b.ts'])
    expect(pack.dropped).toBe(1)
  })

  it('labels each file so the model can cite it, and admits what was left out', () => {
    const text = serializePack(buildPagePack([file('a.ts', 10), file('b.ts', 10)], { maxBytes: 15 }))
    expect(text).toContain('--- FILE: a.ts ---')
    expect(text).toContain('1 further file(s) were not included')
  })
})

describe('repo wiki — page titles', () => {
  it('drops the archetype word the icon already shows', () => {
    expect(cleanPageTitle('Database Module')).toBe('Database')
    expect(cleanPageTitle('Release process')).toBe('Release process')
    expect(cleanPageTitle('Commit graph  ')).toBe('Commit graph')
  })

  it('keeps a title that is only the archetype word', () => {
    expect(cleanPageTitle('Overview')).toBe('Overview')
    expect(cleanPageTitle('Reference')).toBe('Reference')
  })
})

describe('repo facts — languages', () => {
  it('maps files to languages by extension and by name', () => {
    expect(languageOf('src/app.tsx')).toBe('TypeScript')
    expect(languageOf('lib/thing.rb')).toBe('Ruby')
    expect(languageOf('Dockerfile')).toBe('Docker')
    expect(languageOf('deploy/Makefile')).toBe('Make')
    expect(languageOf('LICENSE')).toBeNull()
  })

  it('weighs languages by bytes, biggest first', () => {
    const stats = languageBreakdown([
      { path: 'a.ts', size: 700 },
      { path: 'b.ts', size: 300 },
      { path: 'c.py', size: 250 }
    ])
    expect(stats.map((s) => s.language)).toEqual(['TypeScript', 'Python'])
    expect(stats[0]).toMatchObject({ bytes: 1000, files: 2 })
    expect(stats[0].share).toBeCloseTo(0.8)
    expect(stats[1].share).toBeCloseTo(0.2)
  })

  it('leaves config and docs out so fixtures do not read as the language', () => {
    const files = [{ path: 'a.ts', size: 100 }, { path: 'data.json', size: 9000 }, { path: 'README.md', size: 500 }]
    expect(languageBreakdown(files).map((s) => s.language)).toEqual(['TypeScript'])
    expect(languageBreakdown(files, { includeSupporting: true }).map((s) => s.language)).toEqual([
      'JSON',
      'Markdown',
      'TypeScript'
    ])
  })

  it('rolls the tail into one Other slice', () => {
    const stats = languageBreakdown(
      ['ts', 'py', 'rb', 'go', 'rs', 'java', 'php', 'lua', 'zig', 'dart'].map((ext, i) => ({
        path: `f.${ext}`,
        size: 100 - i
      }))
    )
    const top = topLanguages(stats, 3)
    expect(top).toHaveLength(4)
    expect(top[3].language).toBe('Other')
    expect(top[3].files).toBe(7)
  })

  it('handles a repo with nothing countable', () => {
    expect(languageBreakdown([])).toEqual([])
    expect(topLanguages([], 5)).toEqual([])
  })
})

describe('repo facts — manifests', () => {
  it('finds manifests shallowest first', () => {
    expect(findManifests(['src/app.ts', 'web/package.json', 'package.json', 'Cargo.toml'])).toEqual([
      'Cargo.toml',
      'package.json',
      'web/package.json'
    ])
  })

  it('reads npm dependencies, marking dev ones', () => {
    const deps = parseManifest(
      'package.json',
      JSON.stringify({ dependencies: { react: '^18.0.0' }, devDependencies: { vitest: '^2.0.0' } })
    )
    expect(deps).toEqual([
      { name: 'react', version: '^18.0.0', dev: false },
      { name: 'vitest', version: '^2.0.0', dev: true }
    ])
  })

  it('survives a malformed manifest instead of throwing', () => {
    expect(parseManifest('package.json', '{ not json')).toEqual([])
  })

  it('reads Cargo, go.mod, pyproject, requirements, pubspec and Gemfile', () => {
    expect(parseManifest('Cargo.toml', '[dependencies]\nserde = "1.0"\ntokio = { version = "1.35" }\n')).toEqual([
      { name: 'serde', version: '1.0', dev: false },
      { name: 'tokio', version: '1.35', dev: false }
    ])
    expect(parseManifest('go.mod', 'module x\n\nrequire (\n\tgithub.com/foo/bar v1.2.3\n)\n')[0]).toMatchObject({
      name: 'github.com/foo/bar',
      version: 'v1.2.3'
    })
    expect(parseManifest('pyproject.toml', 'dependencies = ["requests>=2.0", "flask"]')).toHaveLength(2)
    expect(parseManifest('requirements.txt', '# comment\nrequests==2.0\n-e .\n')).toEqual([
      { name: 'requests', version: '==2.0', dev: false }
    ])
    expect(parseManifest('pubspec.yaml', 'dependencies:\n  http: ^1.0.0\n  sdk: flutter\n')).toEqual([
      { name: 'http', version: '^1.0.0', dev: false }
    ])
    expect(parseManifest('Gemfile', "source 'x'\ngem 'rails', '7.0'\n")).toEqual([
      { name: 'rails', version: '7.0', dev: false }
    ])
  })
})

describe('repo facts — the model groups, the manifest names', () => {
  const declared = new Set(['react', 'vitest', 'electron'])
  const good = {
    summary: 'A desktop app.',
    groups: [{ name: 'UI', items: [{ dep: 'react', role: 'renders the interface' }] }]
  }

  it('accepts a grouping of declared dependencies', () => {
    expect(validateTechStack(good, declared)).toEqual([])
  })

  it('rejects a package the project does not declare', () => {
    const bad = { ...good, groups: [{ name: 'UI', items: [{ dep: 'vue', role: 'x' }] }] }
    expect(validateTechStack(bad, declared)[0]).toContain('vue')
  })

  it('rejects listing the same dependency twice', () => {
    const twice = {
      ...good,
      groups: [
        { name: 'UI', items: [{ dep: 'react', role: 'a' }] },
        { name: 'Other', items: [{ dep: 'react', role: 'b' }] }
      ]
    }
    expect(validateTechStack(twice, declared)[0]).toContain('appears twice')
  })

  it('requires a role for each entry and caps the groups', () => {
    expect(validateTechStack({ ...good, groups: [{ name: 'UI', items: [{ dep: 'react', role: '' }] }] }, declared)[0])
      .toContain('role')
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `g${i}`, items: [] }))
    expect(validateTechStack({ ...good, groups: many }, declared)[0]).toContain('at most 6')
  })
})

describe('wiki page map layout', () => {
  const pages = [
    { slug: 'overview', title: 'Overview', archetype: 'overview', related: ['data'] },
    { slug: 'data', title: 'Data', archetype: 'module', related: [] },
    { slug: 'ui', title: 'UI', archetype: 'module', related: [] }
  ]

  it('puts the overview in the middle and the rest on a ring', () => {
    const { nodes, width, height } = layoutPageGraph(pages, { width: 400, radius: 100 })
    const centre = nodes.find((n) => n.slug === 'overview')!
    expect(centre.x).toBe(width / 2)
    expect(centre.y).toBe(height / 2)
    for (const slug of ['data', 'ui']) {
      const node = nodes.find((n) => n.slug === slug)!
      const dist = Math.hypot(node.x - centre.x, node.y - centre.y)
      expect(Math.round(dist)).toBe(100)
    }
  })

  it('draws each link once, however both pages phrase it', () => {
    const mutual = [
      { slug: 'a', title: 'A', archetype: 'overview', related: ['b'] },
      { slug: 'b', title: 'B', archetype: 'module', related: ['a'] }
    ]
    expect(layoutPageGraph(mutual).edges).toHaveLength(1)
  })

  it('drops links to pages that are not in the wiki', () => {
    const dangling = [
      { slug: 'a', title: 'A', archetype: 'overview', related: ['ghost'] },
      { slug: 'b', title: 'B', archetype: 'module', related: [] }
    ]
    const { edges } = layoutPageGraph(dangling)
    expect(edges.every((e) => e.to !== 'ghost' && e.from !== 'ghost')).toBe(true)
  })

  it('still connects a page nobody linked to', () => {
    const { edges } = layoutPageGraph(pages)
    expect(edges.some((e) => e.from === 'ui' || e.to === 'ui')).toBe(true)
  })
})

describe('import graph — reading imports out of source', () => {
  it('reads every JS/TS import form', () => {
    const src = `
import { a } from './a'
import b from "../b"
import './side-effect'
export { c } from './c'
const d = require('./d')
const e = await import('./e')
`
    expect(extractImports('src/x.ts', src).sort()).toEqual(
      ['../b', './a', './c', './d', './e', './side-effect'].sort()
    )
  })

  it('ignores imports inside comments', () => {
    const src = "// import { x } from './commented'\n/* import './block' */\nimport { y } from './real'"
    expect(extractImports('src/x.ts', src)).toEqual(['./real'])
  })

  it('reads Python, Go, Rust, Dart and Ruby', () => {
    expect(extractImports('app.py', 'from .models import User\nimport os')).toEqual(['.models', 'os'])
    expect(extractImports('main.go', 'import "example.com/x/y"')).toContain('example.com/x/y')
    expect(extractImports('lib.rs', 'use crate::db::pool;\nmod helpers;')).toEqual(['crate::db::pool', 'helpers'])
    expect(extractImports('main.dart', "import 'package:http/http.dart';")).toEqual(['package:http/http.dart'])
    expect(extractImports('app.rb', "require_relative 'thing'")).toEqual(['thing'])
  })

  it('returns nothing for a language it does not parse', () => {
    expect(extractImports('README.md', 'import this')).toEqual([])
  })
})

describe('import graph — resolving to real files', () => {
  const files = new Set([
    'src/app.ts',
    'src/db/pool.ts',
    'src/db/index.ts',
    'src/ui/panel.tsx',
    'app/models/user.py',
    'app/__init__.py'
  ])

  it('resolves relative paths, adding the extension', () => {
    expect(resolveImport('src/app.ts', './db/pool', files)).toBe('src/db/pool.ts')
    expect(resolveImport('src/ui/panel.tsx', '../db/pool', files)).toBe('src/db/pool.ts')
  })

  it('resolves a folder to its index file', () => {
    expect(resolveImport('src/app.ts', './db', files)).toBe('src/db/index.ts')
  })

  it('resolves root aliases', () => {
    expect(resolveImport('src/ui/panel.tsx', '@/db/pool', files)).toBe('src/db/pool.ts')
  })

  it('resolves dotted Python modules', () => {
    expect(resolveImport('app/main.py', 'app.models.user', files)).toBe('app/models/user.py')
  })

  it('returns null for packages outside the repo', () => {
    expect(resolveImport('src/app.ts', 'react', files)).toBeNull()
    expect(resolveImport('main.go', 'fmt', files)).toBeNull()
    expect(resolveImport('src/app.ts', './nope', files)).toBeNull()
  })
})

describe('import graph — folders, not files', () => {
  const repo = [
    { path: 'src/ui/panel.tsx', content: "import { query } from '../db/pool'\nimport './styles'" },
    { path: 'src/ui/styles.ts', content: '' },
    { path: 'src/db/pool.ts', content: "import { log } from '../util/log'" },
    { path: 'src/util/log.ts', content: '' },
    { path: 'src/app.ts', content: "import { Panel } from './ui/panel'\nimport react from 'react'" }
  ]

  it('aggregates file imports into folder edges, with direction', () => {
    const graph = buildImportGraph(repo, { depth: 2 })
    const edge = (from: string, to: string): number =>
      graph.edges.find((e) => e.from === from && e.to === to)?.count ?? 0
    expect(edge('src/ui', 'src/db')).toBe(1)
    expect(edge('src/db', 'src/util')).toBe(1)
    expect(edge('src', 'src/ui')).toBe(1)
    expect(edge('src/db', 'src/ui')).toBe(0)
  })

  it('drops imports within the same folder', () => {
    const graph = buildImportGraph(repo, { depth: 2 })
    expect(graph.edges.some((e) => e.from === e.to)).toBe(false)
  })

  it('counts what pointed outside the repo separately', () => {
    const graph = buildImportGraph(repo, { depth: 2 })
    expect(graph.resolved).toBe(4)
    expect(graph.external).toBe(1)
  })

  it('rolls folders up as depth shrinks', () => {
    const graph = buildImportGraph(repo, { depth: 1 })
    expect(graph.nodes.every((n) => !n.id.includes('/'))).toBe(true)
  })

  it('keeps the busiest edges and reports the rest', () => {
    const graph = buildImportGraph(repo, { depth: 2, maxEdges: 1 })
    expect(graph.edges).toHaveLength(1)
    expect(graph.omittedEdges).toBe(2)
  })

  it('names entry points and the folders everything leans on', () => {
    const graph = buildImportGraph(repo, { depth: 2 })
    expect(entryPoints(graph)).toContain('src')
    expect(foundations(graph, 1)).toHaveLength(1)
  })
})

describe('import graph — arc layout', () => {
  const nodes = [{ id: 'a', weight: 3 }, { id: 'b', weight: 2 }, { id: 'c', weight: 1 }]
  const edges = [{ from: 'a', to: 'b', count: 2 }]

  it('places every node on the circle', () => {
    const layout = layoutArcGraph(nodes, edges, { size: 400 })
    for (const node of layout.nodes) {
      const dist = Math.hypot(node.x - 200, node.y - 200)
      expect(Math.round(dist)).toBe(Math.round(layout.radius))
    }
  })

  it('draws a curve between the two ends of each edge', () => {
    const layout = layoutArcGraph(nodes, edges)
    expect(layout.edges).toHaveLength(1)
    expect(layout.edges[0].path).toMatch(/^M [\d.]+ [\d.]+ Q [\d.]+ [\d.]+ [\d.]+ [\d.]+$/)
  })

  it('skips edges whose ends are missing or identical', () => {
    expect(layoutArcGraph(nodes, [{ from: 'a', to: 'ghost', count: 1 }]).edges).toHaveLength(0)
    expect(layoutArcGraph(nodes, [{ from: 'a', to: 'a', count: 1 }]).edges).toHaveLength(0)
  })
})

describe('import graph — choosing the folder depth', () => {
  const links = [
    { from: 'src/renderer/src/components/A.tsx', to: 'src/renderer/src/stores/ui.ts' },
    { from: 'src/renderer/src/components/B.tsx', to: 'src/shared/types.ts' },
    { from: 'src/main/git.ts', to: 'src/shared/types.ts' }
  ]

  it('cuts deep enough to separate sibling folders', () => {
    // depth 1 collapses everything into "src"; depth 4 keeps components apart.
    expect(pickDepth(links, 14)).toBe(4)
  })

  it('backs off when a deep cut would make too many nodes', () => {
    expect(pickDepth(links, 3)).toBeLessThan(4)
  })

  it('survives a repo with no internal links at all', () => {
    expect(pickDepth([], 14)).toBe(1)
  })
})

describe('import graph — readable labels', () => {
  it('drops the prefix every folder shares', () => {
    const ids = ['desktop/app/src/ui', 'desktop/app/src/lib', 'desktop/app/test/e2e']
    expect(commonPrefix(ids)).toBe('desktop/app/')
    expect(shortLabel('desktop/app/src/ui', 'desktop/app/')).toBe('src/ui')
  })

  it('keeps the whole id when folders share nothing', () => {
    expect(commonPrefix(['src/main', 'test'])).toBe('')
    expect(commonPrefix(['src/main'])).toBe('')
  })

  it('never eats the last segment, even if all paths are identical up to it', () => {
    expect(commonPrefix(['src/a', 'src/b'])).toBe('src/')
    expect(shortLabel('src/a', 'src/')).toBe('a')
  })

  it('truncates from the front so the distinguishing tail survives', () => {
    const label = shortLabel('a/very/deeply/nested/components/panel', '', 20)
    expect(label.length).toBeLessThanOrEqual(22)
    expect(label.endsWith('panel')).toBe(true)
    expect(label.startsWith('…/')).toBe(true)
  })
})

describe('import graph — layering', () => {
  const nodes = [
    { id: 'ui', files: 3, in: 0, out: 2 },
    { id: 'db', files: 2, in: 1, out: 1 },
    { id: 'util', files: 1, in: 2, out: 0 }
  ]
  const edges = [
    { from: 'ui', to: 'db', count: 2 },
    { from: 'ui', to: 'util', count: 1 },
    { from: 'db', to: 'util', count: 1 }
  ]

  it('puts foundations at layer 0 and dependents above', () => {
    const layers = layerNodes(nodes, edges)
    expect(layers.get('util')).toBe(0)
    expect(layers.get('db')).toBe(1)
    expect(layers.get('ui')).toBe(2)
  })

  it('terminates on a circular dependency', () => {
    const cyclic = [{ id: 'a', files: 1, in: 1, out: 1 }, { id: 'b', files: 1, in: 1, out: 1 }]
    const loop = [{ from: 'a', to: 'b', count: 1 }, { from: 'b', to: 'a', count: 1 }]
    const layers = layerNodes(cyclic, loop)
    expect(layers.size).toBe(2)
  })

  it('lays layers out top to bottom, foundations last', () => {
    const layers = layerNodes(nodes, edges)
    const layout = layoutLayeredGraph(
      nodes.map((n) => ({ ...n, label: n.id, layer: layers.get(n.id) ?? 0 })),
      edges
    )
    const y = (id: string): number => layout.nodes.find((n) => n.id === id)!.y
    expect(y('ui')).toBeLessThan(y('db'))
    expect(y('db')).toBeLessThan(y('util'))
    expect(layout.edges).toHaveLength(3)
  })
})

describe('repo facts — signal over scaffolding', () => {
  const deps = (...names: string[]): { name: string; version: string; dev: boolean }[] =>
    names.map((name) => ({ name, version: '1.0.0', dev: false }))

  it('drops type stubs, loaders and lint plugins', () => {
    for (const name of ['@types/node', 'ts-loader', 'eslint-plugin-react', 'prettier', '@babel/core', 'tslib']) {
      expect(isNoiseDependency(name), name).toBe(true)
    }
    for (const name of ['react', 'electron', 'tailwindcss', 'go-sqlite3']) {
      expect(isNoiseDependency(name), name).toBe(false)
    }
  })

  it('folds away sub-packages implied by their framework', () => {
    const kept = meaningfulDependencies(deps('react', 'react-dom', 'vue-router')).map((d) => d.name)
    expect(kept).toEqual(['react', 'vue-router']) // vue isn't here, so its router stands alone
  })

  it('recognises frameworks and gives each a badge', () => {
    const hits = detectFrameworks(deps('next', 'react', 'tailwindcss', 'left-pad'))
    expect(hits.map((h) => h.label)).toEqual(['Next.js', 'React', 'Tailwind'])
    expect(hits[0].badge).toBeTruthy()
    expect(hits[0].kind).toBe('framework')
  })

  it('reports a framework once, whichever package revealed it', () => {
    expect(detectFrameworks(deps('react', 'react')).map((h) => h.label)).toEqual(['React'])
  })
})

// ─── Merge conflict picking (src/renderer/src/lib/conflict.ts) ───────────────

import {
  assemble,
  lineKey,
  mergePicks,
  parseHunks,
  reconcileOutput,
  sideFullyPicked,
  sidePartlyPicked,
  toggleSideEverywhere,
  toggleSideInHunk
} from '../src/renderer/src/lib/conflict'

const CONFLICTED = [
  'top context',
  '<<<<<<< HEAD',
  'ours one',
  'ours two',
  '=======',
  'theirs one',
  '>>>>>>> feature',
  'middle',
  '<<<<<<< HEAD',
  'ours three',
  '=======',
  'theirs two',
  '>>>>>>> feature',
  'bottom context'
].join('\n')

describe('conflict marker parsing', () => {
  it('splits every hunk and reconstructs both whole files', () => {
    const { hunks, oursContent, theirsContent } = parseHunks(CONFLICTED)
    expect(hunks.length).toBe(2)
    expect(hunks[0].ours).toEqual(['ours one', 'ours two'])
    expect(hunks[0].theirs).toEqual(['theirs one'])
    expect(hunks[0].oursLabel).toBe('HEAD')
    expect(hunks[0].theirsLabel).toBe('feature')
    expect(oursContent.split('\n')).toEqual([
      'top context',
      'ours one',
      'ours two',
      'middle',
      'ours three',
      'bottom context'
    ])
    expect(theirsContent.split('\n')).toEqual([
      'top context',
      'theirs one',
      'middle',
      'theirs two',
      'bottom context'
    ])
    // Side line indices must point at the reconstructed files.
    expect(hunks[1].oursStart).toBe(4)
    expect(hunks[1].theirsStart).toBe(3)
  })

  it('skips the diff3 base section', () => {
    const { hunks } = parseHunks(
      ['<<<<<<< HEAD', 'mine', '||||||| base', 'original', '=======', 'yours', '>>>>>>> other'].join('\n')
    )
    expect(hunks[0].ours).toEqual(['mine'])
    expect(hunks[0].theirs).toEqual(['yours'])
  })

  it('finds no hunks in a clean file', () => {
    expect(parseHunks('just\nsome\nlines').hunks).toEqual([])
  })
})

describe('conflict output assembly', () => {
  const { hunks, oursContent } = parseHunks(CONFLICTED)

  it('drops every conflict body when nothing is picked, keeping context', () => {
    const { text } = assemble(hunks, oursContent, new Set())
    expect(text.split('\n')).toEqual(['top context', 'middle', 'bottom context'])
  })

  it('emits ours before theirs when both sides of a chunk are taken', () => {
    const both = new Set([
      lineKey(0, 'ours', 0),
      lineKey(0, 'ours', 1),
      lineKey(0, 'theirs', 0)
    ])
    const { text } = assemble(hunks, oursContent, both)
    expect(text.split('\n')).toEqual([
      'top context',
      'ours one',
      'ours two',
      'theirs one',
      'middle',
      'bottom context'
    ])
  })

  it('tags each output line with the side it came from', () => {
    const both = new Set([lineKey(0, 'ours', 0), lineKey(0, 'ours', 1), lineKey(0, 'theirs', 0)])
    const { text, origins } = assemble(hunks, oursContent, both)
    expect(origins.length).toBe(text.split('\n').length)
    expect(origins.map((o) => (o ? `${o.side}${o.hunk}` : '.'))).toEqual([
      '.',
      'ours0',
      'ours0',
      'theirs0',
      '.',
      '.'
    ])
    // The per-side line index is what "remove this line from the output" unpicks.
    expect(origins[2]).toEqual({ side: 'ours', hunk: 0, line: 1 })
    expect(lineKey(origins[2]!.hunk, origins[2]!.side, origins[2]!.line)).toBe(lineKey(0, 'ours', 1))
  })

  it('reports the output line each hunk landed on', () => {
    const all = toggleSideEverywhere(hunks, 'ours', new Set(), true)
    const { text, starts } = assemble(hunks, oursContent, all)
    const lines = text.split('\n')
    expect(lines[starts[0]]).toBe('ours one')
    expect(lines[starts[1]]).toBe('ours three')
  })
})

describe('conflict output reconciliation', () => {
  const { hunks, oursContent } = parseHunks(CONFLICTED)
  const picked = toggleSideEverywhere(hunks, 'ours', new Set(), true)
  const base = assemble(hunks, oursContent, picked)
  const mark = (m: ReturnType<typeof reconcileOutput>[number]): string =>
    m === 'edited' ? 'E' : m ? (m.side === 'ours' ? 'A' : 'B') : '.'

  it('keeps every attribution while the text is untouched', () => {
    expect(reconcileOutput(base.text, base.origins, base.text).map(mark)).toEqual(['.', 'A', 'A', '.', 'A', '.'])
  })

  it('flags an inserted line and keeps the rest attributed', () => {
    const lines = base.text.split('\n')
    lines.splice(2, 0, 'typed by hand')
    expect(reconcileOutput(base.text, base.origins, lines.join('\n')).map(mark)).toEqual([
      '.',
      'A',
      'E',
      'A',
      '.',
      'A',
      '.'
    ])
  })

  it('flags a rewritten line without disturbing its neighbours', () => {
    const lines = base.text.split('\n')
    lines[1] = 'ours one, but edited'
    expect(reconcileOutput(base.text, base.origins, lines.join('\n')).map(mark)).toEqual([
      '.',
      'E',
      'A',
      '.',
      'A',
      '.'
    ])
  })

  it('survives edits at both ends and in the middle', () => {
    const lines = base.text.split('\n')
    lines[0] = 'new top'
    lines[3] = 'new middle'
    lines[lines.length - 1] = 'new bottom'
    expect(reconcileOutput(base.text, base.origins, lines.join('\n')).map(mark)).toEqual([
      'E',
      'A',
      'A',
      'E',
      'A',
      'E'
    ])
  })

  it('treats a wholesale replacement (e.g. an AI proposal) as all edited', () => {
    expect(reconcileOutput(base.text, base.origins, 'one\ntwo').map(mark)).toEqual(['E', 'E'])
  })

  it('returns one mark per current line, whatever the edit', () => {
    for (const text of ['', 'x', base.text + '\n\n\n', base.text.split('\n').slice(0, 2).join('\n')]) {
      expect(reconcileOutput(base.text, base.origins, text).length).toBe(text.split('\n').length)
    }
  })
})

describe('conflict pick changes keep hand edits', () => {
  const { hunks, oursContent } = parseHunks(CONFLICTED)
  const pick = (...keys: string[]): Set<string> => new Set(keys)
  const A0 = [lineKey(0, 'ours', 0), lineKey(0, 'ours', 1)]
  const B0 = [lineKey(0, 'theirs', 0)]
  const A1 = [lineKey(1, 'ours', 0)]

  it('passes the fresh output straight through when nothing was typed', () => {
    const prev = assemble(hunks, oursContent, pick())
    const next = assemble(hunks, oursContent, pick(...A0))
    expect(mergePicks(prev, prev.text, next)).toBe(next.text)
  })

  it('keeps a typed line when another chunk is picked afterwards', () => {
    const prev = assemble(hunks, oursContent, pick(...A0))
    const typed = prev.text.replace('middle', 'middle\ntyped by hand')
    const next = assemble(hunks, oursContent, pick(...A0, ...A1))
    expect(mergePicks(prev, typed, next).split('\n')).toEqual([
      'top context',
      'ours one',
      'ours two',
      'middle',
      'typed by hand',
      'ours three', // newly picked, lands in its own slot
      'bottom context'
    ])
  })

  it('keeps typed lines when a side is unpicked', () => {
    const prev = assemble(hunks, oursContent, pick(...A0))
    const typed = prev.text.replace('ours two', 'ours two\ntyped by hand')
    const next = assemble(hunks, oursContent, pick())
    expect(mergePicks(prev, typed, next).split('\n')).toEqual([
      'top context',
      'typed by hand',
      'middle',
      'bottom context'
    ])
  })

  it('keeps a line typed at the very top', () => {
    const prev = assemble(hunks, oursContent, pick())
    const typed = `header\n${prev.text}`
    const next = assemble(hunks, oursContent, pick(...B0))
    expect(mergePicks(prev, typed, next).split('\n')).toEqual([
      'header',
      'top context',
      'theirs one',
      'middle',
      'bottom context'
    ])
  })

  it('does not resurrect a line the user deleted or rewrote', () => {
    const prev = assemble(hunks, oursContent, pick(...A0))
    const rewritten = prev.text.replace('ours one', 'ours one, my way')
    // Picking the other side of the same chunk must not bring 'ours one' back.
    const next = assemble(hunks, oursContent, pick(...A0, ...B0))
    const out = mergePicks(prev, rewritten, next).split('\n')
    expect(out).toContain('ours one, my way')
    expect(out).not.toContain('ours one')
    expect(out).toContain('theirs one')
  })
})

describe('conflict side selection', () => {
  const { hunks } = parseHunks(CONFLICTED)

  it('takes a whole side across every chunk, and can drop it again', () => {
    const ours = toggleSideEverywhere(hunks, 'ours', new Set(), true)
    expect(sideFullyPicked(hunks, 'ours', ours)).toBe(true)
    expect(sidePartlyPicked(hunks, 'theirs', ours)).toBe(false)
    expect(sideFullyPicked(hunks, 'ours', toggleSideEverywhere(hunks, 'ours', ours, false))).toBe(false)
  })

  it('keeps both sides selectable at once', () => {
    const both = toggleSideEverywhere(hunks, 'theirs', toggleSideEverywhere(hunks, 'ours', new Set(), true), true)
    expect(sideFullyPicked(hunks, 'ours', both)).toBe(true)
    expect(sideFullyPicked(hunks, 'theirs', both)).toBe(true)
  })

  it('toggles one chunk without touching the other side or the other chunk', () => {
    const one = toggleSideInHunk(hunks[0], 'ours', new Set())
    expect(one.has(lineKey(0, 'ours', 0))).toBe(true)
    expect(one.has(lineKey(0, 'ours', 1))).toBe(true)
    expect(one.has(lineKey(1, 'ours', 0))).toBe(false)
    expect(one.has(lineKey(0, 'theirs', 0))).toBe(false)
    expect(sidePartlyPicked(hunks, 'ours', one)).toBe(true)
    expect(sideFullyPicked(hunks, 'ours', one)).toBe(false)
    // Toggling the same chunk again clears it.
    expect(toggleSideInHunk(hunks[0], 'ours', one).size).toBe(0)
  })

  it('treats an empty selection as nothing picked', () => {
    expect(sideFullyPicked(hunks, 'ours', new Set())).toBe(false)
    expect(sidePartlyPicked(hunks, 'ours', new Set())).toBe(false)
    expect(sideFullyPicked([], 'ours', new Set())).toBe(false)
  })
})

describe('group folders — nesting repositories inside a group tab', () => {
  const repos: RepoRef[] = [
    { path: '/r/api', name: 'api' },
    { path: '/r/web', name: 'web' },
    { path: '/r/docs', name: 'docs' },
    { path: '/r/infra', name: 'infra' }
  ]
  // backend ─ deep ─ deeper, plus a sibling docs folder.
  const tree = (): RepoFolder[] => [
    {
      id: 'backend',
      name: 'Backend',
      paths: ['/r/api'],
      folders: [
        { id: 'deep', name: 'Deep', paths: ['/r/infra'], folders: [{ id: 'deeper', name: 'Deeper', paths: [], folders: [] }] }
      ]
    },
    { id: 'docs', name: 'Docs', paths: ['/r/docs'], folders: [] }
  ]

  it('walks the tree depth-first with parent and depth', () => {
    expect(flattenFolders(tree()).map((x) => [x.folder.id, x.parentId, x.depth])).toEqual([
      ['backend', null, 0],
      ['deep', 'backend', 1],
      ['deeper', 'deep', 2],
      ['docs', null, 0]
    ])
  })

  it('nests without a depth limit', () => {
    let folders = tree()
    for (let i = 0; i < 20; i++) {
      folders = insertFolder(folders, i === 0 ? 'deeper' : `n${i - 1}`, {
        id: `n${i}`,
        name: `n${i}`,
        paths: [],
        folders: []
      })
    }
    const flat = flattenFolders(folders)
    expect(flat.find((x) => x.folder.id === 'n19')?.depth).toBe(22)
    expect(findFolder(folders, 'n19')?.name).toBe('n19')
  })

  it('shows unfiled repos at the group root and filed ones only in their folder', () => {
    expect(rootRepos(repos, tree()).map((r) => r.name)).toEqual(['web'])
    expect(folderPaths(tree()).sort()).toEqual(['/r/api', '/r/docs', '/r/infra'])
    expect(folderRepos(findFolder(tree(), 'deep')!, repos).map((r) => r.name)).toEqual(['infra'])
  })

  it('counts a folder including everything nested under it', () => {
    expect(folderCount(findFolder(tree(), 'backend')!)).toBe(2)
    expect(subtreePaths(findFolder(tree(), 'backend')!).sort()).toEqual(['/r/api', '/r/infra'])
  })

  it('files a repo into a folder, removing it from wherever it was', () => {
    const moved = movePathToFolder(tree(), '/r/api', 'docs')
    expect(findFolder(moved, 'backend')!.paths).toEqual([])
    expect(findFolder(moved, 'docs')!.paths).toEqual(['/r/docs', '/r/api'])
    expect(rootRepos(repos, moved).map((r) => r.name)).toEqual(['web'])
  })

  it('honours the insert position inside a folder and never files a repo twice', () => {
    const filed = movePathToFolder(movePathToFolder(tree(), '/r/web', 'docs'), '/r/api', 'docs', '/r/docs')
    expect(findFolder(filed, 'docs')!.paths).toEqual(['/r/api', '/r/docs', '/r/web'])
    const again = movePathToFolder(filed, '/r/web', 'docs', '/r/api')
    expect(findFolder(again, 'docs')!.paths).toEqual(['/r/web', '/r/api', '/r/docs'])
  })

  it('sends a repo back to the group root', () => {
    const out = movePathToFolder(tree(), '/r/api', null)
    expect(folderPaths(out)).not.toContain('/r/api')
    expect(rootRepos(repos, out).map((r) => r.name)).toEqual(['api', 'web'])
  })

  it('reorders a repo inside the folder that holds it', () => {
    const filled = movePathToFolder(tree(), '/r/web', 'backend')
    expect(findFolder(filled, 'backend')!.paths).toEqual(['/r/api', '/r/web'])
    expect(findFolder(reorderInFolder(filled, '/r/web', '/r/api'), 'backend')!.paths).toEqual(['/r/web', '/r/api'])
    expect(findFolder(reorderInFolder(filled, '/r/api', null), 'backend')!.paths).toEqual(['/r/web', '/r/api'])
  })

  it('re-parents a folder with its whole subtree', () => {
    const moved = moveFolder(tree(), 'backend', 'docs')
    expect(flattenFolders(moved).map((x) => x.folder.id)).toEqual(['docs', 'backend', 'deep', 'deeper'])
    expect(findFolder(moved, 'deep')!.paths).toEqual(['/r/infra'])
  })

  it('refuses to move a folder into itself or its own subtree', () => {
    expect(isSelfOrDescendant(tree(), 'backend', 'deeper')).toBe(true)
    expect(isSelfOrDescendant(tree(), 'docs', 'deep')).toBe(false)
    expect(moveFolder(tree(), 'backend', 'deeper')).toEqual(tree())
    expect(moveFolder(tree(), 'backend', 'backend')).toEqual(tree())
  })

  it('deleting a folder lifts its repos and subfolders to the parent', () => {
    const gone = deleteFolder(tree(), 'deep')
    expect(findFolder(gone, 'deep')).toBeNull()
    expect(findFolder(gone, 'backend')!.paths).toEqual(['/r/api', '/r/infra'])
    expect(findFolder(gone, 'deeper')).not.toBeNull()
  })

  it('deleting a top-level folder returns its repos to the group root', () => {
    const gone = deleteFolder(tree(), 'backend')
    expect(rootRepos(repos, gone).map((r) => r.name).sort()).toEqual(['api', 'web'])
    expect(findFolder(gone, 'deep')).not.toBeNull()
  })

  it('prunes repos that left the group, and duplicate filings', () => {
    const stale = pruneFolders(tree(), [{ path: '/r/api', name: 'api' }])
    expect(folderPaths(stale)).toEqual(['/r/api'])
    const dupe: RepoFolder[] = [
      { id: 'a', name: 'A', paths: ['/r/api'], folders: [] },
      { id: 'b', name: 'B', paths: ['/r/api'], folders: [] }
    ]
    expect(folderPaths(pruneFolders(dupe, repos))).toEqual(['/r/api'])
  })

  it('labels a folder with its full trail', () => {
    expect(folderTrail(tree(), 'deeper')).toBe('Backend / Deep / Deeper')
    expect(folderTrail(tree(), 'docs')).toBe('Docs')
  })

  it('detaching a path that is not filed anywhere leaves the tree alone', () => {
    expect(detachPath(tree(), '/r/web')).toEqual(tree())
    expect(updateFolder(tree(), 'nope', (f) => ({ ...f, name: 'x' }))).toEqual(tree())
  })
})

describe('repo wiki — exporting to the repo', () => {
  const wiki = {
    headSha: 'abc1234567',
    generatedAt: Date.UTC(2026, 0, 15),
    model: 'gpt-4o-mini',
    promptVersion: WIKI_PROMPT_VERSION,
    stack: null,
    pages: [
      {
        slug: 'overview',
        title: 'Overview',
        archetype: 'overview' as const,
        summary: 'What this is.',
        sections: [],
        related: ['data'],
        markdown: '# Overview\n\nWhat this is.\n'
      },
      {
        slug: 'data',
        title: 'Data layer',
        archetype: 'module' as const,
        summary: 'How data is read.',
        sections: [],
        related: [],
        markdown: '# Data layer\n\nHow data is read.\n'
      }
    ]
  }

  it('writes an index plus one file per page, under docs/wiki', () => {
    const files = wikiExportFiles(wiki, 'gitcito')
    expect(files.map((f) => f.path)).toEqual([
      'docs/wiki/README.md',
      'docs/wiki/overview.md',
      'docs/wiki/data.md'
    ])
  })

  it('links every page from the index, with its summary', () => {
    const [index] = wikiExportFiles(wiki, 'gitcito')
    expect(index.content).toContain('# gitcito wiki')
    expect(index.content).toContain('- [Data layer](data.md) — How data is read.')
  })

  it('stamps each file with the commit it came from', () => {
    for (const file of wikiExportFiles(wiki, 'gitcito')) {
      expect(file.content).toContain('abc1234')
      expect(file.content).toContain('Generated by Gitcito')
    }
  })

  it('turns related pages into links, and back to the index', () => {
    const overview = wikiExportFiles(wiki, 'gitcito').find((f) => f.path.endsWith('overview.md'))!
    expect(overview.content).toContain('## See also')
    expect(overview.content).toContain('- [Data layer](data.md)')
    expect(overview.content).toContain('[← Index](README.md)')
  })

  it('leaves out the See also section when a page links nowhere', () => {
    const data = wikiExportFiles(wiki, 'gitcito').find((f) => f.path.endsWith('data.md'))!
    expect(data.content).not.toContain('## See also')
  })

  it('only ever writes paths inside the repo', () => {
    for (const file of wikiExportFiles(wiki, 'gitcito')) {
      expect(isSafeRepoPath(file.path)).toBe(true)
    }
  })
})

describe('file list keyboard navigation', () => {
  const tree: NavNode[] = [
    {
      path: 'src',
      children: [
        { path: 'src/a.ts', children: [], file: {} },
        {
          path: 'src/lib',
          children: [{ path: 'src/lib/b.ts', children: [], file: {} }]
        }
      ]
    },
    { path: 'README.md', children: [], file: {} }
  ]

  it('lists visible files depth-first', () => {
    expect(visiblePaths(tree, new Set())).toEqual(['src/a.ts', 'src/lib/b.ts', 'README.md'])
  })

  it('skips the subtree of a collapsed folder', () => {
    expect(visiblePaths(tree, new Set(['src/lib']))).toEqual(['src/a.ts', 'README.md'])
    expect(visiblePaths(tree, new Set(['src']))).toEqual(['README.md'])
  })

  it('steps down and up one row', () => {
    const order = ['a', 'b', 'c']
    expect(stepPath(order, 'a', 1)).toBe('b')
    expect(stepPath(order, 'c', -1)).toBe('b')
  })

  it('enters at the top going down, at the bottom going up', () => {
    const order = ['a', 'b', 'c']
    expect(stepPath(order, null, 1)).toBe('a')
    expect(stepPath(order, null, -1)).toBe('c')
    // A file selected in some other list is not an anchor here either.
    expect(stepPath(order, 'zz', 1)).toBe('a')
  })

  it('stops at both ends instead of wrapping', () => {
    const order = ['a', 'b', 'c']
    expect(stepPath(order, 'c', 1)).toBeNull()
    expect(stepPath(order, 'a', -1)).toBeNull()
  })

  it('does nothing on an empty list', () => {
    expect(stepPath([], null, 1)).toBeNull()
  })
})

describe('merge-tree output parsing (conflict radar)', () => {
  const NUL = '\0'

  it('reads a clean merge from batch output', () => {
    const out = ['1', 'aaa111', ''].join(NUL) + NUL
    expect(parseMergeTreeStdin(out)).toEqual([{ status: 'clean', tree: 'aaa111', files: [], message: '' }])
  })

  it('reads conflicting paths and messages from batch output', () => {
    const out =
      ['0', 'bbb222', 'f.txt', '', '1', 'f.txt', 'CONFLICT (content)', 'CONFLICT (content): Merge conflict in f.txt\n', ''].join(NUL) +
      NUL
    expect(parseMergeTreeStdin(out)).toEqual([
      {
        status: 'conflict',
        tree: 'bbb222',
        files: ['f.txt'],
        message: 'CONFLICT (content): Merge conflict in f.txt'
      }
    ])
  })

  it('keeps records in input order so they align with the refs asked for', () => {
    const clean = ['1', 'aaa', ''].join(NUL) + NUL
    const conflict = ['0', 'bbb', 'x.txt', 'y.txt', '', ''].join(NUL) + NUL
    const recs = parseMergeTreeStdin(clean + conflict + clean)
    expect(recs.map((r) => r.status)).toEqual(['clean', 'conflict', 'clean'])
    expect(recs[1].files).toEqual(['x.txt', 'y.txt'])
  })

  it('stops cleanly when git aborts the batch mid-stream', () => {
    // Only the first merge made it out before a fatal error killed the run —
    // the caller retries the rest one at a time.
    const recs = parseMergeTreeStdin(['1', 'aaa', ''].join(NUL) + NUL)
    expect(recs).toHaveLength(1)
  })

  it('reads a single-merge run from its exit code', () => {
    expect(parseMergeTreeSingle('treeoid\n\nAuto-merging f.txt\n', 0)).toEqual({
      status: 'clean',
      tree: 'treeoid',
      files: [],
      message: 'Auto-merging f.txt'
    })
    expect(parseMergeTreeSingle('treeoid\nf.txt\n\nCONFLICT (content)\n', 1)).toEqual({
      status: 'conflict',
      tree: 'treeoid',
      files: ['f.txt'],
      message: 'CONFLICT (content)'
    })
  })

  it('reports git refusing the merge as an error, not a clean result', () => {
    const rec = parseMergeTreeSingle('', 128, 'fatal: refusing to merge unrelated histories')
    expect(rec.status).toBe('error')
    expect(rec.message).toContain('unrelated histories')
  })
})
