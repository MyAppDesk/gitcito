import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, FolderOpen, Folder } from 'lucide-react'
import type { FileEntry } from '../../../shared/types'
import { useSettingsStore } from '../stores/settings'

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
      return 'R'
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
  return (
    <div
      className={`file-item wip ${isCurrent ? 'current' : ''} ${isSelected ? 'multi-selected' : ''}`}
      style={{ paddingLeft: 14 + depth * 14 }}
      onClick={(e) => props.onFileClick(file, e)}
      onContextMenu={(e) => props.onFileContext?.(file, e)}
      title={file.path}
    >
      <FileText size={13} />
      <span className="file-path">{label}</span>
      <span className={`file-status ${statusClass(file.status)}`}>{statusLabel(file.status)}</span>
      {props.action?.(file)}
    </div>
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
            <button
              className="tree-folder"
              style={{ paddingLeft: 14 + depth * 14 }}
              onClick={() => toggle(n.path)}
              onContextMenu={(e) => props.onFolderContext?.(n.path, e)}
              title={n.path}
            >
              {collapsed.has(n.path) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              {collapsed.has(n.path) ? <Folder size={13} /> : <FolderOpen size={13} />}
              <span>{n.name}</span>
            </button>
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
