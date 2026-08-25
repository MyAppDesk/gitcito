import { useRef, useState } from 'react'
import { Plus, FolderGit2, X, Minus, Square, Settings, Sparkles, LifeBuoy, FileText, Bell, BarChart3, BookOpen, ScrollText, CircleDot, Flag, Tag, Download, ArrowDownToLine, KeyRound, LayoutGrid, Folder, FolderOpen, FolderPlus, FolderTree, Trash2, Scale } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import type { GroupTab, RepoFolder, RepoRef, TabState } from '../../../shared/types'
import {
  findFolder,
  flattenFolders,
  folderCount,
  folderRepos,
  folderTrail,
  isSelfOrDescendant,
  rootRepos,
  subtreePaths
} from '../lib/repoFolders'
import { ProfileSwitcher } from './ProfileSwitcher'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { tabLabel } from '../lib/tabLabel'
import { repoCloseStatus, tabCloseStatus, type TabStatus } from '../lib/tabClose'
import { canonicalRepoPath, repoDisplayName } from '../lib/repoAlias'
import { todoSummary } from '../lib/todos'
import { confirmRemoveRepoFromGroup, repositoryMenuItems, requestCloseTab } from '../lib/repositoryMenuItems'
import { useT, interp } from '../i18n'

export { requestCloseTab }

// Tracing for the folder drag & drop, off by default: it logs on every dragover,
// which is unusable noise outside of debugging that specific behaviour.
const DND_DEBUG = false
const dnd = (...args: unknown[]): void => {
  if (DND_DEBUG) console.log('[dnd]', ...args)
}

/** Icon for a page tab, by page type. */
function pageTabIcon(type: string): React.JSX.Element {
  switch (type) {
    case 'notifications':
      return <Bell size={13} />
    case 'insights':
      return <BarChart3 size={13} />
    case 'wiki':
      return <BookOpen size={13} />
    case 'vault':
      return <KeyRound size={13} />
    case 'logs':
      return <ScrollText size={13} />
    case 'issue':
      return <CircleDot size={13} />
    case 'milestone':
      return <Flag size={13} />
    case 'release':
      return <Tag size={13} />
    case 'help':
      return <LifeBuoy size={13} />
    case 'licenses':
      return <Scale size={13} />
    // Explicit, so a new page type never inherits the release-notes sparkle by
    // falling through to the default.
    case 'changelog':
      return <Sparkles size={13} />
    default:
      return <FileText size={13} />
  }
}

// ── drag types ──────────────────────────────────────────────────────────────
// Tabs, repos and folders all ride the same native HTML5 drag. Folder chips are
// plain divs for exactly that reason: Chromium will not start a drag from a
// <button>, which is why they must not be one.
type DragItem =
  | { kind: 'tab'; tabId: string }
  | { kind: 'repo'; tabId: string; repoPath: string }
  | { kind: 'folder'; tabId: string; folderId: string }

type DropTarget =
  | { kind: 'before-tab' | 'after-tab'; tabId: string }
  | { kind: 'into-group'; tabId: string }
  | { kind: 'before-repo' | 'after-repo'; tabId: string; repoPath: string }
  | { kind: 'into-folder' | 'before-folder' | 'after-folder'; tabId: string; folderId: string }
  | { kind: 'eject-at'; insertBeforeTabId: string | null }

