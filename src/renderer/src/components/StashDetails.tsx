import { useEffect, useRef, useState } from 'react'
import { Archive } from 'lucide-react'
import type { FileEntry, StashInfo } from '../../../shared/types'
import { gitApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { FileListView } from './FileListView'
import { ViewToggle } from './CommitComposer'
import { repoActions, type RepoData } from '../stores/repo'

export function StashDetails({ repo, sha }: { repo: RepoData; sha: string }): React.JSX.Element {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const lastClicked = useRef<string | null>(null)
  const fileView = useUIStore((s) => s.fileView)
  const setFileView = useUIStore((s) => s.setFileView)
  const openModal = useUIStore((s) => s.openModal)
  const stash: StashInfo | undefined = repo.stashes.find((s) => s.sha === sha)

  useEffect(() => {
    setFiles([])
    setSelected(new Set())
    lastClicked.current = null
    if (!stash) return
    let cancelled = false
    void gitApi.stashFiles(repo.path, sha, stash.untrackedSha).then((f) => {
      if (!cancelled) setFiles(f)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.path, sha])

  if (!stash) return <div className="panel-empty">Stash no longer exists</div>

  const currentFile =
    fileView && fileView.repoPath === repo.path && fileView.source.type === 'stash' && fileView.source.sha === sha
      ? fileView.file
      : null

  const restoreFiles = (targets: FileEntry[]): void => {
    const tracked = targets.filter((f) => !f.untracked).map((f) => f.path)
    const untracked = targets.filter((f) => f.untracked).map((f) => f.path)
    void repoActions.stashApplyFiles(repo.path, sha, tracked, untracked)
    setSelected(new Set())
  }

  const targetsFor = (file: FileEntry): FileEntry[] =>
    selected.has(file.path) && selected.size > 1 ? files.filter((f) => selected.has(f.path)) : [file]

  const handleClick = (file: FileEntry, e: React.MouseEvent): void => {
    let paths: Set<string>
    if (e.shiftKey && lastClicked.current) {
      const order = files.map((f) => f.path)
      const a = order.indexOf(lastClicked.current)
      const b = order.indexOf(file.path)
      paths =
        a !== -1 && b !== -1
          ? new Set([...selected, ...order.slice(Math.min(a, b), Math.max(a, b) + 1)])
          : new Set([file.path])
    } else if (e.metaKey || e.ctrlKey) {
      paths = new Set(selected)
      if (paths.has(file.path)) paths.delete(file.path)
      else paths.add(file.path)
      lastClicked.current = file.path
    } else {
      paths = new Set([file.path])
      lastClicked.current = file.path
    }
    setSelected(paths)
    setFileView({
      repoPath: repo.path,
      file: file.path,
      source: { type: 'stash', sha, untracked: !!file.untracked },
      mode: useUIStore.getState().fileView?.mode === 'file' ? 'file' : 'diff'
    })
  }

  return (
    <div className="details">
      <div className="details-info">
        <div className="commit-header">
          <div className="avatar stash-avatar" title={`stash@{${stash.index}}`}>
            <Archive size={15} />
          </div>
          <div className="commit-meta">
            <strong>{stash.message}</strong>
            {stash.branch && <span className="stash-branch-tag">{stash.branch}</span>}
            <span>{new Date(stash.date * 1000).toLocaleString()}</span>
            <code>{stash.sha.slice(0, 10)}</code>
          </div>
        </div>

        <div className="stash-actions">
          <button className="btn" onClick={() => void repoActions.stashApply(repo.path, stash.index)}>
            Apply
          </button>
          <button className="btn" onClick={() => void repoActions.stashPop(repo.path, stash.index)}>
            Pop
          </button>
          <button
            className="btn danger"
            onClick={() =>
              openModal({
                kind: 'confirm',
                title: 'Drop stash',
                message: `Drop "${stash.message}"? This cannot be undone.`,
                danger: true,
                confirmLabel: 'Drop',
                onConfirm: () => void repoActions.stashDrop(repo.path, stash.index)
              })
            }
          >
            Drop
          </button>
        </div>

        <div className="panel-toolbar">
          <span className="panel-title">
            {files.length} changed file{files.length === 1 ? '' : 's'}
          </span>
          {selected.size > 0 && (
            <button
              className="btn ghost tiny"
              title="Restore only the selected files into the working tree (stash is kept)"
              onClick={() => restoreFiles(files.filter((f) => selected.has(f.path)))}
            >
              Apply selected ({selected.size})
            </button>
          )}
          <ViewToggle />
        </div>
        <FileListView
          files={files}
          current={currentFile}
          selected={selected}
          onFileClick={handleClick}
          onFileContext={(f, e) => {
            e.preventDefault()
            const targets = targetsFor(f)
            useUIStore.getState().openContextMenu(e.clientX, e.clientY, [
              {
                label: `Apply ${targets.length > 1 ? `${targets.length} files` : 'this file'} to working tree`,
                onClick: () => restoreFiles(targets)
              },
              { separator: true },
              { label: shellApi.revealLabel, onClick: () => void shellApi.revealInFolder(`${repo.path}/${f.path}`) },
              { label: 'Open with default app', onClick: () => void shellApi.openPath(`${repo.path}/${f.path}`) }
            ])
          }}
        />
      </div>
    </div>
  )
}
