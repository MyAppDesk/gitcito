import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, File, Folder, FolderOpen, Loader2, ExternalLink, Pencil } from 'lucide-react'
import type { CodeSearchHit, FsDropMode, TreeEntry, TreeStatusKind } from '../../../shared/types'
import { editorApi, gitApi, shellApi } from '../infrastructure/api'
import { useUIStore, type MenuItem } from '../stores/ui'
import { repoActions, type RepoData } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { openWithMenuItems } from '../lib/openWith'
import { treeStatusOf } from '../lib/treeStatus'
import {
  EMPTY_FILTER,
  isFilterActive,
  buildQueryRegExp,
  matchesGlobList,
  type FileFilter
} from './FileSearchBar'
import { MatchSummary, SearchResultsTree } from './SearchMatches'
import { useT, interp } from '../i18n'

const abs = (repoRoot: string, rel: string): string => `${repoRoot.replace(/\/+$/, '')}/${rel}`
const parentOf = (rel: string): string => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/') + 1) : '')
const baseOf = (rel: string): string => rel.split('/').pop() ?? rel

// Drag & drop. Internal drags carry the repo-relative path on a private MIME type
// so foreign drags (Finder, other apps) are never mistaken for tree moves.
const DRAG_MIME = 'application/x-gitcito-path'
const isExternalDrag = (e: React.DragEvent): boolean => e.dataTransfer.types.includes('Files')
// How long a drag has to hover a collapsed folder before it springs open.
const SPRING_MS = 700

// Keyboard activation for clickable non-button elements: Enter/Space runs the
// same onClick handler the mouse uses, so every row and icon is reachable.
const keyActivate = (e: React.KeyboardEvent): void => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  e.stopPropagation()
  ;(e.currentTarget as HTMLElement).click()
}

