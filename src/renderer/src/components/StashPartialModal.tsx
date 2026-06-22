import { useMemo, useState } from 'react'
import { Archive, Plus, Pencil, Minus } from 'lucide-react'
import { repoActions, useRepoStore } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import type { FileEntry } from '../../../shared/types'

/** Pick a subset of working-tree changes to stash (partial stash). */
export function StashPartialModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const repo = useRepoStore((s) => s.repos[repoPath])

  // Dirty files, deduped by path (a file can be both staged + unstaged).
  const files = useMemo<FileEntry[]>(() => {
    const all = [
      ...(repo?.status?.staged ?? []),
      ...(repo?.status?.unstaged ?? []),
      ...(repo?.status?.conflicted ?? [])
    ]
    const byPath = new Map<string, FileEntry>()
    for (const f of all) if (!byPath.has(f.path)) byPath.set(f.path, f)
    return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path))
  }, [repo?.status])

  const [picked, setPicked] = useState<Set<string>>(() => new Set(files.map((f) => f.path)))
  const [message, setMessage] = useState('')
  const [keepIndex, setKeepIndex] = useState(false)

  const toggle = (path: string): void =>
    setPicked((cur) => {
      const next = new Set(cur)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const allOn = picked.size === files.length && files.length > 0
  const toggleAll = (): void => setPicked(allOn ? new Set() : new Set(files.map((f) => f.path)))

  const kindIcon = (f: FileEntry): React.JSX.Element => {
    if (f.untracked || f.status === 'A') return <Plus size={12} className="wip-add" />
    if (f.status === 'D') return <Minus size={12} className="wip-del" />
    return <Pencil size={11} className="wip-mod" />
  }

  const submit = (): void => {
    if (picked.size === 0) return
    repoActions.stashPush(repoPath, message.trim() || undefined, [...picked], keepIndex)
    toast('success', `Stashing ${picked.size} file${picked.size === 1 ? '' : 's'}`)
    closeModal()
  }

  return (
    <div className="stash-partial">
      <h3>
        <Archive size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Stash selected changes
      </h3>
      <p className="settings-hint">
        Stash only the files you tick. Unticked changes stay in your working tree.
      </p>

      {files.length === 0 ? (
        <p className="settings-hint">Working tree is clean — nothing to stash.</p>
      ) : (
        <>
          <div className="stash-partial-toolbar">
            <label className="stash-partial-all">
              <input type="checkbox" checked={allOn} onChange={toggleAll} />
              {allOn ? 'None' : 'All'} ({picked.size}/{files.length})
            </label>
          </div>
          <div className="stash-partial-list">
            {files.map((f) => (
              <label key={f.path} className="stash-partial-row">
                <input type="checkbox" checked={picked.has(f.path)} onChange={() => toggle(f.path)} />
                {kindIcon(f)}
                <span className="stash-partial-path" title={f.path}>{f.path}</span>
              </label>
            ))}
          </div>
          <input
            className="modal-input"
            placeholder="Stash message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <label className="stash-partial-keep">
            <input type="checkbox" checked={keepIndex} onChange={(e) => setKeepIndex(e.target.checked)} />
            Keep staged changes in the working tree (<code>--keep-index</code>)
          </label>
        </>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={picked.size === 0}>
          <Archive size={14} /> Stash {picked.size > 0 ? `(${picked.size})` : ''}
        </button>
      </div>
    </div>
  )
}
