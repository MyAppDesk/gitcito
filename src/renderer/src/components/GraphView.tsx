import { useEffect, useMemo, useRef } from 'react'
import { Archive, GitCommitHorizontal, Tag, Laptop, Github, Gitlab, Cloud, Server, Check, Settings2 } from 'lucide-react'
import type { GraphCommit, StashInfo, GraphColumnId, GraphColumns } from '../../../shared/types'
import { defaultGraphColumns } from '../../../shared/types'
import { layoutGraph, colorFor } from '../graph/layout'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useT } from '../i18n'
import { Avatar } from './Avatar'

const ROW_H = 28
const LANE_W = 18
const LEFT_PAD = 16
const NODE_R = 4.5
const AVA = 20 // avatar node diameter

const COL_MIN: Record<GraphColumnId, number> = { branch: 90, graph: 40, message: 120, author: 80, date: 56, sha: 56 }
const COL_LABEL: Record<GraphColumnId, string> = {
  branch: 'BRANCH / TAG',
  graph: 'GRAPH',
  message: 'COMMIT MESSAGE',
  author: 'AUTHOR',
  date: 'DATE',
  sha: 'SHA'
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

/** Pick a small provider icon for a remote URL's host. */
function providerIcon(url: string | undefined, size: number): React.JSX.Element {
  const u = (url ?? '').toLowerCase()
  if (u.includes('github.com')) return <Github size={size} />
  if (u.includes('gitlab')) return <Gitlab size={size} />
  if (u.includes('bitbucket')) return <Cloud size={size} />
  if (u.includes('dev.azure.com') || u.includes('visualstudio.com') || u.includes('azure')) return <Server size={size} />
  return <Cloud size={size} />
}

function timeAgo(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`
  return new Date(unixSeconds * 1000).toLocaleDateString()
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`
  const bendY = Math.min(y1 + ROW_H, y2)
  return `M ${x1} ${y1} C ${x1} ${y1 + ROW_H * 0.7}, ${x2} ${y1 + ROW_H * 0.3}, ${x2} ${bendY} L ${x2} ${y2}`
}

/** Resizable / toggleable column header. */
function GraphColumnsHeader({
  columns,
  branchCol,
  graphCol,
  onResize,
  onMenu
}: {
  columns: GraphColumns
  branchCol: number
  graphCol: number
  onResize: (id: GraphColumnId, width: number) => void
  onMenu: (x: number, y: number) => void
}): React.JSX.Element {
  // `side` = which edge of the column the handle sits on. A left-edge handle
  // resizes the column inward as you drag right (its left border moves), so the
  // divider *left of* a column resizes that column — what users expect.
  const startResize = (id: GraphColumnId, side: 'left' | 'right', e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
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
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const handle = (id: GraphColumnId, side: 'left' | 'right'): React.JSX.Element => (
    <span className={`col-resize col-resize-${side}`} onMouseDown={(e) => startResize(id, side, e)} />
  )

  return (
    <div className="graph-header">
      {columns.branch.visible && (
        <div className="ghc" style={{ width: branchCol }}>
          <span className="ghc-label">{COL_LABEL.branch}</span>
          {handle('branch', 'right')}
        </div>
      )}
      {columns.graph.visible && (
        <div className="ghc ghc-graph" style={{ width: graphCol }}>
          <span className="ghc-label">{COL_LABEL.graph}</span>
          {handle('graph', 'right')}
        </div>
      )}
      {columns.message.visible && (
        <div className="ghc ghc-flex">
          <span className="ghc-label">{COL_LABEL.message}</span>
        </div>
      )}
      {columns.author.visible && (
        <div className="ghc" style={{ width: columns.author.width }}>
          {handle('author', 'left')}
          <span className="ghc-label">{COL_LABEL.author}</span>
        </div>
      )}
      {columns.date.visible && (
        <div className="ghc" style={{ width: columns.date.width }}>
          {handle('date', 'left')}
          <span className="ghc-label">{COL_LABEL.date}</span>
        </div>
      )}
      {columns.sha.visible && (
        <div className="ghc" style={{ width: columns.sha.width }}>
          {handle('sha', 'left')}
          <span className="ghc-label">{COL_LABEL.sha}</span>
        </div>
      )}
      <button
        className="ghc-gear"
        title="Columns"
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
  const { openContextMenu, openModal, graphFilter } = useUIStore()
  const scrollToHash = useUIStore((s) => s.scrollToHash)
  const requestScrollTo = useUIStore((s) => s.requestScrollTo)
  const relativeDates = useSettingsStore((s) => s.settings.relativeDates ?? true)
  const autoLoadOnScroll = useSettingsStore((s) => s.settings.autoLoadOnScroll ?? true)
  const columns = useSettingsStore((s) => s.settings.graphColumns ?? defaultGraphColumns())
  const updateSettings = useSettingsStore((s) => s.update)
  const t = useT()

  const setColumn = (id: GraphColumnId, patch: Partial<{ width: number; visible: boolean }>): void =>
    updateSettings((s) => {
      const cols = s.graphColumns ?? defaultGraphColumns()
      return { ...s, graphColumns: { ...cols, [id]: { ...cols[id], ...patch } } }
    })

  const openColumnsMenu = (x: number, y: number): void => {
    const ids: GraphColumnId[] = ['branch', 'graph', 'message', 'author', 'date', 'sha']
    const items: MenuItem[] = ids.map((id) => ({
      label: `${columns[id].visible ? '✓ ' : '   '}${COL_LABEL[id]}`,
      onClick: () => setColumn(id, { visible: !columns[id].visible })
    }))
    items.push({ separator: true }, {
      label: 'Reset columns',
      onClick: () => updateSettings((s) => ({ ...s, graphColumns: defaultGraphColumns() }))
    })
    openContextMenu(x, y, items)
  }
  const scrollRef = useRef<HTMLDivElement>(null)

  const fmtDate = (unix: number): string =>
    relativeDates ? timeAgo(unix) : new Date(unix * 1000).toLocaleDateString()

  const hasWip =
    (repo.status?.staged.length ?? 0) + (repo.status?.unstaged.length ?? 0) + (repo.status?.conflicted.length ?? 0) > 0

  const stashBySha = useMemo(() => new Map(repo.stashes.map((s) => [s.sha, s])), [repo.stashes])
  const remoteNames = useMemo(() => new Set(repo.remotes.map((r) => r.name)), [repo.remotes])

  const displayCommits = useMemo<GraphCommit[]>(() => {
    if (repo.commits.length === 0) return repo.commits
    const stashesByParent = new Map<string, StashInfo[]>()
    for (const s of repo.stashes) {
      const list = stashesByParent.get(s.parentSha) ?? []
      list.push(s)
      stashesByParent.set(s.parentSha, list)
    }
    const out: GraphCommit[] = []
    if (hasWip) {
      const head = repo.commits.find((c) => c.refs.some((r) => r.startsWith('HEAD')))
      out.push({
        hash: WIP_HASH,
        parents: head ? [head.hash] : [],
        author: '',
        email: '',
        date: Math.floor(Date.now() / 1000),
        refs: [],
        subject: '// WIP'
      })
    }
    for (const c of repo.commits) {
      for (const s of stashesByParent.get(c.hash) ?? []) {
        out.push({
          hash: s.sha,
          parents: [s.parentSha],
          author: '',
          email: '',
          date: s.date,
          refs: [],
          subject: s.message
        })
      }
      out.push(c)
    }
    return out
  }, [repo.commits, repo.stashes, hasWip, repo.status])

  const layout = useMemo(() => layoutGraph(displayCommits), [displayCommits])

  const graphAuto = LEFT_PAD + Math.min(layout.laneCount, 24) * LANE_W + 18
  const totalHeight = displayCommits.length * ROW_H
  const filter = graphFilter.trim().toLowerCase()
  const branchCol = columns.branch.visible ? columns.branch.width : 0
  const graphCol = columns.graph.visible ? (columns.graph.width > 0 ? columns.graph.width : graphAuto) : 0

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

  // Auto-load more commits when scrolling near the bottom.
  const onScroll = (): void => {
    if (!autoLoadOnScroll) return
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - ROW_H * 4 && repo.commits.length >= repo.maxCount) {
      loadMore(repo.path)
    }
  }

  const commitMenu = (c: GraphCommit): MenuItem[] => {
    const currentBranch = repo.branches.current.trim()
    const mergeItems = mergeableRefs(c.refs).map<MenuItem>((ref) => ({
      label: `Merge ${ref} into ${currentBranch}`,
      disabled: !currentBranch || ref === currentBranch,
      onClick: () => void repoActions.merge(repo.path, ref)
    }))

    return [
      ...mergeItems,
      ...(mergeItems.length ? [{ separator: true } satisfies MenuItem] : []),
      {
      label: 'Create branch here…',
      onClick: () =>
        openModal({
          kind: 'input',
          title: 'Create branch',
          label: `Branch from ${c.hash.slice(0, 7)}`,
          placeholder: 'feature/my-branch',
          submitLabel: 'Create',
          onSubmit: (name) => void repoActions.createBranch(repo.path, name, c.hash)
        })
    },
    {
      label: 'Create tag here…',
      onClick: () =>
        openModal({
          kind: 'input',
          title: 'Create tag',
          label: `Tag at ${c.hash.slice(0, 7)}`,
          placeholder: 'v1.0.0',
          submitLabel: 'Create',
          onSubmit: (name) => void repoActions.createTag(repo.path, name, c.hash)
        })
    },
    { separator: true },
    { label: 'Checkout this commit (detached)', onClick: () => void repoActions.checkout(repo.path, c.hash) },
    { label: 'Cherry-pick commit', onClick: () => void repoActions.cherryPick(repo.path, c.hash) },
    {
      label: 'Cherry-pick — apply changes without committing',
      onClick: () => void repoActions.cherryPick(repo.path, c.hash, true)
    },
    { label: 'Revert commit', onClick: () => void repoActions.revertCommit(repo.path, c.hash) },
    { separator: true },
    {
      label: 'Reset current branch — soft',
      onClick: () => void repoActions.reset(repo.path, c.hash, 'soft')
    },
    {
      label: 'Reset current branch — mixed',
      onClick: () => void repoActions.reset(repo.path, c.hash, 'mixed')
    },
    {
      label: 'Reset current branch — hard',
      danger: true,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: 'Hard reset',
          message: `Hard reset to ${c.hash.slice(0, 7)}? All uncommitted work will be lost.`,
          danger: true,
          confirmLabel: 'Hard reset',
          onConfirm: () => void repoActions.reset(repo.path, c.hash, 'hard')
        })
    },
    { separator: true },
    { label: 'Copy SHA', onClick: () => void navigator.clipboard.writeText(c.hash) },
    { label: 'Copy commit message', onClick: () => void navigator.clipboard.writeText(c.subject) }
    ]
  }

  const stashMenu = (s: StashInfo): MenuItem[] => [
    { label: 'Apply stash (keep)', onClick: () => void repoActions.stashApply(repo.path, s.index) },
    { label: 'Pop stash', onClick: () => void repoActions.stashPop(repo.path, s.index) },
    { separator: true },
    { label: 'Copy stash message', onClick: () => void navigator.clipboard.writeText(s.message) },
    {
      label: 'Drop stash',
      danger: true,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: 'Drop stash',
          message: `Drop "${s.message}"? This cannot be undone.`,
          danger: true,
          confirmLabel: 'Drop',
          onConfirm: () => void repoActions.stashDrop(repo.path, s.index)
        })
    },
    { separator: true },
    { label: 'Copy SHA', onClick: () => void navigator.clipboard.writeText(s.sha) }
  ]

  // Context menu for a branch/tag group shown next to a commit in the graph.
  const groupMenu = (g: RefGroup, c: GraphCommit): MenuItem[] => {
    if (g.isTag) {
      const remoteName = repo.remotes[0]?.name ?? 'origin'
      return [
        { label: `Checkout ${g.label}`, onClick: () => void repoActions.checkout(repo.path, g.label) },
        { label: 'Copy tag name', onClick: () => void navigator.clipboard.writeText(g.label) },
        ...(repo.remotes.length
          ? [{ label: `Push tag to ${remoteName}`, onClick: () => void repoActions.pushTag(repo.path, g.label, remoteName) } satisfies MenuItem]
          : []),
        { separator: true },
        {
          label: 'Delete tag',
          danger: true,
          onClick: () =>
            openModal({
              kind: 'confirm',
              title: 'Delete tag',
              message: `Delete tag "${g.label}"?`,
              danger: true,
              confirmLabel: 'Delete',
              onConfirm: () => void repoActions.deleteTag(repo.path, g.label)
            })
        }
      ]
    }

    const isCurrent = repo.branches.current.trim() === g.label
    const items: MenuItem[] = []
    if (g.isLocal) {
      items.push({ label: `Checkout ${g.label}`, disabled: isCurrent, onClick: () => void repoActions.checkout(repo.path, g.label) })
    } else if (g.remotes.length) {
      const full = `${g.remotes[0]}/${g.label}`
      items.push({ label: `Checkout ${g.label} as local branch`, onClick: () => void repoActions.checkoutRemote(repo.path, full, g.label) })
    }
    items.push({ label: 'Copy branch name', onClick: () => void navigator.clipboard.writeText(g.label) })
    items.push({
      label: 'Create tag here…',
      onClick: () =>
        openModal({
          kind: 'input',
          title: 'Create tag',
          label: `Tag at ${c.hash.slice(0, 7)}`,
          placeholder: 'v1.0.0',
          submitLabel: 'Create',
          onSubmit: (name) => void repoActions.createTag(repo.path, name, c.hash)
        })
    })
    if (g.isLocal && isCurrent) items.push({ label: 'Push branch', onClick: () => void repoActions.push(repo.path) })

    const deletions: MenuItem[] = []
    if (g.isLocal) {
      deletions.push({
        label: 'Delete local branch',
        danger: true,
        disabled: isCurrent,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: 'Delete branch',
            message: `Delete branch "${g.label}"?`,
            danger: true,
            confirmLabel: 'Delete',
            onConfirm: () => void repoActions.deleteBranch(repo.path, g.label, c.hash)
          })
      })
    }
    for (const remote of g.remotes) {
      deletions.push({
        label: `Delete ${g.label} from ${remote}`,
        danger: true,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: 'Delete remote branch',
            message: `Delete "${remote}/${g.label}" from ${remote}?`,
            danger: true,
            confirmLabel: 'Delete',
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
    if (g.isTag) return <Tag size={9} className="ref-ic" />
    return (
      <>
        {g.isLocal && <Laptop size={9} className="ref-ic" />}
        {g.remotes.map((remote) => {
          const url = repo.remotes.find((r) => r.name === remote)?.url
          return (
            <span key={remote} className="ref-ic">
              {providerIcon(url, 9)}
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
      void repoActions.checkoutRemote(repo.path, `${g.remotes[0]}/${g.label}`, g.label)
    }
  }

  const renderGroup = (g: RefGroup, c: GraphCommit): React.JSX.Element => {
    const title = g.isTag
      ? g.label
      : `${g.label}${g.isLocal ? ' · local' : ''}${g.remotes.length ? ` · ${g.remotes.join(', ')}` : ''}`
    return (
      <span
        key={g.key}
        className={`ref-badge ref-${g.kind}`}
        title={title}
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
      <GraphColumnsHeader
        columns={columns}
        branchCol={branchCol}
        graphCol={graphCol}
        onResize={(id, width) => setColumn(id, { width })}
        onMenu={openColumnsMenu}
      />
      <div className="graph-scroll" ref={scrollRef} onScroll={onScroll}>
      <div className="graph-canvas" style={{ height: totalHeight }}>
        {columns.graph.visible && (
        <>
        <svg className="graph-svg" width={graphCol} height={totalHeight} style={{ left: branchCol }}>
          {layout.edges.map((e, i) => {
            const x1 = LEFT_PAD + e.fromLane * LANE_W
            const y1 = e.fromRow * ROW_H + ROW_H / 2
            const x2 = LEFT_PAD + e.toLane * LANE_W
            const y2 = e.toRow * ROW_H + ROW_H / 2
            return (
              <path
                key={i}
                d={edgePath(x1, y1, x2, y2)}
                stroke={colorFor(e.color)}
                strokeWidth={2}
                fill="none"
                opacity={0.85}
              />
            )
          })}
          {displayCommits.map((c) => {
            const n = layout.nodes.get(c.hash)
            if (!n) return null
            const cx = LEFT_PAD + n.lane * LANE_W
            const cy = n.row * ROW_H + ROW_H / 2
            const isWip = c.hash === WIP_HASH
            const isStash = stashBySha.has(c.hash)
            if (isStash) {
              return (
                <g key={c.hash}>
                  <rect
                    x={cx - 5.5}
                    y={cy - 5.5}
                    width={11}
                    height={11}
                    rx={3}
                    fill="var(--bg-1)"
                    stroke={colorFor(n.color)}
                    strokeWidth={2}
                    className="graph-node"
                  />
                  <rect x={cx - 2.5} y={cy - 1} width={5} height={1.6} rx={0.8} fill={colorFor(n.color)} />
                </g>
              )
            }
            if (isWip) {
              return (
                <circle
                  key={c.hash}
                  cx={cx}
                  cy={cy}
                  r={NODE_R + 1}
                  fill="transparent"
                  stroke={colorFor(n.color)}
                  strokeWidth={2}
                  strokeDasharray="2.5 2.5"
                  className="graph-node"
                />
              )
            }
            // Normal commits are drawn as avatar nodes in the HTML overlay below.
            return null
          })}
        </svg>

        {/* Avatar nodes overlay — the gravatar/generated avatar sits on the
            commit "ball", with a connector line from any branch labels. The
            overlay is clipped to the branch+graph region so avatars never spill
            over the commit messages when columns are resized too narrow. */}
        <div className="graph-nodes" style={{ width: branchCol + graphCol }}>
          {displayCommits.map((c) => {
            const n = layout.nodes.get(c.hash)
            if (!n) return null
            if (c.hash === WIP_HASH || stashBySha.has(c.hash)) return null
            const x = branchCol + LEFT_PAD + n.lane * LANE_W
            const y = n.row * ROW_H + ROW_H / 2
            const color = colorFor(n.color)
            const hasRefs = buildRefGroups(c.refs, remoteNames).length > 0
            const connStart = branchCol - 6
            return (
              <div key={c.hash}>
                {hasRefs && branchCol > 0 && x - AVA / 2 > connStart && (
                  <div
                    className="node-connector"
                    style={{ left: connStart, width: x - AVA / 2 - connStart, top: y, background: color }}
                  />
                )}
                <div
                  className="node-ava"
                  style={{ left: x, top: y, boxShadow: `0 0 0 2px ${color}` }}
                  title={[c.author, ...(c.coAuthors?.map((a) => `+ ${a.name}`) ?? [])].join('\n')}
                >
                  <Avatar email={c.email} name={c.author} size={AVA} />
                </div>
              </div>
            )
          })}
        </div>
        </>
        )}

        {displayCommits.map((c, row) => {
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
          const dimmed = filter.length > 0 && !matches && !isWip
          const wipCount =
            (repo.status?.staged.length ?? 0) +
            (repo.status?.unstaged.length ?? 0) +
            (repo.status?.conflicted.length ?? 0)

          return (
            <div
              key={c.hash}
              className={`graph-row ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${matches ? 'matched' : ''}`}
              style={{ top: row * ROW_H, height: ROW_H, paddingLeft: branchCol + graphCol }}
              onClick={() =>
                select(
                  repo.path,
                  isWip
                    ? { type: 'wip' }
                    : stash
                      ? { type: 'stash', index: stash.index, sha: stash.sha }
                      : { type: 'commit', hash: c.hash }
                )
              }
              onContextMenu={(e) => {
                e.preventDefault()
                if (stash) openContextMenu(e.clientX, e.clientY, stashMenu(stash))
                else if (!isWip) openContextMenu(e.clientX, e.clientY, commitMenu(c))
              }}
            >
              {branchCol > 0 && groups.length > 0 && (
                <div className="graph-refs" style={{ width: branchCol }}>
                  {groups.length <= 2 ? (
                    groups.map((g) => renderGroup(g, c))
                  ) : (
                    <>
                      <span className="ref-collapsed">
                        {renderGroup(groups[0], c)}
                        <span className="ref-more-chip">+{groups.length - 1}</span>
                      </span>
                      <div className="graph-refs-pop">{groups.map((g) => renderGroup(g, c))}</div>
                    </>
                  )}
                </div>
              )}
              {columns.message.visible &&
                (isWip ? (
                  <span className="row-subject wip-subject">
                    Work in progress
                    <span className="wip-count">
                      &nbsp;· {wipCount} file change{wipCount === 1 ? '' : 's'}
                    </span>
                  </span>
                ) : stash ? (
                  <span className="row-subject stash-subject" title={stash.message}>
                    <span className="ref-badge ref-stash">
                      <Archive size={10} /> stash@{`{${stash.index}}`}
                    </span>
                    {stash.message}
                  </span>
                ) : (
                  <span className="row-subject" title={c.subject}>
                    {c.subject}
                  </span>
                ))}
              {columns.author.visible && (
                <span className="row-author" style={{ flex: `0 0 ${columns.author.width}px`, maxWidth: columns.author.width }}>
                  {isWip || stash ? '' : c.author}
                </span>
              )}
              {columns.date.visible && (
                <span className="row-date" style={{ flex: `0 0 ${columns.date.width}px`, width: columns.date.width }}>
                  {isWip ? '' : stash ? fmtDate(stash.date) : fmtDate(c.date)}
                </span>
              )}
              {columns.sha.visible && (
                <span className="row-sha" style={{ flex: `0 0 ${columns.sha.width}px`, width: columns.sha.width }}>
                  {isWip ? '' : stash ? stash.sha.slice(0, 7) : c.hash.slice(0, 7)}
                </span>
              )}
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
