import { Fragment, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  GitBranch,
  Cloud,
  Tag,
  Archive,
  GitPullRequest,
  CircleDot,
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
  ArrowUpRight
} from 'lucide-react'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { shellApi } from '../infrastructure/api'
import { useT } from '../i18n'
import { defaultSettings } from '../../../shared/types'
import type { BranchInfo, ReleaseInfo, RemoteBranchInfo, StashInfo, TagInfo, WorktreeInfo, SubmoduleInfo } from '../../../shared/types'

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
  nested
}: SectionProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const draggable = !!sectionId
  return (
    <div
      className={`sb-section ${nested ? 'nested' : ''} ${dragging ? 'dragging' : ''} ${dragOver ? 'drag-over' : ''}`}
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
  const sidebarOrder = useSettingsStore((s) => s.settings.sidebarOrder)
  const sidebarHidden = useSettingsStore((s) => s.settings.sidebarHidden)
  const updateSettings = useSettingsStore((s) => s.update)
  const openPageTab = useSettingsStore((s) => s.openPageTab)
  const openRepoTab = useSettingsStore((s) => s.openRepoTab)
  const activeProfile = useSettingsStore((s) => s.activeProfile)
  const aiEnabled = activeProfile().ai.enabled !== false
  const t = useT()
  const [filter, setFilter] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const path = repo.path
  const f = filter.trim().toLowerCase()

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
      : 'Local only'
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

  const createTagAtHead = (): void =>
    openModal({
      kind: 'input',
      title: 'Create tag',
      label: 'Tag name (at current HEAD)',
      placeholder: 'v1.0.0',
      submitLabel: 'Create',
      onSubmit: (name) => void repoActions.createTag(path, name)
    })

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
              label: `Go to release ${release.name || release.tag || tag.name}`,
              onClick: () => openPageTab({ type: 'release', release, repoPath: path })
            } satisfies MenuItem,
            { separator: true } satisfies MenuItem
          ]
        : []),
      { label: `Checkout ${tag.name}`, onClick: () => void repoActions.checkout(path, tag.name) },
      { separator: true },
      {
        label: `Rebase ${currentBranch} onto ${tag.name}`,
        disabled: !currentBranch,
        onClick: () => void repoActions.rebase(path, tag.name)
      },
      {
        label: `Reset ${currentBranch} to here — soft`,
        disabled: !currentBranch,
        onClick: () => void repoActions.reset(path, tag.name, 'soft')
      },
      {
        label: `Reset ${currentBranch} to here — mixed`,
        disabled: !currentBranch,
        onClick: () => void repoActions.reset(path, tag.name, 'mixed')
      },
      {
        label: `Reset ${currentBranch} to here — hard`,
        danger: true,
        disabled: !currentBranch,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: 'Hard reset',
            message: `Hard reset to ${tag.name}? All uncommitted work will be lost.`,
            danger: true,
            confirmLabel: 'Hard reset',
            onConfirm: () => void repoActions.reset(path, tag.name, 'hard')
          })
      },
      { separator: true },
      { label: 'Copy tag name', onClick: () => void navigator.clipboard.writeText(tag.name) },
      ...(webUrl
        ? [
            { label: `Open ${tag.name} on ${remoteName}`, onClick: () => void shellApi.openExternal(webUrl) } satisfies MenuItem,
            { label: `Copy link to ${tag.name} on ${remoteName}`, onClick: () => void navigator.clipboard.writeText(webUrl) } satisfies MenuItem
          ]
        : []),
      { label: 'Create tag here…', onClick: createTagAtHead },
      { separator: true },
      ...(repo.remotes.length && !isPushed
        ? [{ label: `Push ${tag.name} to ${remoteName}`, onClick: () => void repoActions.pushTag(path, tag.name, remoteName) } satisfies MenuItem]
        : []),
      ...(repo.remotes.length && isPushed
        ? [{
            label: `Delete ${tag.name} from ${remoteName}`,
            danger: true,
            onClick: () =>
              openModal({
                kind: 'confirm',
                title: 'Delete remote tag',
                message: `Delete tag "${tag.name}" from ${remoteName}?`,
                danger: true,
                confirmLabel: 'Delete',
                onConfirm: () => void repoActions.deleteRemoteTag(path, tag.name, remoteName)
              })
          } satisfies MenuItem]
        : []),
      {
        label: `Delete ${tag.name} locally`,
        danger: true,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: 'Delete tag',
            message: `Delete tag "${tag.name}"?`,
            danger: true,
            confirmLabel: 'Delete',
            onConfirm: () => void repoActions.deleteTag(path, tag.name)
          })
      }
    ]
  }

  const localMenu = (b: BranchInfo): MenuItem[] => [
    { label: `Checkout ${b.name}`, disabled: b.isCurrent, onClick: () => void repoActions.checkout(path, b.name) },
    {
      label: `Merge ${b.name} into ${repo.branches.current}`,
      disabled: b.isCurrent,
      onClick: () => void repoActions.merge(path, b.name)
    },
    {
      label: `Rebase ${repo.branches.current} onto ${b.name}`,
      disabled: b.isCurrent,
      onClick: () => void repoActions.rebase(path, b.name)
    },
    {
      label: `Compare with ${repo.branches.current}…`,
      disabled: b.isCurrent,
      onClick: () => openModal({ kind: 'branch-compare', repoPath: path, branchA: b.name, branchB: repo.branches.current ?? 'HEAD' })
    },
    { separator: true },
    {
      label: 'Rename…',
      onClick: () =>
        openModal({
          kind: 'input',
          title: 'Rename branch',
          label: `New name for ${b.name}`,
          initial: b.name,
          submitLabel: 'Rename',
          onSubmit: (name) => void repoActions.renameBranch(path, b.name, name)
        })
    },
    { label: 'Push branch', onClick: () => void repoActions.push(path) },
    {
      label: 'Create pull request…',
      onClick: () => openModal({ kind: 'create-pr', repoPath: path, source: b.name })
    },
    { separator: true },
    { label: 'Copy branch name', onClick: () => void navigator.clipboard.writeText(b.name) },
    {
      label: 'Delete branch',
      danger: true,
      disabled: b.isCurrent,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: 'Delete branch',
          message: `Delete local branch "${b.name}"?`,
          danger: true,
          confirmLabel: 'Delete',
          onConfirm: () => void repoActions.deleteBranch(path, b.name, b.sha)
        })
    }
  ]

  const remoteMenu = (b: RemoteBranchInfo): MenuItem[] => [
    {
      label: `Checkout as local branch`,
      onClick: () => void repoActions.checkoutRemote(path, b.fullName, b.name)
    },
    { label: `Merge ${b.fullName} into ${repo.branches.current}`, onClick: () => void repoActions.merge(path, b.fullName) },
    {
      label: `Compare with ${repo.branches.current}…`,
      onClick: () => openModal({ kind: 'branch-compare', repoPath: path, branchA: b.fullName, branchB: repo.branches.current ?? 'HEAD' })
    },
    { separator: true },
    { label: 'Copy branch name', onClick: () => void navigator.clipboard.writeText(b.fullName) },
    {
      label: 'Delete from remote',
      danger: true,
      onClick: () =>
        openModal({
          kind: 'confirm',
          title: 'Delete remote branch',
          message: `Delete "${b.name}" from remote "${b.remote}"? This affects everyone using the remote.`,
          danger: true,
          confirmLabel: 'Delete remote branch',
          onConfirm: () => void repoActions.deleteRemoteBranch(path, b.remote, b.name)
        })
    }
  ]

  const stashMenu = (s: StashInfo): MenuItem[] => [
    { label: 'Pop stash', onClick: () => void repoActions.stashPop(path, s.index) },
    { label: 'Apply stash (keep)', onClick: () => void repoActions.stashApply(path, s.index) },
    { separator: true },
    { label: 'Copy stash message', onClick: () => void navigator.clipboard.writeText(s.message) },
    { separator: true },
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
      label: 'Path · branch (e.g. ../feature  feature-x)',
      placeholder: '../my-worktree  branch-name',
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
      { label: `Fetch ${remoteName}`, onClick: () => void repoActions.fetchRemote(path, remoteName) },
      {
        label: `Edit ${remoteName}`,
        onClick: () =>
          openModal({
            kind: 'editRemote',
            path,
            name: remoteName,
            url: url ?? ''
          })
      },
      { separator: true },
      ...(web ? [{ label: 'Open on web', onClick: (): void => void shellApi.openExternal(web) }] : []),
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
      placeholder: 'https://github.com/org/repo.git',
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
      label: 'URL · path (e.g. https://… vendor/lib)',
      placeholder: 'https://github.com/org/repo.git  vendor/lib',
      submitLabel: t('common.add'),
      onSubmit: (value) => {
        const parts = value.trim().split(/\s+/)
        const url = parts[0]
        const dir = parts[1]
        if (!url || !dir) return
        void repoActions.submoduleAdd(path, url, dir)
      }
    })


  const sectionLabels: Record<string, string> = {
    local: t('sidebar.local'),
    remotes: t('sidebar.remotes'),
    prs: t('sidebar.pullRequests'),
    issues: t('sidebar.issues'),
    tags: t('sidebar.tags'),
    releases: t('sidebar.releases'),
    stashes: t('sidebar.stashes'),
    worktrees: t('sidebar.worktrees'),
    submodules: t('sidebar.submodules')
  }

  const toggleSection = (id: string): void =>
    updateSettings((s) => ({
      ...s,
      sidebarHidden: s.sidebarHidden.includes(id)
        ? s.sidebarHidden.filter((x) => x !== id)
        : [...s.sidebarHidden, id]
    }))

  const reorder = (from: string, to: string): void => {
    if (from === to) return
    updateSettings((s) => {
      const next = s.sidebarOrder.filter((id) => id !== from)
      const idx = next.indexOf(to)
      next.splice(idx < 0 ? next.length : idx, 0, from)
      return { ...s, sidebarOrder: next }
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
        {locals.map((b) => (
          <div
            key={b.name}
            className={`sb-item ${b.isCurrent ? 'current' : ''}`}
            onClick={() => goToBranch(b.sha)}
            onDoubleClick={() => !b.isCurrent && void repoActions.checkout(path, b.name)}
            onContextMenu={(e) => {
              e.preventDefault()
              openContextMenu(e.clientX, e.clientY, localMenu(b))
            }}
            title={`${b.name}${b.upstream ? ` → ${b.upstream}` : ''}`}
          >
            {b.isCurrent && <Check size={12} className="sb-current-mark" />}
            <span className="sb-name">{b.name}</span>
            {b.ahead > 0 && <span className="badge ahead">↑{b.ahead}</span>}
            {b.behind > 0 && <span className="badge behind">↓{b.behind}</span>}
            <Presence remoteNames={branchPresence.get(b.name) ?? []} />
          </div>
        ))}
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
              title={remote.name.toUpperCase()}
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
              {branches.map((b) => (
                <div
                  key={b.fullName}
                  className="sb-item"
                  onDoubleClick={() => void repoActions.checkoutRemote(path, b.fullName, b.name)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    openContextMenu(e.clientX, e.clientY, remoteMenu(b))
                  }}
                  title={b.fullName}
                >
                  <span className="sb-name">{b.name}</span>
                </div>
              ))}
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
              title="Create pull request"
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
        {tags.map((tag) => {
          const isPushed = repo.remoteTagNames.includes(tag.name)
          const release = releaseByTag.get(tag.name)
          const tagLink = repo.remotes.length ? tagWebLink(tag.name) : null
          return (
            <div
              key={tag.name}
              className="sb-item"
              onClick={() => goToBranch(tag.sha)}
              onContextMenu={(e) => {
                e.preventDefault()
                openContextMenu(e.clientX, e.clientY, tagMenu(tag))
              }}
              title={`${tag.name}${release ? ' · release' : ''}${repo.remotes.length ? (isPushed ? ' · pushed' : ' · local only') : ''}`}
            >
              <Tag size={11} className="sb-tag-icon" />
              <span className="sb-name">{tag.name}</span>
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
        })}
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
                {rel.draft && <span className="badge release-draft">draft</span>}
                {rel.prerelease && <span className="badge release-pre">pre</span>}
                <span
                  className="icon-btn"
                  title="Open on web"
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
            className={`sb-item ${repo.selected?.type === 'stash' && repo.selected.sha === s.sha ? 'current' : ''}`}
            onClick={() => select(path, { type: 'stash', index: s.index, sha: s.sha })}
            onContextMenu={(e) => {
              e.preventDefault()
              openContextMenu(e.clientX, e.clientY, stashMenu(s))
            }}
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

  const order = sidebarOrder.filter((id) => sections[id])
  for (const id of Object.keys(sections)) if (!order.includes(id)) order.push(id)
  const visibleOrder = order.filter((id) => !sidebarHidden.includes(id))

  const openSectionsMenu = (x: number, y: number): void => {
    const items: MenuItem[] = order.map((id) => ({
      label: `${sidebarHidden.includes(id) ? '   ' : '✓ '}${sectionLabels[id] ?? id}`,
      onClick: () => toggleSection(id)
    }))
    if (sidebarHidden.length) {
      items.push({ separator: true }, { label: t('sidebar.showAllSections'), onClick: () => updateSettings((s) => ({ ...s, sidebarHidden: [] })) })
    }
    items.push({ separator: true }, {
      label: t('sidebar.resetPanel'),
      onClick: () => {
        const sd = defaultSettings()
        updateSettings((s) => ({ ...s, sidebarOrder: sd.sidebarOrder, sidebarHidden: sd.sidebarHidden }))
      }
    })
    openContextMenu(x, y, items)
  }

  return (
    <aside className="sidebar">
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
    </aside>
  )
}
