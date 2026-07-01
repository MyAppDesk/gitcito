import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, GitCommitHorizontal, Tag, Laptop, Cloud, Check, Settings2, Pencil, Plus, Minus, CheckCircle2, XCircle, Clock, MinusCircle } from 'lucide-react'
import type { CiState, CiStatus, GraphCommit, StashInfo, GraphColumnId, GraphFlowColumnId, GraphColumns, FileEntry } from '../../../shared/types'
import { defaultGraphColumns, defaultGraphColumnOrder, defaultGraphStyle } from '../../../shared/types'
import { GraphHeaderFilter, type FilterOption } from './GraphHeaderFilter'
import { layoutGraph } from '../graph/layout'
import { edgePath, colorForPalette, findGraphPalette, DENSITY_ROW_H, LINE_WIDTH_PX } from '../graph/style'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'
import { Avatar } from './Avatar'
import { RemoteIcon } from './RemoteIcon'
import { SignatureBadge } from './SignatureBadge'
import { gitApi } from '../infrastructure/api'
import { repoIsGitHub } from '../lib/hosting'

const LANE_W = 18
const LEFT_PAD = 16
const NODE_R = 4.5
const AVA = 20 // avatar node diameter

const COL_MIN: Record<GraphColumnId, number> = { branch: 90, graph: 8, message: 120, deployment: 70, author: 80, date: 56, sha: 56, signature: 56 }
const COL_LABEL_KEY: Record<GraphColumnId, string> = {
  branch: 'graph.col.branch',
  graph: 'graph.col.graph',
  message: 'graph.col.message',
  deployment: 'graph.col.deployment',
  author: 'graph.col.author',
  date: 'graph.col.date',
  sha: 'graph.col.sha',
  signature: 'graph.col.signature'
}

const WIP_HASH = '__WIP__'

interface RefBadge {
  label: string
  kind: 'head' | 'local' | 'remote' | 'tag'
}

function parseRefs(refs: string[]): RefBadge[] {
  const out: RefBadge[] = []
  for (const r of refs) {
    if (r.startsWith('HEAD ->')) out.push({ label: r.replace('HEAD ->', '').trim(), kind: 'head' })
    else if (r === 'HEAD') out.push({ label: 'HEAD', kind: 'head' })
    else if (r.startsWith('tag:')) out.push({ label: r.replace('tag:', '').trim(), kind: 'tag' })
    else if (r.includes('/')) out.push({ label: r, kind: 'remote' })
    else out.push({ label: r, kind: 'local' })
  }
  return out
}

function mergeableRefs(refs: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const ref of parseRefs(refs)) {
    if (ref.label === 'HEAD') continue
    if (ref.kind !== 'head' && ref.kind !== 'local' && ref.kind !== 'remote') continue
    if (seen.has(ref.label)) continue
    seen.add(ref.label)
    out.push(ref.label)
  }
  return out
}

/**
 * A branch/tag label as shown next to a commit. A local branch and its
 * remote-tracking counterpart (e.g. `main` + `origin/main`) collapse into a
 * single group so the graph isn't littered with "+N" chips.
 */
interface RefGroup {
  key: string
  label: string
  kind: 'head' | 'local' | 'remote' | 'tag'
  isHead: boolean
  isLocal: boolean
  isTag: boolean
  remotes: string[]
}

function buildRefGroups(refs: string[], remoteNames: Set<string>): RefGroup[] {
  const branches = new Map<string, RefGroup>()
  const tags: RefGroup[] = []
  const branch = (name: string): RefGroup => {
    let g = branches.get(name)
    if (!g) {
      g = { key: `b:${name}`, label: name, kind: 'local', isHead: false, isLocal: false, isTag: false, remotes: [] }
      branches.set(name, g)
    }
    return g
  }
  // A ref is remote-tracking only when its prefix is an actual remote name —
  // local branches may contain slashes too (e.g. `backup/pre-cleanup-push`).
  const remoteSplit = (r: string): { remote: string; name: string } | null => {
    const slash = r.indexOf('/')
    if (slash <= 0) return null
    const remote = r.slice(0, slash)
    return remoteNames.has(remote) ? { remote, name: r.slice(slash + 1) } : null
  }
  for (const r of refs) {
    if (r === 'HEAD') continue
    if (r.startsWith('HEAD ->')) {
      const g = branch(r.replace('HEAD ->', '').trim())
      g.isHead = true
      g.isLocal = true
    } else if (r.startsWith('tag:')) {
      const label = r.replace('tag:', '').trim()
      tags.push({ key: `t:${label}`, label, kind: 'tag', isHead: false, isLocal: false, isTag: true, remotes: [] })
    } else {
      const rem = remoteSplit(r)
      if (rem) {
        if (rem.name === 'HEAD') continue // origin/HEAD is a symbolic alias — pure noise
        const g = branch(rem.name)
        if (!g.remotes.includes(rem.remote)) g.remotes.push(rem.remote)
      } else {
        branch(r).isLocal = true
      }
    }
  }
  const rank = (g: RefGroup): number => (g.isHead ? 0 : g.isLocal ? 1 : 2)
  const groups = [...branches.values()].map<RefGroup>((g) => ({
    ...g,
    kind: g.isHead ? 'head' : g.isLocal ? 'local' : 'remote'
  }))
  groups.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label))
  return [...groups, ...tags]
}


/** Black or white text, whichever contrasts better with a hex lane color. */
function contrastText(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  // Perceived luminance (sRGB weights). Bright lanes → dark text.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#10121a' : '#fff'
}

