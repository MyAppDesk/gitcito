import { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FolderOpen, Folder, Pencil } from 'lucide-react'
import type { CodeSearchHit, FileEntry } from '../../../shared/types'
import { useSettingsStore } from '../stores/settings'
import { stepPath, visiblePaths } from '../lib/fileNav'
import { MatchRows } from './SearchMatches'
import { t, type TranslationKey } from '../i18n'

/** The spoken name of a status glyph — the glyph itself is colour + symbol only. */
export function statusName(s: string): string {
  const key: TranslationKey =
    s === 'A' || s === 'C' || s === '?'
      ? 'a11y.stAdded'
      : s === 'D'
        ? 'a11y.stDeleted'
        : s === 'R'
          ? 'a11y.stRenamed'
          : s === 'U'
            ? 'a11y.stConflict'
            : 'a11y.stModified'
  return t(key)
}

export function statusClass(s: string): string {
  switch (s) {
    case 'A':
    case 'C':
    case '?':
      return 'st-add'
    case 'D':
      return 'st-del'
    case 'R':
      return 'st-ren'
    case 'U':
      return 'st-conflict'
    default:
      return 'st-mod'
  }
}

export function statusLabel(s: string): string {
  switch (s) {
    case 'A':
    case 'C':
    case '?':
      return '+'
    case 'D':
      return '-'
    case 'R':
      return '→'
    case 'U':
      return '!'
    default:
      return 'M'
  }
}

interface FileListProps {
  files: FileEntry[]
  current?: string | null
  selected?: Set<string>
  onFileClick: (file: FileEntry, e: React.MouseEvent) => void
  onFileContext?: (file: FileEntry, e: React.MouseEvent) => void
  onFolderContext?: (folderPath: string, e: React.MouseEvent) => void
  action?: (file: FileEntry) => React.ReactNode
  folderAction?: (folderPath: string) => React.ReactNode
  /** Content-search hits per file — rows gain a count badge and expand into
   *  their matching lines, VSCode style. */
  matches?: Map<string, CodeSearchHit[]>
  /** Query regex used to <mark> the term inside each matching line. */
  matchRe?: RegExp | null
  onMatchClick?: (file: string, line: number) => void
  /** Line currently open in the viewer, highlighted in the match list. */
  activeLine?: number | null
  /** A marker rendered before the row's actions — hack mode's "this file is
   *  not yours" hint. A hint and never a block: the row behaves identically. */
  flag?: (file: FileEntry) => React.ReactNode
}

interface TreeNode {
  name: string
  path: string
  children: TreeNode[]
  file?: FileEntry
}

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', children: [] }
  for (const f of files) {
    const parts = f.path.split('/')
    let node = root
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      acc = acc ? `${acc}/${parts[i]}` : parts[i]
      const isLeaf = i === parts.length - 1
      let child = node.children.find((c) => c.name === parts[i] && !!c.file === isLeaf)
      if (!child) {
        child = { name: parts[i], path: acc, children: [], file: isLeaf ? f : undefined }
        node.children.push(child)
      }
      node = child
    }
  }
  // Compress single-child folder chains (a/b/c → "a/b/c")
  const compress = (node: TreeNode): TreeNode => {
    while (!node.file && node.children.length === 1 && !node.children[0].file) {
      const only = node.children[0]
      node = { ...only, name: node.name ? `${node.name}/${only.name}` : only.name }
    }
    return { ...node, children: node.children.map(compress) }
  }
  const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    [...nodes]
      .sort((a, b) => Number(!!a.file) - Number(!!b.file) || a.name.localeCompare(b.name))
      .map((n) => ({ ...n, children: sortNodes(n.children) }))
  return sortNodes(root.children.map(compress))
}

// Aggregate descendant-file counts for a folder, bucketed like statusClass —
// shown as badges when the folder is collapsed.
interface FolderCounts {
  add: number
  mod: number
  del: number
  ren: number
  conflict: number
}

function countsOf(node: TreeNode): FolderCounts {
  const c: FolderCounts = { add: 0, mod: 0, del: 0, ren: 0, conflict: 0 }
  const walk = (n: TreeNode): void => {
    if (n.file) {
      const cls = statusClass(n.file.status)
      if (cls === 'st-add') c.add++
      else if (cls === 'st-del') c.del++
      else if (cls === 'st-ren') c.ren++
      else if (cls === 'st-conflict') c.conflict++
      else c.mod++
    }
    for (const child of n.children) walk(child)
  }
  walk(node)
  return c
}

function FolderBadges({ node }: { node: TreeNode }): React.JSX.Element {
  const c = countsOf(node)
  return (
    <span className="tree-badges">
      {c.add > 0 && <span className="tree-badge tb-added">+{c.add}</span>}
      {c.mod > 0 && (
        <span className="tree-badge tb-modified">
          <Pencil size={9} />
          {c.mod}
        </span>
      )}
      {c.del > 0 && <span className="tree-badge tb-deleted">−{c.del}</span>}
      {c.ren > 0 && (
        <span className="tree-badge tb-renamed">
          <ChevronRight size={9} strokeWidth={3.5} />
          {c.ren}
        </span>
      )}
      {c.conflict > 0 && <span className="tree-badge tb-conflicted">!{c.conflict}</span>}
    </span>
  )
}

