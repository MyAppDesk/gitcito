import { useEffect, useMemo, useRef } from 'react'
import { Archive, GitCommitHorizontal, Tag, Laptop, Github, Gitlab, Cloud, Server } from 'lucide-react'
import type { GraphCommit, StashInfo } from '../../../shared/types'
import { layoutGraph, colorFor } from '../graph/layout'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useT } from '../i18n'

const ROW_H = 28
const LANE_W = 15
const LEFT_PAD = 14
const NODE_R = 4.5
const REF_COL = 168

const WIP_HASH = '__WIP__'

interface RefBadge {
  label: string
  kind: 'head' | 'local' | 'remote' | 'tag'
}

const REF_PRIORITY: Record<RefBadge['kind'], number> = { head: 0, local: 1, tag: 2, remote: 3 }

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

export function GraphView({ repo }: { repo: RepoData }): React.JSX.Element {
  const select = useRepoStore((s) => s.select)
  const loadMore = useRepoStore((s) => s.loadMore)
  const { openContextMenu, openModal, graphFilter } = useUIStore()
  const scrollToHash = useUIStore((s) => s.scrollToHash)
  const requestScrollTo = useUIStore((s) => s.requestScrollTo)
  const relativeDates = useSettingsStore((s) => s.settings.relativeDates ?? true)
  const autoLoadOnScroll = useSettingsStore((s) => s.settings.autoLoadOnScroll ?? true)
  const t = useT()
  const scrollRef = useRef<HTMLDivElement>(null)

  const fmtDate = (unix: number): string =>
    relativeDates ? timeAgo(unix) : new Date(unix * 1000).toLocaleDateString()

  const hasWip =
    (repo.status?.staged.length ?? 0) + (repo.status?.unstaged.length ?? 0) + (repo.status?.conflicted.length ?? 0) > 0

  const stashBySha = useMemo(() => new Map(repo.stashes.map((s) => [s.sha, s])), [repo.stashes])

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

  const graphWidth = LEFT_PAD + Math.min(layout.laneCount, 24) * LANE_W + 18
  const totalHeight = displayCommits.length * ROW_H
  const filter = graphFilter.trim().toLowerCase()
  const refCol = displayCommits.some((c) => c.refs.length > 0) ? REF_COL : 0

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
      label: `Merge ${ref} into…`,
      disabled: !currentBranch || ref === currentBranch,
      onClick: () =>
        openModal({
          kind: 'input',
          title: 'Merge branches',
          label: `Target branch for ${ref}`,
          initial: currentBranch,
          placeholder: 'main',
          submitLabel: 'Merge',
          onSubmit: (target) => void repoActions.mergeInto(repo.path, ref, target)
        })
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

  // Context menu for a branch/tag pill shown next to a commit in the graph.
  const refMenu = (b: RefBadge, c: GraphCommit): MenuItem[] => {
    if (b.kind === 'tag') {
      const remoteName = repo.remotes[0]?.name ?? 'origin'
      return [
        { label: `Checkout ${b.label}`, onClick: () => void repoActions.checkout(repo.path, b.label) },
        { label: 'Copy tag name', onClick: () => void navigator.clipboard.writeText(b.label) },
        ...(repo.remotes.length
          ? [{ label: `Push tag to ${remoteName}`, onClick: () => void repoActions.pushTag(repo.path, b.label, remoteName) } satisfies MenuItem]
          : []),
        { separator: true },
        {
          label: 'Delete tag',
          danger: true,
          onClick: () =>
            openModal({
              kind: 'confirm',
              title: 'Delete tag',
              message: `Delete tag "${b.label}"?`,
              danger: true,
              confirmLabel: 'Delete',
              onConfirm: () => void repoActions.deleteTag(repo.path, b.label)
            })
        }
      ]
    }
    if (b.kind === 'remote') {
      const slash = b.label.indexOf('/')
      const remote = b.label.slice(0, slash)
      const name = b.label.slice(slash + 1)
      return [
        { label: `Checkout ${name} as local branch`, onClick: () => void repoActions.checkoutRemote(repo.path, b.label, name) },
        { label: 'Copy branch name', onClick: () => void navigator.clipboard.writeText(b.label) },
        { separator: true },
        {
          label: `Delete ${name} from ${remote}`,
          danger: true,
          onClick: () =>
            openModal({
              kind: 'confirm',
              title: 'Delete remote branch',
              message: `Delete "${b.label}" from ${remote}?`,
              danger: true,
              confirmLabel: 'Delete',
              onConfirm: () => void repoActions.deleteRemoteBranch(repo.path, remote, name)
            })
        }
      ]
    }
    // local / head branch
    const isCurrent = repo.branches.current.trim() === b.label
    return [
      { label: `Checkout ${b.label}`, disabled: isCurrent, onClick: () => void repoActions.checkout(repo.path, b.label) },
      { label: 'Copy branch name', onClick: () => void navigator.clipboard.writeText(b.label) },
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
      ...(isCurrent ? [{ label: 'Push branch', onClick: () => void repoActions.push(repo.path) } satisfies MenuItem] : []),
      { separator: true },
      {
        label: 'Delete branch',
        danger: true,
        disabled: isCurrent,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: 'Delete branch',
            message: `Delete branch "${b.label}"?`,
            danger: true,
            confirmLabel: 'Delete',
            onConfirm: () => void repoActions.deleteBranch(repo.path, b.label, c.hash)
          })
      }
    ]
  }

  // A tiny presence glyph for each ref pill: laptop (local), provider icon
  // (remote-tracking) or tag.
  const badgeIcon = (b: RefBadge): React.JSX.Element => {
    if (b.kind === 'tag') return <Tag size={9} className="ref-ic" />
    if (b.kind === 'remote') {
      const remote = b.label.slice(0, b.label.indexOf('/'))
      const url = repo.remotes.find((r) => r.name === remote)?.url
      return <span className="ref-ic">{providerIcon(url, 9)}</span>
    }
    return <Laptop size={9} className="ref-ic" />
  }

  const renderBadge = (b: RefBadge, c: GraphCommit, key: React.Key): React.JSX.Element => (
    <span
      key={key}
      className={`ref-badge ref-${b.kind}`}
      title={b.label}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openContextMenu(e.clientX, e.clientY, refMenu(b, c))
      }}
    >
      {badgeIcon(b)}
      <span className="ref-text">{b.label}</span>
    </span>
  )

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
    <div className="graph-scroll" ref={scrollRef} onScroll={onScroll}>
      <div className="graph-canvas" style={{ height: totalHeight }}>
        <svg className="graph-svg" width={graphWidth} height={totalHeight} style={{ left: refCol }}>
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
            return (
              <g key={c.hash}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_R + (isWip ? 1 : 0)}
                  fill={isWip ? 'transparent' : colorFor(n.color)}
                  stroke={colorFor(n.color)}
                  strokeWidth={2}
                  strokeDasharray={isWip ? '2.5 2.5' : undefined}
                  className="graph-node"
                />
                {c.parents.length > 1 && !isWip && (
                  <circle cx={cx} cy={cy} r={1.8} fill="var(--bg-1)" />
                )}
              </g>
            )
          })}
        </svg>

        {displayCommits.map((c, row) => {
          const isWip = c.hash === WIP_HASH
          const stash = stashBySha.get(c.hash)
          const selected =
            (isWip && repo.selected?.type === 'wip') ||
            (stash != null && repo.selected?.type === 'stash' && repo.selected.sha === c.hash) ||
            (repo.selected?.type === 'commit' && repo.selected.hash === c.hash)
          const badges = parseRefs(c.refs)
          const sortedBadges = [...badges].sort((a, b) => REF_PRIORITY[a.kind] - REF_PRIORITY[b.kind])
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
              style={{ top: row * ROW_H, height: ROW_H, paddingLeft: refCol + graphWidth }}
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
              {refCol > 0 && badges.length > 0 && (
                <div className="graph-refs" style={{ width: refCol }}>
                  {sortedBadges.length === 1 ? (
                    renderBadge(sortedBadges[0], c, 0)
                  ) : (
                    <>
                      <span className="ref-collapsed">
                        {renderBadge(sortedBadges[0], c, 'primary')}
                        <span className="ref-more-chip">+{sortedBadges.length - 1}</span>
                      </span>
                      <div className="graph-refs-pop">{sortedBadges.map((b, i) => renderBadge(b, c, i))}</div>
                    </>
                  )}
                </div>
              )}
              {isWip ? (
                <>
                  <span className="row-subject wip-subject">Work in progress</span>
                  <span className="wip-count">{wipCount} file change{wipCount === 1 ? '' : 's'}</span>
                </>
              ) : stash ? (
                <>
                  <span className="ref-badge ref-stash">
                    <Archive size={10} /> stash@{`{${stash.index}}`}
                  </span>
                  <span className="row-subject stash-subject" title={stash.message}>
                    {stash.message}
                  </span>
                  <span className="row-date">{fmtDate(stash.date)}</span>
                </>
              ) : (
                <>
                  <span className="row-subject" title={c.subject}>
                    {c.subject}
                  </span>
                  <span className="row-author">{c.author}</span>
                  <span className="row-sha">{c.hash.slice(0, 7)}</span>
                  <span className="row-date">{fmtDate(c.date)}</span>
                </>
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
  )
}
