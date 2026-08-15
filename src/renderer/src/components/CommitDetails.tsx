import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SquarePen, ExternalLink, Sparkles, Loader2, Laptop, Tag, Cloud, Copy } from 'lucide-react'
import type { CodeSearchHit, CommitBranchInfo, FileEntry, GraphCommit, RemoteInfo } from '../../../shared/types'
import { autolink, remoteWebUrl } from '../lib/autolink'
import { gitApi, aiApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { repoActions } from '../stores/repo'
import { FileListView } from './FileListView'
import {
  FileSearchBar,
  EMPTY_FILTER,
  isFilterActive,
  buildQueryRegExp,
  matchesGlobList,
  type FileFilter
} from './FileSearchBar'
import { MatchSummary, matchesByFile } from './SearchMatches'
import { ViewToggle } from './CommitComposer'
import { Avatar } from './Avatar'
import { RemoteIcon } from './RemoteIcon'
import { SignatureBadge } from './SignatureBadge'
import type { RepoData } from '../stores/repo'
import { useT, interp } from '../i18n'
import { openWithMenuItems } from '../lib/openWith'

function profileUrl(name: string, email: string, remotes: RemoteInfo[]): string | undefined {
  const origin = remotes.find((r) => r.name === 'origin')?.url ?? remotes[0]?.url
  if (!origin) return undefined
  const ghNoreply = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/.exec(email)
  if (ghNoreply) return `https://github.com/${ghNoreply[1]}`
  if (origin.includes('github.com'))
    return `https://github.com/search?q=${encodeURIComponent(email)}&type=users`
  if (origin.includes('gitlab.com'))
    return `https://gitlab.com/search?search=${encodeURIComponent(name)}&nav_source=navbar&scope=users`
  if (origin.includes('bitbucket.org'))
    return `https://bitbucket.org/repo/all?search=${encodeURIComponent(name)}`
  return undefined
}

export function CommitDetails({ repo, hash }: { repo: RepoData; hash: string }): React.JSX.Element {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [branches, setBranches] = useState<CommitBranchInfo[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [amendBusy, setAmendBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [editingSubject, setEditingSubject] = useState(false)
  const [draftSubject, setDraftSubject] = useState('')
  const [filter, setFilter] = useState<FileFilter>(EMPTY_FILTER)
  const [hits, setHits] = useState<CodeSearchHit[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileView = useUIStore((s) => s.fileView)
  const setFileView = useUIStore((s) => s.setFileView)
  const toast = useUIStore((s) => s.toast)
  const activeProfile = useSettingsStore((s) => s.activeProfile)
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)
  const defaultOpenApp = useSettingsStore((s) => s.settings.defaultOpenApp)
  const editor = useSettingsStore((s) => s.settings.editor)
  const commit: GraphCommit | undefined = repo.commits.find((c) => c.hash === hash)
  const t = useT()

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
    setBranches([])
    let cancelled = false
    void gitApi.commitBranches(repo.path, hash).then((b) => {
      if (!cancelled) setBranches(b)
    })
    return () => {
      cancelled = true
    }
  }, [repo.path, hash])

  useEffect(() => {
    setTags([])
    let cancelled = false
    void gitApi.commitTags(repo.path, hash).then((tg) => {
      if (!cancelled) setTags(tg)
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

  // ─── File search / filter inside this commit ──────────────────────────────
  // Content search greps the commit's own tree, so hits are the file as it
  // looked at this commit — not the working-tree copy.
  const query = filter.query.trim()
  useEffect(() => {
    if (!query || filter.mode !== 'content' || files.length === 0) {
      setHits(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      void gitApi
        .searchCommitMatches(repo.path, hash, query, {
          paths: files.map((f) => f.path),
          caseSensitive: filter.caseSensitive,
          wholeWord: filter.wholeWord,
          regex: filter.regex
        })
        .then((found) => {
          if (!cancelled) setHits(found)
        })
        .catch(() => {
          if (!cancelled) setHits([])
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, filter.mode, filter.caseSensitive, filter.wholeWord, filter.regex, repo.path, hash, files])

  // Mirror the query into the UI store so the center file/diff view highlights
  // the same term, and drop it when the panel goes away.
  useEffect(() => {
    const setFileSearch = useUIStore.getState().setFileSearch
    if (query && filter.mode === 'content') {
      setFileSearch({
        query,
        caseSensitive: filter.caseSensitive,
        wholeWord: filter.wholeWord,
        regex: filter.regex
      })
    } else setFileSearch(null)
  }, [query, filter.mode, filter.caseSensitive, filter.wholeWord, filter.regex])
  useEffect(() => () => useUIStore.getState().setFileSearch(null), [])

  const hitsByFile = useMemo(() => (hits ? matchesByFile(hits) : null), [hits])
  const contentRe = useMemo(
    () => (filter.mode === 'content' && query ? buildQueryRegExp(filter, true) : null),
    [filter.mode, filter.query, filter.caseSensitive, filter.wholeWord, filter.regex, query]
  )
  const nameRe = useMemo(
    () => (filter.mode === 'name' ? buildQueryRegExp(filter) : null),
    [filter.mode, filter.query, filter.caseSensitive, filter.wholeWord, filter.regex]
  )
  const filteredFiles = useMemo(() => {
    if (!isFilterActive(filter)) return files
    return files.filter((f) => {
      if (filter.include.trim() && !matchesGlobList(f.path, filter.include)) return false
      if (filter.exclude.trim() && matchesGlobList(f.path, filter.exclude)) return false
      if (!query) return true
      if (filter.mode === 'name') return !nameRe || nameRe.test(f.path)
      return !hitsByFile || hitsByFile.has(f.path)
    })
  }, [files, filter, query, nameRe, hitsByFile])

  useEffect(() => {
    if (!editingSubject) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingSubject])

  if (!commit) return <div className="panel-empty">{t('commitPanel.notFound')}</div>

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

  const generateWithAI = async (): Promise<void> => {
    if (!canAmendMessage || aiBusy || amendBusy) return
    setAiBusy(true)
    try {
      const diff = await gitApi.commitDiff(repo.path, hash)
      if (!diff.trim()) {
        toast('info', t('commitPanel.nothingToSummarize'))
        return
      }
      const msg = await aiApi.commitMessage(diff, activeProfile().ai, { branch: repo.branches.current })
      setDraftSubject(msg.summary)
      setEditingSubject(true)
      toast('success', t('commitPanel.aiGenerated'))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setAiBusy(false)
    }
  }

  const currentFile =
    fileView && fileView.repoPath === repo.path && fileView.source.type === 'commit' && fileView.source.hash === hash
      ? fileView.file
      : null

  const REFS_VISIBLE = 3
  const refItems: { key: string; node: React.JSX.Element }[] = [
    ...branches.map((b) => {
      const key = `b:${b.name}`
      return {
        key,
        node: (
          <span
            key={key}
            className={`ref-badge ${b.isLocal ? 'ref-local' : 'ref-remote'}`}
            title={`${b.name}${b.isLocal ? ' · local' : ''}${b.remotes.length ? ` · ${b.remotes.join(', ')}` : ''}`}
          >
            {b.isLocal && <Laptop size={10} className="ref-ic" />}
            {b.remotes.map((remote) => (
              <span key={remote} className="ref-ic">
                <RemoteIcon url={repo.remotes.find((r) => r.name === remote)?.url} size={10} />
              </span>
            ))}
            <span className="ref-text">{b.name}</span>
          </span>
        )
      }
    }),
    ...tags.map((tg) => {
      const key = `t:${tg}`
      const isPushed = repo.remoteTagNames.includes(tg)
      return {
        key,
        node: (
          <span key={key} className="ref-badge ref-tag" title={`${tg}${isPushed ? ` · ${t('ref.pushed')}` : ` · ${t('ref.localOnly')}`}`}>
            <Tag size={10} className="ref-ic" />
            {isPushed && <Cloud size={10} className="ref-ic" />}
            <span className="ref-text">{tg}</span>
          </span>
        )
      }
    })
  ]
  const visibleRefs = refItems.slice(0, REFS_VISIBLE)
  const hiddenRefs = refItems.slice(REFS_VISIBLE)

  const COAUTHORS_VISIBLE = 4
  const coAuthors = commit.coAuthors ?? []
  const visibleCoAuthors = coAuthors.slice(0, COAUTHORS_VISIBLE)
  const hiddenCoAuthors = coAuthors.slice(COAUTHORS_VISIBLE)

  const renderCoauthorRow = (a: (typeof coAuthors)[number]): React.JSX.Element => {
    const url = profileUrl(a.name, a.email, repo.remotes)
    return (
      <div key={a.email} className="commit-coauthor-row">
        <Avatar email={a.email} name={a.name} size={16} />
        <span>{a.name}</span>
        {url && (
          <a
            className="commit-profile-link"
            href="#"
            title={interp(t('commitPanel.openProfileTitle'), { author: a.name })}
            onClick={(e) => { e.preventDefault(); void shellApi.openExternal(url) }}
          >
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="details">
      <div className="details-info">
        <div className="commit-header">
          <Avatar email={commit.email} name={commit.author} size={38} className="avatar" title={commit.email} />
          <div className="commit-meta">
            <span className="commit-author-row">
              <strong>{commit.author}</strong>
              {profileUrl(commit.author, commit.email, repo.remotes) && (
                <a
                  className="commit-profile-link"
                  href="#"
                  title={interp(t('commitPanel.openProfileTitle'), { author: commit.author })}
                  onClick={(e) => { e.preventDefault(); void shellApi.openExternal(profileUrl(commit.author, commit.email, repo.remotes)!) }}
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </span>
            <span>{new Date(commit.date * 1000).toLocaleString()}</span>
            {commit.signature && commit.signature !== 'none' && (
              <span className="commit-sig-row">
                <SignatureBadge signature={commit.signature} signer={commit.signer} withText />
              </span>
            )}
            <div className="commit-meta-row">
              <code>{commit.hash.slice(0, 10)}</code>
              <button
                className="icon-btn commit-edit-btn"
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(commit.hash)
                  toast('success', t('reflog.shaCopied'))
                }}
                title={t('commit.copySha')}
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
        </div>
        {refItems.length > 0 && (
          <div className="commit-section commit-refs-section">
            <span className="commit-section-label">{t('commitPanel.refsLabel')}</span>
            <div className="commit-refs-row">
              {visibleRefs.map((r) => r.node)}
              {hiddenRefs.length > 0 && (
                <span className="ref-collapsed">
                  <span className="ref-more-chip">+{hiddenRefs.length}</span>
                  <div className="commit-refs-pop">{hiddenRefs.map((r) => r.node)}</div>
                </span>
              )}
            </div>
          </div>
        )}
        {coAuthors.length > 0 && (
          <div className="commit-section commit-coauthors-section">
            <span className="commit-section-label">{t('commitPanel.coauthorsLabel')}</span>
            <div className="commit-coauthor-avatars">
              {visibleCoAuthors.map((a) => (
                <span key={a.email} className="coauthor-avatar-wrap">
                  <Avatar email={a.email} name={a.name} size={20} />
                  <div className="commit-coauthor-pop">{renderCoauthorRow(a)}</div>
                </span>
              ))}
              {hiddenCoAuthors.length > 0 && (
                <span className="coauthor-collapsed">
                  <span className="ref-more-chip coauthor-more-chip">+{hiddenCoAuthors.length}</span>
                  <div className="commit-coauthor-pop">{hiddenCoAuthors.map(renderCoauthorRow)}</div>
                </span>
              )}
            </div>
          </div>
        )}
        <div className="commit-message-toolbar">
          <span className="commit-message-label">{t('commitPanel.messageLabel')}</span>
          {canAmendMessage && (
            <button
              className="icon-btn commit-edit-btn"
              type="button"
              onClick={() => {
                setDraftSubject(commit.subject)
                setEditingSubject(true)
              }}
              title={t('commitPanel.editMsgTitle')}
              disabled={amendBusy || aiBusy}
            >
              <SquarePen size={13} />
            </button>
          )}
          {canAmendMessage && aiEnabled && (
            <motion.button
              className="icon-btn commit-edit-btn"
              type="button"
              onClick={() => void generateWithAI()}
              title={t('commitPanel.generateWithAiTitle')}
              disabled={amendBusy || aiBusy}
              whileTap={{ scale: 0.92 }}
            >
              {aiBusy ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
            </motion.button>
          )}
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
          <p className="commit-subject">{autolink(commit.subject, remoteWebUrl(repo.remotes.find((r) => r.name === 'origin')?.url ?? repo.remotes[0]?.url))}</p>
        )}

        <div className="panel-toolbar">
          <span className="panel-title">
            {interp(files.length === 1 ? t('commitPanel.changedFile') : t('commitPanel.changedFiles'), { n: files.length })}
          </span>
          <ViewToggle />
        </div>
        <FileSearchBar value={filter} onChange={setFilter} />
        {hits && <MatchSummary hits={hits} label={(n, f) => interp(t('search.summary'), { n, files: f })} />}
        <FileListView
          files={filteredFiles}
          current={currentFile}
          matches={hitsByFile ?? undefined}
          matchRe={contentRe}
          activeLine={fileView?.line ?? null}
          // Line numbers come from the commit's own blob, so open the File view
          // at that revision — a diff would hide matches outside the hunks.
          onMatchClick={(file, line) =>
            setFileView({ repoPath: repo.path, file, source: { type: 'commit', hash }, mode: 'file', line })
          }
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
              { label: t('commitPanel.openDefaultApp'), onClick: () => void shellApi.openPath(`${repo.path}/${f.path}`) },
              ...openWithMenuItems(
                `${repo.path}/${f.path}`,
                defaultOpenApp,
                {
                  openWithDefault: (name) => interp(t('fileTree.openWithApp'), { name }),
                  openWith: t('fileTree.openWith')
                },
                editor
              ),
              { label: t('common.copyFilePath'), onClick: () => void navigator.clipboard.writeText(`${repo.path}/${f.path}`) }
            ])
          }}
          onFolderContext={(folderPath, e) => {
            e.preventDefault()
            useUIStore.getState().openContextMenu(e.clientX, e.clientY, [
              { label: shellApi.revealLabel, onClick: () => void shellApi.revealInFolder(`${repo.path}/${folderPath}`) },
              { label: t('commitPanel.openDefaultApp'), onClick: () => void shellApi.openPath(`${repo.path}/${folderPath}`) },
              ...openWithMenuItems(
                `${repo.path}/${folderPath}`,
                defaultOpenApp,
                {
                  openWithDefault: (name) => interp(t('fileTree.openWithApp'), { name }),
                  openWith: t('fileTree.openWith')
                },
                editor,
                { isDir: true }
              ),
              { label: t('common.copyFolderPath'), onClick: () => void navigator.clipboard.writeText(`${repo.path}/${folderPath}`) }
            ])
          }}
        />
        {files.length > 0 && filteredFiles.length === 0 && (
          <div className="sb-empty">{t('composer.noFilesMatch')}</div>
        )}
      </div>
    </div>
  )
}
