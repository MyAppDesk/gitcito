import { useCallback, useEffect, useState } from 'react'
import { Binary, Boxes, ChevronLeft, FileText, FolderTree, GitCommit, Loader2, Tag } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import type { GitObject, GitObjectKind, RefObject } from '../../../shared/types'
import { useT, interp } from '../i18n'

/** Human-readable byte size. */
function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

const ICON: Record<GitObjectKind, typeof GitCommit> = {
  commit: GitCommit,
  tree: FolderTree,
  blob: FileText,
  tag: Tag
}

/** `refs/heads/main` reads better as `main` once the group is obvious. */
function shortRef(name: string): string {
  return name.replace(/^refs\/(heads|tags|remotes)\//, '')
}

function groupOf(name: string): string {
  if (name === 'HEAD') return 'HEAD'
  if (name.startsWith('refs/heads/')) return 'refs/heads'
  if (name.startsWith('refs/tags/')) return 'refs/tags'
  if (name.startsWith('refs/remotes/')) return 'refs/remotes'
  return name.split('/').slice(0, 2).join('/')
}

/**
 * The layer beneath the graph: blobs, trees, commits, tags and the refs that
 * point at them, walkable.
 *
 * Nothing here mutates anything — that is the point. Git's model is four object
 * types and some pointers, and it stops being folklore the moment you can click
 * a commit, land on its tree, and find the blob your file actually is.
 */
export function ObjectExplorer({ repoPath, rev }: { repoPath: string; rev?: string }): React.JSX.Element {
  const t = useT()
  const [refs, setRefs] = useState<RefObject[]>([])
  const [object, setObject] = useState<GitObject | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(rev ?? 'HEAD')
  // Where we have been, so walking down a tree can be walked back up.
  const [trail, setTrail] = useState<string[]>([])

  const load = useCallback(
    async (target: string, push: boolean): Promise<void> => {
      setLoading(true)
      setError('')
      try {
        const found = await gitApi.gitObject(repoPath, target)
        setObject((previous) => {
          if (push && previous) setTrail((t2) => [...t2, previous.sha])
          return found
        })
        setQuery(target)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    },
    [repoPath]
  )

  useEffect(() => {
    void gitApi.objectRefs(repoPath).then(setRefs).catch(() => setRefs([]))
    void load(rev ?? 'HEAD', false)
  }, [repoPath, rev, load])

  const back = (): void => {
    const previous = trail[trail.length - 1]
    if (!previous) return
    setTrail((t2) => t2.slice(0, -1))
    void load(previous, false)
  }

  const link = (target: string, label: string, title?: string): React.JSX.Element => (
    <button className="obj-link" title={title} onClick={() => void load(target, true)}>
      {label}
    </button>
  )

  const Icon = object ? ICON[object.kind] : Boxes

  return (
    <div className="obj-modal">
      <h3>
        <Boxes size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('objects.title')}
      </h3>
      <p className="settings-hint">{t('objects.intro')}</p>

      <div className="obj-bar">
        <button className="btn ghost small" disabled={!trail.length} onClick={back} title={t('objects.back')}>
          <ChevronLeft size={13} />
        </button>
        <input
          className="modal-input"
          value={query}
          spellCheck={false}
          placeholder="HEAD~2^{tree}" // i18n-ignore a git revision expression, not prose
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load(query, true)
          }}
        />
        <button className="btn primary small" onClick={() => void load(query, true)}>
          {loading ? <Loader2 size={13} className="spin" /> : t('objects.resolve')}
        </button>
      </div>

      <div className="obj-body">
        <div className="obj-refs">
          {Object.entries(
            refs.reduce<Record<string, RefObject[]>>((groups, ref) => {
              ;(groups[groupOf(ref.name)] ??= []).push(ref)
              return groups
            }, {})
          ).map(([group, list]) => (
            <div key={group} className="obj-ref-group">
              <div className="obj-ref-head">{group}</div>
              {list.slice(0, 40).map((ref) => (
                <button
                  key={ref.name}
                  className={`obj-ref ${object?.sha === ref.sha ? 'active' : ''}`}
                  onClick={() => void load(ref.name, true)}
                  title={ref.sha}
                >
                  {shortRef(ref.name)}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="obj-pane">
          {error ? (
            <p className="obj-error">{error}</p>
          ) : !object ? (
            <p className="settings-hint">{t('common.loading')}</p>
          ) : (
            <>
              <div className="obj-head">
                <Icon size={14} />
                <span className="obj-kind">{object.kind}</span>
                <code className="obj-sha" title={object.sha}>
                  {object.sha}
                </code>
                <span className="obj-size">{fmtBytes(object.size)}</span>
              </div>

              {object.commit && (
                <div className="obj-fields">
                  <div className="obj-field">
                    <span>tree</span>
                    {link(object.commit.tree, object.commit.tree.slice(0, 12), t('objects.openTree'))}
                  </div>
                  {object.commit.parents.map((parent) => (
                    <div key={parent} className="obj-field">
                      <span>parent</span>
                      {link(parent, parent.slice(0, 12))}
                    </div>
                  ))}
                  <div className="obj-field">
                    <span>author</span>
                    <em>{object.commit.author}</em>
                  </div>
                  <div className="obj-field">
                    <span>committer</span>
                    <em>{object.commit.committer}</em>
                  </div>
                  <pre className="obj-message">{object.commit.message}</pre>
                </div>
              )}

              {object.tag && (
                <div className="obj-fields">
                  <div className="obj-field">
                    <span>object</span>
                    {link(object.tag.object, object.tag.object.slice(0, 12))}
                  </div>
                  <div className="obj-field">
                    <span>type</span>
                    <em>{object.tag.type}</em>
                  </div>
                  <div className="obj-field">
                    <span>tagger</span>
                    <em>{object.tag.tagger}</em>
                  </div>
                  <pre className="obj-message">{object.tag.message}</pre>
                </div>
              )}

              {object.tree && (
                <div className="obj-tree">
                  {object.tree.length === 0 && <p className="settings-hint">{t('objects.emptyTree')}</p>}
                  {object.tree.map((child) => (
                    <div key={`${child.sha}:${child.name}`} className="obj-tree-row">
                      <code className="obj-mode">{child.mode}</code>
                      <span className="obj-child-kind">{child.kind}</span>
                      {link(child.sha, child.name)}
                      <code className="obj-child-sha">{child.sha.slice(0, 8)}</code>
                      <span className="obj-size">{child.size === null ? '' : fmtBytes(child.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              {object.blob && (
                <div className="obj-blob">
                  {object.blob.text === null ? (
                    <p className="settings-hint">
                      <Binary size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                      {interp(t('objects.binary'), { size: fmtBytes(object.size) })}
                    </p>
                  ) : (
                    <pre>{object.blob.text}</pre>
                  )}
                  {object.blob.truncated && <p className="settings-hint">{t('objects.truncated')}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
