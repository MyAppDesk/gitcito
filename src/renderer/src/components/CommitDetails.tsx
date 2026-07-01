import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SquarePen, ExternalLink, Sparkles, Loader2, Laptop, Tag, Cloud, Copy } from 'lucide-react'
import type { CommitBranchInfo, FileEntry, GraphCommit, RemoteInfo } from '../../../shared/types'
import { autolink, remoteWebUrl } from '../lib/autolink'
import { gitApi, aiApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { repoActions } from '../stores/repo'
import { FileListView } from './FileListView'
import { ViewToggle } from './CommitComposer'
import { Avatar } from './Avatar'
import { RemoteIcon } from './RemoteIcon'
import { SignatureBadge } from './SignatureBadge'
import type { RepoData } from '../stores/repo'
import { useT, interp } from '../i18n'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const fileView = useUIStore((s) => s.fileView)
  const setFileView = useUIStore((s) => s.setFileView)
  const toast = useUIStore((s) => s.toast)
  const activeProfile = useSettingsStore((s) => s.activeProfile)
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)
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
            {(branches.length > 0 || tags.length > 0) && (
              <div className="commit-refs-row">
                {branches.map((b) => (
                  <span
                    key={b.name}
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
                ))}
                {tags.map((tg) => {
                  const isPushed = repo.remoteTagNames.includes(tg)
                  return (
                    <span
                      key={tg}
                      className="ref-badge ref-tag"
                      title={`${tg}${isPushed ? ' · pushed' : ' · local only'}`}
                    >
                      <Tag size={10} className="ref-ic" />
                      {isPushed && <Cloud size={10} className="ref-ic" />}
                      <span className="ref-text">{tg}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {commit.coAuthors && commit.coAuthors.length > 0 && (
          <div className="commit-coauthors">
            {commit.coAuthors.map((a) => {
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
            })}
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
              { label: t('commitPanel.openDefaultApp'), onClick: () => void shellApi.openPath(`${repo.path}/${f.path}`) }
            ])
          }}
        />
      </div>
    </div>
  )
}
