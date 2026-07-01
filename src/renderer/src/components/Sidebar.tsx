import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  GitBranch,
  Cloud,
  Tag,
  Archive,
  GitPullRequest,
  CircleDot,
  Milestone,
  Search,
  RefreshCw,
  Check,
  FolderGit2,
  Boxes,
  AlertTriangle,
  GripVertical,
  Laptop,
  Plus,
  Lock,
  ExternalLink,
  Sparkles,
  Rocket,
  Settings2,
  ArrowUpRight,
  FolderTree,
  FilePlus,
  FolderPlus,
  Play,
  ChevronDown
} from 'lucide-react'
import { FileTree } from './FileTree'
import { FileSearchBar, EMPTY_FILTER, type FileFilter } from './FileSearchBar'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useLaunchStore } from '../stores/launch'
import { shellApi } from '../infrastructure/api'
import { useT, interp } from '../i18n'
import { repoIsGitHub } from '../lib/hosting'
import { defaultSettings } from '../../../shared/types'
import type { BranchInfo, ReleaseInfo, RemoteBranchInfo, StashInfo, TagInfo, WorktreeInfo, SubmoduleInfo, LaunchGroup, LaunchConfig } from '../../../shared/types'

import { RemoteIcon } from './RemoteIcon'

interface SectionProps {
  title: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
  actions?: React.ReactNode
  sectionId?: string
  dragging?: boolean
  dragOver?: boolean
  reorderHint?: string
  onReorderStart?: () => void
  onReorderOver?: (e: React.DragEvent) => void
  onReorderDrop?: () => void
  onReorderEnd?: () => void
  onHeaderContextMenu?: (e: React.MouseEvent) => void
  nested?: boolean
  /** Nesting level (0 = top). Drives compounding left-indent so deep folders
   *  (feature/payments/…) read as children, not siblings. */
  depth?: number
}

/** A node in a branch folder tree (local or per-remote). `item` is set when
 *  this node is itself a branch (a leaf, or a folder name that's also a ref). */
interface TreeNode<T> {
  seg: string
  item?: T
  children: Map<string, TreeNode<T>>
}

/** Fold a flat list of refs into a folder tree keyed by their "/" prefix. */
function buildPrefixTree<T>(items: T[], nameOf: (t: T) => string): TreeNode<T> {
  const root: TreeNode<T> = { seg: '', children: new Map() }
  for (const it of items) {
    let node = root
    const parts = nameOf(it).split('/')
    parts.forEach((seg, i) => {
      let child = node.children.get(seg)
      if (!child) {
        child = { seg, children: new Map() }
        node.children.set(seg, child)
      }
      node = child
      if (i === parts.length - 1) node.item = it
    })
  }
  return root
}

/** Number of actual branches under a node, used for the folder's count badge. */
function leafCount<T>(node: TreeNode<T>): number {
  let n = node.item ? 1 : 0
  for (const c of node.children.values()) n += leafCount(c)
  return n
}

