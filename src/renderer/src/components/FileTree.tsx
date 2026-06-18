import { Fragment, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, File, Folder, FolderOpen, Loader2 } from 'lucide-react'
import type { TreeEntry } from '../../../shared/types'
import { gitApi, shellApi } from '../infrastructure/api'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useRepoStore, repoActions, type RepoData } from '../stores/repo'

const abs = (repoRoot: string, rel: string): string => `${repoRoot.replace(/\/+$/, '')}/${rel}`
const parentOf = (rel: string): string => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/') + 1) : '')
const baseOf = (rel: string): string => rel.split('/').pop() ?? rel

export function FileTree({ repo }: { repo: RepoData }): React.JSX.Element {
  const path = repo.path
  const { openContextMenu, openModal, setFileView, toast } = useUIStore()
  const fileView = useUIStore((s) => s.fileView)
  const treeStatus = repo.treeStatus

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

  // Open a file in the center viewer, guarding unsaved edits in the editor.
  const openFile = (rel: string): void => {
    const doOpen = (): void =>
      setFileView({ repoPath: path, file: rel, source: { type: 'tree' }, mode: 'file' })
    if (useUIStore.getState().editorDirty) {
      openModal({
        kind: 'confirm',
        title: 'Discard changes',
        message: 'Discard unsaved changes in the open file?',
        danger: true,
        confirmLabel: 'Discard',
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
      title: isDir ? 'New folder' : 'New file',
      label: dir ? `In ${dir}/` : 'At repository root',
      placeholder: isDir ? 'components' : 'index.ts',
      submitLabel: 'Create',
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
      title: `Rename ${node.dir ? 'folder' : 'file'}`,
      label: `New name for ${baseOf(node.path)}`,
      initial: baseOf(node.path),
      submitLabel: 'Rename',
      onSubmit: (name) => {
        const clean = name.trim().replace(/^\/+|\/+$/g, '')
        if (!clean || clean === baseOf(node.path)) return
        void repoActions.fsRename(path, node.path, parentOf(node.path) + clean)
      }
    })

  const confirmDelete = (node: TreeEntry): void =>
    openModal({
      kind: 'confirm',
      title: 'Move to trash',
      message: `Move "${node.path}" to the trash? You can restore it from your system trash.`,
      danger: true,
      confirmLabel: 'Move to trash',
      onConfirm: () => void repoActions.fsDelete(path, [node.path], baseOf(node.path))
    })

  const menuFor = (node: TreeEntry): MenuItem[] => {
    const status = treeStatus[node.path]
    const ignorePattern = node.dir ? `/${node.path}/` : `/${node.path}`
    return [
      ...(node.dir
        ? [
            { label: 'New File…', onClick: () => promptCreate(node.path, false) } as MenuItem,
            { label: 'New Folder…', onClick: () => promptCreate(node.path, true) } as MenuItem,
            { separator: true } as MenuItem
          ]
        : [{ label: 'Open', onClick: () => openFile(node.path) } as MenuItem, { separator: true } as MenuItem]),
      { label: 'Rename…', onClick: () => promptRename(node) },
      { label: 'Move to Trash', danger: true, onClick: () => confirmDelete(node) },
      { separator: true },
      {
        label: 'Add to .gitignore',
        disabled: status === 'ignored',
        onClick: () => void repoActions.addToGitignore(path, [ignorePattern], node.path)
      },
      {
        label: 'Stop tracking (keep file)',
        onClick: () => void repoActions.untrack(path, [node.path], false, node.path)
      },
      { separator: true },
      { label: shellApi.revealLabel, onClick: () => void shellApi.revealInFolder(abs(path, node.path)) },
      { label: 'Open in default app', onClick: () => void shellApi.openPath(abs(path, node.path)) },
      { label: 'Copy path', onClick: () => void navigator.clipboard.writeText(node.path) }
    ]
  }

  const rootMenu = (): MenuItem[] => [
    { label: 'New File…', onClick: () => promptCreate('', false) },
    { label: 'New Folder…', onClick: () => promptCreate('', true) }
  ]

  const renderLevel = (dir: string, depth: number): React.JSX.Element[] => {
    const ents = children[dir]
    if (!ents) return []
    return ents.map((node) => {
      const open = node.dir && expanded.has(node.path)
      const status = treeStatus[node.path]
      const selected = !node.dir && fileView?.repoPath === path && fileView.file === node.path
      return (
        <Fragment key={node.path}>
          <div
            className={`tree-row${selected ? ' selected' : ''}${status ? ` st-${status}` : ''}`}
            style={{ paddingLeft: 6 + depth * 13 }}
            title={node.path}
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
            {status && status !== 'ignored' && <span className="tree-dot" />}
          </div>
          {open && renderLevel(node.path, depth + 1)}
        </Fragment>
      )
    })
  }

  const rootEnts = children['']
  return (
    <div
      className="file-tree"
      onContextMenu={(e) => {
        // Right-click on empty area → root-level create menu.
        if (e.target === e.currentTarget) {
          e.preventDefault()
          openContextMenu(e.clientX, e.clientY, rootMenu())
        }
      }}
    >
      {!rootEnts && loading.has('') && (
        <div className="tree-loading">
          <Loader2 size={14} className="spin" /> Loading…
        </div>
      )}
      {rootEnts && rootEnts.length === 0 && <div className="sb-empty">Empty repository</div>}
      {renderLevel('', 0)}
    </div>
  )
}