function FileRowInner({
  file,
  label,
  depth,
  props
}: {
  file: FileEntry
  label: string
  depth: number
  props: FileListProps
}): React.JSX.Element {
  const isCurrent = props.current === file.path
  const isSelected = props.selected?.has(file.path) ?? false
  const hits = props.matches?.get(file.path)
  // Matches start expanded, as in VSCode; the caret collapses one file.
  const [open, setOpen] = useState(true)
  return (
    <>
      <div
        className={`file-item wip ${isCurrent ? 'current' : ''} ${isSelected ? 'multi-selected' : ''}`}
        data-file-path={file.path}
        style={{ paddingLeft: 14 + depth * 14 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            props.onFileClick(file, e as unknown as React.MouseEvent)
          }
        }}
        onClick={(e) => props.onFileClick(file, e)}
        onContextMenu={(e) => props.onFileContext?.(file, e)}
        title={file.path}
      >
        {hits && hits.length > 0 && (
          <span
            className="file-caret"
            role="button"
            tabIndex={0}
            title={file.path}
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                setOpen((v) => !v)
              }
            }}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        <span className={`file-status ${statusClass(file.status)}`} title={statusName(file.status)} aria-label={statusName(file.status)}>
          {file.status === 'R' ? <ChevronRight size={12} strokeWidth={3} aria-hidden="true" /> : statusLabel(file.status)}
        </span>
        <span className="file-path">{label}</span>
        {props.flag?.(file)}
        {hits && hits.length > 0 && <span className="sm-count">{hits.length}</span>}
        {props.action?.(file)}
      </div>
      {hits && hits.length > 0 && open && props.onMatchClick && (
        <MatchRows
          hits={hits}
          re={props.matchRe ?? null}
          activeFile={props.current ?? null}
          activeLine={props.activeLine ?? null}
          indent={28 + depth * 14}
          onOpen={props.onMatchClick}
        />
      )}
    </>
  )
}

function TreeLevel({
  nodes,
  depth,
  collapsed,
  toggle,
  props
}: {
  nodes: TreeNode[]
  depth: number
  collapsed: Set<string>
  toggle: (path: string) => void
  props: FileListProps
}): React.JSX.Element {
  return (
    <>
      {nodes.map((n) =>
        n.file ? (
          <FileRowInner key={`f-${n.path}`} file={n.file} label={n.name} depth={depth} props={props} />
        ) : (
          <div key={`d-${n.path}`}>
            <div
              className="tree-folder"
              role="button"
              tabIndex={0}
              aria-expanded={!collapsed.has(n.path)}
              style={{ paddingLeft: 14 + depth * 14 }}
              onClick={() => toggle(n.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle(n.path)
                }
              }}
              onContextMenu={(e) => props.onFolderContext?.(n.path, e)}
              title={n.path}
            >
              {collapsed.has(n.path) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              {collapsed.has(n.path) ? <Folder size={13} /> : <FolderOpen size={13} />}
              <span className="tree-folder-name">{n.name}</span>
              {collapsed.has(n.path) && <FolderBadges node={n} />}
              {props.folderAction?.(n.path)}
            </div>
            {!collapsed.has(n.path) && (
              <TreeLevel nodes={n.children} depth={depth + 1} collapsed={collapsed} toggle={toggle} props={props} />
            )}
          </div>
        )
      )}
    </>
  )
}

// Keyboard selection reuses the click handler; consumers read modifier keys off
// the event for range/toggle selection, and arrows always mean a plain select.
const PLAIN_CLICK = {
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  preventDefault: () => {},
  stopPropagation: () => {}
} as unknown as React.MouseEvent

export function FileListView(props: FileListProps): React.JSX.Element {
  const view = useSettingsStore((s) => s.settings.fileListView ?? 'path')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const tree = useMemo(() => (view === 'tree' ? buildTree(props.files) : []), [view, props.files])
  const listRef = useRef<HTMLDivElement>(null)
  // Fallback cursor for lists whose selection lives elsewhere (the conflicted
  // list opens the resolver, so `current` never points into it).
  const cursor = useRef<string | null>(null)

  const toggle = (path: string): void =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  // Up/Down (and j/k) walk the list like the commit graph does.
  const step = (dir: 1 | -1): void => {
    const order = view === 'tree' ? visiblePaths(tree, collapsed) : props.files.map((f) => f.path)
    const anchor = order.includes(props.current ?? '') ? props.current : cursor.current
    const next = stepPath(order, anchor, dir)
    const file = next ? props.files.find((f) => f.path === next) : null
    if (!file) return
    cursor.current = file.path
    props.onFileClick(file, PLAIN_CLICK)
    listRef.current
      ?.querySelector(`[data-file-path="${CSS.escape(file.path)}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
    // Shift+↑/↓ is range extension, owned by the panel around this list — let
    // it bubble to the window listener instead of stepping the cursor.
    if (e.shiftKey) return
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault()
      step(1)
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault()
      step(-1)
    }
  }

  // Clicks move the keyboard cursor too, so arrows continue from the last row
  // the user touched.
  const rowProps: FileListProps = {
    ...props,
    onFileClick: (file, e) => {
      cursor.current = file.path
      props.onFileClick(file, e)
    }
  }

  return (
    <div className="file-list" ref={listRef} tabIndex={0} onKeyDown={onKeyDown}>
      {view === 'tree' ? (
        <TreeLevel nodes={tree} depth={0} collapsed={collapsed} toggle={toggle} props={rowProps} />
      ) : (
        props.files.map((f) => <FileRowInner key={f.path} file={f} label={f.path} depth={0} props={rowProps} />)
      )}
    </div>
  )
}
