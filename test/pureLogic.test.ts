import { describe, it, expect } from 'vitest'
import { parseRemoteUrl } from '../src/main/hosting'
import { lintCommit, subjectCounterLevel, parseCcPrefix, applyCcType, parseGitmojiPrefix, applyGitmoji, parseTicketPrefix, applyTicket, ticketFromBranch } from '../src/renderer/src/lib/commitLint'
import { isSecretFile, maskSecretLine } from '../src/renderer/src/lib/secrets'
import { comboFromEvent, formatCombo, effectiveBindings, matchShortcut } from '../src/renderer/src/lib/shortcuts'
import { autolink, remoteWebUrl, filePermalink } from '../src/renderer/src/lib/autolink'
import { frecencyScore } from '../src/renderer/src/lib/frecency'
import { togglePin, selectPinned } from '../src/renderer/src/lib/pinnedBranches'
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