export function FileTree({
  repo,
  filter = EMPTY_FILTER
}: {
  repo: RepoData
  filter?: FileFilter
}): React.JSX.Element {
  const path = repo.path
  const { openContextMenu, openModal, setFileView, toast } = useUIStore()
  const fileView = useUIStore((s) => s.fileView)
  const defaultOpenApp = useSettingsStore((s) => s.settings.defaultOpenApp)
  const editor = useSettingsStore((s) => s.settings.editor)
  const treeStatus = repo.treeStatus
  const filterActive = isFilterActive(filter)
  const t = useT()

  // Row-end icon: the configured editor first — it is the more specific choice
  // of the two — then the default "open with" app, then the native picker.
  const openWithSmart = (rel: string): void => {
    const target = abs(path, rel)
    const action = editor?.command
      ? editorApi.open(editor, { path: target })
      : defaultOpenApp?.path
        ? shellApi.openWithApp(target, defaultOpenApp.path)
        : shellApi.openWithPicker(target)
    void action.then((err: string) => {
      if (err) toast('error', err)
    })
  }

  // Per-folder change counts shown as badges on collapsed folders. treeStatus
  // holds both files and (aggregated) directories — a key is a directory when
  // some other key nests under it, so only leaf entries are counted.
  const folderCounts = useMemo(() => {
    const dirs = new Set<string>()
    for (const p of Object.keys(treeStatus)) {
      let slash = p.lastIndexOf('/')
      while (slash > 0) {
        dirs.add(p.slice(0, slash))
        slash = p.lastIndexOf('/', slash - 1)
      }
    }
    const bucketOf = (kind: TreeStatusKind): 'added' | 'modified' | 'deleted' | 'renamed' | 'conflicted' | null =>
      kind === 'added' || kind === 'untracked' ? 'added'
        : kind === 'modified' ? 'modified'
        : kind === 'renamed' ? 'renamed'
        : kind === 'deleted' ? 'deleted'
        : kind === 'conflicted' ? 'conflicted'
        : null
    const counts: Record<string, { added: number; modified: number; deleted: number; renamed: number; conflicted: number }> = {}
    for (const [p, kind] of Object.entries(treeStatus)) {
      if (dirs.has(p)) continue
      const bucket = bucketOf(kind)
      if (!bucket) continue
      let slash = p.lastIndexOf('/')
      while (slash > 0) {
        const dir = p.slice(0, slash)
        ;(counts[dir] ??= { added: 0, modified: 0, deleted: 0, renamed: 0, conflicted: 0 })[bucket]++
        slash = p.lastIndexOf('/', slash - 1)
      }
    }
    return counts
  }, [treeStatus])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [children, setChildren] = useState<Record<string, TreeEntry[]>>({})
  const [loading, setLoading] = useState<Set<string>>(new Set())

  const load = useCallback(
    async (dir: string): Promise<void> => {
      setLoading((s) => new Set(s).add(dir))
      try {
        const ents = await gitApi.listDir(path, dir || undefined)
        setChildren((c) => ({ ...c, [dir]: ents }))
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      } finally {
        setLoading((s) => {
          const n = new Set(s)
          n.delete(dir)
          return n
        })
      }
    },
    [path, toast]
  )

  // Re-read the root and every expanded folder whenever the working tree changes
  // (our own mutations refresh the store; the file watcher catches external ones).
  useEffect(() => {
    void load('')
    for (const dir of expanded) void load(dir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, treeStatus, load])

  // ─── Search/filter (flat results) ───
  const [allFiles, setAllFiles] = useState<string[] | null>(null)
  const [results, setResults] = useState<string[] | null>(null)
  // Line-level matches for a content search; null for name/glob-only filtering,
  // where there is nothing to expand under a file.
  const [hits, setHits] = useState<CodeSearchHit[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Load the (cheap) candidate file list when filtering starts; refresh it when
  // the working tree changes so new/renamed files become searchable.
  useEffect(() => {
    if (!filterActive) return
    void gitApi
      .listFiles(path)
      .then(setAllFiles)
      .catch((err) => toast('error', err instanceof Error ? err.message : String(err)))
  }, [filterActive, path, treeStatus, toast])

  // Recompute results whenever the query, glob filters or candidate list change.
  useEffect(() => {
    if (!filterActive || !allFiles) {
      setResults(null)
      setHits(null)
      return
    }
    const inc = filter.include.trim()
    const exc = filter.exclude.trim()
    const scoped = allFiles.filter(
      (p) => (!inc || matchesGlobList(p, inc)) && !(exc && matchesGlobList(p, exc))
    )
    const q = filter.query.trim()
    if (!q) {
      setResults(scoped.sort())
      setHits(null)
      return
    }
    if (filter.mode === 'name') {
      const re = buildQueryRegExp(filter)
      setResults(scoped.filter((p) => !re || re.test(p)).sort())
      setHits(null)
      return
    }
    // Content search runs in the main process over the scoped candidate set and
    // comes back as file:line:text matches for the expandable results tree.
    let cancelled = false
    setSearching(true)
    gitApi
      .searchFileMatches(path, [...scoped].sort(), q, {
        caseSensitive: filter.caseSensitive,
        wholeWord: filter.wholeWord,
        regex: filter.regex
      })
      .then((found) => {
        if (cancelled) return
        setHits(found)
        setResults([...new Set(found.map((h) => h.file))])
      })
      .catch((err) => {
        if (!cancelled) toast('error', err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [filterActive, allFiles, filter, path, toast])

  const toggle = (dir: string): void =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(dir)) n.delete(dir)
      else {
        n.add(dir)
        if (!children[dir]) void load(dir)
      }
      return n
    })

  // ─── Drag & drop ───
  // `dragSrc` is the row being dragged inside the tree (null for OS drags);
  // `dropDir` is the folder a drop would land in ('' = repository root).
  const [dragSrc, setDragSrc] = useState<string | null>(null)
  const [dropDir, setDropDir] = useState<string | null>(null)
  const spring = useRef<{ dir: string; timer: ReturnType<typeof setTimeout> } | null>(null)

  const cancelSpring = useCallback((): void => {
    if (spring.current) clearTimeout(spring.current.timer)
    spring.current = null
  }, [])

  // Hovering a collapsed folder mid-drag opens it, so nested targets are reachable
  // without dropping first.
  const springLoad = (dir: string): void => {
    if (!dir || expanded.has(dir) || spring.current?.dir === dir) return
    cancelSpring()
    spring.current = {
      dir,
      timer: setTimeout(() => {
        spring.current = null
        setExpanded((s) => {
          if (s.has(dir)) return s
          if (!children[dir]) void load(dir)
          return new Set(s).add(dir)
        })
      }, SPRING_MS)
    }
  }

  const endDrag = useCallback((): void => {
    cancelSpring()
    setDragSrc(null)
    setDropDir(null)
  }, [cancelSpring])

  useEffect(() => cancelSpring, [cancelSpring])

  // A move is refused when it would be a no-op (same parent) or would put a folder
  // inside itself. OS drops are always allowed — they copy in from outside.
  const canDrop = (dir: string, external: boolean): boolean => {
    if (external) return true
    if (dragSrc === null) return false
    if (dir === dragSrc || dir.startsWith(`${dragSrc}/`)) return false
    return dir !== parentOf(dragSrc).replace(/\/$/, '')
  }

  const onZoneOver = (dir: string) => (e: React.DragEvent): void => {
    const external = isExternalDrag(e)
    if (!canDrop(dir, external)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = external ? 'copy' : 'move'
    setDropDir(dir)
    springLoad(dir)
  }

  const onZoneLeave = (dir: string) => (e: React.DragEvent): void => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    if (spring.current?.dir === dir) cancelSpring()
    setDropDir((d) => (d === dir ? null : d))
  }

  // Runs the drop, asking first when the destination already holds one of the
  // dropped names: replace it (the old entry goes to the trash) or keep both.
  const runDrop = async (
    dir: string,
    sources: string[],
    external: boolean
  ): Promise<void> => {
    const apply = (mode?: FsDropMode): void => {
      const done = (): void => {
        if (dir) setExpanded((s) => new Set(s).add(dir))
      }
      const action = external
        ? repoActions.fsImport(path, sources, dir, mode)
        : repoActions.fsMove(path, sources, dir, mode)
      void action.then(done)
    }
    const clashes = await gitApi
      .fsExisting(path, dir, sources.map(baseOf))
      .catch(() => [] as string[])
    if (clashes.length === 0) {
      apply()
      return
    }
    const where = dir || t('fileTree.dropRootLabel')
    openModal({
      kind: 'confirm',
      title: t('fileTree.dropConflictTitle'),
      message:
        clashes.length === 1
          ? interp(t('fileTree.dropConflictMsg'), { name: clashes[0], dir: where })
          : interp(t('fileTree.dropConflictMsgMany'), { count: String(clashes.length), dir: where }),
      danger: true,
      confirmLabel: t('fileTree.dropReplace'),
      onConfirm: () => apply('replace'),
      secondaryLabel: t('fileTree.dropKeepBoth'),
      onSecondary: () => apply('keepBoth')
    })
  }

  const onZoneDrop = (dir: string) => (e: React.DragEvent): void => {
    const external = isExternalDrag(e)
    if (!canDrop(dir, external)) return
    e.preventDefault()
    e.stopPropagation()
    const src = external ? null : e.dataTransfer.getData(DRAG_MIME) || dragSrc
    const paths = external
      ? Array.from(e.dataTransfer.files)
          .map((f) => window.api.getPathForFile(f))
          .filter(Boolean)
      : src
        ? [src]
        : []
    endDrag()
    if (paths.length > 0) void runDrop(dir, paths, external)
  }

  const dragProps = (node: TreeEntry): React.HTMLAttributes<HTMLDivElement> & { draggable: true } => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData(DRAG_MIME, node.path)
      // `copyMove`, not `move`: the same drag also pins a file to repository
      // chat, which is a copy — a `move`-only drag is refused there.
      e.dataTransfer.effectAllowed = 'copyMove'
      setDragSrc(node.path)
    },
    onDragEnd: endDrag
  })

  // Open a file in the center viewer, guarding unsaved edits in the editor.
  // `line` (from a search hit) scrolls the viewer straight to that line.
  const openFile = (rel: string, line?: number): void => {
    const doOpen = (): void =>
      setFileView({ repoPath: path, file: rel, source: { type: 'tree' }, mode: 'file', line })
    if (useUIStore.getState().editorDirty) {
      openModal({
        kind: 'confirm',
        title: t('fileTree.discardTitle'),
        message: t('fileTree.discardMsg'),
        danger: true,
        confirmLabel: t('fileTree.discardConfirm'),
        onConfirm: () => {
          useUIStore.getState().setEditorDirty(false)
          doOpen()
        }
      })
    } else doOpen()
  }

  const promptCreate = (dir: string, isDir: boolean): void =>
    openModal({
      kind: 'input',
      title: isDir ? t('fileTree.newFolderTitle') : t('fileTree.newFileTitle'),
      label: dir ? interp(t('fileTree.inDir'), { dir }) : t('fileTree.atRoot'),
      placeholder: isDir ? t('fileTree.folderPlaceholder') : t('fileTree.filePlaceholder'),
      submitLabel: t('fileTree.createSubmit'),
      onSubmit: (name) => {
        const clean = name.trim().replace(/^\/+|\/+$/g, '')
        if (!clean) return
        const rel = dir ? `${dir}/${clean}` : clean
        void repoActions.fsCreate(path, rel, isDir).then(() => {
          if (dir) setExpanded((s) => new Set(s).add(dir))
        })
      }
    })

  const promptRename = (node: TreeEntry): void =>
    openModal({
      kind: 'input',
      title: node.dir ? t('fileTree.renameFolderTitle') : t('fileTree.renameFileTitle'),
      label: interp(t('fileTree.renameLabel'), { name: baseOf(node.path) }),
      initial: baseOf(node.path),
      submitLabel: t('fileTree.renameSubmit'),
      onSubmit: (name) => {
        const clean = name.trim().replace(/^\/+|\/+$/g, '')
        if (!clean || clean === baseOf(node.path)) return
        void repoActions.fsRename(path, node.path, parentOf(node.path) + clean)
      }
    })

  const confirmDelete = (node: TreeEntry): void =>
    openModal({
      kind: 'confirm',
      title: t('fileTree.moveToTrashTitle'),
      message: interp(t('fileTree.moveToTrashMsg'), { path: node.path }),
      danger: true,
      confirmLabel: t('fileTree.moveToTrashConfirm'),
      onConfirm: () => void repoActions.fsDelete(path, [node.path], baseOf(node.path))
    })

  // The ".gitignore / stop tracking" block — same options as the commit panel's
  // file menu (Add to .gitignore · Ignore… · & stop tracking · Stop tracking ·
  // Delete from Git and disk). Untrack actions only show for tracked paths.
  const ignoreMenu = (node: TreeEntry): MenuItem[] => {
    const status = treeStatusOf(treeStatus, node.path)
    const patterns = [node.dir ? `/${node.path}/` : `/${node.path}`]
    const tracked = status !== 'untracked' && status !== 'ignored'
    const items: MenuItem[] = [
      {
        label: t('fileTree.addToGitignore'),
        disabled: status === 'ignored',
        onClick: () => void repoActions.addToGitignore(path, patterns, node.path)
      },
      {
        label: t('fileTree.ignoreChoose'),
        onClick: () => openModal({ kind: 'ignore', repoPath: path, targetPath: node.path, isFolder: node.dir })
      }
    ]
    if (tracked) {
      items.push({
        label: t('fileTree.ignoreAndUntrackTitle'),
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('fileTree.ignoreAndUntrackTitle'),
            message: `Add ${node.path} to .gitignore and stop tracking it in Git. The file(s) stay on disk.`,
            confirmLabel: t('fileTree.ignoreAndUntrackConfirm'),
            onConfirm: () => void repoActions.ignoreAndUntrack(path, [node.path], patterns, node.path)
          })
      })
      items.push({ separator: true })
      items.push({
        label: t('fileTree.stopTrackingTitle'),
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('fileTree.stopTrackingTitle'),
            message: `Stop tracking ${node.path} in Git? It stays on disk but is removed from the repository on the next commit.`,
            confirmLabel: t('fileTree.stopTrackingConfirm'),
            onConfirm: () => void repoActions.untrack(path, [node.path], false, node.path)
          })
      })
      items.push({
        label: t('fileTree.deleteFromDiskTitle'),
        danger: true,
        onClick: () =>
          openModal({
            kind: 'confirm',
            title: t('fileTree.deleteFromDiskTitle'),
            message: `Remove ${node.path} from version control and permanently delete from disk? This cannot be undone.`,
            danger: true,
            confirmLabel: t('fileTree.deleteFromDiskConfirm'),
            onConfirm: () => void repoActions.untrack(path, [node.path], true, node.path)
          })
      })
    }
    return items
  }

  const menuFor = (node: TreeEntry): MenuItem[] => [
    ...(node.dir
      ? [
          { label: t('fileTree.newFileMenu'), onClick: () => promptCreate(node.path, false) } as MenuItem,
          { label: t('fileTree.newFolderMenu'), onClick: () => promptCreate(node.path, true) } as MenuItem,
          { separator: true } as MenuItem
        ]
      : [{ label: t('fileTree.open'), onClick: () => openFile(node.path) } as MenuItem, { separator: true } as MenuItem]),
    { label: t('fileTree.rename'), onClick: () => promptRename(node) },
    { label: t('fileTree.moveToTrashMenu'), danger: true, onClick: () => confirmDelete(node) },
    { separator: true },
    ...ignoreMenu(node),
    { separator: true },
    { label: t('fileTree.filterGraph'), onClick: () => useUIStore.getState().setPathFilter(node.path) },
    { separator: true },
    { label: shellApi.revealLabel, onClick: () => void shellApi.revealInFolder(abs(path, node.path)) },
    { label: t('fileTree.openDefaultApp'), onClick: () => void shellApi.openPath(abs(path, node.path)) },
    ...openWithMenuItems(
      abs(path, node.path),
      defaultOpenApp,
      {
        openWithDefault: (name) => interp(t('fileTree.openWithApp'), { name }),
        openWith: t('fileTree.openWith')
      },
      editor,
      { isDir: node.dir }
    ),
    { label: t('fileTree.copyPath'), onClick: () => void navigator.clipboard.writeText(node.path) },
    ...(node.dir
      ? []
      : [
          {
            label: t('cmd.historyPurge'),
            danger: true,
            onClick: () => openModal({ kind: 'history-purge', repoPath: path, initialPath: node.path })
          }
        ])
  ]

  const rootMenu = (): MenuItem[] => [
    { label: t('fileTree.newFileMenu'), onClick: () => promptCreate('', false) },
    { label: t('fileTree.newFolderMenu'), onClick: () => promptCreate('', true) }
  ]

  const renderLevel = (dir: string, depth: number): React.JSX.Element[] => {
    const ents = children[dir]
    if (!ents) return []
    return ents.map((node) => {
      const open = node.dir && expanded.has(node.path)
      const status = treeStatusOf(treeStatus, node.path)
      const selected = !node.dir && fileView?.repoPath === path && fileView.file === node.path
      // Collapsed folders show aggregate change counts instead of the plain dot.
      const counts = node.dir && !open ? folderCounts[node.path] : undefined
      // Where a drop on this row lands: into the folder itself, or — for a file —
      // into the folder that holds it, which is the row that lights up.
      const zone = node.dir ? node.path : parentOf(node.path).replace(/\/$/, '')
      return (
        <Fragment key={node.path}>
          <div
            className={`tree-row${selected ? ' selected' : ''}${status ? ` st-${status}` : ''}${
              dragSrc === node.path ? ' dragging' : ''
            }${node.dir && dropDir === node.path ? ' drop-into' : ''}`}
            role="button"
            tabIndex={0}
            onKeyDown={keyActivate}
            style={{ paddingLeft: 6 + depth * 13 }}
            title={node.path}
            {...dragProps(node)}
            onDragOver={onZoneOver(zone)}
            onDragLeave={onZoneLeave(zone)}
            onDrop={onZoneDrop(zone)}
            onClick={() => (node.dir ? toggle(node.path) : openFile(node.path))}
            onContextMenu={(e) => {
              e.preventDefault()
              openContextMenu(e.clientX, e.clientY, menuFor(node))
            }}
          >
            <span className="tree-arrow">
              {node.dir ? (
                <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.12 }}>
                  <ChevronRight size={12} />
                </motion.span>
              ) : null}
            </span>
            <span className="tree-icon">
              {loading.has(node.path) ? (
                <Loader2 size={13} className="spin" />
              ) : node.dir ? (
                open ? <FolderOpen size={13} /> : <Folder size={13} />
              ) : (
                <File size={13} />
              )}
            </span>
            <span className="tree-name">{node.name}</span>
            {counts ? (
              <span className="tree-badges">
                {counts.added > 0 && (
                  <span className="tree-badge tb-added">+{counts.added}</span>
                )}
                {counts.modified > 0 && (
                  <span className="tree-badge tb-modified">
                    <Pencil size={9} />
                    {counts.modified}
                  </span>
                )}
                {counts.deleted > 0 && (
                  <span className="tree-badge tb-deleted">−{counts.deleted}</span>
                )}
                {counts.renamed > 0 && (
                  <span className="tree-badge tb-renamed">
                    <ChevronRight size={9} strokeWidth={3.5} />
                    {counts.renamed}
                  </span>
                )}
                {counts.conflicted > 0 && (
                  <span className="tree-badge tb-conflicted">!{counts.conflicted}</span>
                )}
              </span>
            ) : (
              status && status !== 'ignored' && <span className="tree-dot" />
            )}
            {!node.dir && (
              <span
                className="icon-btn tree-open-with"
                role="button"
                tabIndex={0}
                aria-label={t('fileTree.openWithIconTitle')}
                onKeyDown={keyActivate}
                title={t('fileTree.openWithIconTitle')}
                onClick={(e) => {
                  e.stopPropagation()
                  openWithSmart(node.path)
                }}
              >
                <ExternalLink size={12} />
              </span>
            )}
          </div>
          {open && renderLevel(node.path, depth + 1)}
        </Fragment>
      )
    })
  }

  // Search results. A content search renders the VSCode-style tree (file rows
  // that expand into their matching lines); a name/glob filter has no lines to
  // show, so it stays a flat one-row-per-file list.
  const renderResults = (): React.JSX.Element => {
    if (!results) {
      return (
        <div className="tree-loading">
          <Loader2 size={14} className="spin" /> {searching ? t('diff.find') : t('lfs.loading')}
        </div>
      )
    }
    if (results.length === 0) return <div className="sb-empty">{t('search.noResults')}</div>
    const openWithBtn = (rel: string): React.ReactNode => (
      <span
        className="icon-btn tree-open-with"
        role="button"
        tabIndex={0}
        aria-label={t('fileTree.openWithIconTitle')}
        onKeyDown={keyActivate}
        title={t('fileTree.openWithIconTitle')}
        onClick={(e) => {
          e.stopPropagation()
          openWithSmart(rel)
        }}
      >
        <ExternalLink size={12} />
      </span>
    )
    if (hits) {
      return (
        <div className="search-results">
          {searching && (
            <div className="tree-loading">
              <Loader2 size={14} className="spin" /> {t('diff.find')}
            </div>
          )}
          <MatchSummary
            hits={hits}
            label={(n, files) => interp(t('search.summary'), { n, files })}
          />
          <SearchResultsTree
            hits={hits}
            filter={filter}
            activeFile={fileView?.repoPath === path ? fileView.file : null}
            activeLine={fileView?.line ?? null}
            onOpen={(rel, line) => openFile(rel, line)}
            fileRowClass={(rel) => {
              const kind = treeStatusOf(treeStatus, rel)
              return kind ? `st-${kind}` : ''
            }}
            fileRowExtras={openWithBtn}
            onFileContext={(rel, e) => {
              e.preventDefault()
              openContextMenu(e.clientX, e.clientY, menuFor({ name: baseOf(rel), path: rel, dir: false }))
            }}
          />
        </div>
      )
    }
    return (
      <>
        {searching && (
          <div className="tree-loading">
            <Loader2 size={14} className="spin" /> {t('diff.find')}
          </div>
        )}
        {results.map((rel) => {
          const node: TreeEntry = { name: baseOf(rel), path: rel, dir: false }
          const status = treeStatusOf(treeStatus, rel)
          const selected = fileView?.repoPath === path && fileView.file === rel
          return (
            <div
              key={rel}
              className={`tree-row tree-result${selected ? ' selected' : ''}${status ? ` st-${status}` : ''}`}
              role="button"
              tabIndex={0}
              onKeyDown={keyActivate}
              title={rel}
              onClick={() => openFile(rel)}
              onContextMenu={(e) => {
                e.preventDefault()
                openContextMenu(e.clientX, e.clientY, menuFor(node))
              }}
            >
              <span className="tree-icon">
                <File size={13} />
              </span>
              <span className="tree-result-name">
                <span className="tree-result-base">{node.name}</span>
                {rel.includes('/') && <span className="tree-result-dir">{parentOf(rel).replace(/\/$/, '')}</span>}
              </span>
              {status && status !== 'ignored' && <span className="tree-dot" />}
              <span
                className="icon-btn tree-open-with"
                role="button"
                tabIndex={0}
                aria-label={t('fileTree.openWithIconTitle')}
                onKeyDown={keyActivate}
                title={t('fileTree.openWithIconTitle')}
                onClick={(e) => {
                  e.stopPropagation()
                  openWithSmart(rel)
                }}
              >
                <ExternalLink size={12} />
              </span>
            </div>
          )
        })}
      </>
    )
  }

  const rootEnts = children['']
  return (
    <div
      className={`file-tree${dropDir === '' ? ' drop-root' : ''}`}
      // Anything not dropped on a folder row lands at the repository root.
      onDragOver={onZoneOver('')}
      onDragLeave={onZoneLeave('')}
      onDrop={onZoneDrop('')}
      onContextMenu={(e) => {
        // Right-click on empty area → root-level create menu.
        if (e.target === e.currentTarget) {
          e.preventDefault()
          openContextMenu(e.clientX, e.clientY, rootMenu())
        }
      }}
    >
      {filterActive ? (
        renderResults()
      ) : (
        <>
          {!rootEnts && loading.has('') && (
            <div className="tree-loading">
              <Loader2 size={14} className="spin" /> {t('lfs.loading')}
            </div>
          )}
          {rootEnts && rootEnts.length === 0 && <div className="sb-empty">{t('sidebar.emptyRepo')}</div>}
          {renderLevel('', 0)}
        </>
      )}
    </div>
  )
}
