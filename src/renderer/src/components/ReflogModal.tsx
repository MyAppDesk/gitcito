import { useEffect, useState } from 'react'
import { History, Loader2, MoreVertical } from 'lucide-react'
import type { ReflogEntry } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import { useT, interp } from '../i18n'

/** Short "time since" label — mirrors the Toolbar helper. */
function timeSince(at: number): string {
  if (!at) return ''
  const diff = (Date.now() - at * 1000) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/** Split "commit: msg" into a leading verb and the rest, for compact display. */
function splitAction(action: string): { verb: string; rest: string } {
  const i = action.indexOf(':')
  if (i === -1) return { verb: action, rest: '' }
  return { verb: action.slice(0, i), rest: action.slice(i + 1).trim() }
}

export function ReflogModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const toast = useUIStore((s) => s.toast)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const t = useT()

  const [ref, setRef] = useState('HEAD')
  const [entries, setEntries] = useState<ReflogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const locals = repo?.branches.locals ?? []

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    gitApi
      .reflog(repoPath, ref)
      .then((e) => {
        if (!cancelled) setEntries(e)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [repoPath, ref])

  const rowMenu = (entry: ReflogEntry, e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const short = entry.sha.slice(0, 7)
    openContextMenu(rect.right, rect.bottom + 4, [
      {
        label: t('reflog.checkoutDetached'),
        onClick: () => {
          closeModal()
          void repoActions.checkout(repoPath, entry.sha)
        }
      },
      {
        label: t('reflog.createBranch'),
        onClick: () => {
          openModal({
            kind: 'input',
            title: t('reflog.createBranchTitle'),
            label: interp(t('reflog.createBranchFrom'), { sha: short }),
            placeholder: t('reflog.createBranchPlaceholder'),
            submitLabel: t('reflog.createBranchSubmit'),
            onSubmit: (name) => void repoActions.createBranch(repoPath, name, entry.sha)
          })
        }
      },
      { separator: true },
      {
        label: interp(t('reflog.resetHard'), { ref: repo?.branches.current ?? 'branch' }),
        danger: true,
        onClick: () => {
          openModal({
            kind: 'confirm',
            title: t('reflog.resetHardTitle'),
            message: interp(t('reflog.resetHardMsg'), { branch: repo?.branches.current ?? 'the current branch', sha: short }),
            danger: true,
            confirmLabel: t('reflog.resetHardConfirm'),
            onConfirm: () => void repoActions.reset(repoPath, entry.sha, 'hard')
          })
        }
      },
      { separator: true },
      {
        label: t('reflog.copySha'),
        onClick: () => {
          void navigator.clipboard.writeText(entry.sha)
          toast('success', t('reflog.shaCopied'))
        }
      }
    ])
  }

  return (
    <>
      <h3>
        <History size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('reflog.title')}
      </h3>
      <p className="reflog-sub">
        {t('reflog.intro')}
      </p>

      <div className="reflog-refbar">
        <label className="modal-label" style={{ margin: 0 }}>
          {t('reflog.refLabel')}
        </label>
        <select className="ir-action" value={ref} onChange={(e) => setRef(e.target.value)}>
          <option value="HEAD">HEAD</option>
          {locals.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="reflog-empty">
          <Loader2 size={15} className="spin" /> {t('reflog.loading')}
        </div>
      ) : error ? (
        <div className="ir-error">{error}</div>
      ) : entries.length === 0 ? (
        <div className="reflog-empty">{interp(t('reflog.empty'), { ref })}</div>
      ) : (
        <div className="reflog-list">
          {entries.map((entry) => {
            const { verb, rest } = splitAction(entry.action)
            return (
              <div key={entry.selector} className="reflog-row">
                <code className="reflog-selector">{entry.selector}</code>
                <code className="ir-hash">{entry.sha.slice(0, 7)}</code>
                <span className="reflog-verb">{verb}</span>
                <span className="reflog-msg" title={rest}>
                  {rest}
                </span>
                <span className="reflog-date">{timeSince(entry.date)}</span>
                <button className="reflog-actions-btn" title={t('reflog.title')} onClick={(e) => rowMenu(entry, e)}>
                  <MoreVertical size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          {t('rebase.cancel')}
        </button>
      </div>
    </>
  )
}
