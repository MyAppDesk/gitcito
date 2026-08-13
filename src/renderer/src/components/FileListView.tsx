import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FolderOpen, Folder, Pencil } from 'lucide-react'
import type { CodeSearchHit, FileEntry } from '../../../shared/types'
import { useSettingsStore } from '../stores/settings'
import { MatchRows } from './SearchMatches'

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
        style={{ paddingLeft: 14 + depth * 14 }}
        onClick={(e) => props.onFileClick(file, e)}
        onContextMenu={(e) => props.onFileContext?.(file, e)}
        title={file.path}
      >
        {hits && hits.length > 0 && (
          <span
            className="file-caret"
            role="button"
            title={file.path}
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        <span className={`file-status ${statusClass(file.status)}`}>
          {file.status === 'R' ? <ChevronRight size={12} strokeWidth={3} /> : statusLabel(file.status)}
        </span>
        <span className="file-path">{label}</span>
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
              style={{ paddingLeft: 14 + depth * 14 }}
              onClick={() => toggle(n.path)}
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

export function FileListView(props: FileListProps): React.JSX.Element {
  const view = useSettingsStore((s) => s.settings.fileListView ?? 'path')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const tree = useMemo(() => (view === 'tree' ? buildTree(props.files) : []), [view, props.files])

  const toggle = (path: string): void =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  if (view === 'tree') {
    return (
      <div className="file-list">
        <TreeLevel nodes={tree} depth={0} collapsed={collapsed} toggle={toggle} props={props} />
      </div>
    )
  }

  return (
    <div className="file-list">
      {props.files.map((f) => (
        <FileRowInner key={f.path} file={f} label={f.path} depth={0} props={props} />
      ))}
    </div>
  )
}
