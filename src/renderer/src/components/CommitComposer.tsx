import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Trash2, AlignLeft, FolderTree, GitMerge, ChevronDown } from 'lucide-react'
import { MYAPPDESK_COAUTHOR, type FileEntry } from '../../../shared/types'
import { gitApi, aiApi, shellApi } from '../infrastructure/api'
import { repoActions, useRepoStore, type RepoData } from '../stores/repo'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { FileListView } from './FileListView'
import { lintCommit, subjectCounterLevel, SUBJECT_IDEAL_LEN } from '../lib/commitLint'
import { isSecretFile } from '../lib/secrets'
import {
  FileSearchBar,
  EMPTY_FILTER,
  isFilterActive,
  matchesGlobList,
  buildQueryRegExp,
  type FileFilter
} from './FileSearchBar'

type ListName = 'staged' | 'unstaged'

/** Human-readable byte size, e.g. 7.3 MB. */
function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

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
  const summary = useRepoStore((s) => s.drafts[repo.path] ?? '')
  const setSummary = useRepoStore((s) => s.setDraft).bind(null, repo.path)
  const [description, setDescription] = useState('')
  // Commit message recall: ↑/↓ in the summary cycles recent commit subjects.
  const histIdx = useRef(-1)
  const histSaved = useRef('')
  const recentMessages = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const c of repo.commits) {
      const s = c.subject.trim()
      if (s && !seen.has(s)) {
        seen.add(s)
        out.push(s)
        if (out.length >= 25) break
      }
    }
    return out
  }, [repo.commits])
  const lintHints = useMemo(() => lintCommit(summary, description), [summary, description])
  const subjLevel = subjectCounterLevel(summary.trim().length)
  const [amend, setAmend] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiStageBusy, setAiStageBusy] = useState(false)
  const [selection, setSelection] = useState<{ list: ListName; paths: Set<string> }>({
    list: 'unstaged',
    paths: new Set()
  })
  const lastClicked = useRef<string | null>(null)
  const toast = useUIStore((s) => s.toast)
  const fileView = useUIStore((s) => s.fileView)
  const setFileView = useUIStore((s) => s.setFileView)
  const activeProfile = useSettingsStore((s) => s.activeProfile)
  const largeFileKb = useSettingsStore((s) => s.settings.largeFileKb)
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)

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

  // ─── File search / filter (path globs + content search) ───────────────────
  const [filter, setFilter] = useState<FileFilter>(EMPTY_FILTER)
  // Paths whose working-tree content matches the search query; null = no active
  // content query (so the content dimension is ignored by the filter).
  const [contentMatches, setContentMatches] = useState<Set<string> | null>(null)
  const query = filter.query.trim()
  const setFileSearch = useUIStore((s) => s.setFileSearch)

  // Content search: ask the backend which changed files contain the query.
  useEffect(() => {
    if (!query || filter.mode !== 'content') {
      setContentMatches(null)
      return
    }
    const allPaths = [...new Set([...unstaged, ...staged, ...conflicted].map((f) => f.path))]
    let cancelled = false
    const t = setTimeout(() => {
      void gitApi
        .searchFileContents(path, allPaths, query, {
          caseSensitive: filter.caseSensitive,
          wholeWord: filter.wholeWord,
          regex: filter.regex
        })
        .then((paths) => {
          if (!cancelled) setContentMatches(new Set(paths))
        })
        .catch(() => {
          if (!cancelled) setContentMatches(new Set())
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, filter.mode, filter.caseSensitive, filter.wholeWord, filter.regex, path, unstaged, staged, conflicted])

  // Mirror the active content query into the UI store so the center file/diff
  // view highlights the same matches.
  useEffect(() => {
    if (query && filter.mode === 'content') {
      setFileSearch({
        query,
        caseSensitive: filter.caseSensitive,
        wholeWord: filter.wholeWord,
        regex: filter.regex
      })
    } else {
      setFileSearch(null)
    }
  }, [query, filter.mode, filter.caseSensitive, filter.wholeWord, filter.regex, setFileSearch])
  useEffect(() => () => useUIStore.getState().setFileSearch(null), [])

  // For file-name search, match the path with the same query/toggles.
  const nameRe = useMemo(
    () => (filter.mode === 'name' ? buildQueryRegExp(filter) : null),
    [filter.mode, filter.query, filter.caseSensitive, filter.wholeWord, filter.regex]
  )

  const matchesFilter = (f: FileEntry): boolean => {
    if (filter.include.trim() && !matchesGlobList(f.path, filter.include)) return false
    if (filter.exclude.trim() && matchesGlobList(f.path, filter.exclude)) return false
    if (query) {
      if (filter.mode === 'name') {
        if (nameRe && !nameRe.test(f.path)) return false
      } else if (contentMatches && !contentMatches.has(f.path)) return false
    }
    return true
  }
  const active = isFilterActive(filter)
  const fUnstaged = useMemo(() => (active ? unstaged.filter(matchesFilter) : unstaged), [unstaged, filter, contentMatches, active])
  const fStaged = useMemo(() => (active ? staged.filter(matchesFilter) : staged), [staged, filter, contentMatches, active])
  const fConflicted = useMemo(() => (active ? conflicted.filter(matchesFilter) : conflicted), [conflicted, filter, contentMatches, active])

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

  // Prefill from the repo's commit.template (.gitmessage) when the composer is
  // empty and no merge is in progress. Comment lines (leading '#') are dropped
  // to match git's default template cleanup, so they never end up committed.
  const templatePrefilledFor = useRef<string | null>(null)
  useEffect(() => {
    if (repo.mergeState) return // merge prefill takes priority
    if (templatePrefilledFor.current === path || summary.trim() || description.trim()) return
    templatePrefilledFor.current = path
    void gitApi.commitTemplate(path).then((tpl) => {
      const text = tpl
        .split('\n')
        .filter((l) => !l.startsWith('#'))
        .join('\n')
        .trim()
      if (!text) return
      // Bail if the user started typing while the template was loading.
      if (useRepoStore.getState().drafts[path]?.trim() || description.trim()) return
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
    // Open in the center panel (keep the right panel as-is). During a content
    // search, open the full File view — the diff only shows changed lines, so a
    // match elsewhere in the file would otherwise be invisible.
    const contentSearch = filter.mode === 'content' && !!query
    setFileView({
      repoPath: path,
      file: file.path,
      source: { type: 'wip', staged: list === 'staged', untracked: !!file.untracked },
      mode: contentSearch || useUIStore.getState().fileView?.mode === 'file' ? 'file' : 'diff'
    })
  }

  const pathsFor = (list: ListName, file: FileEntry): string[] =>
    selection.list === list && selection.paths.has(file.path) && selection.paths.size > 1
      ? [...selection.paths]
      : [file.path]

  // Builds the ".gitignore / stop tracking" menu items shared by the file and
  // folder context menus. For folders, pass `folderPath` so a single anchored
  // `folder/` pattern is written and `git rm -r` untracks the whole subtree.
  const buildIgnoreMenu = (entries: FileEntry[], displayLabel: string, folderPath?: string): MenuItem[] => {
    const isFolder = folderPath !== undefined
    const patterns = isFolder ? [`/${folderPath}/`] : entries.map((f) => `/${f.path}`)
    const hasTracked = entries.some((f) => !f.untracked)
    const trackTargets = isFolder ? [folderPath] : entries.filter((f) => !f.untracked).map((f) => f.path)
    const ignoreTarget = isFolder ? folderPath! : entries[0].path
    const items: MenuItem[] = [
      { separator: true },
      { label: 'Add to .gitignore', onClick: () => void repoActions.addToGitignore(path, patterns, displayLabel) },
      {
        label: 'Ignore… (choose pattern & location)',
        onClick: () =>
          useUIStore.getState().openModal({ kind: 'ignore', repoPath: path, targetPath: ignoreTarget, isFolder })
      }
    ]
    if (hasTracked) {
      items.push({
        label: 'Add to .gitignore & stop tracking',
        onClick: () =>
          useUIStore.getState().openModal({
            kind: 'confirm',
            title: 'Ignore & stop tracking',
            message: `Add ${displayLabel} to .gitignore and stop tracking it in Git. The file(s) stay on disk.`,
            confirmLabel: 'Ignore & untrack',
            onConfirm: () => void repoActions.ignoreAndUntrack(path, trackTargets, patterns, displayLabel)
          })
      })
      items.push({ separator: true })
      items.push({
        label: 'Stop tracking (keep on disk)',
        onClick: () =>
          useUIStore.getState().openModal({
            kind: 'confirm',
            title: 'Stop tracking',
            message: `Stop tracking ${displayLabel} in Git? The file(s) stay on disk but will be removed from the repository on the next commit.`,
            confirmLabel: 'Stop tracking',
            onConfirm: () => void repoActions.untrack(path, trackTargets, false, displayLabel)
          })
      })
      items.push({
        label: 'Delete from Git and disk',
        danger: true,
        onClick: () =>
          useUIStore.getState().openModal({
            kind: 'confirm',
            title: 'Delete from Git and disk',
            message: `Remove ${displayLabel} from version control and permanently delete from disk? This cannot be undone.`,
            danger: true,
            confirmLabel: 'Delete',
            onConfirm: () => void repoActions.untrack(path, trackTargets, true, displayLabel)
          })
      })
    }
    return items
  }

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
      },
      ...buildIgnoreMenu(targetFiles, label)
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
      },
      ...buildIgnoreMenu(inFolder, `"${folderPath}/"`, folderPath)
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

  const autoStageWithAI = async (): Promise<void> => {
    if (unstaged.length === 0) return
    setAiStageBusy(true)
    try {
      const files = unstaged.map((f) => ({ path: f.path, status: f.status }))
      const result = await aiApi.smartStage(files, activeProfile().ai)
      if (result.toStage.length === 0) {
        toast('info', 'AI found nothing worth staging')
        return
      }
      await repoActions.stage(path, result.toStage)
      const skipped = files.length - result.toStage.length
      const msg = skipped > 0
        ? `Staged ${result.toStage.length} file${result.toStage.length === 1 ? '' : 's'}, skipped ${skipped} (${result.reason})`
        : `Staged ${result.toStage.length} file${result.toStage.length === 1 ? '' : 's'} (${result.reason})`
      toast('success', msg)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setAiStageBusy(false)
    }
  }

  const runCommit = async (message: string): Promise<void> => {
    const ok = await repoActions.commit(path, message, amend)
    if (ok) {
      setSummary('')
      setDescription('')
      setAmend(false)
      setFileView(null)
    }
  }

  const doCommit = async (): Promise<void> => {
    let message = description.trim() ? `${summary.trim()}\n\n${description.trim()}` : summary.trim()
    if (!message) return
    const trailer = `Co-authored-by: ${MYAPPDESK_COAUTHOR}`
    if (activeProfile().ai.coAuthor !== false && !message.includes(trailer)) {
      message = `${message}\n\n${trailer}`
    }
    // Pre-commit guard: flag credential-looking files and oversized blobs before
    // they enter history. Both are hard to fully erase later.
    const flagged: { path: string; reason: string }[] = []
    for (const f of staged) if (isSecretFile(f.path)) flagged.push({ path: f.path, reason: 'secret' })
    if (largeFileKb > 0) {
      const sizes = await gitApi
        .fileSizes(path, staged.map((f) => f.path))
        .catch(() => ({}) as Record<string, { size: number; binary: boolean }>)
      for (const f of staged) {
        const info = sizes[f.path]
        if (info && info.size > largeFileKb * 1024 && !flagged.some((x) => x.path === f.path)) {
          flagged.push({ path: f.path, reason: `${fmtBytes(info.size)}${info.binary ? ', binary' : ''}` })
        }
      }
    }
    // Protected-branch warning (committing straight to main/master/…).
    const protectedList = await gitApi.protectedBranches(path).catch(() => [] as string[])
    const onProtected = !amend && protectedList.includes(repo.branches.current)

    if (flagged.length > 0 || onProtected) {
      const all = flagged.map((f) => f.path)
      const parts: string[] = []
      if (onProtected) parts.push(`• You're committing directly to protected branch "${repo.branches.current}"`)
      for (const f of flagged) parts.push(`• ${f.path} (${f.reason})`)
      useUIStore.getState().openModal({
        kind: 'confirm',
        danger: true,
        title: onProtected && flagged.length === 0 ? 'Commit to a protected branch?' : 'Commit anyway?',
        message: `Heads up before this commit:\n\n${parts.join('\n')}\n\nSecrets land in history hard to erase; large blobs bloat the repo forever.`,
        confirmLabel: 'Commit anyway',
        onConfirm: () => void runCommit(message),
        // Offer untrack only when files were flagged.
        secondaryLabel: all.length > 0 ? 'Ignore & untrack' : undefined,
        onSecondary: all.length > 0 ? () => void repoActions.ignoreAndUntrack(path, all, all) : undefined
      })
      return
    }
    await runCommit(message)
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

      <FileSearchBar value={filter} onChange={setFilter} />

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
              <span className="sb-count">{active ? `${fConflicted.length}/${conflicted.length}` : conflicted.length}</span>
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
                files={fConflicted}
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
              {active && fConflicted.length === 0 && <div className="sb-empty">No conflicts match</div>}
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
            <span className="sb-count">{active ? `${fUnstaged.length}/${unstaged.length}` : unstaged.length}</span>
            <div className="stage-header-actions">
              {aiEnabled && (
                <motion.button
                  className="btn ai-stage-btn"
                  title="Auto-select files to stage with AI"
                  disabled={aiStageBusy || unstaged.length === 0}
                  onClick={() => void autoStageWithAI()}
                  whileTap={{ scale: 0.92 }}
                >
                  {aiStageBusy ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                </motion.button>
              )}
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
                  files={fUnstaged}
                  current={currentFile}
                  selected={selection.list === 'unstaged' ? selection.paths : undefined}
                  onFileClick={handleClick('unstaged', fUnstaged)}
                  onFileContext={handleContext('unstaged', fUnstaged)}
                  onFolderContext={handleFolderContext('unstaged', fUnstaged)}
                  action={stageAction('unstaged')}
                />
                {unstaged.length === 0 && <div className="sb-empty">Working tree clean</div>}
                {unstaged.length > 0 && fUnstaged.length === 0 && (
                  <div className="sb-empty">No files match</div>
                )}
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
            <span className="sb-count">{active ? `${fStaged.length}/${staged.length}` : staged.length}</span>
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
                  files={fStaged}
                  current={currentFile}
                  selected={selection.list === 'staged' ? selection.paths : undefined}
                  onFileClick={handleClick('staged', fStaged)}
                  onFileContext={handleContext('staged', fStaged)}
                  onFolderContext={handleFolderContext('staged', fStaged)}
                  action={stageAction('staged')}
                />
                {staged.length === 0 && <div className="sb-empty">Nothing staged</div>}
                {staged.length > 0 && fStaged.length === 0 && (
                  <div className="sb-empty">No files match</div>
                )}
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
            title="↑ / ↓ recall recent commit messages"
            value={summary}
            maxLength={100}
            onChange={(e) => {
              histIdx.current = -1 // typing cancels history navigation
              setSummary(e.target.value)
            }}
            onKeyDown={(e) => {
              const recents = recentMessages
              if (e.key === 'ArrowUp' && recents.length) {
                e.preventDefault()
                if (histIdx.current === -1) histSaved.current = summary
                histIdx.current = Math.min(histIdx.current + 1, recents.length - 1)
                setSummary(recents[histIdx.current])
              } else if (e.key === 'ArrowDown' && histIdx.current >= 0) {
                e.preventDefault()
                histIdx.current -= 1
                setSummary(histIdx.current === -1 ? histSaved.current : recents[histIdx.current])
              }
            }}
          />
          {summary.trim().length > 0 && (
            <span className={`commit-counter ${subjLevel}`} title={`Subject length (aim for ≤ ${SUBJECT_IDEAL_LEN})`}>
              {summary.trim().length}
            </span>
          )}
          {aiEnabled && (
            <motion.button
              className="ai-btn"
              title="Generate commit message with AI"
              disabled={aiBusy || staged.length === 0}
              onClick={() => void generateWithAI()}
              whileTap={{ scale: 0.92 }}
            >
              {aiBusy ? <Loader2 size={15} className="spin" /> : <Sparkles size={14} />}
            </motion.button>
          )}
        </div>
        <textarea
          className="commit-description"
          placeholder="Description (optional)"
          value={description}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
        />
        {lintHints.length > 0 && (
          <ul className="commit-lint">
            {lintHints.map((h, i) => (
              <li key={i} className={`commit-lint-item ${h.level}`}>
                {h.text}
              </li>
            ))}
          </ul>
        )}
        <div className="commit-actions">
          <label className="amend-check">
            <input
              type="checkbox"
              checked={amend}
              onChange={(e) => {
                const on = e.target.checked
                setAmend(on)
                // Prefill the composer with HEAD's message so amend doesn't start blank.
                if (on && !summary.trim() && !description.trim()) {
                  void gitApi.getCommitMessage(path, 'HEAD').then((msg) => {
                    const text = msg.trim()
                    if (!text) return
                    const [first, ...rest] = text.split('\n')
                    setSummary(first)
                    setDescription(rest.join('\n').trim())
                  })
                }
              }}
            />
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
