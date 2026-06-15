import { useEffect, useRef, useState } from 'react'
import { SquarePen } from 'lucide-react'
import type { FileEntry, GraphCommit } from '../../../shared/types'
import { gitApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import { FileListView } from './FileListView'
import { ViewToggle } from './CommitComposer'
import { Avatar } from './Avatar'
import type { RepoData } from '../stores/repo'

export function CommitDetails({ repo, hash }: { repo: RepoData; hash: string }): React.JSX.Element {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [amendBusy, setAmendBusy] = useState(false)
  const [editingSubject, setEditingSubject] = useState(false)
  const [draftSubject, setDraftSubject] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const fileView = useUIStore((s) => s.fileView)
  const setFileView = useUIStore((s) => s.setFileView)
  const commit: GraphCommit | undefined = repo.commits.find((c) => c.hash === hash)

  useEffect(() => {
    setFiles([])
    let cancelled = false
    void gitApi.commitFiles(repo.path, hash).then((f) => {
      if (!cancelled) setFiles(f)
    })
    return () => {
      cancelled = true
    }
  }, [repo.path, hash])

  useEffect(() => {
    if (!commit) return
    setEditingSubject(false)
    setDraftSubject(commit.subject)
  }, [commit])

  useEffect(() => {
    if (!editingSubject) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingSubject])

  if (!commit) return <div className="panel-empty">Commit not found</div>

  const canAmendMessage = commit.refs.some((ref) => ref === 'HEAD' || ref.startsWith('HEAD ->'))

  const cancelEditing = (): void => {
    setEditingSubject(false)
    setDraftSubject(commit.subject)
  }

  const submitSubject = async (): Promise<void> => {
    const nextSubject = draftSubject.trim()
    if (!nextSubject || nextSubject === commit.subject) {
      cancelEditing()
      return
    }

    if (!canAmendMessage || amendBusy) return
    setAmendBusy(true)
    try {
      const ok = await repoActions.amendCommitMessage(repo.path, nextSubject, commit.subject)
      if (ok) setEditingSubject(false)
    } finally {
      setAmendBusy(false)
    }
  }

  const currentFile =
    fileView && fileView.repoPath === repo.path && fileView.source.type === 'commit' && fileView.source.hash === hash
      ? fileView.file
      : null

  return (
    <div className="details">
      <div className="details-info">
        <div className="commit-header">
          <Avatar email={commit.email} name={commit.author} size={38} className="avatar" title={commit.email} />
          <div className="commit-meta">
            <strong>{commit.author}</strong>
            <span>{new Date(commit.date * 1000).toLocaleString()}</span>
            <div className="commit-meta-row">
              <code>{commit.hash.slice(0, 10)}</code>
              {canAmendMessage && (
                <button
                  className="icon-btn commit-edit-btn"
                  type="button"
                  onClick={() => {
                    setDraftSubject(commit.subject)
                    setEditingSubject(true)
                  }}
                  title="Edit the last commit message"
                  disabled={amendBusy}
                >
                  <SquarePen size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
        {editingSubject ? (
          <input
            ref={inputRef}
            className="commit-subject commit-subject-input"
            value={draftSubject}
            maxLength={100}
            disabled={amendBusy}
            onChange={(e) => setDraftSubject(e.target.value)}
            onBlur={() => {
              if (!amendBusy) cancelEditing()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void submitSubject()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                cancelEditing()
              }
            }}
          />
        ) : (
          <p className="commit-subject">{commit.subject}</p>
        )}

        <div className="panel-toolbar">
          <span className="panel-title">
            {files.length} changed file{files.length === 1 ? '' : 's'}
          </span>
          <ViewToggle />
        </div>
        <FileListView
          files={files}
          current={currentFile}
          onFileClick={(f) =>
            setFileView({
              repoPath: repo.path,
              file: f.path,
              source: { type: 'commit', hash },
              mode: useUIStore.getState().fileView?.mode === 'file' ? 'file' : 'diff'
            })
          }
          onFileContext={(f, e) => {
            e.preventDefault()
            useUIStore.getState().openContextMenu(e.clientX, e.clientY, [
              { label: shellApi.revealLabel, onClick: () => void shellApi.revealInFolder(`${repo.path}/${f.path}`) },
              { label: 'Open with default app', onClick: () => void shellApi.openPath(`${repo.path}/${f.path}`) }
            ])
          }}
        />
      </div>
    </div>
  )
}