function timeAgo(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`
  return new Date(unixSeconds * 1000).toLocaleDateString()
}

function CiBadge({ status, onClick }: { status: CiStatus; onClick: () => void }): React.JSX.Element {
  const { state, jobs } = status
  const title = jobs.map((j) => `${j.name}: ${j.state}`).join('\n') || state
  let icon: React.ReactNode
  if (state === 'success') icon = <CheckCircle2 size={12} className="ci-badge ci-success" />
  else if (state === 'failure') icon = <XCircle size={12} className="ci-badge ci-failure" />
  else if (state === 'pending') icon = <Clock size={12} className="ci-badge ci-pending" />
  else icon = <MinusCircle size={12} className="ci-badge ci-neutral" />
  return <span title={title} onClick={onClick} style={{ display: 'contents' }}>{icon}</span>
}

/** Resizable / toggleable / reorderable column header. */
function GraphColumnsHeader({
  columns,
  order,
  branchCol,
  graphCol,
  onResize,
  onMenu,
  onReorder,
  renderFilter
}: {
  columns: GraphColumns
  order: GraphFlowColumnId[]
  branchCol: number
  graphCol: number
  onResize: (id: GraphColumnId, width: number) => void
  onMenu: (x: number, y: number) => void
  onReorder: (from: GraphFlowColumnId, to: GraphFlowColumnId) => void
  renderFilter?: (id: GraphFlowColumnId) => React.ReactNode
}): React.JSX.Element {
  const [dragId, setDragId] = useState<GraphFlowColumnId | null>(null)
  const [dropId, setDropId] = useState<GraphFlowColumnId | null>(null)
  const t = useT()
  // True while a resize handle is being dragged. The header cells are HTML5
  // `draggable` for reordering, so grabbing a handle would otherwise kick off a
  // column-move drag instead of a resize — this flag cancels that dragstart.
  const resizing = useRef(false)
  // `side` = which edge of the column the handle sits on. A left-edge handle
  // resizes the column inward as you drag right (its left border moves), so the
  // divider *left of* a column resizes that column — what users expect.
  const startResize = (id: GraphColumnId, side: 'left' | 'right', e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = true
    const startX = e.clientX
    // The graph column may be in `auto` mode (stored width 0); seed the drag
    // from its currently-rendered width so it doesn't jump on first move.
    const startW = id === 'graph' ? graphCol : columns[id].width
    const move = (ev: MouseEvent): void => {
      const delta = ev.clientX - startX
      const w = side === 'left' ? startW - delta : startW + delta
      onResize(id, Math.max(COL_MIN[id], w))
    }
    const up = (): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      document.body.style.cursor = ''
      // Defer so the cell's `onDragStart` (if any) still sees resizing === true.
      setTimeout(() => (resizing.current = false), 0)
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const handle = (id: GraphColumnId, side: 'left' | 'right'): React.JSX.Element => (
    <span
      className={`col-resize col-resize-${side}`}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => startResize(id, side, e)}
    />
  )

  return (
    <div className="graph-header">
      {columns.branch.visible && (
        <div className="ghc" style={{ width: branchCol }}>
          <span className="ghc-label">{t(COL_LABEL_KEY.branch as Parameters<typeof t>[0])}</span>
          {handle('branch', 'right')}
        </div>
      )}
      {columns.graph.visible && (
        <div className="ghc ghc-graph" style={{ width: graphCol }}>
          <span className="ghc-label">{t(COL_LABEL_KEY.graph as Parameters<typeof t>[0])}</span>
          {handle('graph', 'right')}
        </div>
      )}
      {order
        .filter((id) => columns[id].visible)
        .map((id) => {
          const isFlex = id === 'message'
          return (
            <div
              key={id}
              className={`ghc ghc-drag ${isFlex ? 'ghc-flex' : ''} ${dragId === id ? 'dragging' : ''} ${dropId === id ? 'drop-target' : ''}`}
              style={isFlex ? undefined : { width: columns[id].width }}
              draggable
              onDragStart={(e) => {
                if (resizing.current) {
                  e.preventDefault()
                  return
                }
                setDragId(id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragId && dragId !== id) setDropId(id)
              }}
              onDragLeave={() => setDropId((d) => (d === id ? null : d))}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId && dragId !== id) onReorder(dragId, id)
                setDragId(null)
                setDropId(null)
              }}
              onDragEnd={() => {
                setDragId(null)
                setDropId(null)
              }}
            >
              {!isFlex && handle(id, 'left')}
              <span className="ghc-label">{t(COL_LABEL_KEY[id] as Parameters<typeof t>[0])}</span>
              {renderFilter?.(id)}
            </div>
          )
        })}
      <button
        className="ghc-gear"
        title={t('graph.columnsTitle')}
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          onMenu(r.right, r.bottom)
        }}
      >
        <Settings2 size={13} />
      </button>
    </div>
  )
}

export function GraphView({ repo }: { repo: RepoData }): React.JSX.Element {
  const select = useRepoStore((s) => s.select)
  const loadMore = useRepoStore((s) => s.loadMore)
  const draft = useRepoStore((s) => s.drafts[repo.path] ?? '')
  const setDraft = useRepoStore((s) => s.setDraft)
  const { openContextMenu, openModal, graphFilter, ciFilter, setCiFilter, authorFilter, setAuthorFilter } = useUIStore()
  const pathFilter = useUIStore((s) => s.pathFilter)
  const setPathFilter = useUIStore((s) => s.setPathFilter)
  // Hashes that touched the path filter (null = filter off / still loading-as-all).
  const [pathHashes, setPathHashes] = useState<Set<string> | null>(null)
  useEffect(() => {
    if (!pathFilter) {
      setPathHashes(null)
      return
    }
    let cancelled = false
    void gitApi
      .commitsTouchingPath(repo.path, pathFilter)
      .then((hs) => !cancelled && setPathHashes(new Set(hs)))
      .catch(() => !cancelled && setPathHashes(new Set()))
    return () => {
      cancelled = true
    }
  }, [pathFilter, repo.path])
  const toast = useUIStore((s) => s.toast)
  const scrollToHash = useUIStore((s) => s.scrollToHash)
  const requestScrollTo = useUIStore((s) => s.requestScrollTo)
  const relativeDates = useSettingsStore((s) => s.settings.relativeDates ?? true)
  const autoLoadOnScroll = useSettingsStore((s) => s.settings.autoLoadOnScroll ?? true)
  const baseColumns = useSettingsStore((s) => s.settings.graphColumns ?? defaultGraphColumns())
  const baseColumnOrder = useSettingsStore((s) => s.settings.graphColumnOrder ?? defaultGraphColumnOrder())
  const repoLayout = useSettingsStore((s) => s.settings.repoLayouts?.[repo.path])
  // Graph columns are per-repository: a repo's own override wins, otherwise the
  // global defaults apply.
  const columns = useMemo(() => repoLayout?.graphColumns ?? baseColumns, [repoLayout, baseColumns])
  const columnOrderRaw = useMemo(
    () => repoLayout?.graphColumnOrder ?? baseColumnOrder,
    [repoLayout, baseColumnOrder]
  )
  // The deployment column shows GitHub CI/deploy status; drop it for other hosts.
  const isGitHub = repoIsGitHub(repo.remotes)
  const columnOrder = useMemo(
    () => (isGitHub ? columnOrderRaw : columnOrderRaw.filter((id) => id !== 'deployment')),
    [columnOrderRaw, isGitHub]
  )
  const graphStyle = useSettingsStore((s) => s.settings.graphStyle ?? defaultGraphStyle())
  const customGraphPalettes = useSettingsStore((s) => s.settings.customGraphPalettes ?? [])
  const updateRepoLayout = useSettingsStore((s) => s.updateRepoLayout)
  const t = useT()

  // Visual style of the rails — palette, row spacing, line corners, thickness.
  const ROW_H = DENSITY_ROW_H[graphStyle.density] ?? DENSITY_ROW_H.comfortable
  const lineW = LINE_WIDTH_PX[graphStyle.lineWidth] ?? LINE_WIDTH_PX.normal
  const edgeStyle = graphStyle.edgeStyle
  // Compact mode draws commits as dots instead of author avatars.
  const compact = (graphStyle.nodeStyle ?? 'normal') === 'compact'
  const colorFor = useMemo(
    () => colorForPalette(findGraphPalette(graphStyle.paletteId, customGraphPalettes).colors),
    [graphStyle.paletteId, customGraphPalettes]
  )
  // First-parent-only view: hides merged side-branches. Persisted per machine.
  const [linearOnly, setLinearOnly] = useState(() => localStorage.getItem('gitcito-graph-linear') === 'on')
  useEffect(() => localStorage.setItem('gitcito-graph-linear', linearOnly ? 'on' : 'off'), [linearOnly])

  const setColumn = (id: GraphColumnId, patch: Partial<{ width: number; visible: boolean }>): void =>
    updateRepoLayout(repo.path, (l) => {
      const cols = l.graphColumns ?? baseColumns
      return { ...l, graphColumns: { ...cols, [id]: { ...cols[id], ...patch } } }
    })

  const reorderColumns = (from: GraphFlowColumnId, to: GraphFlowColumnId): void =>
    updateRepoLayout(repo.path, (l) => {
      const order = [...(l.graphColumnOrder ?? baseColumnOrder)]
      const fi = order.indexOf(from)
      const ti = order.indexOf(to)
      if (fi < 0 || ti < 0 || fi === ti) return l
      order.splice(fi, 1)
      order.splice(fi < ti ? order.indexOf(to) + 1 : order.indexOf(to), 0, from)
      return { ...l, graphColumnOrder: order }
    })

  const openColumnsMenu = (x: number, y: number): void => {
    const ids: GraphColumnId[] = ['branch', 'graph', ...columnOrder]
    const items: MenuItem[] = [
      {
        label: t('graph.themeSettings'),
        icon: <Settings2 size={14} />,
        onClick: () => openModal({ kind: 'settings', page: 'themes', themeTab: 'graph' })
      },
      { separator: true },
      ...ids.map((id) => ({
        label: `${columns[id].visible ? '✓ ' : '   '}${t(COL_LABEL_KEY[id] as Parameters<typeof t>[0])}`,
        onClick: () => setColumn(id, { visible: !columns[id].visible })
      }))
    ]
    items.push(
      { separator: true },
      {
        label: `${linearOnly ? '✓ ' : '   '}${t('graph.linearHistory')}`,
        onClick: () => setLinearOnly((v) => !v)
      },
      {
        label: t('graph.resetColumns'),
        onClick: () =>
          updateRepoLayout(repo.path, (l) => ({ ...l, graphColumns: defaultGraphColumns(), graphColumnOrder: defaultGraphColumnOrder() }))
      }
    )
    openContextMenu(x, y, items)
  }
  const scrollRef = useRef<HTMLDivElement>(null)

  const fmtDate = (unix: number): string =>
    relativeDates
      ? timeAgo(unix)
      : new Date(unix * 1000).toLocaleString(undefined, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })

  const hasWip =
    (repo.status?.staged.length ?? 0) + (repo.status?.unstaged.length ?? 0) + (repo.status?.conflicted.length ?? 0) > 0

  // Break the working-tree changes down by kind (added / modified / deleted),
  // deduped by path so a file that's both staged and unstaged counts once.
  const wipStats = useMemo(() => {
    const all: FileEntry[] = [
      ...(repo.status?.staged ?? []),
      ...(repo.status?.unstaged ?? []),
      ...(repo.status?.conflicted ?? [])
    ]
    const byPath = new Map<string, FileEntry>()
    for (const f of all) if (!byPath.has(f.path)) byPath.set(f.path, f)
    let added = 0
    let modified = 0
    let deleted = 0
    for (const f of byPath.values()) {
      if (f.untracked || f.status === 'A') added++
      else if (f.status === 'D') deleted++
      else modified++
    }
    return { added, modified, deleted, total: byPath.size }
  }, [repo.status])

  const newSet = useMemo(() => new Set(repo.newCommits ?? []), [repo.newCommits])
  const stashBySha = useMemo(() => new Map(repo.stashes.map((s) => [s.sha, s])), [repo.stashes])
  const remoteNames = useMemo(() => new Set(repo.remotes.map((r) => r.name)), [repo.remotes])

  const displayCommits = useMemo<GraphCommit[]>(() => {
    if (repo.commits.length === 0 && !hasWip) return repo.commits
    const head = repo.commits.find((c) => c.refs.some((r) => r.startsWith('HEAD')))
    // Linear view: keep only HEAD's first-parent chain (hides merged-in branches).
    let commits = repo.commits
    if (linearOnly && head) {
      const byHash = new Map(repo.commits.map((c) => [c.hash, c]))
      const chain = new Set<string>()
      let cur: GraphCommit | undefined = head
      while (cur && !chain.has(cur.hash)) {
        chain.add(cur.hash)
        cur = cur.parents[0] ? byHash.get(cur.parents[0]) : undefined
      }
      commits = repo.commits.filter((c) => chain.has(c.hash))
    }
    const out: GraphCommit[] = [...commits]
    // Stashes float to their chronological slot (by the time they were made),
    // not glued above their parent commit — the edge still descends to the
    // parent. Insert newest-first by date, but never below the stash's own
    // parent (keeps the edge pointing downward / topology valid).
    for (const s of repo.stashes) {
      const stashCommit: GraphCommit = {
        hash: s.sha,
        parents: [s.parentSha],
        author: '',
        email: '',
        date: s.date,
        refs: [],
        subject: s.message
      }
      const parentIdx = out.findIndex((c) => c.hash === s.parentSha)
      let dateIdx = out.findIndex((c) => c.date < s.date)
      if (dateIdx === -1) dateIdx = out.length
      const idx = parentIdx === -1 ? dateIdx : Math.min(dateIdx, parentIdx)
      out.splice(idx, 0, stashCommit)
    }
    if (hasWip) {
      out.unshift({
        hash: WIP_HASH,
        parents: head ? [head.hash] : [],
        author: '',
        email: '',
        date: Math.floor(Date.now() / 1000),
        refs: [],
        subject: '// WIP'
      })
    }
    return out
  }, [repo.commits, repo.stashes, hasWip, repo.status, linearOnly])

  // Stashes are laid out as right-side spurs so they never displace the trunk.
  const layout = useMemo(
    () => layoutGraph(displayCommits, new Set(stashBySha.keys())),
    [displayCommits, stashBySha]
  )

  // Branch preview: hovering a branch/tag label ghosts every commit that isn't
  // an ancestor of that ref's tip, so the branch's own history stands out.
  const [previewHash, setPreviewHash] = useState<string | null>(null)
  // Row hovered with no ref of its own — show which branch contains it.
  const [hoverRow, setHoverRow] = useState<string | null>(null)

  // Multi-selection (⌘/Ctrl-click toggles, Shift-click extends a range). Holds
  // real commit hashes only — WIP / stash rows are excluded. Used for batch
  // cherry-pick / patch export from the context menu.
  const [multi, setMulti] = useState<Set<string>>(new Set())
  const [anchorRow, setAnchorRow] = useState<number | null>(null)

  // ── Virtualized rendering ──
  // Every row/node/edge is absolutely positioned by its row index, so we can
  // mount only the slice intersecting the viewport. The canvas keeps its full
  // height, so the scrollbar and scroll-to-commit (which scrolls by `idx*ROW_H`)
  // stay correct regardless of which rows are in the DOM.
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = (): void => setViewportH(el.clientHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const preview = useMemo(() => {
    if (!previewHash) return null
    const byHash = new Map(displayCommits.map((c) => [c.hash, c]))
    const hashes = new Set<string>()
    const rows = new Set<number>()
    const stack = [previewHash]
    while (stack.length) {
      const h = stack.pop()!
      if (hashes.has(h)) continue
      hashes.add(h)
      const node = layout.nodes.get(h)
      if (node) rows.add(node.row)
      for (const p of byHash.get(h)?.parents ?? []) stack.push(p)
    }
    return { hashes, rows }
  }, [previewHash, displayCommits, layout])

  // Owning branch per commit: walk each branch tip's ancestry and tag every
  // commit with the *nearest* tip (fewest steps away). Feature commits end up
  // owned by their feature branch rather than mainline. Used to label a hovered
  // commit that carries no ref of its own.
  const branchOf = useMemo(() => {
    const byHash = new Map(displayCommits.map((c) => [c.hash, c]))
    const owner = new Map<string, string>()
    const bestDepth = new Map<string, number>()
    const tips: { hash: string; label: string; rank: number }[] = []
    for (const c of displayCommits) {
      for (const g of buildRefGroups(c.refs, remoteNames)) {
        if (g.isTag) continue
        tips.push({ hash: c.hash, label: g.label, rank: g.isHead ? 0 : g.isLocal ? 1 : 2 })
      }
    }
    tips.sort((a, b) => a.rank - b.rank) // local/HEAD claim ties first
    for (const tip of tips) {
      const stack: [string, number][] = [[tip.hash, 0]]
      while (stack.length) {
        const [h, d] = stack.pop()!
        const prev = bestDepth.get(h)
        if (prev !== undefined && prev <= d) continue
        bestDepth.set(h, d)
        owner.set(h, tip.label)
        for (const p of byHash.get(h)?.parents ?? []) stack.push([p, d + 1])
      }
    }
    return owner
  }, [displayCommits, remoteNames])

  const graphAuto = LEFT_PAD + Math.min(layout.laneCount, 24) * LANE_W + 18
  const totalHeight = displayCommits.length * ROW_H

  // Visible row window [firstRow, lastRow] with overscan. Before the viewport is
  // measured, fall back to a generous height so the first paint isn't blank.
  const OVERSCAN = 6
  const effViewport = viewportH || 1000
  const firstRow = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const lastRow = Math.min(displayCommits.length - 1, Math.ceil((scrollTop + effViewport) / ROW_H) + OVERSCAN)
  const visibleRows: number[] = []
  for (let i = firstRow; i <= lastRow; i++) visibleRows.push(i)
  const filter = graphFilter.trim().toLowerCase()
  const branchCol = columns.branch.visible ? columns.branch.width : 0
  const graphCol = columns.graph.visible ? (columns.graph.width > 0 ? columns.graph.width : graphAuto) : 0

  // Distinct authors present in the loaded commits, for the author filter menu.
  const authorOptions = useMemo<FilterOption[]>(() => {
    const byName = new Map<string, string>() // name -> email (first seen)
    for (const c of displayCommits) {
      if (!c.author || c.hash === WIP_HASH) continue
      if (!byName.has(c.author)) byName.set(c.author, c.email)
    }
    const opts: FilterOption[] = [{ value: '', label: t('graph.allAuthors') }]
    for (const [name, email] of [...byName].sort((a, b) => a[0].localeCompare(b[0]))) {
      opts.push({ value: name, label: name, icon: <Avatar email={email} name={name} size={16} /> })
    }
    return opts
  }, [displayCommits])

  const ciOptions: FilterOption[] = [
    { value: 'all', label: t('graph.ciAll') },
    { value: 'success', label: t('graph.ciSuccess'), icon: <CheckCircle2 size={13} className="ci-badge ci-success" /> },
    { value: 'failure', label: t('graph.ciFailure'), icon: <XCircle size={13} className="ci-badge ci-failure" /> },
    { value: 'pending', label: t('graph.ciPending'), icon: <Clock size={13} className="ci-badge ci-pending" /> },
    { value: 'neutral', label: t('graph.ciNeutral'), icon: <MinusCircle size={13} className="ci-badge ci-neutral" /> }
  ]

  const renderFilter = (id: GraphFlowColumnId): React.ReactNode => {
    if (id === 'deployment')
      return (
        <GraphHeaderFilter
          active={ciFilter}
          options={ciOptions}
          onSelect={(v) => setCiFilter(v as CiState | 'all')}
          title={t('graph.filterByDeployment')}
        />
      )
    if (id === 'author')
      return (
        <GraphHeaderFilter
          active={authorFilter ?? ''}
          options={authorOptions}
          onSelect={(v) => setAuthorFilter(v === '' ? null : v)}
          title={t('graph.filterByAuthor')}
        />
      )
    return null
  }

  // Scroll the graph to a requested commit (e.g. when clicking a branch).
  useEffect(() => {
    if (!scrollToHash) return
    const idx = displayCommits.findIndex((c) => c.hash === scrollToHash || c.hash.startsWith(scrollToHash))
    if (idx >= 0 && scrollRef.current) {
      const el = scrollRef.current
      const target = idx * ROW_H - el.clientHeight / 2 + ROW_H / 2
      el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    }
    requestScrollTo(null)
  }, [scrollToHash, displayCommits, requestScrollTo])

  // Refresh remote tag names when the repo or its remotes change.
  useEffect(() => {
    if (repo.remotes.length) void repoActions.refreshRemoteTags(repo.path)
  }, [repo.path, repo.remotes])

  // Fetch CI statuses for visible commits (GitHub only, requires token).
  // Poll every 15s so a pending badge updates once the CI/deploy finishes —
  // refreshCiStatuses no-ops when there is nothing missing or pending to fetch,
  // so an idle (all-resolved) repo makes no network calls.
  useEffect(() => {
    void repoActions.refreshCiStatuses(repo.path)
    // Poll at 60s (not 15s): each tick can fan out up to ~40 check-run requests,
    // so 15s blew through GitHub's 5000/hr authenticated limit on busy repos.
    const id = setInterval(() => void repoActions.refreshCiStatuses(repo.path), 60000)
    return () => clearInterval(id)
  }, [repo.path, repo.commits.length])

  // Auto-load more commits when scrolling near the bottom.
  const onScroll = (): void => {
    const el = scrollRef.current
    if (!el) return
    setScrollTop(el.scrollTop)
    if (!autoLoadOnScroll) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - ROW_H * 4 && repo.commits.length >= repo.maxCount) {
      loadMore(repo.path)
    }
  }

  // Keyboard navigation: ↑/↓ or k/j move the selection between rows, Enter is a
  // no-op (selecting already opens the detail). Ignored while typing in an input.
  const selectedRow = useMemo(() => {
    const sel = repo.selected
    const hash = !sel ? null : sel.type === 'wip' ? WIP_HASH : sel.type === 'stash' ? sel.sha : sel.hash
    if (!hash) return -1
    return displayCommits.findIndex((c) => c.hash === hash)
  }, [repo.selected, displayCommits])

  const selectRow = (row: number): void => {
    const c = displayCommits[row]
    if (!c) return
    select(
      repo.path,
      c.hash === WIP_HASH
        ? { type: 'wip' }
        : stashBySha.has(c.hash)
          ? { type: 'stash', index: stashBySha.get(c.hash)!.index, sha: c.hash }
          : { type: 'commit', hash: c.hash }
    )
    // Keep the newly-selected row inside the viewport (windowing mounts it).
    const el = scrollRef.current
    if (el) {
      const top = row * ROW_H
      if (top < el.scrollTop) el.scrollTo({ top })
      else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTo({ top: top - el.clientHeight + ROW_H })
    }
  }

  const onGraphKeyDown = (e: React.KeyboardEvent): void => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault()
      selectRow(Math.min((selectedRow < 0 ? -1 : selectedRow) + 1, displayCommits.length - 1))
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault()
      selectRow(Math.max((selectedRow < 0 ? displayCommits.length : selectedRow) - 1, 0))
    }
  }

  const exportPatch = async (c: GraphCommit): Promise<void> => {
    try {
      const patch = await gitApi.formatPatch(repo.path, c.hash, 1)
      const slug =
        c.subject
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 50) || 'patch'
      const name = `${c.hash.slice(0, 7)}-${slug}.patch`
      const saved = await window.api.savePatch(name, patch)
      if (saved) toast('success', interp(t('graph.exportedPatch'), { name }))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  // ── Multi-selection helpers ──
  // Selected hashes, newest-first (display order). A real commit is one that
  // isn't the WIP placeholder or a stash entry.
  const isRealCommit = (hash: string): boolean => hash !== WIP_HASH && !stashBySha.has(hash)
  const orderedSelection = (): string[] => displayCommits.map((c) => c.hash).filter((h) => multi.has(h))

  const rowClick = (e: React.MouseEvent, row: number, c: GraphCommit): void => {
    scrollRef.current?.focus({ preventScroll: true })
    const isWip = c.hash === WIP_HASH
    const stash = stashBySha.get(c.hash)
    // Modifier-clicks only apply to real commits; fall through otherwise.
    if (isRealCommit(c.hash) && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      if (e.shiftKey && anchorRow != null) {
        const [lo, hi] = anchorRow < row ? [anchorRow, row] : [row, anchorRow]
        const range = new Set(multi)
        for (let i = lo; i <= hi; i++) {
          const h = displayCommits[i].hash
          if (isRealCommit(h)) range.add(h)
        }
        setMulti(range)
      } else {
        const next = new Set(multi)
        if (next.has(c.hash)) next.delete(c.hash)
        else next.add(c.hash)
        setMulti(next)
        setAnchorRow(row)
      }
      return
    }
    // Plain click: clear any multi-selection and select normally.
    if (multi.size) setMulti(new Set())
    setAnchorRow(isRealCommit(c.hash) ? row : null)
    select(
      repo.path,
      isWip ? { type: 'wip' } : stash ? { type: 'stash', index: stash.index, sha: stash.sha } : { type: 'commit', hash: c.hash }
    )
  }

  const exportManyPatches = async (hashes: string[]): Promise<void> => {
    try {
      // Oldest-first so the combined patch reads in history order.
      const ordered = [...hashes].reverse()
      const parts = await Promise.all(ordered.map((h) => gitApi.formatPatch(repo.path, h, 1)))
      const saved = await window.api.savePatch(`${ordered.length}-commits.patch`, parts.join('\n'))
      if (saved) toast('success', interp(t('graph.exportedPatches'), { n: ordered.length }))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  const multiMenu = (): MenuItem[] => {
    const sel = orderedSelection() // newest-first
    // Squash only when the selection is a contiguous run reaching the branch tip
    // (HEAD), since it's done by a soft reset to the oldest commit's parent.
    const rows = displayCommits.map((c, i) => (multi.has(c.hash) ? i : -1)).filter((i) => i >= 0)
    const contiguous = rows.length >= 2 && rows[rows.length - 1] - rows[0] === rows.length - 1
    const headHash = repo.commits.find((c) => c.refs.some((r) => r.startsWith('HEAD')))?.hash
    // The oldest commit must have a parent (soft-reset to `oldest^`), so a range
    // reaching the root commit can't be squashed this way.
    const oldestCommit = sel.length ? displayCommits.find((c) => c.hash === sel[sel.length - 1]) : undefined
    const canSquash = contiguous && sel[0] === headHash && (oldestCommit?.parents.length ?? 0) > 0
    const subjectOf = (h: string): string => displayCommits.find((c) => c.hash === h)?.subject ?? ''

    const items: MenuItem[] = [
      {
        label: interp(t('commit.cherryPickMany'), { n: sel.length, branch: repo.branches.current.trim() || 'HEAD' }),
        disabled: !repo.branches.current.trim(),
        onClick: () => void repoActions.cherryPickMany(repo.path, sel)
      },
      { label: interp(t('commit.exportMany'), { n: sel.length }), onClick: () => void exportManyPatches(sel) }
    ]
    if (canSquash) {
      const oldest = sel[sel.length - 1]
      const defaultMsg = [...sel].reverse().map(subjectOf).filter(Boolean).join('; ')
      items.push({
        label: interp(t('commit.squashMany'), { n: sel.length }),
        onClick: () =>
          openModal({
            kind: 'input',
            title: t('commit.squashTitle'),
            label: interp(t('commit.squashLabel'), { n: sel.length }),
            placeholder: t('commit.squashPlaceholder'),
            initial: defaultMsg,
            submitLabel: t('commit.squashSubmit'),
            onSubmit: (msg) => {
              const message = msg.trim() || defaultMsg
              setMulti(new Set())
              void repoActions.squashCommits(repo.path, oldest, message, sel.length)
            }
          })
      })
    }
    items.push(
      { separator: true },
      { label: interp(t('commit.copyShas'), { n: sel.length }), onClick: () => void navigator.clipboard.writeText(sel.join('\n')) },
      { label: t('commit.clearSelection'), onClick: () => setMulti(new Set()) }
    )
    return items
  }

  const commitMenu = (c: GraphCommit): MenuItem[] => {
    const currentBranch = repo.branches.current.trim()
    const mergeItems = mergeableRefs(c.refs).map<MenuItem>((ref) => ({
      label: interp(t('commit.mergeInto'), { ref, branch: currentBranch }),
      disabled: !currentBranch || ref === currentBranch,
      onClick: () => void repoActions.merge(repo.path, ref)
    }))

    return [
      ...mergeItems,
      ...(mergeItems.length ? [{ separator: true } satisfies MenuItem] : []),
      {
      label: t('commit.createBranchHere'),
      onClick: () =>
        openModal({
          kind: 'input',
          title: t('modal.createBranch'),
          label: interp(t('commit.createBranchFrom'), { sha: c.hash.slice(0, 7) }),
          placeholder: t('commit.createBranchPlaceholder'),
          submitLabel: t('commit.createBranchSubmit'),
          onSubmit: (name) => void repoActions.createBranch(repo.path, name, c.hash)
        })
    },
    {
      label: t('commit.createTagHere'),
      onClick: () => openModal({ kind: 'create-tag', repoPath: repo.path, hash: c.hash, at: c.hash.slice(0, 7) })
    },
    { separator: true },
    { label: t('commit.checkoutDetached'), onClick: () => void repoActions.checkout(repo.path, c.hash) },
    { label: t('commit.cherryPick'), onClick: () => void repoActions.cherryPick(repo.path, c.hash) },
    {
      label: t('commit.cherryPickNoCommit'),
      onClick: () => void repoActions.cherryPick(repo.path, c.hash, true)
    },
    { label: t('commit.revert'), onClick: () => void repoActions.revertCommit(repo.path, c.hash) },
    { separator: true },
    {
      label: t('commit.resetSoft'),
      onClick: () => void repoActions.reset(repo.path, c.hash, 'soft')
    },
    {
      label: t('commit.resetMixed'),
      onClick: () => void repoActions.reset(repo.path, c.hash, 'mixed')
    },
    {
      label: t('commit.resetHard'),
      danger: true,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('commit.hardResetTitle'),
          message: interp(t('commit.hardResetMsg'), { sha: c.hash.slice(0, 7) }),
          danger: true,
          confirmLabel: t('commit.hardResetConfirm'),
          onConfirm: () => void repoActions.reset(repo.path, c.hash, 'hard')
        })
    },
    { separator: true },
    {
      label: t('commit.createPr'),
      onClick: () => openModal({ kind: 'create-pr', repoPath: repo.path, source: repo.branches.current ?? undefined })
    },
    { label: t('commit.exportPatch'), onClick: () => void exportPatch(c) },
    { label: t('commit.copySha'), onClick: () => void navigator.clipboard.writeText(c.hash) },
    { label: t('commit.copyMessage'), onClick: () => void navigator.clipboard.writeText(c.subject) },
    { separator: true },
    {
      label: t('commit.interactiveRebase'),
      onClick: () =>
        openModal({
          kind: 'interactive-rebase',
          repoPath: repo.path,
          base: c.hash,
          baseSubject: c.subject
        })
    },
    {
      label: t('commit.fixup'),
      disabled: (repo.status?.staged.length ?? 0) === 0,
      onClick: () => void repoActions.commitFixup(repo.path, c.hash)
    },
    {
      label: t('commit.autosquash'),
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('commit.autosquashTitle'),
          message: interp(t('commit.autosquashMsg'), { sha: c.hash.slice(0, 7) }),
          confirmLabel: t('commit.autosquashConfirm'),
          onConfirm: () => void repoActions.autosquash(repo.path, c.hash)
        })
    }
    ]
  }

  const stashMenu = (s: StashInfo): MenuItem[] => [
    { label: t('stash.applyKeep'), onClick: () => void repoActions.stashApply(repo.path, s.index) },
    { label: t('stash.pop'), onClick: () => void repoActions.stashPop(repo.path, s.index) },
    {
      label: t('stash.branchFrom'),
      onClick: () =>
        openModal({
          kind: 'input',
          title: t('stash.branchTitle'),
          label: t('stash.branchLabel'),
          placeholder: t('stash.branchPlaceholder'),
          submitLabel: t('stash.branchSubmit'),
          onSubmit: (name) => {
            if (name.trim()) void repoActions.stashToBranch(repo.path, name.trim(), s.index)
          }
        })
    },
    { separator: true },
    { label: t('stash.copyMsg'), onClick: () => void navigator.clipboard.writeText(s.message) },
    {
      label: t('stash.drop'),
      danger: true,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('stash.dropTitle'),
          message: interp(t('stash.dropMsg'), { message: s.message }),
          danger: true,
          confirmLabel: t('stash.dropConfirm'),
          onConfirm: () => void repoActions.stashDrop(repo.path, s.index)
        })
    },
    { separator: true },
    { label: t('stash.copySha'), onClick: () => void navigator.clipboard.writeText(s.sha) }
  ]

  const tagRemoteUrl = (remoteUrl: string, tagName: string): string | null => {
    const gh = /github\.com[/:]([^/]+)\/([^/]+?)(\.git)?$/.exec(remoteUrl)
    if (gh) return `https://github.com/${gh[1]}/${gh[2]}/releases/tag/${tagName}`
    const az = /dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+?)(\.git)?$/.exec(remoteUrl)
    if (az) return `https://dev.azure.com/${az[1]}/${az[2]}/_git/${az[3]}?version=GT${tagName}`
    return null
  }

  // Context menu for a branch/tag group shown next to a commit in the graph.
  const groupMenu = (g: RefGroup, c: GraphCommit): MenuItem[] => {
    if (g.isTag) {
      const remoteName = repo.remotes[0]?.name ?? 'origin'
      const currentBranch = repo.branches.current.trim()
      const isPushed = repo.remoteTagNames.includes(g.label)
      const remUrl = repo.remotes.find((r) => r.name === remoteName)?.url
      const webUrl = remUrl ? tagRemoteUrl(remUrl, g.label) : null
      return [
        { label: interp(t('tag.checkout'), { tag: g.label }), onClick: () => void repoActions.checkout(repo.path, g.label) },
        { label: t('commit.checkoutDetached'), onClick: () => void repoActions.checkout(repo.path, c.hash) },
        {
          label: t('tag.worktree'),
          onClick: () =>
            openModal({
              kind: 'input',
              title: t('tag.worktreeTitle'),
              label: interp(t('tag.worktreeLabel'), { tag: g.label }),
              placeholder: `../${g.label}-worktree`,
              submitLabel: t('tag.worktreeSubmit'),
              onSubmit: (dir) => {
                if (dir.trim()) void repoActions.worktreeAdd(repo.path, dir.trim(), g.label, false)
              }
            })
        },
        { separator: true },
        {
          label: interp(t('tag.rebaseOnto'), { branch: currentBranch, tag: g.label }),
          disabled: !currentBranch,
          onClick: () => void repoActions.rebase(repo.path, g.label)
        },
        {
          label: t('tag.createBranchHere'),
          onClick: () =>
            openModal({
              kind: 'input',
              title: t('modal.createBranch'),
              label: interp(t('commit.createBranchFrom'), { sha: g.label }),
              placeholder: t('commit.createBranchPlaceholder'),
              submitLabel: t('commit.createBranchSubmit'),
              onSubmit: (name) => void repoActions.createBranch(repo.path, name, c.hash)
            })
        },
        { separator: true },
        {
          label: interp(t('tag.resetSoft'), { branch: currentBranch, tag: g.label }),
          disabled: !currentBranch,
          onClick: () => void repoActions.reset(repo.path, g.label, 'soft')
        },
        {
          label: interp(t('tag.resetMixed'), { branch: currentBranch, tag: g.label }),
          disabled: !currentBranch,
          onClick: () => void repoActions.reset(repo.path, g.label, 'mixed')
        },
        {
          label: interp(t('tag.resetHard'), { branch: currentBranch, tag: g.label }),
          danger: true,
          disabled: !currentBranch,
          onClick: () =>
            openModal({
              kind: 'confirm',
              title: t('commit.hardResetTitle'),
              message: interp(t('commit.hardResetMsg'), { sha: g.label }),
              danger: true,
              confirmLabel: t('commit.hardResetConfirm'),
              onConfirm: () => void repoActions.reset(repo.path, g.label, 'hard')
            })
        },
        { separator: true },
        { label: t('tag.copyName'), onClick: () => void navigator.clipboard.writeText(g.label) },
        { label: t('commit.copySha'), onClick: () => void navigator.clipboard.writeText(c.hash) },
        ...(webUrl
          ? [{ label: interp(t('tag.copyLink'), { tag: g.label, remote: remoteName }), onClick: () => void navigator.clipboard.writeText(webUrl) } satisfies MenuItem]
          : []),
        { separator: true },
        ...(repo.remotes.length && !isPushed
          ? [{ label: interp(t('tag.push'), { tag: g.label, remote: remoteName }), onClick: () => void repoActions.pushTag(repo.path, g.label, remoteName) } satisfies MenuItem]
          : []),
        ...(repo.remotes.length && isPushed
          ? [{
              label: interp(t('tag.deleteFromRemote'), { tag: g.label, remote: remoteName }),
              danger: true,
              onClick: () =>
                openModal({
                  kind: 'confirm',
                  title: t('tag.deleteRemoteTitle'),
                  message: interp(t('tag.deleteRemoteMsg'), { tag: g.label, remote: remoteName }),
                  danger: true,
                  confirmLabel: t('tag.deleteConfirm'),
                  onConfirm: () => void repoActions.deleteRemoteTag(repo.path, g.label, remoteName)
                })
            } satisfies MenuItem]
          : []),
        {
          label: interp(t('tag.deleteLocalLabel'), { tag: g.label }),
          danger: true,
          onClick: () =>
            openModal({
              kind: 'confirm',
              title: t('tag.deleteLocalTitle'),
              message: interp(t('tag.deleteLocalMsg'), { tag: g.label }),
              danger: true,
              confirmLabel: t('tag.deleteConfirm'),
              onConfirm: () => void repoActions.deleteTag(repo.path, g.label)
            })
        }
      ]
    }

    const isCurrent = repo.branches.current.trim() === g.label
    const currentBranch = repo.branches.current.trim()
    // The ref to operate on: local branch by name, else its tracking remote ref.
    const ref = g.isLocal ? g.label : g.remotes.length ? `${g.remotes[0]}/${g.label}` : g.label
    const items: MenuItem[] = []
    if (g.isLocal) {
      items.push({ label: interp(t('tag.checkout'), { tag: g.label }), disabled: isCurrent, onClick: () => void repoActions.checkout(repo.path, g.label) })
    } else if (g.remotes.length) {
      const full = `${g.remotes[0]}/${g.label}`
      items.push({ label: interp(t('branch.checkoutAsLocal'), { branch: g.label }), onClick: () => void repoActions.checkoutRemote(repo.path, full, g.label, g.remotes[0]) })
    }
    items.push({ label: t('commit.checkoutDetached'), onClick: () => void repoActions.checkout(repo.path, c.hash) })
    items.push({ separator: true })
    items.push({
      label: interp(t('branch.mergeInto'), { ref, branch: currentBranch }),
      disabled: isCurrent || !currentBranch,
      onClick: () => void repoActions.merge(repo.path, ref)
    })
    items.push({
      label: interp(t('branch.rebaseOnto'), { current: currentBranch, ref }),
      disabled: isCurrent || !currentBranch,
      onClick: () => void repoActions.rebase(repo.path, ref)
    })
    items.push({
      label: interp(t('branch.compareWith'), { branch: currentBranch }),
      disabled: isCurrent || !currentBranch,
      onClick: () => openModal({ kind: 'branch-compare', repoPath: repo.path, branchA: ref, branchB: currentBranch || 'HEAD' })
    })
    items.push({ separator: true })
    items.push({
      label: t('commit.createBranchHere'),
      onClick: () =>
        openModal({
          kind: 'input',
          title: t('modal.createBranch'),
          label: interp(t('commit.createBranchFrom'), { sha: g.label }),
          placeholder: t('commit.createBranchPlaceholder'),
          submitLabel: t('commit.createBranchSubmit'),
          onSubmit: (name) => void repoActions.createBranch(repo.path, name, c.hash)
        })
    })
    items.push({
      label: t('commit.createTagHere'),
      onClick: () => openModal({ kind: 'create-tag', repoPath: repo.path, hash: c.hash, at: c.hash.slice(0, 7) })
    })
    if (g.isLocal) {
      items.push({
        label: t('commit.createPr'),
        onClick: () => openModal({ kind: 'create-pr', repoPath: repo.path, source: g.label })
      })
    }
    items.push({ separator: true })
    items.push({
      label: interp(t('tag.resetSoft'), { branch: currentBranch, tag: ref }),
      disabled: !currentBranch,
      onClick: () => void repoActions.reset(repo.path, ref, 'soft')
    })
    items.push({
      label: interp(t('tag.resetMixed'), { branch: currentBranch, tag: ref }),
      disabled: !currentBranch,
      onClick: () => void repoActions.reset(repo.path, ref, 'mixed')
    })
    items.push({
      label: interp(t('tag.resetHard'), { branch: currentBranch, tag: ref }),
      danger: true,
      disabled: !currentBranch,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('commit.hardResetTitle'),
          message: interp(t('commit.hardResetMsg'), { sha: ref }),
          danger: true,
          confirmLabel: t('commit.hardResetConfirm'),
          onConfirm: () => void repoActions.reset(repo.path, ref, 'hard')
        })
    })
    items.push({ separator: true })
    items.push({ label: t('branch.copyBranchName'), onClick: () => void navigator.clipboard.writeText(g.label) })
    items.push({ label: t('branch.copySha'), onClick: () => void navigator.clipboard.writeText(c.hash) })
    if (g.isLocal && isCurrent) items.push({ label: t('branch.push'), onClick: () => void repoActions.push(repo.path) })

    const deletions: MenuItem[] = []
    if (g.isLocal) {
      deletions.push({
        label: t('branch.deleteLocal'),
        danger: true,
        disabled: isCurrent,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('branch.deleteLocalTitle'),
            message: interp(t('branch.deleteLocalMsg'), { name: g.label }),
            danger: true,
            confirmLabel: t('branch.deleteConfirm'),
            onConfirm: () => void repoActions.deleteBranch(repo.path, g.label, c.hash)
          })
      })
    }
    for (const remote of g.remotes) {
      deletions.push({
        label: interp(t('branch.deleteFromRemote'), { branch: g.label, remote }),
        danger: true,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('branch.deleteRemoteTitle'),
            message: interp(t('branch.deleteRemoteMsg'), { remote, branch: g.label }),
            danger: true,
            confirmLabel: t('branch.deleteConfirm'),
            onConfirm: () => void repoActions.deleteRemoteBranch(repo.path, remote, g.label)
          })
      })
    }
    if (deletions.length) items.push({ separator: true }, ...deletions)
    return items
  }

  // Presence glyphs for a ref group: tag, laptop (has local) and/or a provider
  // icon per remote that tracks the branch.
  const groupIcons = (g: RefGroup): React.JSX.Element => {
    if (g.isTag) {
      const isPushed = repo.remoteTagNames.includes(g.label)
      return (
        <>
          <Tag size={10} className="ref-ic" />
          {isPushed && <Cloud size={10} className="ref-ic" />}
        </>
      )
    }
    return (
      <>
        {g.isLocal && <Laptop size={10} className="ref-ic" />}
        {g.remotes.map((remote) => {
          const url = repo.remotes.find((r) => r.name === remote)?.url
          return (
            <span key={remote} className="ref-ic">
              <RemoteIcon url={url} size={10} />
            </span>
          )
        })}
      </>
    )
  }

  // Double-clicking a branch/tag badge checks it out — the same action as the
  // context menu's "Checkout". No-op on the current branch.
  const checkoutGroup = (g: RefGroup): void => {
    if (g.isTag) {
      void repoActions.checkout(repo.path, g.label)
    } else if (g.isLocal) {
      if (repo.branches.current.trim() === g.label) return
      void repoActions.checkout(repo.path, g.label)
    } else if (g.remotes.length) {
      void repoActions.checkoutRemote(repo.path, `${g.remotes[0]}/${g.label}`, g.label, g.remotes[0])
    }
  }

  const renderGroup = (g: RefGroup, c: GraphCommit, laneColor?: string): React.JSX.Element => {
    const title = g.isTag
      ? `${g.label}${repo.remoteTagNames.includes(g.label) ? ' · pushed' : ' · local only'}`
      : `${g.label}${g.isLocal ? ' · local' : ''}${g.remotes.length ? ` · ${g.remotes.join(', ')}` : ''}`
    // Active branch (HEAD) gets a solid lane-colored pill so it stands out as
    // the checked-out branch; others keep the soft lane tint.
    const solidStyle = laneColor
      ? { borderColor: laneColor, background: laneColor, color: contrastText(laneColor) }
      : undefined
    const laneStyle: React.CSSProperties | undefined = solidStyle
      ? g.isTag ? { ...solidStyle, opacity: 0.72 } : solidStyle
      : undefined
    return (
      <span
        key={g.key}
        className={`ref-badge ref-${g.kind}`}
        style={laneStyle}
        title={title}
        onMouseEnter={() => setPreviewHash(c.hash)}
        onMouseLeave={() => setPreviewHash((h) => (h === c.hash ? null : h))}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation()
          checkoutGroup(g)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          openContextMenu(e.clientX, e.clientY, groupMenu(g, c))
        }}
      >
        {g.isHead && <Check size={10} className="ref-check" />}
        {groupIcons(g)}
        <span className="ref-text">{g.label}</span>
      </span>
    )
  }

  if (repo.loading) {
    return (
      <div className="graph-empty">
        <div className="spinner" />
        <span>{t('graph.loading')}</span>
      </div>
    )
  }

  if (displayCommits.length === 0) {
    return (
      <div className="graph-empty">
        <GitCommitHorizontal size={42} strokeWidth={1.2} />
        <span>{t('graph.noCommits')}</span>
      </div>
    )
  }

  return (
    <div className="graph-wrap">
      {pathFilter && (
        <div className="path-filter-bar">
          <span>
            {t('graph.pathFilterShowing')} <code>{pathFilter}</code>
            {pathHashes ? ` (${pathHashes.size})` : '…'}
          </span>
          <button className="btn ghost tiny" onClick={() => setPathFilter(null)}>
            {t('graph.pathFilterClear')}
          </button>
        </div>
      )}
      <GraphColumnsHeader
        columns={columns}
        order={columnOrder}
        branchCol={branchCol}
        graphCol={graphCol}
        onResize={(id, width) => setColumn(id, { width })}
        onMenu={openColumnsMenu}
        onReorder={reorderColumns}
        renderFilter={renderFilter}
      />
      <div className="graph-scroll" ref={scrollRef} onScroll={onScroll} tabIndex={0} onKeyDown={onGraphKeyDown}>
      <div className="graph-canvas" style={{ height: totalHeight }}>
        {columns.graph.visible && (
        <>
        {(() => {
          const clampX = (x: number) => Math.min(x, graphCol - NODE_R - 1)
          return (
            <svg className="graph-svg" width={graphCol} height={totalHeight} style={{ left: branchCol }}>
              {[...layout.edges]
                .filter((e) => Math.max(e.fromRow, e.toRow) >= firstRow && Math.min(e.fromRow, e.toRow) <= lastRow)
                .sort((a, b) => Math.max(a.fromLane, a.toLane) - Math.max(b.fromLane, b.toLane)).map((e, i) => {
                const x1 = clampX(LEFT_PAD + e.fromLane * LANE_W)
                const y1 = e.fromRow * ROW_H + ROW_H / 2
                const x2 = clampX(LEFT_PAD + e.toLane * LANE_W)
                const y2 = e.toRow * ROW_H + ROW_H / 2
                const ghost = preview != null && !preview.rows.has(e.fromRow)
                // Edges leaving a WIP / stash node are dashed (uncommitted work).
                const fromHash = displayCommits[e.fromRow]?.hash
                const dashed = fromHash != null && (fromHash === WIP_HASH || stashBySha.has(fromHash))
                return (
                  <path
                    key={i}
                    className="graph-edge"
                    d={edgePath(x1, y1, x2, y2, edgeStyle)}
                    stroke={colorFor(e.color)}
                    strokeWidth={lineW}
                    strokeLinecap="round"
                    strokeDasharray={dashed ? '3 3' : undefined}
                    fill="none"
                    opacity={ghost ? 0.1 : 0.85}
                  />
                )
              })}
              {visibleRows.map((row) => {
                const c = displayCommits[row]
                const n = layout.nodes.get(c.hash)
                if (!n) return null
                const cx = clampX(LEFT_PAD + n.lane * LANE_W)
                const cy = n.row * ROW_H + ROW_H / 2
                const isWip = c.hash === WIP_HASH
                const isStash = stashBySha.has(c.hash)
                if (isStash) {
                  const sc = colorFor(n.color)
                  // Compact: a dashed, hatched box. Normal: a stacked-cards glyph.
                  if (compact) {
                    const size = 13
                    const bx = cx - size / 2
                    const by = cy - size / 2
                    const clipId = `stash-hatch-${c.hash}`
                    return (
                      <g key={c.hash} className="graph-node stash-node">
                        <defs>
                          <clipPath id={clipId}>
                            <rect x={bx} y={by} width={size} height={size} rx={2.5} />
                          </clipPath>
                        </defs>
                        <rect x={bx} y={by} width={size} height={size} rx={2.5} fill="var(--bg-1)" />
                        <g clipPath={`url(#${clipId})`}>
                          {[-size, -size / 2, 0, size / 2, size].map((off, k) => (
                            <line key={k} x1={bx + off} y1={by + size} x2={bx + off + size} y2={by} stroke={sc} strokeWidth={1.5} opacity={0.7} />
                          ))}
                        </g>
                        <rect x={bx} y={by} width={size} height={size} rx={2.5} fill="none" stroke={sc} strokeWidth={lineW} strokeDasharray="2.5 2" />
                      </g>
                    )
                  }
                  // Layered "stack of cards" glyph — reads as saved/stashed work
                  // with a bit of depth. Both cards fill with bg so the connector
                  // line behind never peeks through.
                  return (
                    <g key={c.hash} className="graph-node stash-node">
                      {/* back card, offset up-right and faded for depth */}
                      <rect
                        x={cx - 3.75}
                        y={cy - 7.25}
                        width={11}
                        height={11}
                        rx={3}
                        fill="var(--bg-1)"
                        stroke={sc}
                        strokeWidth={1.5}
                        opacity={0.55}
                      />
                      {/* front card */}
                      <rect
                        x={cx - 7.25}
                        y={cy - 3.75}
                        width={11}
                        height={11}
                        rx={3}
                        fill="var(--bg-1)"
                        stroke={sc}
                        strokeWidth={lineW}
                      />
                      {/* tiny dot = the stashed change sitting on the card */}
                      <circle cx={cx - 1.75} cy={cy + 1.75} r={1.4} fill={sc} />
                    </g>
                  )
                }
                if (isWip) {
                  // Bigger hollow ring. Opaque bg fill hides the connector line
                  // that would otherwise show through the centre.
                  return (
                    <circle
                      key={c.hash}
                      cx={cx}
                      cy={cy}
                      r={NODE_R + 3}
                      fill="var(--bg-1)"
                      stroke={colorFor(n.color)}
                      strokeWidth={lineW}
                      strokeDasharray="2.5 2.5"
                      className="graph-node"
                    />
                  )
                }
                if (c.parents.length >= 2) {
                  return (
                    <circle
                      key={c.hash}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={colorFor(n.color)}
                      stroke="var(--bg-1)"
                      strokeWidth={1.5}
                      className="graph-node"
                    />
                  )
                }
                // Compact: commits are dots too, a touch larger than merge dots.
                if (compact) {
                  return (
                    <circle
                      key={c.hash}
                      cx={cx}
                      cy={cy}
                      r={6.5}
                      fill={colorFor(n.color)}
                      stroke="var(--bg-1)"
                      strokeWidth={1.5}
                      className="graph-node"
                    />
                  )
                }
                // Normal commits drawn as avatar nodes in the HTML overlay below.
                return null
              })}
            </svg>
          )
        })()}

        {/* Avatar nodes overlay — the gravatar/generated avatar sits on the
            commit "ball", with a connector line from any branch labels. The
            overlay is clipped to the branch+graph region so avatars never spill
            over the commit messages when columns are resized too narrow.
            Skipped entirely in compact mode, where commits are SVG dots. */}
        {!compact && (
        <div className="graph-nodes" style={{ width: branchCol + graphCol }}>
          {visibleRows.map((row) => {
            const c = displayCommits[row]
            const n = layout.nodes.get(c.hash)
            if (!n) return null
            if (c.hash === WIP_HASH || stashBySha.has(c.hash)) return null
            // Merge commits render as a small SVG dot (above), not an avatar —
            // but they still get a connector line from their branch label.
            const isMerge = c.parents.length >= 2
            const ballR = isMerge ? 6 : AVA / 2
            const x = branchCol + Math.min(LEFT_PAD + n.lane * LANE_W, graphCol - ballR - 1)
            const y = n.row * ROW_H + ROW_H / 2
            const color = colorFor(n.color)
            const ghost = preview != null && !preview.hashes.has(c.hash)
            return (
              <div key={c.hash} className={ghost ? 'node-ghost' : undefined}>
                {!isMerge && (
                  <div
                    className="node-ava"
                    style={{ left: x, top: y, boxShadow: `0 0 0 2px ${color}` }}
                    title={[c.author, ...(c.coAuthors?.map((a) => `+ ${a.name}`) ?? [])].join('\n')}
                  >
                    <Avatar email={c.email} name={c.author} size={AVA} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )}
        </>
        )}

        {visibleRows.map((row) => {
          const c = displayCommits[row]
          const isWip = c.hash === WIP_HASH
          const stash = stashBySha.get(c.hash)
          const selected =
            (isWip && repo.selected?.type === 'wip') ||
            (stash != null && repo.selected?.type === 'stash' && repo.selected.sha === c.hash) ||
            (repo.selected?.type === 'commit' && repo.selected.hash === c.hash)
          const groups = buildRefGroups(c.refs, remoteNames)
          const matches =
            filter.length > 0 &&
            (c.subject.toLowerCase().includes(filter) ||
              c.author.toLowerCase().includes(filter) ||
              c.hash.startsWith(filter))
          const ci = isWip || stash ? undefined : repo.ciStatuses[c.hash]
          const ciDimmed = ciFilter !== 'all' && !isWip && ci?.state !== ciFilter
          const authorDimmed = authorFilter != null && !isWip && !stash && c.author !== authorFilter
          const pathDimmed = pathHashes != null && !isWip && !stash && !pathHashes.has(c.hash)
          const dimmed = ((filter.length > 0 && !matches) || ciDimmed || authorDimmed || pathDimmed) && !isWip
          const ghosted = preview != null && !preview.hashes.has(c.hash)

          return (
            <div
              key={c.hash}
              className={`graph-row ${selected ? 'selected' : ''} ${multi.has(c.hash) ? 'multi-selected' : ''} ${newSet.has(c.hash) ? 'row-new' : ''} ${dimmed ? 'dimmed' : ''} ${matches ? 'matched' : ''} ${ghosted ? 'ghosted' : ''}`}
              style={{ top: row * ROW_H, height: ROW_H, paddingLeft: branchCol + graphCol }}
              onMouseEnter={() => setHoverRow(c.hash)}
              onMouseLeave={() => setHoverRow((h) => (h === c.hash ? null : h))}
              onClick={(e) => rowClick(e, row, c)}
              onContextMenu={(e) => {
                e.preventDefault()
                // A right-click on one of several selected rows acts on the batch.
                if (multi.size > 1 && multi.has(c.hash)) openContextMenu(e.clientX, e.clientY, multiMenu())
                else if (stash) openContextMenu(e.clientX, e.clientY, stashMenu(stash))
                else if (!isWip) openContextMenu(e.clientX, e.clientY, commitMenu(c))
              }}
            >
              {columns.graph.visible && (() => {
                const n = layout.nodes.get(c.hash)
                if (!n) return null
                const col = colorFor(n.color)
                // Start the lead-in at this node's own x (its lane), so the
                // gradient visually "comes out" of each commit / stash.
                const nodeX = branchCol + Math.min(LEFT_PAD + n.lane * LANE_W, graphCol - NODE_R - 1)
                const barX = branchCol + graphCol + 3
                return (
                  <>
                    {/* Soft lead-in: transparent at the node → lane colour @0.25
                        at the solid bar. */}
                    <div
                      style={{
                        position: 'absolute',
                        left: nodeX,
                        width: Math.max(0, barX - nodeX),
                        top: 4,
                        bottom: 4,
                        background: `linear-gradient(90deg, transparent, ${col}40)`,
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: barX,
                        top: 4,
                        bottom: 4,
                        width: 2,
                        borderRadius: 1,
                        background: col,
                        pointerEvents: 'none',
                      }}
                    />
                  </>
                )
              })()}
              {branchCol > 0 && groups.length > 0 && (() => {
                const node = layout.nodes.get(c.hash)
                const laneColor = colorFor(node?.color ?? 0)
                const isMerge = c.parents.length >= 2
                const ballR = isMerge ? 6 : AVA / 2
                const ballX = node
                  ? branchCol + Math.min(LEFT_PAD + node.lane * LANE_W, graphCol - ballR - 1)
                  : branchCol
                const refsWidth = graphCol > 0 ? Math.max(branchCol, ballX - ballR) : branchCol
                return (
                  <div
                    className="graph-refs"
                    style={{ width: refsWidth, '--branch-cap': `${Math.max(40, branchCol - 16)}px` } as React.CSSProperties}
                  >
                    {groups.length <= 1 ? (
                      groups.map((g) => renderGroup(g, c, laneColor))
                    ) : (
                      <span className="ref-collapsed" style={{ '--lane': laneColor } as React.CSSProperties}>
                        {renderGroup(groups[0], c, laneColor)}
                        <span
                          className="ref-more-chip"
                          style={laneColor ? { background: laneColor, borderColor: laneColor, color: contrastText(laneColor) } : undefined}
                        >+{groups.length - 1}</span>
                        <div className="graph-refs-pop">
                          {groups.slice(1).map((g) => renderGroup(g, c, laneColor))}
                        </div>
                      </span>
                    )}
                    {graphCol > 0 && node && (
                      <div className="node-connector" style={{ background: laneColor }} />
                    )}
                  </div>
                )
              })()}
              {/* Hover hint: a commit with no ref of its own shows the branch
                  that contains it (ghosted) while hovered — purely informational. */}
              {branchCol > 0 && groups.length === 0 && !isWip && !stash && hoverRow === c.hash && branchOf.get(c.hash) && (
                <div className="graph-refs" style={{ width: branchCol }}>
                  {(() => {
                    const laneColor = colorFor(layout.nodes.get(c.hash)?.color ?? 0)
                    return (
                      <span
                        className="ref-badge ref-local preview-hint"
                        style={{ borderColor: laneColor + '90', background: laneColor + '20' }}
                      >
                        <Laptop size={10} className="ref-ic" />
                        <span className="ref-text">{branchOf.get(c.hash)}</span>
                      </span>
                    )
                  })()}
                </div>
              )}
              {columnOrder
                .filter((id) => columns[id].visible)
                .map((id) => {
                  if (id === 'message')
                    return isWip ? (
                      <span key="message" className="row-subject wip-subject">
                        <input
                          className="wip-input"
                          placeholder="Work in progress"
                          value={draft}
                          maxLength={100}
                          onChange={(e) => setDraft(repo.path, e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <span className="wip-stats">
                          {wipStats.added > 0 && (
                            <span className="wip-stat wip-add" title={`${wipStats.added} added`}>
                              <Plus size={11} />
                              {wipStats.added}
                            </span>
                          )}
                          {wipStats.modified > 0 && (
                            <span className="wip-stat wip-mod" title={`${wipStats.modified} modified`}>
                              <Pencil size={10} />
                              {wipStats.modified}
                            </span>
                          )}
                          {wipStats.deleted > 0 && (
                            <span className="wip-stat wip-del" title={`${wipStats.deleted} deleted`}>
                              <Minus size={11} />
                              {wipStats.deleted}
                            </span>
                          )}
                        </span>
                      </span>
                    ) : stash ? (
                      <span key="message" className="row-subject stash-subject" title={stash.message}>
                        <span className="ref-badge ref-stash">
                          <Archive size={10} />
                          <span className="stash-msg">{stash.message}</span>
                        </span>
                      </span>
                    ) : (
                      <span key="message" className="row-subject" title={c.subject}>
                        {newSet.has(c.hash) && <span className="row-new-badge">new</span>}
                        {c.subject}
                      </span>
                    )
                  if (id === 'deployment')
                    return (
                      <span
                        key="deployment"
                        className="row-deploy"
                        style={{ flex: `0 0 ${columns.deployment.width}px`, width: columns.deployment.width }}
                      >
                        {ci && (
                          <CiBadge
                            status={ci}
                            onClick={() => {
                              const first = ci.jobs.find((j) => j.url)
                              if (first?.url) void window.api.openExternal(first.url)
                            }}
                          />
                        )}
                      </span>
                    )
                  if (id === 'author')
                    return (
                      <span
                        key="author"
                        className="row-author"
                        style={{ flex: `0 0 ${columns.author.width}px`, maxWidth: columns.author.width }}
                      >
                        {isWip || stash ? '' : c.author}
                      </span>
                    )
                  if (id === 'date')
                    return (
                      <span
                        key="date"
                        className="row-date"
                        style={{ flex: `0 0 ${columns.date.width}px`, width: columns.date.width }}
                      >
                        {isWip ? '' : stash ? fmtDate(stash.date) : fmtDate(c.date)}
                      </span>
                    )
                  if (id === 'signature')
                    return (
                      <span
                        key="signature"
                        className="row-signature"
                        style={{ flex: `0 0 ${columns.signature.width}px`, width: columns.signature.width }}
                      >
                        {!isWip && !stash && <SignatureBadge signature={c.signature} signer={c.signer} />}
                      </span>
                    )
                  return (
                    <span
                      key="sha"
                      className="row-sha"
                      style={{ flex: `0 0 ${columns.sha.width}px`, width: columns.sha.width }}
                    >
                      {isWip ? '' : stash ? stash.sha.slice(0, 7) : c.hash.slice(0, 7)}
                    </span>
                  )
                })}
            </div>
          )
        })}
      </div>

      {repo.commits.length >= repo.maxCount && (
        <button className="load-more" onClick={() => loadMore(repo.path)}>
          {t('graph.loadMore')}
        </button>
      )}
      </div>
    </div>
  )
}
