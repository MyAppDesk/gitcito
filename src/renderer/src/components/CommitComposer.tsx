import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Trash2, AlignLeft, FolderTree, GitMerge, ChevronDown } from 'lucide-react'
import { MYAPPDESK_COAUTHOR, type FileEntry } from '../../../shared/types'
import { gitApi, aiApi, shellApi } from '../infrastructure/api'
import { repoActions, type RepoData } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { FileListView } from './FileListView'

type ListName = 'staged' | 'unstaged'

export function ViewToggle(): React.JSX.Element {
  const fileListView = useSettingsStore((s) => s.settings.fileListView ?? 'path')
  const update = useSettingsStore((s) => s.update)
  const setFileListView = (v: 'path' | 'tree'): void => update((s) => ({ ...s, fileListView: v }))
  return (
    <div className="view-toggle">
      <button
        className={fileListView === 'path' ? 'active' : ''}
        onClick={() => setFileListView('path')}
        title="Flat path list"
      >
        <AlignLeft size={12} /> Path
      </button>
      <button
        className={fileListView === 'tree' ? 'active' : ''}
        onClick={() => setFileListView('tree')}
        title="Tree view"
      >
        <FolderTree size={12} /> Tree
      </button>
    </div>
  )
}

export function CommitComposer({ repo }: { repo: RepoData }): React.JSX.Element {
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [amend, setAmend] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [selection, setSelection] = useState<{ list: ListName; paths: Set<string> }>({
    list: 'unstaged',
    paths: new Set()
  })
  const lastClicked = useRef<string | null>(null)
  const toast = useUIStore((s) => s.toast)
  const fileView = useUIStore((s) => s.fileView)
  const setFileView = useUIStore((s) => s.setFileView)
  const activeProfile = useSettingsStore((s) => s.activeProfile)

  const layout = useUIStore((s) => s.layout)
  const setLayout = useUIStore((s) => s.setLayout)
  const unstagedRef = useRef<HTMLDivElement>(null)
  const stagedRef = useRef<HTMLDivElement>(null)
  const [splitDragging, setSplitDragging] = useState(false)

  const status = repo.status
  const staged = status?.staged ?? []
  const unstaged = status?.unstaged ?? []
  const conflicted = status?.conflicted ?? []
  const path = repo.path

  // When a merge/cherry-pick/revert is in progress, prefill the composer with the
  // message git already prepared (e.g. "Merge branch 'main' into feat/ui") — so
  // resolving conflicts doesn't leave the commit message blank.
  // Prefill once per merge: the guard resets when the merge state clears.
  const prefilledFor = useRef<string | null>(null)
  useEffect(() => {
    if (!repo.mergeState) {
      prefilledFor.current = null
      return
    }
    if (prefilledFor.current === path || summary.trim() || description.trim()) return
    prefilledFor.current = path
    void gitApi.mergeMessage(path).then((msg) => {
      const text = msg.trim()
      if (!text) return
      const [first, ...rest] = text.split('\n')
      setSummary(first)
      setDescription(rest.join('\n').trim())
    })
  }, [repo.mergeState, path, summary, description])

  // Drag the divider between the Unstaged and Staged lists to repartition space.
  const startSplitDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.preventDefault()
    const u = unstagedRef.current
    const s = stagedRef.current
    if (!u || !s) return
    const startY = e.clientY
    const total = u.offsetHeight + s.offsetHeight
    const startU = u.offsetHeight
    const min = 56
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'row-resize'
    setSplitDragging(true)
    const move = (ev: PointerEvent): void => {
      const next = Math.min(total - min, Math.max(min, startU + (ev.clientY - startY)))
      setLayout({ composerUnstagedRatio: next / total })
    }
    const up = (): void => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      setSplitDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const currentFile = fileView && fileView.repoPath === path && fileView.source.type === 'wip' ? fileView.file : null

  const handleClick = (list: ListName, files: FileEntry[]) => (file: FileEntry, e: React.MouseEvent) => {
    let paths: Set<string>
    if (e.shiftKey && selection.list === list && lastClicked.current) {
      const order = files.map((f) => f.path)
      const a = order.indexOf(lastClicked.current)
      const b = order.indexOf(file.path)
      if (a !== -1 && b !== -1) {
        const range = order.slice(Math.min(a, b), Math.max(a, b) + 1)
        paths = new Set([...selection.paths, ...range])
      } else {
        paths = new Set([file.path])
      }
    } else if ((e.metaKey || e.ctrlKey) && selection.list === list) {
      paths = new Set(selection.paths)
      if (paths.has(file.path)) paths.delete(file.path)
      else paths.add(file.path)
      lastClicked.current = file.path
    } else {
      paths = new Set([file.path])
      lastClicked.current = file.path
    }
    setSelection({ list, paths })
    // Open in the center panel (keep the right panel as-is).
    setFileView({
      repoPath: path,
      file: file.path,
      source: { type: 'wip', staged: list === 'staged', untracked: !!file.untracked },
      mode: useUIStore.getState().fileView?.mode === 'file' ? 'file' : 'diff'
    })
  }

  const pathsFor = (list: ListName, file: FileEntry): string[] =>
    selection.list === list && selection.paths.has(file.path) && selection.paths.size > 1
      ? [...selection.paths]
      : [file.path]

  const handleContext = (list: ListName, files: FileEntry[]) => (file: FileEntry, e: React.MouseEvent) => {
    e.preventDefault()
    const targets = pathsFor(list, file)
    const targetFiles = files.filter((f) => targets.includes(f.path))
    const label = targets.length > 1 ? `${targets.length} files` : `"${file.path}"`
    useUIStore.getState().openContextMenu(e.clientX, e.clientY, [
      list === 'staged'
        ? { label: `Unstage ${targets.length > 1 ? `${targets.length} files` : 'file'}`, onClick: () => void repoActions.unstage(path, targets) }
        : { label: `Stage ${targets.length > 1 ? `${targets.length} files` : 'file'}`, onClick: () => void repoActions.stage(path, targets) },
      { separator: true },
      { label: shellApi.revealLabel, onClick: () => void shellApi.revealInFolder(`${path}/${file.path}`) },
      { label: 'Open with default app', onClick: () => void shellApi.openPath(`${path}/${file.path}`) },
      { separator: true },
      {
        label: 'Discard changes',
        danger: true,
        onClick: () =>
          useUIStore.getState().openModal({
            kind: 'confirm',
            title: 'Discard changes',
            message: `Discard changes in ${label}? This cannot be undone.`,
            danger: true,
            confirmLabel: 'Discard',
            onConfirm: async () => {
              const untracked = targetFiles.filter((f) => f.untracked).map((f) => f.path)
              const tracked = targetFiles.filter((f) => !f.untracked).map((f) => f.path)
              if (tracked.length) await repoActions.discard(path, tracked, false)
              if (untracked.length) await repoActions.discard(path, untracked, true)
            }
          })
      }
    ])
  }

  const handleFolderContext = (list: ListName, files: FileEntry[]) => (folderPath: string, e: React.MouseEvent) => {
    e.preventDefault()
    const inFolder = files.filter((f) => f.path === folderPath || f.path.startsWith(`${folderPath}/`))
    const targets = inFolder.map((f) => f.path)
    if (targets.length === 0) return
    const label = `"${folderPath}/" (${targets.length} file${targets.length === 1 ? '' : 's'})`
    useUIStore.getState().openContextMenu(e.clientX, e.clientY, [
      list === 'staged'
        ? { label: `Unstage folder (${targets.length})`, onClick: () => void repoActions.unstage(path, targets) }
        : { label: `Stage folder (${targets.length})`, onClick: () => void repoActions.stage(path, targets) },
      { separator: true },
      { label: shellApi.revealLabel, onClick: () => void shellApi.revealInFolder(`${path}/${folderPath}`) },
      { separator: true },
      {
        label: 'Discard changes in folder',
        danger: true,
        onClick: () =>
          useUIStore.getState().openModal({
            kind: 'confirm',
            title: 'Discard changes',
            message: `Discard changes in ${label}? This cannot be undone.`,
            danger: true,
            confirmLabel: 'Discard',
            onConfirm: async () => {
              const untracked = inFolder.filter((f) => f.untracked).map((f) => f.path)
              const tracked = inFolder.filter((f) => !f.untracked).map((f) => f.path)
              if (tracked.length) await repoActions.discard(path, tracked, false)
              if (untracked.length) await repoActions.discard(path, untracked, true)
            }
          })
      }
    ])
  }

  const stageAction = (list: ListName) => (file: FileEntry) => (
    <button
      className="btn ghost tiny file-stage-btn"
      onClick={(e) => {
        e.stopPropagation()
        const targets = pathsFor(list, file)
        if (list === 'staged') void repoActions.unstage(path, targets)
        else void repoActions.stage(path, targets)
        setSelection({ list, paths: new Set() })
      }}
    >
      {list === 'staged' ? 'Unstage' : 'Stage'}
    </button>
  )

  const selectedCount = (list: ListName): number => (selection.list === list ? selection.paths.size : 0)

  const generateWithAI = async (): Promise<void> => {
    if (staged.length === 0) {
      toast('info', 'Stage some changes first')
      return
    }
    setAiBusy(true)
    try {
      const stagedDiff = await gitApi.stagedDiff(path)
      const msg = await aiApi.commitMessage(stagedDiff, activeProfile().ai, { branch: repo.branches.current })
      setSummary(msg.summary)
      setDescription(msg.description)
      toast('success', 'AI commit message generated')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setAiBusy(false)
    }
  }

  const doCommit = async (): Promise<void> => {
    let message = description.trim() ? `${summary.trim()}\n\n${description.trim()}` : summary.trim()
    if (!message) return
    const trailer = `Co-authored-by: ${MYAPPDESK_COAUTHOR}`
    if (activeProfile().ai.coAuthor !== false && !message.includes(trailer)) {
      message = `${message}\n\n${trailer}`
    }
    const ok = await repoActions.commit(path, message, amend)
    if (ok) {
      setSummary('')
      setDescription('')
      setAmend(false)
      setFileView(null)
    }
  }

  // Partition the remaining space between the Unstaged and Staged lists.
  const ratio = Math.min(0.88, Math.max(0.12, layout.composerUnstagedRatio ?? 0.5))
  const bothExpanded = !layout.composerUnstagedCollapsed && !layout.composerStagedCollapsed
  const showSplitHandle = bothExpanded
  const unstagedStyle: React.CSSProperties = layout.composerUnstagedCollapsed
    ? { flex: '0 0 auto' }
    : { flex: bothExpanded ? `${ratio} 1 0` : '1 1 0' }
  const stagedStyle: React.CSSProperties = layout.composerStagedCollapsed
    ? { flex: '0 0 auto' }
    : { flex: bothExpanded ? `${1 - ratio} 1 0` : '1 1 0' }

  return (
    <div className="composer">
      <div className="panel-toolbar">
        <span className="panel-title">
          {staged.length + unstaged.length} file change{staged.length + unstaged.length === 1 ? '' : 's'} on{' '}
          <em>{repo.branches.current}</em>
        </span>
        <ViewToggle />
      </div>

      <div className={`composer-lists${splitDragging ? ' dragging' : ''}`}>
        {conflicted.length > 0 && (
          <div className={`stage-section conflict-section${layout.composerConflictedCollapsed ? ' collapsed' : ''}`}>
            <div className="stage-header conflict-header">
              <button
                className="stage-collapse"
                title={layout.composerConflictedCollapsed ? 'Expand' : 'Collapse'}
                onClick={() => setLayout({ composerConflictedCollapsed: !layout.composerConflictedCollapsed })}
              >
                <ChevronDown size={13} className={`chevron${layout.composerConflictedCollapsed ? ' collapsed' : ''}`} />
              </button>
              <GitMerge size={13} />
              <span>Conflicted files</span>
              <span className="sb-count">{conflicted.length}</span>
            </div>
            <AnimatePresence initial={false}>
              {!layout.composerConflictedCollapsed && (
                <motion.div
                  className="stage-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
              <FileListView
                files={conflicted}
                current={null}
                onFileClick={(f) => useUIStore.getState().setConflictView({ repoPath: path, file: f.path })}
                onFileContext={(f, e) => {
                  e.preventDefault()
                  useUIStore.getState().openContextMenu(e.clientX, e.clientY, [
                    {
                      label: 'Resolve conflicts…',
                      onClick: () => useUIStore.getState().setConflictView({ repoPath: path, file: f.path })
                    },
                    { label: 'Keep ours', onClick: () => void repoActions.conflictTakeSide(path, f.path, 'ours') },
                    { label: 'Keep theirs', onClick: () => void repoActions.conflictTakeSide(path, f.path, 'theirs') },
                    { label: 'Delete file', danger: true, onClick: () => void repoActions.conflictTakeSide(path, f.path, 'delete') },
                    {
                      label: 'Mark as resolved (stage as-is)',
                      onClick: () => void repoActions.stage(path, [f.path])
                    },
                    { separator: true },
                    { label: shellApi.revealLabel, onClick: () => void shellApi.revealInFolder(`${path}/${f.path}`) },
                    { label: 'Open with default app', onClick: () => void shellApi.openPath(`${path}/${f.path}`) }
                  ])
                }}
                action={(f) => (
                  <button
                    className="btn ghost tiny file-stage-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      useUIStore.getState().setConflictView({ repoPath: path, file: f.path })
                    }}
                  >
                    Resolve
                  </button>
                )}
              />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div
          ref={unstagedRef}
          className={`stage-section${layout.composerUnstagedCollapsed ? ' collapsed' : ''}`}
          style={unstagedStyle}
        >
          <div className="stage-header">
            <button
              className="stage-collapse"
              title={layout.composerUnstagedCollapsed ? 'Expand' : 'Collapse'}
              onClick={() => setLayout({ composerUnstagedCollapsed: !layout.composerUnstagedCollapsed })}
            >
              <ChevronDown size={13} className={`chevron${layout.composerUnstagedCollapsed ? ' collapsed' : ''}`} />
            </button>
            <span>Unstaged files</span>
            <span className="sb-count">{unstaged.length}</span>
            <button
              className="btn ghost tiny"
              disabled={unstaged.length === 0}
              onClick={() => {
                if (selectedCount('unstaged') > 1) {
                  void repoActions.stage(path, [...selection.paths])
                  setSelection({ list: 'unstaged', paths: new Set() })
                } else void repoActions.stageAll(path)
              }}
            >
              {selectedCount('unstaged') > 1 ? `Stage selected (${selectedCount('unstaged')})` : 'Stage all'}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {!layout.composerUnstagedCollapsed && (
              <motion.div
                className="stage-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <FileListView
                  files={unstaged}
                  current={currentFile}
                  selected={selection.list === 'unstaged' ? selection.paths : undefined}
                  onFileClick={handleClick('unstaged', unstaged)}
                  onFileContext={handleContext('unstaged', unstaged)}
                  onFolderContext={handleFolderContext('unstaged', unstaged)}
                  action={stageAction('unstaged')}
                />
                {unstaged.length === 0 && <div className="sb-empty">Working tree clean</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showSplitHandle && (
          <div
            className="resize-handle rh-y composer-split-rh"
            onPointerDown={startSplitDrag}
            role="separator"
            aria-orientation="horizontal"
          />
        )}

        <div
          ref={stagedRef}
          className={`stage-section${layout.composerStagedCollapsed ? ' collapsed' : ''}`}
          style={stagedStyle}
        >
          <div className="stage-header">
            <button
              className="stage-collapse"
              title={layout.composerStagedCollapsed ? 'Expand' : 'Collapse'}
              onClick={() => setLayout({ composerStagedCollapsed: !layout.composerStagedCollapsed })}
            >
              <ChevronDown size={13} className={`chevron${layout.composerStagedCollapsed ? ' collapsed' : ''}`} />
            </button>
            <span>Staged files</span>
            <span className="sb-count">{staged.length}</span>
            <button
              className="btn ghost tiny"
              disabled={staged.length === 0}
              onClick={() => {
                if (selectedCount('staged') > 1) {
                  void repoActions.unstage(path, [...selection.paths])
                  setSelection({ list: 'staged', paths: new Set() })
                } else void repoActions.unstageAll(path)
              }}
            >
              {selectedCount('staged') > 1 ? `Unstage selected (${selectedCount('staged')})` : 'Unstage all'}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {!layout.composerStagedCollapsed && (
              <motion.div
                className="stage-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <FileListView
                  files={staged}
                  current={currentFile}
                  selected={selection.list === 'staged' ? selection.paths : undefined}
                  onFileClick={handleClick('staged', staged)}
                  onFileContext={handleContext('staged', staged)}
                  onFolderContext={handleFolderContext('staged', staged)}
                  action={stageAction('staged')}
                />
                {staged.length === 0 && <div className="sb-empty">Nothing staged</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="commit-box">
        <div className="commit-summary-row">
          <input
            className="commit-summary"
            placeholder="Commit summary"
            value={summary}
            maxLength={100}
            onChange={(e) => setSummary(e.target.value)}
          />
          <motion.button
            className="ai-btn"
            title="Generate commit message with AI"
            disabled={aiBusy || staged.length === 0}
            onClick={() => void generateWithAI()}
            whileTap={{ scale: 0.92 }}
          >
            {aiBusy ? <Loader2 size={15} className="spin" /> : <Sparkles size={14} />}
          </motion.button>
        </div>
        <textarea
          className="commit-description"
          placeholder="Description (optional)"
          value={description}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="commit-actions">
          <label className="amend-check">
            <input type="checkbox" checked={amend} onChange={(e) => setAmend(e.target.checked)} />
            Amend
          </label>
          <button
            className="btn ghost small discard-btn"
            title="Discard everything"
            disabled={staged.length + unstaged.length === 0}
            onClick={() =>
              useUIStore.getState().openModal({
                kind: 'confirm',
                title: 'Discard all changes',
                message: 'Discard ALL staged and unstaged changes? This cannot be undone.',
                danger: true,
                confirmLabel: 'Discard all',
                onConfirm: async () => {
                  await gitApi.unstageAll(path).catch(() => undefined)
                  const all = [...staged, ...unstaged]
                  const untracked = all.filter((fl) => fl.untracked).map((fl) => fl.path)
                  const tracked = all.filter((fl) => !fl.untracked).map((fl) => fl.path)
                  if (tracked.length) await repoActions.discard(path, tracked, false)
                  if (untracked.length) await repoActions.discard(path, untracked, true)
                }
              })
            }
          >
            <Trash2 size={13} />
          </button>
          <motion.button
            className="btn primary commit-btn"
            disabled={(!summary.trim() && !amend) || (staged.length === 0 && !amend)}
            onClick={() => void doCommit()}
            whileTap={{ scale: 0.97 }}
          >
            {amend ? 'Amend last commit' : `Commit ${staged.length ? `${staged.length} file${staged.length === 1 ? '' : 's'}` : ''}`}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