function Section({
  title,
  icon,
  count,
  children,
  defaultOpen = true,
  actions,
  sectionId,
  dragging,
  dragOver,
  reorderHint,
  onReorderStart,
  onReorderOver,
  onReorderDrop,
  onReorderEnd,
  onHeaderContextMenu,
  nested,
  depth = 0
}: SectionProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const draggable = !!sectionId
  return (
    <div
      className={`sb-section ${nested ? 'nested' : ''} ${dragging ? 'dragging' : ''} ${dragOver ? 'drag-over' : ''}`}
      style={depth > 0 ? ({ '--sb-indent': depth } as React.CSSProperties) : undefined}
      onDragOver={draggable ? onReorderOver : undefined}
      onDrop={
        draggable
          ? (e) => {
              e.preventDefault()
              onReorderDrop?.()
            }
          : undefined
      }
    >
      <div
        className="sb-header"
        draggable={draggable}
        onClick={() => setOpen(!open)}
        onContextMenu={onHeaderContextMenu}
        onDragStart={draggable ? onReorderStart : undefined}
        onDragEnd={draggable ? onReorderEnd : undefined}
      >
        {draggable && (
          <span className="sb-grip" title={reorderHint} onClick={(e) => e.stopPropagation()}>
            <GripVertical size={12} />
          </span>
        )}
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }} className="sb-arrow">
          <ChevronRight size={13} />
        </motion.span>
        {icon}
        <span className="sb-title">{title}</span>
        {actions && <span className="sb-actions">{actions}</span>}
        <span className="sb-count">{count}</span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="sb-body"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar({ repo }: { repo: RepoData }): React.JSX.Element {
  const { openContextMenu, openModal } = useUIStore()
  const refreshPRs = useRepoStore((s) => s.refreshPRs)
  const refreshReleases = useRepoStore((s) => s.refreshReleases)
  const select = useRepoStore((s) => s.select)
  const requestScrollTo = useUIStore((s) => s.requestScrollTo)
  const baseSidebarOrder = useSettingsStore((s) => s.settings.sidebarOrder)
  const baseSidebarHidden = useSettingsStore((s) => s.settings.sidebarHidden)
  const repoLayout = useSettingsStore((s) => s.settings.repoLayouts?.[repo.path])
  // Sidebar section order/visibility is per-repository: a repo's own override
  // wins, otherwise the global defaults apply.
  const sidebarOrder = useMemo(() => repoLayout?.sidebarOrder ?? baseSidebarOrder, [repoLayout, baseSidebarOrder])
  const sidebarHidden = useMemo(() => repoLayout?.sidebarHidden ?? baseSidebarHidden, [repoLayout, baseSidebarHidden])
  const groupBranches = useSettingsStore((s) => s.settings.groupBranches)
  const updateRepoLayout = useSettingsStore((s) => s.updateRepoLayout)
  const openPageTab = useSettingsStore((s) => s.openPageTab)
  const openRepoTab = useSettingsStore((s) => s.openRepoTab)
  const activeProfile = useSettingsStore((s) => s.activeProfile)
  const aiEnabled = activeProfile().ai.enabled !== false
  const t = useT()
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState<'git' | 'files'>('git')

  // ─── Launch configs (.vscode/launch.json) ───
  const enableLaunchJson = useSettingsStore((s) => s.settings.enableLaunchJson)
  const launchGroups = useLaunchStore((s) => s.groupsByRepo[repo.path] ?? [])
  const discoverLaunch = useLaunchStore((s) => s.discover)
  const runLaunch = useLaunchStore((s) => s.run)
  useEffect(() => {
    if (enableLaunchJson) void discoverLaunch(repo.path)
  }, [repo.path, enableLaunchJson, discoverLaunch])
  const hasLaunch = enableLaunchJson && launchGroups.some((g) => g.configs.length > 0)

  // Build the Run/Debug picker: root group first, deeper folders after a
  // divider; a lone deeper folder shows with no divider. Within a folder we
  // honour `presentation` — hidden configs are skipped and the rest are sorted
  // by `group` then `order` (then their original order), matching VS Code.
  const visibleConfigs = (g: LaunchGroup): LaunchConfig[] =>
    g.configs
      .filter((c) => !c.presentation?.hidden)
      .map((c, i) => ({ c, i }))
      .sort((a, b) => {
        const ga = a.c.presentation?.group ?? ''
        const gb = b.c.presentation?.group ?? ''
        if (ga !== gb) return ga < gb ? -1 : 1
        const oa = a.c.presentation?.order ?? Number.MAX_SAFE_INTEGER
        const ob = b.c.presentation?.order ?? Number.MAX_SAFE_INTEGER
        return oa - ob || a.i - b.i
      })
      .map(({ c }) => c)

  const openLaunchMenu = (x: number, y: number): void => {
    const groups = launchGroups
      .map((g) => ({ g, configs: visibleConfigs(g) }))
      .filter(({ configs }) => configs.length > 0)
    const showLabels = groups.length > 1
    const items: MenuItem[] = []
    groups.forEach(({ g, configs }, gi) => {
      if (gi > 0) items.push({ separator: true })
      if (showLabels) items.push({ label: g.label, disabled: true })
      let prevGroup: string | undefined
      configs.forEach((cfg, ci) => {
        // Draw a divider when the presentation group changes within a folder.
        const grp = cfg.presentation?.group
        if (ci > 0 && grp !== prevGroup) items.push({ separator: true })
        prevGroup = grp
        items.push({
          label: cfg.name,
          icon: <Play size={13} />,
          onClick: () => void runLaunch(repo.path, g, cfg)
        })
      })
    })
    openContextMenu(x, y, items)
  }
  const [fileFilter, setFileFilter] = useState<FileFilter>(EMPTY_FILTER)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  // Drag-a-branch-onto-another (merge / rebase gesture).
  const [dragBranch, setDragBranch] = useState<string | null>(null)
  const [dropBranch, setDropBranch] = useState<string | null>(null)
  const path = repo.path
  const f = filter.trim().toLowerCase()

  // ─── Multi-select (Cmd/Ctrl-click toggle, Shift-click range) ───
  // One section "owns" the selection at a time; `kind` namespaces the ids.
  const [sel, setSel] = useState<{ kind: string; ids: string[] } | null>(null)
  const lastClick = useRef<{ kind: string; id: string } | null>(null)
  const isSel = (kind: string, id: string): boolean => sel?.kind === kind && sel.ids.includes(id)
  const clearSel = (): void => setSel(null)

  // Returns true when the click was a multi-select gesture (caller skips its
  // normal navigate/select action).
  const onSelectClick = (kind: string, id: string, ordered: string[], e: React.MouseEvent): boolean => {
    if (e.metaKey || e.ctrlKey) {
      setSel((prev) =>
        !prev || prev.kind !== kind
          ? { kind, ids: [id] }
          : prev.ids.includes(id)
            ? { kind, ids: prev.ids.filter((x) => x !== id) }
            : { kind, ids: [...prev.ids, id] }
      )
      lastClick.current = { kind, id }
      return true
    }
    if (e.shiftKey && lastClick.current?.kind === kind) {
      const a = ordered.indexOf(lastClick.current.id)
      const b = ordered.indexOf(id)
      if (a !== -1 && b !== -1) {
        const range = ordered.slice(Math.min(a, b), Math.max(a, b) + 1)
        setSel((prev) => ({ kind, ids: Array.from(new Set([...(prev?.kind === kind ? prev.ids : []), ...range])) }))
        return true
      }
    }
    lastClick.current = { kind, id }
    clearSel()
    return false
  }

  // Picks the bulk menu when right-clicking inside a multi-selection, else the
  // single-item menu. `bulk` receives the selected ids (≥2).
  const ctxMenu = (
    e: React.MouseEvent,
    kind: string,
    id: string,
    single: () => MenuItem[],
    bulk: (ids: string[]) => MenuItem[]
  ): void => {
    e.preventDefault()
    const ids = isSel(kind, id) && sel && sel.ids.length > 1 ? sel.ids : null
    openContextMenu(e.clientX, e.clientY, ids ? bulk(ids) : single())
  }

  const localBulkMenu = (names: string[]): MenuItem[] => {
    const deletable = names.filter((n) => n !== repo.branches.current.trim())
    return [
      {
        label: interp(t('sidebar.deleteNBranches'), { n: deletable.length }),
        danger: true,
        disabled: deletable.length === 0,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('sidebar.deleteBranchesTitle'),
            message: `${interp(t('sidebar.deleteBranchesMsg'), { n: deletable.length })}\n\n${deletable.join('\n')}`,
            danger: true,
            confirmLabel: t('sidebar.deleteBranchesConfirm'),
            onConfirm: () => {
              void repoActions.deleteBranches(path, deletable)
              clearSel()
            }
          })
      }
    ]
  }

  const remoteBulkMenu = (fullNames: string[]): MenuItem[] => {
    const items = fullNames
      .map((fn) => repo.branches.remotes.find((r) => r.fullName === fn))
      .filter((r): r is RemoteBranchInfo => !!r)
      .map((r) => ({ remote: r.remote, name: r.name }))
    return [
      {
        label: interp(t('sidebar.deleteNRemoteBranches'), { n: items.length }),
        danger: true,
        disabled: items.length === 0,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('sidebar.deleteRemoteBranchesTitle'),
            message: `${interp(t('sidebar.deleteRemoteBranchesMsg'), { n: items.length })}\n\n${fullNames.join('\n')}`,
            danger: true,
            confirmLabel: t('sidebar.deleteRemoteBranchesConfirm'),
            onConfirm: () => {
              void repoActions.deleteRemoteBranches(path, items)
              clearSel()
            }
          })
      }
    ]
  }

  const stashBulkMenu = (ids: string[]): MenuItem[] => {
    const indices = ids.map(Number)
    return [
      {
        label: interp(t('sidebar.dropNStashes'), { n: indices.length }),
        danger: true,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('sidebar.dropStashesTitle'),
            message: interp(t('sidebar.dropStashesMsg'), { n: indices.length }),
            danger: true,
            confirmLabel: t('sidebar.dropStashesConfirm'),
            onConfirm: () => {
              void repoActions.stashDropMany(path, indices)
              clearSel()
            }
          })
      }
    ]
  }

  const tagBulkMenu = (names: string[]): MenuItem[] => [
    {
      label: interp(t('sidebar.deleteNTags'), { n: names.length }),
      danger: true,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('sidebar.deleteTagsTitle'),
          message: `${interp(t('sidebar.deleteTagsMsg'), { n: names.length })}\n\n${names.join('\n')}`,
          danger: true,
          confirmLabel: t('sidebar.deleteTagsConfirm'),
          onConfirm: () => {
            void repoActions.deleteTags(path, names)
            clearSel()
          }
        })
    }
  ]

  // Click a branch → select & scroll the graph to its tip commit.
  const goToBranch = (sha: string): void => {
    const commit = repo.commits.find((c) => c.hash.startsWith(sha) || sha.startsWith(c.hash))
    const hash = commit?.hash ?? sha
    select(path, { type: 'commit', hash })
    requestScrollTo(hash)
  }

  const locals = useMemo(
    () => repo.branches.locals.filter((b) => !f || b.name.toLowerCase().includes(f)),
    [repo.branches.locals, f]
  )
  const remotes = useMemo(
    () => repo.branches.remotes.filter((b) => !f || b.fullName.toLowerCase().includes(f)),
    [repo.branches.remotes, f]
  )
  // Local branches arranged into a folder tree by their "/"-separated prefix.
  const branchTree = useMemo(() => buildPrefixTree(locals, (b) => b.name), [locals])
  const tags = useMemo(
    () => repo.branches.tags.filter((t) => !f || t.name.toLowerCase().includes(f)),
    [repo.branches.tags, f]
  )
  const releases = useMemo(
    () =>
      repo.releases.filter(
        (r) => !f || (r.name ?? '').toLowerCase().includes(f) || (r.tag ?? '').toLowerCase().includes(f)
      ),
    [repo.releases, f]
  )
  // Tag name → its release, so the Tags section can jump straight to a release.
  const releaseByTag = useMemo(() => {
    const map = new Map<string, (typeof repo.releases)[number]>()
    for (const r of repo.releases) if (r.tag && !map.has(r.tag)) map.set(r.tag, r)
    return map
  }, [repo.releases])

  const remoteGroups = useMemo(() => {
    const map = new Map<string, RemoteBranchInfo[]>()
    for (const r of remotes) {
      const arr = map.get(r.remote) ?? []
      arr.push(r)
      map.set(r.remote, arr)
    }
    return map
  }, [remotes])

  // Per-remote prefix trees, so each remote's branches fold the same way locals do.
  const remoteTrees = useMemo(() => {
    const m = new Map<string, TreeNode<RemoteBranchInfo>>()
    for (const [name, brs] of remoteGroups) m.set(name, buildPrefixTree(brs, (b) => b.name))
    return m
  }, [remoteGroups])

  // Tags folded by "/" namespace (release/*, nightly/*, monorepo pkg/v1.0…).
  const tagTree = useMemo(() => buildPrefixTree(tags, (tg) => tg.name), [tags])

  // Which remotes hold a branch with a given name → drives the presence icons.
  const branchPresence = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const r of repo.branches.remotes) {
      const arr = map.get(r.name) ?? []
      if (!arr.includes(r.remote)) arr.push(r.remote)
      map.set(r.name, arr)
    }
    return map
  }, [repo.branches.remotes])

  const remoteUrl = (name: string): string | undefined => repo.remotes.find((r) => r.name === name)?.url

  // The hosting-platform web URL for a tag (GitHub release page / Azure tag
  // view). Used by both the tag context menu and the hover-to-open cloud icon.
  const tagWebLink = (tagName: string): string | null => {
    const url = repo.remotes[0]?.url
    if (!url) return null
    const gh = /github\.com[/:]([^/]+)\/([^/]+?)(\.git)?$/.exec(url)
    if (gh) return `https://github.com/${gh[1]}/${gh[2]}/releases/tag/${tagName}`
    const az = /dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+?)(\.git)?$/.exec(url)
    if (az) return `https://dev.azure.com/${az[1]}/${az[2]}/_git/${az[3]}?version=GT${tagName}`
    return null
  }

  // Small icon strip: a laptop for "on this computer" plus one icon per remote
  // that has the same branch, collapsing extras into a "+N" badge.
  const Presence = ({ remoteNames, local = true }: { remoteNames: string[]; local?: boolean }): React.JSX.Element => {
    const shown = remoteNames.slice(0, 2)
    const extra = remoteNames.length - shown.length
    const title = remoteNames.length
      ? `${local ? 'This computer, ' : ''}${remoteNames.join(', ')}`
      : t('sidebar.localOnly')
    return (
      <span className="sb-presence" title={title}>
        {local && <Laptop size={11} className="presence-local" />}
        {shown.map((rm) => (
          <span key={rm} className="presence-remote">
            <RemoteIcon url={remoteUrl(rm)} size={11} />
          </span>
        ))}
        {extra > 0 && <span className="presence-more">+{extra}</span>}
      </span>
    )
  }

  const createTagAtHead = (): void => openModal({ kind: 'create-tag', repoPath: path, at: 'HEAD' })

  const tagMenu = (tag: TagInfo): MenuItem[] => {
    const remoteName = repo.remotes[0]?.name ?? 'origin'
    const currentBranch = repo.branches.current.trim()
    const isPushed = repo.remoteTagNames.includes(tag.name)
    const webUrl = tagWebLink(tag.name)
    const release = releaseByTag.get(tag.name)
    return [
      ...(release
        ? [
            {
              label: interp(t('sidebar.goToRelease'), { name: release.name || release.tag || tag.name }),
              onClick: () => openPageTab({ type: 'release', release, repoPath: path })
            } satisfies MenuItem,
            { separator: true } satisfies MenuItem
          ]
        : []),
      { label: interp(t('sidebar.checkoutTag'), { tag: tag.name }), onClick: () => void repoActions.checkout(path, tag.name) },
      { separator: true },
      {
        label: interp(t('sidebar.rebaseOnTag'), { branch: currentBranch, tag: tag.name }),
        disabled: !currentBranch,
        onClick: () => void repoActions.rebase(path, tag.name)
      },
      {
        label: interp(t('sidebar.resetToTagSoft'), { branch: currentBranch }),
        disabled: !currentBranch,
        onClick: () => void repoActions.reset(path, tag.name, 'soft')
      },
      {
        label: interp(t('sidebar.resetToTagMixed'), { branch: currentBranch }),
        disabled: !currentBranch,
        onClick: () => void repoActions.reset(path, tag.name, 'mixed')
      },
      {
        label: interp(t('sidebar.resetToTagHard'), { branch: currentBranch }),
        danger: true,
        disabled: !currentBranch,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('sidebar.hardResetTitle'),
            message: interp(t('sidebar.hardResetMsg'), { ref: tag.name }),
            danger: true,
            confirmLabel: t('sidebar.hardResetConfirm'),
            onConfirm: () => void repoActions.reset(path, tag.name, 'hard')
          })
      },
      { separator: true },
      { label: t('sidebar.copyTagName'), onClick: () => void navigator.clipboard.writeText(tag.name) },
      ...(webUrl
        ? [
            { label: interp(t('sidebar.openTagOnWeb'), { tag: tag.name, remote: remoteName }), onClick: () => void shellApi.openExternal(webUrl) } satisfies MenuItem,
            { label: interp(t('sidebar.copyTagLink'), { tag: tag.name, remote: remoteName }), onClick: () => void navigator.clipboard.writeText(webUrl) } satisfies MenuItem
          ]
        : []),
      { label: t('sidebar.createTagHere'), onClick: createTagAtHead },
      { separator: true },
      ...(repo.remotes.length && !isPushed
        ? [{ label: interp(t('sidebar.pushTag'), { tag: tag.name, remote: remoteName }), onClick: () => void repoActions.pushTag(path, tag.name, remoteName) } satisfies MenuItem]
        : []),
      ...(repo.remotes.length && isPushed
        ? [{
            label: t('sidebar.deleteRemoteTag'),
            danger: true,
            onClick: () =>
              openModal({
                kind: 'confirm',
                title: t('sidebar.deleteRemoteTag'),
                message: interp(t('sidebar.deleteRemoteTagMsg'), { tag: tag.name, remote: remoteName }),
                danger: true,
                confirmLabel: t('sidebar.deleteRemoteTagConfirm'),
                onConfirm: () => void repoActions.deleteRemoteTag(path, tag.name, remoteName)
              })
          } satisfies MenuItem]
        : []),
      {
        label: t('sidebar.deleteTagLocal'),
        danger: true,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('sidebar.deleteTagLocal'),
            message: interp(t('sidebar.deleteTagLocalMsg'), { tag: tag.name }),
            danger: true,
            confirmLabel: t('sidebar.deleteTagLocalConfirm'),
            onConfirm: () => void repoActions.deleteTag(path, tag.name)
          })
      }
    ]
  }

  // Dropped branch `source` onto `target`: offer merge / rebase.
  const branchDropMenu = (source: string, target: string, x: number, y: number): void => {
    openContextMenu(x, y, [
      { label: interp(t('sidebar.dropBranchMerge'), { source, target }), onClick: () => void repoActions.mergeInto(path, source, target) },
      { label: interp(t('sidebar.dropBranchRebase'), { source, target }), onClick: () => void repoActions.rebaseOnto(path, source, target) }
    ])
  }

  // Create a worktree for `branch` in a sibling folder and open it as a tab.
  const openInWorktree = async (branch: string): Promise<void> => {
    const segs = path.split(/[/\\]/).filter(Boolean)
    const repoName = segs[segs.length - 1]
    const parent = path.slice(0, path.length - repoName.length - 1)
    const dir = `${parent}/${repoName}--${branch.replace(/[^\w.-]+/g, '-')}`
    const ok = await repoActions.worktreeAdd(path, dir, branch, false)
    if (ok) useSettingsStore.getState().openRepoTab({ path: dir, name: `${repoName} · ${branch}` })
  }

  const localMenu = (b: BranchInfo): MenuItem[] => [
    { label: interp(t('sidebar.checkoutBranch'), { branch: b.name }), disabled: b.isCurrent, onClick: () => void repoActions.checkout(path, b.name) },
    { label: interp(t('sidebar.openInWorktree'), { branch: b.name }), onClick: () => void openInWorktree(b.name) },
    {
      label: interp(t('sidebar.mergeBranchInto'), { branch: b.name, current: repo.branches.current }),
      disabled: b.isCurrent,
      onClick: () => void repoActions.merge(path, b.name)
    },
    {
      label: interp(t('sidebar.rebaseBranchOnto'), { current: repo.branches.current, branch: b.name }),
      disabled: b.isCurrent,
      onClick: () => void repoActions.rebase(path, b.name)
    },
    {
      label: interp(t('sidebar.compareBranchWith'), { current: repo.branches.current }),
      disabled: b.isCurrent,
      onClick: () => openModal({ kind: 'branch-compare', repoPath: path, branchA: b.name, branchB: repo.branches.current ?? 'HEAD' })
    },
    { separator: true },
    {
      label: t('sidebar.renameBranch'),
      onClick: () =>
        openModal({
          kind: 'input',
          title: t('sidebar.renameBranchTitle'),
          label: t('sidebar.renameBranchLabel'),
          initial: b.name,
          submitLabel: t('sidebar.renameBranchSubmit'),
          onSubmit: (name) => void repoActions.renameBranch(path, b.name, name)
        })
    },
    ...(b.upstream
      ? [
          {
            label: t('sidebar.renameWithRemote'),
            onClick: (): void =>
              openModal({
                kind: 'input',
                title: t('sidebar.renameWithRemoteTitle'),
                label: t('sidebar.renameBranchLabel'),
                initial: b.name,
                submitLabel: t('sidebar.renameBranchSubmit'),
                onSubmit: (name) => {
                  const remote = (b.upstream ?? '').split('/')[0]
                  if (name.trim() && remote) void repoActions.renameBranchRemote(path, b.name, name.trim(), remote)
                }
              })
          }
        ]
      : []),
    { label: t('sidebar.pushBranch'), onClick: () => void repoActions.push(path) },
    {
      label: t('sidebar.createPRFromBranch'),
      onClick: () => openModal({ kind: 'create-pr', repoPath: path, source: b.name })
    },
    { separator: true },
    { label: t('sidebar.copyBranchName'), onClick: () => void navigator.clipboard.writeText(b.name) },
    {
      label: t('sidebar.deleteBranch'),
      danger: true,
      disabled: b.isCurrent,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('sidebar.deleteBranchTitle'),
          message: interp(t('sidebar.deleteBranchMsg'), { name: b.name }),
          danger: true,
          confirmLabel: t('sidebar.deleteBranchConfirm'),
          onConfirm: () => void repoActions.deleteBranch(path, b.name, b.sha)
        })
    }
  ]

  const remoteMenu = (b: RemoteBranchInfo): MenuItem[] => [
    {
      label: t('sidebar.checkoutAsLocal'),
      onClick: () => void repoActions.checkoutRemote(path, b.fullName, b.name, b.remote)
    },
    { label: interp(t('sidebar.mergeBranchInto'), { branch: b.fullName, current: repo.branches.current }), onClick: () => void repoActions.merge(path, b.fullName) },
    {
      label: interp(t('sidebar.compareBranchWith'), { current: repo.branches.current }),
      onClick: () => openModal({ kind: 'branch-compare', repoPath: path, branchA: b.fullName, branchB: repo.branches.current ?? 'HEAD' })
    },
    { separator: true },
    { label: t('sidebar.copyBranchName'), onClick: () => void navigator.clipboard.writeText(b.fullName) },
    {
      label: t('sidebar.deleteRemoteBranch'),
      danger: true,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('sidebar.deleteRemoteBranchTitle'),
          message: interp(t('sidebar.deleteRemoteBranchMsg'), { branch: b.name, remote: b.remote }),
          danger: true,
          confirmLabel: t('sidebar.deleteRemoteBranchConfirm'),
          onConfirm: () => void repoActions.deleteRemoteBranch(path, b.remote, b.name)
        })
    }
  ]

  const renameStash = (s: StashInfo): void =>
    openModal({
      kind: 'input',
      title: 'Rename stash',
      label: 'New stash message',
      initial: s.message,
      submitLabel: t('common.rename'),
      onSubmit: (message) => {
        const m = message.trim()
        if (m && m !== s.message) void repoActions.renameStash(path, s.index, m)
      }
    })

  const stashMenu = (s: StashInfo): MenuItem[] => [
    { label: t('sidebar.popStash'), onClick: () => void repoActions.stashPop(path, s.index) },
    { label: t('sidebar.applyStash'), onClick: () => void repoActions.stashApply(path, s.index) },
    { separator: true },
    { label: t('sidebar.renameStash'), onClick: () => renameStash(s) },
    { label: t('sidebar.copyStashMsg'), onClick: () => void navigator.clipboard.writeText(s.message) },
    { separator: true },
    {
      label: t('sidebar.dropStash'),
      danger: true,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('sidebar.dropStashTitle'),
          message: interp(t('sidebar.dropStashMsg'), { message: s.message }),
          danger: true,
          confirmLabel: t('sidebar.dropStashConfirm'),
          onConfirm: () => void repoActions.stashDrop(path, s.index)
        })
    }
  ]

  const worktreeMenu = (w: WorktreeInfo): MenuItem[] => [
    { label: t('sidebar.revealWorktree'), onClick: () => void shellApi.revealInFolder(w.path) },
    { label: t('sidebar.copyPath'), onClick: () => void navigator.clipboard.writeText(w.path) },
    { separator: true },
    {
      label: t('sidebar.removeWorktree'),
      danger: true,
      disabled: w.isMain || w.isCurrent,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: t('sidebar.removeWorktree'),
          message: `Remove worktree "${w.path}"?`,
          danger: true,
          confirmLabel: t('common.delete'),
          onConfirm: () => void repoActions.worktreeRemove(path, w.path)
        })
    }
  ]

  const addWorktree = (): void =>
    openModal({
      kind: 'input',
      title: t('sidebar.addWorktree'),
      label: t('sidebar.addWorktreeLabel'),
      placeholder: t('sidebar.addWorktreePlaceholder'),
      submitLabel: t('common.add'),
      onSubmit: (value) => {
        const parts = value.trim().split(/\s+/)
        const dir = parts[0]
        const branch = parts[1] ?? repo.branches.current
        if (!dir) return
        const isExisting = repo.branches.locals.some((b) => b.name === branch)
        void repoActions.worktreeAdd(path, dir, branch, !isExisting)
      }
    })

  const addRemote = (): void =>
    openModal({
      kind: 'addRemote',
      path,
      defaultName: repo.remotes.length === 0 ? 'origin' : '',
      existingNames: repo.remotes.map((r) => r.name),
      matchName: path.split(/[/\\]/).filter(Boolean).pop()
    })

  // Turn a git remote URL into a browsable web URL (best effort, https hosts only).
  const webUrl = (url?: string): string | undefined => {
    if (!url) return undefined
    const m = /^(?:git@|https?:\/\/(?:[^@/]+@)?)([^:/]+)[:/](.+?)(?:\.git)?\/?$/.exec(url.trim())
    return m ? `https://${m[1]}/${m[2]}` : url.startsWith('http') ? url : undefined
  }

  const remoteMgmtMenu = (remoteName: string, url?: string): MenuItem[] => {
    const web = webUrl(url)
    return [
      { label: t('sidebar.addRemote'), onClick: () => addRemote() },
      { label: interp(t('sidebar.fetchRemote'), { remote: remoteName }), onClick: () => void repoActions.fetchRemote(path, remoteName) },
      {
        label: interp(t('sidebar.editRemote'), { remote: remoteName }),
        onClick: () =>
          openModal({
            kind: 'editRemote',
            path,
            name: remoteName,
            url: url ?? ''
          })
      },
      { separator: true },
      ...(web ? [{ label: t('sidebar.openOnWeb'), onClick: (): void => void shellApi.openExternal(web) }] : []),
      ...(url ? [{ label: 'Copy remote URL', onClick: (): void => void navigator.clipboard.writeText(url) }] : []),
      { separator: true },
      {
        label: t('sidebar.removeRemote'),
        danger: true,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('sidebar.removeRemote'),
            message: `Remove remote "${remoteName}"? Its remote-tracking branches will be deleted locally.`,
            danger: true,
            confirmLabel: t('sidebar.removeRemote'),
            onConfirm: () => void repoActions.removeRemote(path, remoteName)
          })
      }
    ]
  }


  const submoduleMenu = (sm: SubmoduleInfo): MenuItem[] => {
    const absPath = `${path.replace(/\/+$/, '')}/${sm.path}`
    const web = webUrl(sm.url)
    const initialized = sm.status !== 'uninitialized'
    return [
      { label: t('sidebar.updateSubmodule'), onClick: () => void repoActions.submoduleUpdate(path, sm.path) },
      { label: t('sidebar.syncSubmodule'), onClick: () => void repoActions.submoduleSync(path, sm.path) },
      { separator: true },
      {
        label: t('sidebar.openSubmodule'),
        disabled: !initialized,
        onClick: () => openRepoTab({ path: absPath, name: sm.path.split('/').pop() ?? sm.path })
      },
      { label: t('sidebar.editSubmodule'), onClick: () => editSubmodule(sm) },
      { label: t('sidebar.revealWorktree'), onClick: () => void shellApi.revealInFolder(absPath) },
      { separator: true },
      { label: t('sidebar.copyPath'), onClick: () => void navigator.clipboard.writeText(absPath) },
      ...(sm.url ? [{ label: t('sidebar.copySubmoduleUrl'), onClick: (): void => void navigator.clipboard.writeText(sm.url) }] : []),
      ...(web ? [{ label: t('sidebar.openOnWeb'), onClick: (): void => void shellApi.openExternal(web) }] : []),
      { separator: true },
      {
        label: t('sidebar.removeSubmodule'),
        danger: true,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('sidebar.removeSubmodule'),
            message: `Remove submodule "${sm.path}"? This deinitializes it and removes it from the index and .gitmodules.`,
            danger: true,
            confirmLabel: t('common.delete'),
            onConfirm: () => void repoActions.submoduleRemove(path, sm.path)
          })
      }
    ]
  }

  const editSubmodule = (sm: SubmoduleInfo): void =>
    openModal({
      kind: 'input',
      title: `${t('sidebar.editSubmodule')} · ${sm.path}`,
      label: t('sidebar.submoduleUrlLabel'),
      placeholder: t('sidebar.editSubmodulePlaceholder'),
      initial: sm.url,
      submitLabel: t('common.save'),
      onSubmit: (value) => {
        const url = value.trim()
        if (!url || url === sm.url) return
        void repoActions.submoduleSetUrl(path, sm.name, url)
      }
    })

  const addSubmodule = (): void =>
    openModal({
      kind: 'input',
      title: t('sidebar.addSubmodule'),
      label: t('sidebar.addSubmoduleLabel'),
      placeholder: t('sidebar.addSubmodulePlaceholder'),
      submitLabel: t('common.add'),
      onSubmit: (value) => {
        const parts = value.trim().split(/\s+/)
        const url = parts[0]
        const dir = parts[1]
        if (!url || !dir) return
        void repoActions.submoduleAdd(path, url, dir)
      }
    })


  const promptCreateRoot = (isDir: boolean): void =>
    openModal({
      kind: 'input',
      title: isDir ? 'New folder' : 'New file',
      label: 'At repository root',
      placeholder: isDir ? 'components' : 'index.ts',
      submitLabel: t('common.create'),
      onSubmit: (name) => {
        const clean = name.trim().replace(/^\/+|\/+$/g, '')
        if (!clean) return
        void repoActions.fsCreate(path, clean, isDir)
      }
    })

  const sectionLabels: Record<string, string> = {
    local: t('sidebar.local'),
    remotes: t('sidebar.remotes'),
    prs: t('sidebar.pullRequests'),
    issues: t('sidebar.issues'),
    milestones: t('sidebar.milestones'),
    tags: t('sidebar.tags'),
    releases: t('sidebar.releases'),
    stashes: t('sidebar.stashes'),
    worktrees: t('sidebar.worktrees'),
    submodules: t('sidebar.submodules')
  }

  const toggleSection = (id: string): void =>
    updateRepoLayout(repo.path, (l) => {
      const hidden = l.sidebarHidden ?? baseSidebarHidden
      return {
        ...l,
        sidebarHidden: hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]
      }
    })

  const reorder = (from: string, to: string): void => {
    if (from === to) return
    updateRepoLayout(repo.path, (l) => {
      const next = (l.sidebarOrder ?? baseSidebarOrder).filter((id) => id !== from)
      const idx = next.indexOf(to)
      next.splice(idx < 0 ? next.length : idx, 0, from)
      return { ...l, sidebarOrder: next }
    })
  }

  const dragProps = (id: string): Partial<SectionProps> => ({
    sectionId: id,
    dragging: dragId === id,
    dragOver: overId === id && dragId !== null && dragId !== id,
    reorderHint: t('sidebar.reorderHint'),
    onReorderStart: () => setDragId(id),
    onReorderOver: (e) => {
      e.preventDefault()
      if (dragId && dragId !== id) setOverId(id)
    },
    onReorderDrop: () => {
      if (dragId) reorder(dragId, id)
      setDragId(null)
      setOverId(null)
    },
    onReorderEnd: () => {
      setDragId(null)
      setOverId(null)
    }
  })

  const localIds = locals.map((b) => b.name)
  const remoteIds = remotes.map((b) => b.fullName)
  const tagIds = tags.map((t) => t.name)
  const stashIds = repo.stashes.map((s) => String(s.index))

  // One row in the local-branches list. `label` is the displayed text (the last
  // path segment when nested inside a folder, the full name when flat).
  const branchItem = (b: BranchInfo, label: string): React.JSX.Element => (
    <div
      key={b.name}
      className={`sb-item ${b.isCurrent ? 'current' : ''} ${isSel('local', b.name) ? 'multi-sel' : ''} ${dropBranch === b.name ? 'branch-drop-over' : ''}`}
      draggable
      onDragStart={(e) => {
        setDragBranch(b.name)
        e.dataTransfer.effectAllowed = 'link'
        e.dataTransfer.setData('text/plain', b.name)
      }}
      onDragEnd={() => {
        setDragBranch(null)
        setDropBranch(null)
      }}
      onDragOver={(e) => {
        if (dragBranch && dragBranch !== b.name) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'link'
          if (dropBranch !== b.name) setDropBranch(b.name)
        }
      }}
      onDragLeave={() => dropBranch === b.name && setDropBranch(null)}
      onDrop={(e) => {
        e.preventDefault()
        const source = dragBranch
        setDragBranch(null)
        setDropBranch(null)
        if (source && source !== b.name) branchDropMenu(source, b.name, e.clientX, e.clientY)
      }}
      onClick={(e) => {
        if (!onSelectClick('local', b.name, localIds, e)) goToBranch(b.sha)
      }}
      onDoubleClick={() => !b.isCurrent && void repoActions.checkout(path, b.name)}
      onContextMenu={(e) => ctxMenu(e, 'local', b.name, () => localMenu(b), localBulkMenu)}
      title={`${b.name}${b.upstream ? ` → ${b.upstream}` : ''}`}
    >
      {b.isCurrent && <Check size={12} className="sb-current-mark" />}
      <span className="sb-name">{label}</span>
      {b.ahead > 0 && <span className="badge ahead">↑{b.ahead}</span>}
      {b.behind > 0 && <span className="badge behind">↓{b.behind}</span>}
      <Presence remoteNames={branchPresence.get(b.name) ?? []} />
    </div>
  )

  // Recursively render a branch folder node: flatten single-child folders into
  // one "a/b" row, leaves become items, folders with ≥2 entries become a
  // collapsible nested Section. `prefix` carries the flattened path so far.
  const renderBranchNode = (node: TreeNode<BranchInfo>, prefix: string, depth: number): React.JSX.Element => {
    const display = prefix ? `${prefix}/${node.seg}` : node.seg
    // Single-child folder folds into one row — same visual depth, no extra level.
    if (!node.item && node.children.size === 1) {
      return renderBranchNode([...node.children.values()][0], display, depth)
    }
    if (node.children.size === 0 && node.item) {
      return branchItem(node.item, display)
    }
    return (
      <Section
        key={`grp:${display}`}
        nested
        depth={depth}
        title={display}
        icon={<GitBranch size={13} />}
        count={leafCount(node)}
      >
        {node.item && branchItem(node.item, node.seg)}
        {[...node.children.values()].map((c) => renderBranchNode(c, '', depth + 1))}
      </Section>
    )
  }

  // One row in a remote's branch list. `label` mirrors branchItem's contract.
  const remoteItem = (b: RemoteBranchInfo, label: string): React.JSX.Element => (
    <div
      key={b.fullName}
      className={`sb-item ${isSel('remote', b.fullName) ? 'multi-sel' : ''}`}
      onClick={(e) => void onSelectClick('remote', b.fullName, remoteIds, e)}
      onDoubleClick={() => void repoActions.checkoutRemote(path, b.fullName, b.name, b.remote)}
      onContextMenu={(e) => ctxMenu(e, 'remote', b.fullName, () => remoteMenu(b), remoteBulkMenu)}
      title={b.fullName}
    >
      <span className="sb-name">{label}</span>
    </div>
  )

  const renderRemoteNode = (node: TreeNode<RemoteBranchInfo>, prefix: string, depth: number): React.JSX.Element => {
    const display = prefix ? `${prefix}/${node.seg}` : node.seg
    if (!node.item && node.children.size === 1) {
      return renderRemoteNode([...node.children.values()][0], display, depth)
    }
    if (node.children.size === 0 && node.item) {
      return remoteItem(node.item, display)
    }
    return (
      <Section
        key={`rgrp:${display}`}
        nested
        depth={depth}
        title={display}
        icon={<GitBranch size={13} />}
        count={leafCount(node)}
      >
        {node.item && remoteItem(node.item, node.seg)}
        {[...node.children.values()].map((c) => renderRemoteNode(c, '', depth + 1))}
      </Section>
    )
  }

  // One tag row. `label` follows the same last-segment-when-nested contract.
  const tagItem = (tag: TagInfo, label: string): React.JSX.Element => {
    const isPushed = repo.remoteTagNames.includes(tag.name)
    const release = releaseByTag.get(tag.name)
    const tagLink = repo.remotes.length ? tagWebLink(tag.name) : null
    return (
      <div
        key={tag.name}
        className={`sb-item ${isSel('tag', tag.name) ? 'multi-sel' : ''}`}
        onClick={(e) => {
          if (!onSelectClick('tag', tag.name, tagIds, e)) goToBranch(tag.sha)
        }}
        onContextMenu={(e) => ctxMenu(e, 'tag', tag.name, () => tagMenu(tag), tagBulkMenu)}
        title={`${tag.name}${release ? ' · release' : ''}${repo.remotes.length ? (isPushed ? ' · pushed' : ' · local only') : ''}`}
      >
        <Tag size={11} className="sb-tag-icon" />
        <span className="sb-name">{label}</span>
        {release && (
          <span
            className="sb-tag-action"
            title={`Go to release ${release.name || release.tag || tag.name}`}
            onClick={(e) => {
              e.stopPropagation()
              openPageTab({ type: 'release', release, repoPath: path })
            }}
          >
            <Rocket size={10} className="sb-release-badge icon-base" />
            <ArrowUpRight size={11} className="icon-hover" />
          </span>
        )}
        {repo.remotes.length > 0 &&
          (tagLink && isPushed ? (
            <span
              className="sb-tag-action sb-tag-cloud pushed"
              title={`Open ${tag.name} on remote`}
              onClick={(e) => {
                e.stopPropagation()
                void shellApi.openExternal(tagLink)
              }}
            >
              <Cloud size={10} className="icon-base" />
              <ArrowUpRight size={11} className="icon-hover" />
            </span>
          ) : (
            <Cloud size={10} className={`sb-tag-cloud ${isPushed ? 'pushed' : 'unpushed'}`} />
          ))}
      </div>
    )
  }

  const renderTagNode = (node: TreeNode<TagInfo>, prefix: string, depth: number): React.JSX.Element => {
    const display = prefix ? `${prefix}/${node.seg}` : node.seg
    if (!node.item && node.children.size === 1) {
      return renderTagNode([...node.children.values()][0], display, depth)
    }
    if (node.children.size === 0 && node.item) {
      return tagItem(node.item, display)
    }
    return (
      <Section
        key={`tgrp:${display}`}
        nested
        depth={depth}
        title={display}
        icon={<Tag size={13} />}
        count={leafCount(node)}
      >
        {node.item && tagItem(node.item, node.seg)}
        {[...node.children.values()].map((c) => renderTagNode(c, '', depth + 1))}
      </Section>
    )
  }

  const sections: Record<string, React.JSX.Element> = {
    local: (
      <Section
        title={t('sidebar.local')}
        icon={<GitBranch size={13} />}
        count={locals.length}
        {...dragProps('local')}
        actions={
          <span
            className="icon-btn"
            title={t('sidebar.createBranch')}
            onClick={(e) => {
              e.stopPropagation()
              openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })
            }}
          >
            <Plus size={11} />
          </span>
        }
      >
        {groupBranches
          ? [...branchTree.children.values()].map((c) => renderBranchNode(c, '', 1))
          : locals.map((b) => branchItem(b, b.name))}
      </Section>
    ),
    remotes: (
      <Section
        title={t('sidebar.remotes')}
        icon={<Cloud size={13} />}
        count={repo.remotes.length}
        {...dragProps('remotes')}
        actions={
          <span
            className="icon-btn"
            title={t('sidebar.addRemote')}
            onClick={(e) => {
              e.stopPropagation()
              addRemote()
            }}
          >
            +
          </span>
        }
      >
        {repo.remotes.length === 0 && <div className="sb-empty">{t('sidebar.noRemotes')}</div>}
        {repo.remotes.map((remote) => {
          const branches = remoteGroups.get(remote.name) ?? []
          return (
            <Section
              key={remote.name}
              nested
              depth={1}
              title={remote.name}
              icon={<RemoteIcon url={remote.url} />}
              count={branches.length}
              defaultOpen={remote.name === 'origin'}
              onHeaderContextMenu={(e) => {
                e.preventDefault()
                openContextMenu(e.clientX, e.clientY, remoteMgmtMenu(remote.name, remote.url))
              }}
              actions={webUrl(remote.url) ? (
                <span
                  className="icon-btn"
                  title={`Open ${remote.name} on web`}
                  onClick={(e) => {
                    e.stopPropagation()
                    void shellApi.openExternal(webUrl(remote.url)!)
                  }}
                >
                  <ExternalLink size={12} />
                </span>
              ) : undefined}
            >
              {branches.length === 0 && <div className="sb-empty">{t('sidebar.noBranches')}</div>}
              {groupBranches
                ? [...(remoteTrees.get(remote.name)?.children.values() ?? [])].map((c) =>
                    renderRemoteNode(c, '', 2)
                  )
                : branches.map((b) => remoteItem(b, b.name))}
            </Section>
          )
        })}
      </Section>
    ),
    prs: (
      <Section
        title={t('sidebar.pullRequests')}
        icon={<GitPullRequest size={13} />}
        count={repo.prs.length}
        defaultOpen={false}
        {...dragProps('prs')}
        actions={
          <>
            <span
              className="icon-btn"
              title={t('sidebar.createPRFromBranch')}
              onClick={(e) => {
                e.stopPropagation()
                openModal({ kind: 'create-pr', repoPath: path })
              }}
            >
              <Plus size={12} />
            </span>
            <span
              className="icon-btn"
              title={t('sidebar.fetchPRs')}
              onClick={(e) => {
                e.stopPropagation()
                void refreshPRs(path)
              }}
            >
              <RefreshCw size={12} />
            </span>
          </>
        }
      >
        {repo.prs.length === 0 && <div className="sb-empty">{t('sidebar.noPRs')}</div>}
        {repo.prs.map((pr) => (
          <div
            key={pr.id}
            className="sb-item pr"
            onClick={() => {
              // Rich PR detail is GitHub-only; for other hosts open in browser.
              if (!repoIsGitHub(repo.remotes)) {
                void window.api.openExternal(pr.url)
                return
              }
              const origin = repo.remotes.find((r) => r.name === 'origin') ?? repo.remotes[0]
              if (origin) openModal({ kind: 'pr-detail', repoPath: path, remoteUrl: origin.url, number: pr.id })
            }}
            title={pr.title}
          >
            <GitPullRequest size={12} className={pr.isDraft ? 'pr-draft' : 'pr-open'} />
            <span className="sb-name">
              #{pr.id} {pr.title}
            </span>
            {aiEnabled && pr.sourceBranch && pr.targetBranch && (
              <span
                className="icon-btn sb-ai-review"
                title="AI PR review"
                onClick={(e) => {
                  e.stopPropagation()
                  openModal({
                    kind: 'ai-pr-review',
                    repoPath: path,
                    prTitle: pr.title,
                    sourceBranch: pr.sourceBranch!,
                    targetBranch: pr.targetBranch!
                  })
                }}
              >
                <Sparkles size={11} />
              </span>
            )}
            <span
              className="icon-btn sb-pr-open"
              title="Open in browser"
              onClick={(e) => {
                e.stopPropagation()
                void window.api.openExternal(pr.url)
              }}
            >
              <ExternalLink size={11} />
            </span>
          </div>
        ))}
      </Section>
    ),
    issues: (
      <Section
        title={t('sidebar.issues')}
        icon={<CircleDot size={13} />}
        count={repo.issues.length}
        defaultOpen={false}
        {...dragProps('issues')}
        actions={
          <>
            {(() => {
              const origin = repo.remotes.find((r) => r.name === 'origin') ?? repo.remotes[0]
              return origin ? (
                <span
                  className="icon-btn"
                  title="New issue"
                  onClick={(e) => {
                    e.stopPropagation()
                    openModal({ kind: 'create-issue', repoPath: path, remoteUrl: origin.url })
                  }}
                >
                  <Plus size={13} />
                </span>
              ) : null
            })()}
            <span
              className="icon-btn"
              title={t('sidebar.issues')}
              onClick={(e) => {
                e.stopPropagation()
                void useRepoStore.getState().refreshIssues(path)
              }}
            >
              <RefreshCw size={12} />
            </span>
          </>
        }
      >
        {repo.issues.length === 0 && <div className="sb-empty">{t('sidebar.noIssues')}</div>}
        {repo.issues.map((issue) => (
          <div
            key={issue.number}
            className="sb-item pr"
            onClick={() => {
              const origin = repo.remotes.find((r) => r.name === 'origin') ?? repo.remotes[0]
              if (origin)
                useSettingsStore.getState().openPageTab({ type: 'issue', issue, repoPath: path, remoteUrl: origin.url })
            }}
            title={issue.title}
          >
            <CircleDot size={12} className="pr-open" />
            <span className="sb-name">
              #{issue.number} {issue.title}
            </span>
            <span
              className="icon-btn sb-pr-open"
              title="Open in browser"
              onClick={(e) => {
                e.stopPropagation()
                void window.api.openExternal(issue.url)
              }}
            >
              <ExternalLink size={11} />
            </span>
          </div>
        ))}
      </Section>
    ),
    milestones: (
      <Section
        title={t('sidebar.milestones')}
        icon={<Milestone size={13} />}
        count={repo.milestones.filter((m) => m.state === 'open').length}
        defaultOpen={false}
        {...dragProps('milestones')}
        actions={
          <span
            className="icon-btn"
            title={t('sidebar.milestones')}
            onClick={(e) => {
              e.stopPropagation()
              void useRepoStore.getState().refreshMilestones(path)
            }}
          >
            <RefreshCw size={12} />
          </span>
        }
      >
        {repo.milestones.filter((m) => m.state === 'open').length === 0 && (
          <div className="sb-empty">{t('sidebar.noMilestones')}</div>
        )}
        {repo.milestones
          .filter((m) => m.state === 'open')
          .map((m) => {
          const total = m.openIssues + m.closedIssues
          const pct = total > 0 ? Math.round((m.closedIssues / total) * 100) : 0
          return (
            <div
              key={m.number}
              className="sb-item milestone"
              onClick={() => {
                const origin = repo.remotes.find((r) => r.name === 'origin') ?? repo.remotes[0]
                if (origin)
                  useSettingsStore
                    .getState()
                    .openPageTab({ type: 'milestone', milestone: m, repoPath: path, remoteUrl: origin.url })
              }}
              title={`${m.title}${m.dueOn ? ` · due ${new Date(m.dueOn).toLocaleDateString()}` : ''}`}
            >
              <Milestone size={12} className={m.state === 'closed' ? 'pr-draft' : 'pr-open'} />
              <span className="sb-name">{m.title}</span>
              <span className="sb-milestone-pct">{pct}%</span>
              <span
                className="icon-btn sb-pr-open"
                title="Open in browser"
                onClick={(e) => {
                  e.stopPropagation()
                  void window.api.openExternal(m.url)
                }}
              >
                <ExternalLink size={11} />
              </span>
            </div>
          )
        })}
      </Section>
    ),
    tags: (
      <Section
        title={t('sidebar.tags')}
        icon={<Tag size={13} />}
        count={tags.length}
        defaultOpen={false}
        {...dragProps('tags')}
        actions={
          <span
            className="icon-btn"
            title={t('sidebar.createTag')}
            onClick={(e) => {
              e.stopPropagation()
              createTagAtHead()
            }}
          >
            <Plus size={12} />
          </span>
        }
      >
        {tags.length === 0 && <div className="sb-empty">{t('sidebar.noTags')}</div>}
        {groupBranches
          ? [...tagTree.children.values()].map((c) => renderTagNode(c, '', 1))
          : tags.map((tag) => tagItem(tag, tag.name))}
      </Section>
    ),
    releases: (() => {
      const origin = repo.remotes.find((r) => r.name === 'origin') ?? repo.remotes[0]
      const base = webUrl(origin?.url)
      const releasesUrl = base ? `${base}/releases` : undefined
      return (
        <Section
          title={t('sidebar.releases')}
          icon={<Rocket size={13} />}
          count={releases.length}
          defaultOpen={false}
          {...dragProps('releases')}
          actions={
            <>
              {releasesUrl && (
                <span
                  className="icon-btn"
                  title={t('sidebar.openReleases')}
                  onClick={(e) => {
                    e.stopPropagation()
                    void shellApi.openExternal(releasesUrl)
                  }}
                >
                  <ExternalLink size={12} />
                </span>
              )}
              <span
                className="icon-btn"
                title={t('sidebar.fetchReleases')}
                onClick={(e) => {
                  e.stopPropagation()
                  void refreshReleases(path)
                }}
              >
                <RefreshCw size={12} />
              </span>
            </>
          }
        >
          {releases.length === 0 && <div className="sb-empty">{t('sidebar.noReleases')}</div>}
          {releases.map((rel: ReleaseInfo) => {
            const label = rel.name || rel.tag || `#${rel.id}`
            return (
              <div
                key={rel.id}
                className="sb-item release"
                onClick={() => openPageTab({ type: 'release', release: rel, repoPath: path })}
                title={label}
              >
                <Rocket size={11} className="sb-release-icon" />
                <span className="sb-name">{label}</span>
                {rel.draft && <span className="badge release-draft">{t('sidebar.draftBadge')}</span>}
                {rel.prerelease && <span className="badge release-pre">{t('sidebar.preBadge')}</span>}
                <span
                  className="icon-btn"
                  title={t('sidebar.openOnWeb')}
                  onClick={(e) => {
                    e.stopPropagation()
                    void shellApi.openExternal(rel.url)
                  }}
                >
                  <ExternalLink size={11} />
                </span>
              </div>
            )
          })}
        </Section>
      )
    })(),
    stashes: (
      <Section title={t('sidebar.stashes')} icon={<Archive size={13} />} count={repo.stashes.length} {...dragProps('stashes')}>
        {repo.stashes.length === 0 && <div className="sb-empty">{t('sidebar.noStashes')}</div>}
        {repo.stashes.map((s) => (
          <div
            key={s.index}
            className={`sb-item ${repo.selected?.type === 'stash' && repo.selected.sha === s.sha ? 'current' : ''} ${isSel('stash', String(s.index)) ? 'multi-sel' : ''}`}
            onClick={(e) => {
              if (!onSelectClick('stash', String(s.index), stashIds, e))
                select(path, { type: 'stash', index: s.index, sha: s.sha })
            }}
            onContextMenu={(e) => ctxMenu(e, 'stash', String(s.index), () => stashMenu(s), stashBulkMenu)}
            title={s.message}
          >
            <span className="sb-name sb-stash-name">
              <span className="sb-stash-message">{s.message}</span>
              {s.branch && <span className="sb-stash-branch">{s.branch}</span>}
            </span>
          </div>
        ))}
      </Section>
    ),
    worktrees: (
      <Section
        title={t('sidebar.worktrees')}
        icon={<FolderGit2 size={13} />}
        count={repo.worktrees.length}
        defaultOpen={false}
        {...dragProps('worktrees')}
        actions={
          <span
            className="icon-btn"
            title={t('sidebar.addWorktree')}
            onClick={(e) => {
              e.stopPropagation()
              addWorktree()
            }}
          >
            +
          </span>
        }
      >
        {repo.worktrees.length === 0 && <div className="sb-empty">{t('sidebar.noWorktrees')}</div>}
        {repo.worktrees.map((w) => (
          <div
            key={w.path}
            className={`sb-item ${w.isCurrent ? 'current' : ''}`}
            onDoubleClick={() => void shellApi.revealInFolder(w.path)}
            onContextMenu={(e) => {
              e.preventDefault()
              openContextMenu(e.clientX, e.clientY, worktreeMenu(w))
            }}
            title={w.path}
          >
            <span className="sb-name">{w.branch ?? (w.detached ? w.head.slice(0, 7) : w.path.split('/').pop())}</span>
            {w.locked && <Lock size={11} className="text-2" />}
            {w.isMain && <span className="badge">main</span>}
          </div>
        ))}
      </Section>
    ),
    submodules: (
      <Section
        title={t('sidebar.submodules')}
        icon={<Boxes size={13} />}
        count={repo.submodules.length}
        defaultOpen={false}
        {...dragProps('submodules')}
        actions={
          <>
            {repo.submodules.length > 0 && (
              <span
                className="icon-btn"
                title={t('sidebar.updateAllSubmodules')}
                onClick={(e) => {
                  e.stopPropagation()
                  void repoActions.submoduleUpdate(path)
                }}
              >
                <RefreshCw size={11} />
              </span>
            )}
            <span
              className="icon-btn"
              title={t('sidebar.addSubmodule')}
              onClick={(e) => {
                e.stopPropagation()
                addSubmodule()
              }}
            >
              <Plus size={11} />
            </span>
          </>
        }
      >
        {repo.submodules.length === 0 && <div className="sb-empty">{t('sidebar.noSubmodules')}</div>}
        {repo.submodules.map((sm) => {
          const statusIcon =
            sm.status === 'initialized' ? (
              <Check size={13} className="sb-sm-icon ok" />
            ) : sm.status === 'modified' ? (
              <RefreshCw size={12} className="sb-sm-icon sync" />
            ) : sm.status === 'conflict' ? (
              <AlertTriangle size={12} className="sb-sm-icon conflict" />
            ) : (
              <AlertTriangle size={12} className="sb-sm-icon warn" />
            )
          const statusTip =
            sm.status === 'initialized'
              ? `${t('sidebar.submoduleInSync')} ${repo.name}`
              : sm.status === 'modified'
                ? `${t('sidebar.submoduleOutOfSync')} ${repo.name}`
                : sm.status === 'conflict'
                  ? t('sidebar.submoduleConflictTip')
                  : t('sidebar.submoduleNeedsInit')
          return (
            <div
              key={sm.path}
              className="sb-item sb-submodule"
              onDoubleClick={() => void shellApi.revealInFolder(`${path.replace(/\/+$/, '')}/${sm.path}`)}
              onContextMenu={(e) => {
                e.preventDefault()
                openContextMenu(e.clientX, e.clientY, submoduleMenu(sm))
              }}
              title={`${sm.path}${sm.url ? ` → ${sm.url}` : ''}\n${statusTip}${sm.sha ? `\n${sm.sha.slice(0, 10)}` : ''}`}
            >
              <span className="sb-sm-status" title={statusTip}>
                {statusIcon}
              </span>
              <Boxes size={12} className="sb-sm-glyph text-2" />
              <span className="sb-name">{sm.path}</span>
              {sm.describe && <span className="sb-sub-ref text-2">{sm.describe}</span>}
              {sm.ahead > 0 && <span className="badge ahead">↑{sm.ahead}</span>}
              {sm.behind > 0 && <span className="badge behind">↓{sm.behind}</span>}
              {sm.status === 'uninitialized' && <span className="badge">{t('sidebar.submoduleUninit')}</span>}
            </div>
          )
        })}
      </Section>
    )
  }

  // Issues, Milestones & Releases are GitHub-only features; hide them for other hosts.
  if (!repoIsGitHub(repo.remotes)) {
    delete sections.issues
    delete sections.milestones
    delete sections.releases
  }

  const order = sidebarOrder.filter((id) => sections[id])
  for (const id of Object.keys(sections)) if (!order.includes(id)) order.push(id)
  const visibleOrder = order.filter((id) => !sidebarHidden.includes(id))

  const openSectionsMenu = (x: number, y: number): void => {
    const items: MenuItem[] = order.map((id) => ({
      label: `${sidebarHidden.includes(id) ? '   ' : '✓ '}${sectionLabels[id] ?? id}`,
      onClick: () => toggleSection(id)
    }))
    if (sidebarHidden.length) {
      items.push({ separator: true }, { label: t('sidebar.showAllSections'), onClick: () => updateRepoLayout(repo.path, (l) => ({ ...l, sidebarHidden: [] })) })
    }
    items.push({ separator: true }, {
      label: t('sidebar.resetPanel'),
      onClick: () => {
        const sd = defaultSettings()
        updateRepoLayout(repo.path, (l) => ({ ...l, sidebarOrder: sd.sidebarOrder, sidebarHidden: sd.sidebarHidden }))
      }
    })
    openContextMenu(x, y, items)
  }

  return (
    <aside className="sidebar">
      <div className="sb-tabs">
        <button
          className={`sb-tab ${tab === 'git' ? 'active' : ''}`}
          onClick={() => setTab('git')}
        >
          <GitBranch size={13} /> {t('sidebar.tabGit')}
        </button>
        <button
          className={`sb-tab ${tab === 'files' ? 'active' : ''}`}
          onClick={() => setTab('files')}
        >
          <FolderTree size={13} /> {t('sidebar.files')}
        </button>
        {hasLaunch && (
          <button
            className="sb-tab sb-tab-launch"
            title={t('sidebar.launchTitle')}
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              openLaunchMenu(r.left, r.bottom)
            }}
          >
            <Play size={13} /> {t('sidebar.launch')} <ChevronDown size={12} className="sb-tab-launch-caret" />
          </button>
        )}
      </div>

      {tab === 'git' ? (
        <>
          <div className="sb-filter-row">
            <div className="sb-filter">
              <Search size={13} />
              <input placeholder={t('sidebar.filter')} value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <span
              className="icon-btn sb-sections-btn"
              title={t('sidebar.sections')}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                openSectionsMenu(r.right, r.bottom)
              }}
            >
              <Settings2 size={13} />
            </span>
          </div>

          <div className="sb-scroll">
            {visibleOrder.map((id) => (
              <Fragment key={id}>{sections[id]}</Fragment>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="sb-files-toolbar">
            <span className="sb-files-label" title={repo.path}>{repo.name}</span>
            <span className="sb-files-actions">
              <span className="icon-btn" title={t('sidebar.newFilesRoot')} onClick={() => promptCreateRoot(false)}>
                <FilePlus size={13} />
              </span>
              <span className="icon-btn" title={t('sidebar.newFolderRoot')} onClick={() => promptCreateRoot(true)}>
                <FolderPlus size={13} />
              </span>
            </span>
          </div>
          <div className="sb-files-search">
            <FileSearchBar value={fileFilter} onChange={setFileFilter} />
          </div>
          <div className="sb-scroll">
            <FileTree repo={repo} filter={fileFilter} />
          </div>
        </>
      )}
    </aside>
  )
}