export function TitleBar(): React.JSX.Element {
  const t = useT()
  const {
    settings, setGroupActiveRepo, closeTab, setActiveTab, renameTab,
    setTabColor, toggleTabCollapsed,
    reorderTabs, moveTabIntoGroup, ejectRepoFromGroup,
    moveRepoBetweenGroups, reorderReposInGroup, moveTabToWorkspace,
    createFolder, renameFolder, setFolderColor, removeFolder,
    toggleFolderCollapsed, moveRepoToFolder, moveFolderToFolder
  } = useSettingsStore()
  const { openContextMenu, openModal } = useUIStore()
  const githubUnread = useUIStore((s) => s.githubUnread)
  const hasGithubToken = useSettingsStore((s) => !!s.activeProfile().githubToken)
  const repos = useRepoStore((s) => s.repos)
  const isMac = window.api.platform === 'darwin'

  // ── drag state ──────────────────────────────────────────────────────────
  const dragItem = useRef<DragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [draggingRepo, setDraggingRepo] = useState(false)
  const [draggingTab, setDraggingTab] = useState(false)
  // Mirror of `dropTarget` that is readable synchronously — a drop handler runs
  // before React has re-rendered with the last dragover's state.
  const dropRef = useRef<DropTarget | null>(null)
  // Whether the drop event already performed the folder move, so the dragend
  // fallback below doesn't repeat it.
  const folderMoved = useRef(false)
  const dragCancelled = useRef(false)
  const tabsRef = useRef<HTMLDivElement | null>(null)

  // When the pointer was last over a real drop target. dragend can't be trusted
  // for this: Chromium routinely reports clientX/clientY as 0 there, so asking
  // "was it released over the strip?" from its coordinates always said no.
  const lastOverAt = useRef(0)

  const setDrop = (t: DropTarget | null): void => {
    if (JSON.stringify(t) !== JSON.stringify(dropRef.current)) dnd('target', t)
    if (t) lastOverAt.current = performance.now()
    dropRef.current = t
    setDropTarget(t)
  }

  const clearDrop = (): void => setDrop(null)

  const onDragStart = (item: DragItem) => (e: React.DragEvent) => {
    dnd('dragstart', item)
    dragItem.current = item
    folderMoved.current = false
    dragCancelled.current = false
    if (item.kind === 'folder') window.addEventListener('keydown', watchCancel)
    if (item.kind === 'repo') setDraggingRepo(true)
    else setDraggingTab(true)
    e.dataTransfer.effectAllowed = 'move'
    // A drag with no payload is cancelled outright by some Chromium/Electron
    // paths, so give it one — everything real travels in `dragItem`.
    e.dataTransfer.setData('text/plain', item.kind)
    e.stopPropagation()
  }

  // Escape during a drag means "forget it" — without this the dragend fallback
  // would still apply the last hovered target.
  const watchCancel = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') dragCancelled.current = true
  }

  const onDragEnd = (): void => {
    window.removeEventListener('keydown', watchCancel)
    // Chromium sometimes refuses the drop itself (the drag snaps back and no
    // drop event ever fires) even though every dragover accepted it. dragend
    // always runs, so the move is applied here when the drop didn't do it —
    // as long as the pointer was still over a target moments earlier.
    const d = dragItem.current
    const released = performance.now() - lastOverAt.current < 600
    dnd('dragend', {
      item: d,
      moved: folderMoved.current,
      cancelled: dragCancelled.current,
      released,
      target: dropRef.current
    })
    if (d?.kind === 'folder' && !folderMoved.current && !dragCancelled.current && released) {
      applyFolderMove(d, dropRef.current)
    }
    dragItem.current = null
    folderMoved.current = false
    dragCancelled.current = false
    setDraggingRepo(false)
    setDraggingTab(false)
    clearDrop()
  }

  // Middle-click closes a tab/repo. preventDefault on mousedown suppresses
  // the browser autoscroll cursor.
  const middleClose = (fn: () => void) => ({
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    },
    onAuxClick: (e: React.MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      e.stopPropagation()
      fn()
    }
  })

  const sideOf = (e: React.DragEvent): 'before' | 'after' => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
  }

  // For a repo dropped onto a group: edge quarters place it beside the group,
  // the middle adds it into the group. Lets a standalone repo escape to first/last.
  const edgeZone = (e: React.DragEvent): 'before' | 'into' | 'after' => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width * 0.25) return 'before'
    if (x > rect.width * 0.75) return 'after'
    return 'into'
  }

  const onDragOverTab = (tabId: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const d = dragItem.current
    if (!d) return
    if (d.kind === 'tab' && d.tabId === tabId) return clearDrop()
    // A folder never leaves its group: over its own group it means "lift out to
    // the group root", over any other tab it means nothing.
    if (d.kind === 'folder') {
      if (d.tabId === tabId) setDrop({ kind: 'into-group', tabId })
      else clearDrop()
      return
    }
    const tab = settings.tabs.find((t) => t.id === tabId)
    // A repo — either ejected from a group or a standalone repo tab — dropped on
    // a group: edge quarters place it before/after the group, middle adds it in.
    const fromTab = d.kind === 'tab' ? settings.tabs.find((t) => t.id === d.tabId) : null
    const repoOntoGroup =
      tab?.kind === 'group' &&
      ((d.kind === 'repo' && d.tabId !== tabId) || (d.kind === 'tab' && fromTab?.kind === 'repo'))
    if (repoOntoGroup) {
      const z = edgeZone(e)
      if (z === 'into') setDrop({ kind: 'into-group', tabId })
      else setDrop({ kind: z === 'before' ? 'before-tab' : 'after-tab', tabId })
      return
    }
    const side = sideOf(e)
    setDrop({ kind: side === 'before' ? 'before-tab' : 'after-tab', tabId })
  }

  const onDragOverRepo = (tabId: string, repoPath: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const d = dragItem.current
    if (!d) return
    // A folder dragged over a repo means the container that repo lives in — let
    // it bubble to the folder (or the group) instead of eating the event.
    if (d.kind === 'folder') return
    e.stopPropagation()
    if (d.kind === 'repo' && d.tabId === tabId && d.repoPath === repoPath) return clearDrop()
    const side = sideOf(e)
    setDrop({ kind: side === 'before' ? 'before-repo' : 'after-repo', tabId, repoPath })
  }

  /** True when this folder can't accept the folder currently being dragged —
   *  itself or anything under it, which would detach the branch. */
  const folderRejects = (tabId: string, folderId: string): boolean => {
    const d = dragItem.current
    if (d?.kind !== 'folder') return false
    return rejectsFolder(d, tabId, folderId)
  }

  const rejectsFolder = (
    d: Extract<DragItem, { kind: 'folder' }>,
    tabId: string,
    folderId: string
  ): boolean => {
    if (d.tabId !== tabId) return true
    const group = settings.tabs.find((t): t is GroupTab => t.id === tabId && t.kind === 'group')
    return !group || isSelfOrDescendant(group.folders ?? [], d.folderId, folderId)
  }

  /** The single place a folder move is performed, whatever the target and
   *  whichever event got there first (drop, or dragend as the fallback). */
  const applyFolderMove = (d: Extract<DragItem, { kind: 'folder' }>, t: DropTarget | null): void => {
    dnd('apply', { dragged: d.folderId, target: t })
    if (!t) return
    folderMoved.current = true
    switch (t.kind) {
      case 'into-folder':
        if (!rejectsFolder(d, t.tabId, t.folderId)) moveFolderToFolder(t.tabId, d.folderId, t.folderId)
        return
      case 'before-folder':
      case 'after-folder':
        if (!rejectsFolder(d, t.tabId, t.folderId)) {
          placeFolderBeside(t.tabId, d.folderId, t.folderId, t.kind === 'before-folder')
        }
        return
      case 'into-group':
        // Dropped on its own group: lift it out to the group root.
        if (t.tabId === d.tabId) moveFolderToFolder(d.tabId, d.folderId, null)
        return
      case 'eject-at':
        // A folder can't leave its group, so a gap in the strip means the next
        // best thing: up to the group root.
        moveFolderToFolder(d.tabId, d.folderId, null)
        return
      default:
        folderMoved.current = false
    }
  }

  // Over the CHIP: the outer thirds reorder beside the folder, the middle nests
  // inside it — the same edge-zone idea the group chip uses for repos.
  const onDragOverFolderChip = (tabId: string, folderId: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    // Spelling the effect out keeps Chromium from computing 'none' and then
    // refusing the drop with a snap-back.
    e.dataTransfer.dropEffect = 'move'
    const d = dragItem.current
    if (!d) return
    if (folderRejects(tabId, folderId)) return clearDrop()
    if (d.kind === 'folder') {
      const z = edgeZone(e)
      if (z !== 'into') {
        setDrop({ kind: z === 'before' ? 'before-folder' : 'after-folder', tabId, folderId })
        return
      }
    }
    setDrop({ kind: 'into-folder', tabId, folderId })
  }

  // Over the REST of the folder (its repos, its gaps): always "into", so the
  // drop doesn't have to land on the chip itself.
  const onDragOverFolder = (tabId: string, folderId: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (!dragItem.current) return
    if (folderRejects(tabId, folderId)) return clearDrop()
    setDrop({ kind: 'into-folder', tabId, folderId })
  }

  const onDropFolder = (tabId: string, folderId: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const d = dragItem.current
    dnd('drop on folder', { folderId, item: d, target: dropRef.current })
    if (!d) return clearDrop()

    if (d.kind === 'folder') {
      // Prefer what the last dragover computed (nest vs reorder); fall back to
      // "nest here" if that state hasn't landed yet.
      const t = dropRef.current
      const usable =
        t && (t.kind === 'into-folder' || t.kind === 'before-folder' || t.kind === 'after-folder')
          ? t
          : ({ kind: 'into-folder', tabId, folderId } as DropTarget)
      applyFolderMove(d, usable)
    } else if (d.kind === 'repo') {
      // Cross-group drops join the group first, then land in the folder.
      if (d.tabId !== tabId) moveRepoBetweenGroups(d.tabId, d.repoPath, tabId, null)
      moveRepoToFolder(tabId, d.repoPath, folderId)
    } else {
      const from = settings.tabs.find((t) => t.id === d.tabId)
      const repo = from?.kind === 'repo' ? from.repos[0] : null
      if (repo) {
        moveTabIntoGroup(d.tabId, tabId)
        moveRepoToFolder(tabId, repo.path, folderId)
      }
    }
    clearDrop()
  }

  /** Drop a folder beside `targetId`, at the target's own level. Positions are
   *  read from the sibling list WITHOUT the dragged folder, so dropping it
   *  after its own left-hand neighbour doesn't anchor on itself. */
  const placeFolderBeside = (tabId: string, folderId: string, targetId: string, before: boolean): void => {
    const group = settings.tabs.find((t): t is GroupTab => t.id === tabId && t.kind === 'group')
    if (!group) return
    const tree = group.folders ?? []
    const entry = flattenFolders(tree).find((x) => x.folder.id === targetId)
    if (!entry) return
    const siblings = entry.parentId ? (findFolder(tree, entry.parentId)?.folders ?? []) : tree
    const rest = siblings.filter((f) => f.id !== folderId)
    const idx = rest.findIndex((f) => f.id === targetId)
    const beforeId = before ? targetId : (rest[idx + 1]?.id ?? null)
    moveFolderToFolder(tabId, folderId, entry.parentId, beforeId)
  }

  // ── drop zones (eject to standalone) ────────────────────────────────────
  const onDragOverZone = (insertBeforeTabId: string | null) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (!dragItem.current) return
    setDrop({ kind: 'eject-at', insertBeforeTabId })
  }

  const onDropZone = (insertBeforeTabId: string | null) => (e: React.DragEvent): void => {
    e.preventDefault()
    const d = dragItem.current
    dnd('drop on zone', { insertBeforeTabId, item: d, target: dropRef.current })
    if (!d) return clearDrop()
    if (d.kind === 'folder') {
      applyFolderMove(d, { kind: 'eject-at', insertBeforeTabId })
      clearDrop()
      return
    }
    if (d.kind === 'repo') {
      ejectRepoFromGroup(d.tabId, d.repoPath, insertBeforeTabId)
    } else {
      // Reorder a top-level tab into this gap. null → trailing gap (after last).
      if (insertBeforeTabId) reorderTabs(d.tabId, insertBeforeTabId, true)
      else {
        const last = settings.tabs[settings.tabs.length - 1]
        if (last) reorderTabs(d.tabId, last.id, false)
      }
    }
    clearDrop()
  }

  // Spring-loaded folders: hovering a collapsed one during a drag opens it
  // after a beat, so a drag can reach inside without dropping first.
  const hoverOpen = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)

  const cancelHoverOpen = (): void => {
    if (hoverOpen.current) clearTimeout(hoverOpen.current.timer)
    hoverOpen.current = null
  }

  const armHoverOpen = (tabId: string, folder: RepoFolder): void => {
    if (!folder.collapsed || hoverOpen.current?.id === folder.id) return
    cancelHoverOpen()
    hoverOpen.current = {
      id: folder.id,
      timer: setTimeout(() => {
        hoverOpen.current = null
        toggleFolderCollapsed(tabId, folder.id)
      }, 550)
    }
  }

  const isZoneActive = (insertBeforeTabId: string | null): boolean => {
    if (dropTarget?.kind !== 'eject-at') return false
    return insertBeforeTabId === null
      ? dropTarget.insertBeforeTabId === null
      : dropTarget.insertBeforeTabId === insertBeforeTabId
  }

  const onDropTab = (tabId: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    const d = dragItem.current
    dnd('drop on tab', { tabId, item: d, target: dropRef.current })
    if (!d) return clearDrop()
    // Folders first, and off the ref: the state copy can still be null here
    // when the drop lands right after the dragover that set it.
    if (d.kind === 'folder') {
      applyFolderMove(d, dropRef.current)
      clearDrop()
      return
    }
    const dt = dropRef.current ?? dropTarget
    if (!dt) return clearDrop()

    if (dt.kind === 'into-group') {
      if (d.kind === 'tab') moveTabIntoGroup(d.tabId, tabId)
      // Same group: the repo leaves whatever folder held it and returns to the
      // group root. Different group: it changes group and lands at the root.
      else if (d.tabId !== tabId) moveRepoBetweenGroups(d.tabId, d.repoPath, tabId, null)
      else moveRepoToFolder(tabId, d.repoPath, null)
    } else if (dt.kind === 'before-tab' || dt.kind === 'after-tab') {
      if (d.kind === 'tab') {
        reorderTabs(d.tabId, tabId, dt.kind === 'before-tab')
      } else if (d.kind === 'repo') {
        if (dt.kind === 'before-tab') {
          ejectRepoFromGroup(d.tabId, d.repoPath, tabId)
        } else {
          const idx = settings.tabs.findIndex((t) => t.id === tabId)
          const next = settings.tabs[idx + 1]
          ejectRepoFromGroup(d.tabId, d.repoPath, next?.id ?? null)
        }
      }
    }
    clearDrop()
  }

  const onDropRepo = (tabId: string, repoPath: string) => (e: React.DragEvent): void => {
    const d = dragItem.current
    // Folders are handled by the container this repo sits in — let the event
    // bubble there untouched.
    if (d?.kind === 'folder') return
    e.preventDefault()
    const dt = dropRef.current ?? dropTarget
    if (!d || !dt) return clearDrop()

    // Order lives per container: repos inside a folder are ordered by that
    // folder's own path list, root repos by the group's repo list. So a drop
    // beside a repo first has to work out which container it landed in.
    const group = settings.tabs.find((t): t is GroupTab => t.id === tabId && t.kind === 'group')
    const owner =
      flattenFolders(group?.folders ?? []).find((x) => x.folder.paths.includes(repoPath))?.folder ?? null
    const siblings = owner
      ? folderRepos(owner, group?.repos ?? [])
      : rootRepos(group?.repos ?? [], group?.folders)
    const targetIdx = siblings.findIndex((r) => r.path === repoPath)
    const before = dt.kind === 'after-repo' ? (siblings[targetIdx + 1]?.path ?? null) : repoPath

    if (d.kind === 'repo') {
      if (d.tabId === tabId) {
        if (owner) {
          moveRepoToFolder(tabId, d.repoPath, owner.id, before)
        } else {
          moveRepoToFolder(tabId, d.repoPath, null)
          reorderReposInGroup(tabId, d.repoPath, before)
        }
      } else {
        moveRepoBetweenGroups(d.tabId, d.repoPath, tabId, owner ? null : before)
        if (owner) moveRepoToFolder(tabId, d.repoPath, owner.id, before)
      }
    } else if (d.kind === 'tab') {
      const from = settings.tabs.find((t) => t.id === d.tabId)
      const moved = from?.kind === 'repo' ? from.repos[0] : null
      moveTabIntoGroup(d.tabId, tabId)
      if (owner && moved) moveRepoToFolder(tabId, moved.path, owner.id, before)
    }
    clearDrop()
  }

  const dropClass = (
    target: DropTarget | null,
    kind: DropTarget['kind'],
    tabId: string,
    repoPath?: string,
    folderId?: string
  ): string => {
    if (!target) return ''
    if (target.kind !== kind) return ''
    if ('tabId' in target && target.tabId !== tabId) return ''
    if ((target.kind === 'before-repo' || target.kind === 'after-repo') && target.repoPath !== repoPath) return ''
    if (target.kind === 'into-folder' && target.folderId !== folderId) return ''
    return `drop-${kind}`
  }

  // ── status helpers ──────────────────────────────────────────────────────
  const tabStatus = (tab: TabState): TabStatus =>
    tab.kind === 'page' ? null : tabCloseStatus(tab.repos, repos)

  const repoStatus = (path: string): TabStatus => repoCloseStatus(repos[path])

  // Open todos ride next to the working-tree dot: the same glance that says
  // "uncommitted work here" should say "and something you asked yourself to do".
  const repoTodos = (path: string): number =>
    todoSummary(settings.repoTodos?.[canonicalRepoPath(path)]).open
  const tabTodos = (tab: TabState): number =>
    tab.kind === 'page' ? 0 : tab.repos.reduce((n, r) => n + repoTodos(r.path), 0)

  // Aggregate ahead/behind + dirty repo count across a whole group, for the
  // chip badge + tooltip so the group's sync state is visible without opening
  // each repo.
  const groupAgg = (tab: GroupTab): { ahead: number; behind: number; dirty: number } => {
    let ahead = 0
    let behind = 0
    let dirty = 0
    for (const ref of tab.repos) {
      const st = repos[ref.path]?.status
      if (!st) continue
      ahead += st.ahead
      behind += st.behind
      if (st.staged.length + st.unstaged.length > 0) dirty++
    }
    return { ahead, behind, dirty }
  }

  // ── menus ───────────────────────────────────────────────────────────────
  const plusMenu = (): void => openModal({ kind: 'launcher' })

  const confirmRemoveRepo = (groupTabId: string, repoPath: string): void =>
    confirmRemoveRepoFromGroup(groupTabId, repoPath)

  // "Move to workspace →" submenu — only offered when another workspace exists.
  const moveToWorkspaceItem = (tab: TabState): MenuItem | null => {
    const others = settings.workspaces.filter((w) => w.id !== settings.activeWorkspaceId)
    if (others.length === 0) return null
    return {
      label: t('titlebar.moveToWorkspace'),
      icon: <LayoutGrid size={15} />,
      submenu: others.map((w) => ({
        label: w.name,
        onClick: () => moveTabToWorkspace(tab.id, w.id)
      }))
    }
  }

  const tabMenu = (tab: TabState): MenuItem[] => {
    if (tab.kind === 'page') {
      const move = moveToWorkspaceItem(tab)
      return [
        ...(move ? [move, { separator: true } as MenuItem] : []),
        { label: t('titlebar.closeTab'), onClick: () => closeTab(tab.id) }
      ]
    }
    if (tab.kind === 'repo' && tab.repos[0]) {
      const extras: MenuItem[] = []
      const move = moveToWorkspaceItem(tab)
      if (move) extras.push(move)
      return repositoryMenuItems(tab.repos[0].path, () => requestCloseTab(tab.id), extras)
    }
    const items: MenuItem[] = []
    if (tab.kind === 'group') {
      if (tab.repos.length > 0) {
        const paths = tab.repos.map((r) => r.path)
        items.push({
          label: interp(t('titlebar.fetchAll'), { count: paths.length }),
          icon: <Download size={15} />,
          onClick: () => void repoActions.batch(paths, 'fetch')
        })
        items.push({
          label: interp(t('titlebar.pullAll'), { count: paths.length }),
          icon: <ArrowDownToLine size={15} />,
          onClick: () => void repoActions.batch(paths, 'pull')
        })
        items.push({ separator: true })
      }
      items.push({
        label: t('titlebar.manageRepos'),
        onClick: () => openModal({ kind: 'launcher', groupId: tab.id })
      })
      items.push({
        label: t('titlebar.newFolderMenu'),
        icon: <FolderPlus size={15} />,
        onClick: () => promptNewFolder(tab.id, null)
      })
      items.push({
        label: t('titlebar.changeColor'),
        onClick: () =>
          openModal({
            kind: 'group-color',
            tabId: tab.id,
            current: tab.color,
            onSelect: (color) => setTabColor(tab.id, color)
          })
      })
      if (tab.activeRepoPath) {
        items.push({
          label: t('titlebar.viewGroupHome'),
          onClick: () => setGroupActiveRepo(tab.id, null)
        })
      }
      items.push({ separator: true })
    }
    items.push({
      label: t('titlebar.rename'),
      onClick: () =>
        openModal({
          kind: 'input',
          title: t('titlebar.renameTab'),
          label: t('modal.name'),
          initial: tab.name,
          submitLabel: 'Rename',
          onSubmit: (name) => renameTab(tab.id, name)
        })
    })
    const move = moveToWorkspaceItem(tab)
    if (move) items.push(move)
    items.push({ separator: true }, { label: t('titlebar.closeTab'), onClick: () => requestCloseTab(tab.id) })
    return items
  }

  // ── folders inside a group ──────────────────────────────────────────────
  const promptNewFolder = (tabId: string, parentFolderId: string | null): void =>
    openModal({
      kind: 'input',
      title: parentFolderId ? t('titlebar.newSubfolder') : t('titlebar.newFolder'),
      label: t('titlebar.folderName'),
      initial: '',
      submitLabel: t('common.create'),
      onSubmit: (name) => {
        const trimmed = name.trim()
        if (trimmed) createFolder(tabId, trimmed, parentFolderId)
      }
    })

  /** "Move to folder →" submenu: the group root plus every folder in the tree,
   *  labelled with its full trail so deep nestings stay unambiguous. */
  const moveRepoToFolderItem = (tab: GroupTab, repoPath: string): MenuItem | null => {
    const all = flattenFolders(tab.folders ?? [])
    if (!all.length) return null
    const current = all.find((x) => x.folder.paths.includes(repoPath))?.folder.id ?? null
    return {
      label: t('titlebar.moveToFolder'),
      icon: <Folder size={15} />,
      submenu: [
        { label: t('titlebar.groupRoot'), disabled: current === null, onClick: () => moveRepoToFolder(tab.id, repoPath, null) },
        ...all.map(({ folder }) => ({
          label: folderTrail(tab.folders ?? [], folder.id),
          disabled: folder.id === current,
          onClick: () => moveRepoToFolder(tab.id, repoPath, folder.id)
        }))
      ]
    }
  }

  /** Same list for a folder itself, minus anywhere it can't legally go (its own
   *  subtree) — that would detach the branch from the tree. */
  const moveFolderItem = (tab: GroupTab, folder: RepoFolder): MenuItem | null => {
    const tree = tab.folders ?? []
    const targets = flattenFolders(tree).filter((x) => !isSelfOrDescendant(tree, folder.id, x.folder.id))
    const atRoot = tree.some((f) => f.id === folder.id)
    if (!targets.length && atRoot) return null
    return {
      label: t('titlebar.moveFolderTo'),
      icon: <FolderTree size={15} />,
      submenu: [
        { label: t('titlebar.groupRoot'), disabled: atRoot, onClick: () => moveFolderToFolder(tab.id, folder.id, null) },
        ...targets.map((x) => ({
          label: folderTrail(tree, x.folder.id),
          onClick: () => moveFolderToFolder(tab.id, folder.id, x.folder.id)
        }))
      ]
    }
  }

  const folderMenu = (tab: GroupTab, folder: RepoFolder): MenuItem[] => {
    const paths = subtreePaths(folder)
    const items: MenuItem[] = []
    if (paths.length > 0) {
      items.push({
        label: interp(t('titlebar.fetchAll'), { count: paths.length }),
        icon: <Download size={15} />,
        onClick: () => void repoActions.batch(paths, 'fetch')
      })
      items.push({
        label: interp(t('titlebar.pullAll'), { count: paths.length }),
        icon: <ArrowDownToLine size={15} />,
        onClick: () => void repoActions.batch(paths, 'pull')
      })
      items.push({ separator: true })
    }
    items.push({
      label: t('titlebar.newSubfolderMenu'),
      icon: <FolderPlus size={15} />,
      onClick: () => promptNewFolder(tab.id, folder.id)
    })
    items.push({
      label: t('titlebar.rename'),
      onClick: () =>
        openModal({
          kind: 'input',
          title: t('titlebar.renameFolder'),
          label: t('titlebar.folderName'),
          initial: folder.name,
          submitLabel: t('common.rename'),
          onSubmit: (name) => {
            const trimmed = name.trim()
            if (trimmed) renameFolder(tab.id, folder.id, trimmed)
          }
        })
    })
    items.push({
      label: t('titlebar.changeColor'),
      onClick: () =>
        openModal({
          kind: 'group-color',
          tabId: tab.id,
          current: folder.color ?? tab.color,
          onSelect: (color) => setFolderColor(tab.id, folder.id, color)
        })
    })
    const move = moveFolderItem(tab, folder)
    if (move) items.push(move)
    items.push(
      { separator: true },
      {
        label: t('titlebar.deleteFolder'),
        icon: <Trash2 size={15} />,
        danger: true,
        // Deleting only unpacks the folder: its repos and subfolders move up to
        // the parent, so nothing leaves the group.
        onClick: () => removeFolder(tab.id, folder.id)
      }
    )
    return items
  }

  const repoInGroupMenu = (groupTab: GroupTab, repoPath: string): MenuItem[] => {
    // With folders in play, offer to file the repo; with none yet, offer to
    // make the first one.
    const filing: MenuItem = moveRepoToFolderItem(groupTab, repoPath) ?? {
      label: t('titlebar.newFolderMenu'),
      icon: <FolderPlus size={15} />,
      onClick: () => promptNewFolder(groupTab.id, null)
    }
    return repositoryMenuItems(
      repoPath,
      () => confirmRemoveRepo(groupTab.id, repoPath),
      [
        filing,
        { separator: true },
        {
          label: t('titlebar.eject'),
          onClick: () => ejectRepoFromGroup(groupTab.id, repoPath, null)
        }
      ]
    )
  }

  // Worst status found anywhere under a folder, so a collapsed folder still
  // shows that something inside needs attention.
  const folderStatus = (folder: RepoFolder): TabStatus => {
    let wip = false
    for (const path of subtreePaths(folder)) {
      const st = repoStatus(path)
      if (st === 'conflict') return 'conflict'
      if (st === 'wip') wip = true
    }
    return wip ? 'wip' : null
  }

  // One repository chip inside a group — same markup whether it sits at the
  // group root or several folders deep.
  const renderRepoChip = (tab: GroupTab, repo: RepoRef): React.JSX.Element => {
    const isActiveRepo = tab.id === settings.activeTabId && tab.activeRepoPath === repo.path
    const rs = repoStatus(repo.path)
    const repoDc =
      dropClass(dropTarget, 'before-repo', tab.id, repo.path) ||
      dropClass(dropTarget, 'after-repo', tab.id, repo.path)
    return (
      <motion.div
        key={repo.path}
        layout
        className={`tab in-group ${isActiveRepo ? 'active' : ''} ${repoDc}`}
        draggable
        onDragStart={onDragStart({ kind: 'repo', tabId: tab.id, repoPath: repo.path }) as any}
        onDragEnd={onDragEnd as any}
        onDragOver={onDragOverRepo(tab.id, repo.path)}
        onDrop={onDropRepo(tab.id, repo.path)}
        {...middleClose(() => confirmRemoveRepo(tab.id, repo.path))}
        onClick={() => {
          setActiveTab(tab.id)
          setGroupActiveRepo(tab.id, repo.path)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          openContextMenu(e.clientX, e.clientY, repoInGroupMenu(tab, repo.path))
        }}
        initial={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
        animate={{ opacity: 1, width: 'auto', paddingLeft: 12, paddingRight: 8 }}
        exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <FolderGit2 size={13} />
        <span className="tab-name">{repoDisplayName(repo.path, settings.repoAliases, repo.name)}</span>
        {rs && (
          <span
            className={`tab-status tab-status-${rs}`}
            title={rs === 'conflict' ? t('titlebar.conflictsInProgress') : t('titlebar.uncommittedChangesShort')}
          />
        )}
        {repoTodos(repo.path) > 0 && (
          <span
            className="tab-todo-dot"
            title={interp(t('todos.openBadge'), { n: repoTodos(repo.path) })}
          />
        )}
        <button
          className="tab-close"
          aria-label={interp(t('a11y.closeTab'), { name: repoDisplayName(repo.path, settings.repoAliases, repo.name) })}
          title={interp(t('a11y.closeTab'), { name: repoDisplayName(repo.path, settings.repoAliases, repo.name) })}
          onClick={(e) => {
            e.stopPropagation()
            confirmRemoveRepo(tab.id, repo.path)
          }}
        >
          <X size={12} />
        </button>
      </motion.div>
    )
  }

  // A folder and everything under it. Recurses, so nesting has no depth limit;
  // `depth` only drives the tint that separates one level from the next.
  const renderFolder = (tab: GroupTab, folder: RepoFolder, depth: number): React.JSX.Element => {
    const count = folderCount(folder)
    const st = folderStatus(folder)
    const dc =
      dropClass(dropTarget, 'into-folder', tab.id, undefined, folder.id) ||
      dropClass(dropTarget, 'before-folder', tab.id, undefined, folder.id) ||
      dropClass(dropTarget, 'after-folder', tab.id, undefined, folder.id)
    const openMenu = (e: React.MouseEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      openContextMenu(e.clientX, e.clientY, folderMenu(tab, folder))
    }
    return (
      <div
        key={folder.id}
        // The whole folder — chip, its repos, its gaps — accepts drops, so a
        // drop doesn't have to land on the small chip. Nested folders stop
        // propagation, so the innermost one under the pointer wins.
        className={`tab-folder ${folder.collapsed ? 'collapsed' : ''} ${dc}`}
        style={
          {
            '--folder-color': folder.color ?? tab.color ?? '#6366f1',
            '--folder-depth': depth
          } as React.CSSProperties
        }
        onDragOver={onDragOverFolder(tab.id, folder.id)}
        onDrop={onDropFolder(tab.id, folder.id)}
        onDragEnd={onDragEnd}
        onContextMenu={openMenu}
      >
        <div
          // A div, not a button: Chromium never starts a native drag from a
          // form control, which is why folders wouldn't drag at all before.
          role="button"
          tabIndex={0}
          className="tab-folder-chip"
          title={`${folder.name} — ${count} ${count === 1 ? t('batch.repository') : t('batch.repositories')}${
            folder.collapsed ? ' (collapsed)' : ''
          } · drag to nest, reorder or lift out`}
          draggable
          onDragStart={onDragStart({ kind: 'folder', tabId: tab.id, folderId: folder.id })}
          onDragEnd={onDragEnd}
          onDragOver={onDragOverFolderChip(tab.id, folder.id)}
          onDragEnter={() => armHoverOpen(tab.id, folder)}
          onDragLeave={cancelHoverOpen}
          onDrop={onDropFolder(tab.id, folder.id)}
          onClick={() => toggleFolderCollapsed(tab.id, folder.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') toggleFolderCollapsed(tab.id, folder.id)
          }}
          onContextMenu={openMenu}
        >
          {folder.collapsed ? <Folder size={12} /> : <FolderOpen size={12} />}
          <span className="tab-folder-name">{folder.name}</span>
          <span className="tab-folder-count">{count}</span>
          {st && (
            <span
              className={`tab-status tab-status-${st}`}
              title={st === 'conflict' ? t('titlebar.conflictsInProgress') : t('titlebar.uncommittedChangesShort')}
            />
          )}
        </div>
        {!folder.collapsed && (
          <>
            {folderRepos(folder, tab.repos).map((repo) => renderRepoChip(tab, repo))}
            {(folder.folders ?? []).map((sub) => renderFolder(tab, sub, depth + 1))}
          </>
        )}
      </div>
    )
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className={`titlebar ${isMac ? 'mac' : ''}`}>
      <WorkspaceSwitcher />
      <div
        className="tabs"
        ref={tabsRef}
        role="tablist"
        aria-label={t('a11y.tabStrip')}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={clearDrop}
      >
        {settings.tabs.flatMap((tab) => {
          // Drop zone placed BEFORE each top-level tab — only active while dragging a repo
          const zone = (
            <div
              key={`zone-${tab.id}`}
              className={`tab-drop-zone ${(draggingRepo || draggingTab) ? 'visible' : ''} ${isZoneActive(tab.id) ? 'active' : ''}`}
              onDragOver={onDragOverZone(tab.id)}
              onDrop={onDropZone(tab.id)}
              onDragLeave={clearDrop}
            />
          )

          if (tab.kind === 'repo') {
            const status = tabStatus(tab)
            const dc = dropClass(dropTarget, 'before-tab', tab.id) || dropClass(dropTarget, 'after-tab', tab.id)
            return [
              zone,
              <motion.div
                key={tab.id}
                layout
                className={`tab ${tab.id === settings.activeTabId ? 'active' : ''} ${dc}`}
                role="tab"
                aria-selected={tab.id === settings.activeTabId}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveTab(tab.id)
                  }
                }}
                draggable
                onDragStart={onDragStart({ kind: 'tab', tabId: tab.id }) as any}
                onDragEnd={onDragEnd as any}
                onDragOver={onDragOverTab(tab.id)}
                onDrop={onDropTab(tab.id)}
                {...middleClose(() => requestCloseTab(tab.id))}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openContextMenu(e.clientX, e.clientY, tabMenu(tab))
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <FolderGit2 size={13} />
                <span className="tab-name">{tab.name}</span>
                {status && (
                  <span
                    className={`tab-status tab-status-${status}`}
                    title={status === 'conflict' ? t('titlebar.conflictsInProgress') : t('titlebar.uncommittedChangesShort')}
                  />
                )}
                {tabTodos(tab) > 0 && (
                  <span className="tab-todo-dot" title={interp(t('todos.openBadge'), { n: tabTodos(tab) })} />
                )}
                <button
                  className="tab-close"
                  aria-label={interp(t('a11y.closeTab'), { name: tab.name })}
                  title={interp(t('a11y.closeTab'), { name: tab.name })}
                  onClick={(e) => {
                    e.stopPropagation()
                    requestCloseTab(tab.id)
                  }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ]
          }

          if (tab.kind === 'page') {
            const dc = dropClass(dropTarget, 'before-tab', tab.id) || dropClass(dropTarget, 'after-tab', tab.id)
            return [
              zone,
              <motion.div
                key={tab.id}
                layout
                className={`tab tab-page ${tab.id === settings.activeTabId ? 'active' : tab.page.type === 'changelog' ? 'tab-shimmer' : ''} ${dc}`}
                role="tab"
                aria-selected={tab.id === settings.activeTabId}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveTab(tab.id)
                  }
                }}
                draggable
                onDragStart={onDragStart({ kind: 'tab', tabId: tab.id }) as any}
                onDragEnd={onDragEnd as any}
                onDragOver={onDragOverTab(tab.id)}
                onDrop={onDropTab(tab.id)}
                {...middleClose(() => closeTab(tab.id))}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openContextMenu(e.clientX, e.clientY, tabMenu(tab))
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                {pageTabIcon(tab.page.type)}
                <span className="tab-name">{tabLabel(tab, t)}</span>
                <button
                  className="tab-close"
                  aria-label={interp(t('a11y.closeTab'), { name: tabLabel(tab, t) })}
                  title={interp(t('a11y.closeTab'), { name: tabLabel(tab, t) })}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ]
          }

          // group tab
          const groupColor = tab.color ?? '#6366f1'
          const isActiveGroup = tab.id === settings.activeTabId
          const groupStatus = tabStatus(tab)
          const agg = groupAgg(tab)
          const aggTip = [
            `${tab.repos.length} ${tab.repos.length === 1 ? 'repository' : 'repositories'}`,
            agg.ahead ? `↑${agg.ahead} to push` : '',
            agg.behind ? `↓${agg.behind} to pull` : '',
            agg.dirty ? `${agg.dirty} with changes` : ''
          ].filter(Boolean).join(' · ')

          const handleGroupContext = (e: React.MouseEvent): void => {
            e.preventDefault()
            e.stopPropagation()
            openContextMenu(e.clientX, e.clientY, tabMenu(tab))
          }

          // Collapsed: only the repo in view survives, wherever it is filed.
          // Expanded: unfiled repos first, then the folder trees.
          const looseRepos = tab.collapsed
            ? tab.repos.filter((r) => isActiveGroup && r.path === tab.activeRepoPath)
            : rootRepos(tab.repos, tab.folders)
          const visibleFolders = tab.collapsed ? [] : (tab.folders ?? [])

          const chipDc = dropClass(dropTarget, 'into-group', tab.id)
          const wrapDc = dropClass(dropTarget, 'before-tab', tab.id) || dropClass(dropTarget, 'after-tab', tab.id)

          return [
            zone,
            <div
              key={tab.id}
              className={`tab-group-wrap ${tab.collapsed ? 'collapsed' : ''} ${isActiveGroup ? 'active-group' : ''} ${wrapDc}`}
              style={{ '--group-color': groupColor } as React.CSSProperties}
              onContextMenu={handleGroupContext}
              onDragOver={onDragOverTab(tab.id)}
              onDrop={onDropTab(tab.id)}
            >
              <button
                className={`tab-group-chip ${chipDc}`}
                title={`${tab.collapsed ? t('common.expand') : t('common.collapse')} — ${aggTip}`}
                draggable
                onDragStart={onDragStart({ kind: 'tab', tabId: tab.id })}
                onDragEnd={onDragEnd}
                {...middleClose(() => requestCloseTab(tab.id))}
                onClick={() => toggleTabCollapsed(tab.id)}
                onContextMenu={handleGroupContext}
              >
                {tab.name}
                {(agg.ahead > 0 || agg.behind > 0) && (
                  <span className="tab-group-badge">
                    {agg.ahead > 0 && <span>↑{agg.ahead}</span>}
                    {agg.behind > 0 && <span>↓{agg.behind}</span>}
                  </span>
                )}
                {groupStatus && (
                  <span
                    className={`tab-status tab-status-${groupStatus}`}
                    title={groupStatus === 'conflict' ? t('titlebar.conflictsInProgress') : t('titlebar.uncommittedChangesShort')}
                  />
                )}
              </button>
              {tab.repos.length > 0 && (
                <button
                  className="tab-group-sync"
                  title={interp(t('titlebar.fetchAllTitle'), {
                    count: tab.repos.length,
                    repoWord:
                      tab.repos.length === 1 ? t('batch.repository') : t('batch.repositories')
                  })}
                  onClick={(e) => {
                    e.stopPropagation()
                    void repoActions.batch(tab.repos.map((r) => r.path), 'fetch')
                  }}
                >
                  <Download size={12} />
                </button>
              )}

              <AnimatePresence initial={false}>
                {looseRepos.map((repo) => renderRepoChip(tab, repo))}
              </AnimatePresence>
              {visibleFolders.map((folder) => renderFolder(tab, folder, 0))}
            </div>
          ]
        })}
        {/* trailing zone — drop here to eject to end of tab bar */}
        <div
          className={`tab-drop-zone ${(draggingRepo || draggingTab) ? 'visible' : ''} ${isZoneActive(null) ? 'active' : ''}`}
          onDragOver={onDragOverZone(null)}
          onDrop={onDropZone(null)}
          onDragLeave={clearDrop}
        />
        <button className="tab-add" title={t('titlebar.openRepoOrGroup')} onClick={() => plusMenu()}>
          <Plus size={15} />
        </button>
      </div>
      <ProfileSwitcher />
      {/* A typed token or a live inbox: the credential-helper fallback can
          feed the badge without any token in Settings. */}
      {(hasGithubToken || githubUnread > 0) && (
        <button
          className="titlebar-action notif-bell"
          title={t('titlebar.notifications')}
          onClick={() => useSettingsStore.getState().openPageTab({ type: 'notifications' })}
        >
          <Bell size={16} />
          {githubUnread > 0 && <span className="notif-badge">{githubUnread > 99 ? '99+' : githubUnread}</span>}
        </button>
      )}
      <button
        className="titlebar-action"
        title={t('titlebar.settings')}
        onClick={() => openModal({ kind: 'settings' })}
      >
        <Settings size={16} />
      </button>
      {!isMac && (
        <div className="window-controls">
          <button aria-label={t('a11y.windowMinimize')} title={t('a11y.windowMinimize')} onClick={() => window.api.window.minimize()}>
            <Minus size={14} />
          </button>
          <button aria-label={t('a11y.windowMaximize')} title={t('a11y.windowMaximize')} onClick={() => window.api.window.maximize()}>
            <Square size={11} />
          </button>
          <button className="win-close" aria-label={t('a11y.windowClose')} title={t('a11y.windowClose')} onClick={() => window.api.window.close()}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
