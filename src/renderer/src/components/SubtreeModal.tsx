import { useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, FolderInput, Loader2, Plus, Scissors, Upload, X } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import type { SubtreeInfo } from '../../../shared/types'
import { useT, interp } from '../i18n'

/**
 * Subtrees vendored into this repository.
 *
 * The list comes from history (git leaves a `git-subtree-dir:` trailer), but the
 * url and ref do not exist anywhere in git — so a discovered subtree starts
 * unlinked and the fields have to be filled once before pull and push work.
 */
export function SubtreeModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const [subtrees, setSubtrees] = useState<SubtreeInfo[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ prefix: '', url: '', ref: 'main' })
  const [squash, setSquash] = useState(true)
  const [busy, setBusy] = useState('')
  // Per-row edits of the remembered source, keyed by prefix.
  const [edits, setEdits] = useState<Record<string, { url: string; ref: string }>>({})

  const reload = useCallback(async (): Promise<void> => {
    const found = await gitApi.subtrees(repoPath).catch(() => [])
    setSubtrees(found)
    setEdits(Object.fromEntries(found.map((s) => [s.prefix, { url: s.url, ref: s.ref || 'main' }])))
  }, [repoPath])
  useEffect(() => {
    void reload()
  }, [reload])

  const withBusy = async (key: string, fn: () => Promise<unknown>): Promise<void> => {
    setBusy(key)
    try {
      await fn()
      await reload()
    } finally {
      setBusy('')
    }
  }

  const add = (): void =>
    void withBusy('add', async () => {
      const ok = await repoActions.subtreeAdd(repoPath, draft.prefix, draft.url, draft.ref, squash)
      if (ok) {
        setAdding(false)
        setDraft({ prefix: '', url: '', ref: 'main' })
      }
    })

  const split = (entry: SubtreeInfo): void =>
    openModal({
      kind: 'input',
      title: t('subtree.splitTitle'),
      label: interp(t('subtree.splitLabel'), { prefix: entry.prefix }),
      placeholder: entry.prefix.split('/').pop() ?? 'library',
      submitLabel: t('subtree.split'),
      onSubmit: (branch) => void withBusy(entry.prefix, () => repoActions.subtreeSplit(repoPath, entry.prefix, branch))
    })

  const rows = subtrees ?? []

  return (
    <div className="subtree-modal">
      <h3>
        <FolderInput size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('subtree.title')}
      </h3>
      <p className="settings-hint">{t('subtree.intro')}</p>

      {subtrees === null ? (
        <p className="settings-hint">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="settings-hint">{t('subtree.none')}</p>
      ) : (
        <div className="subtree-list">
          {rows.map((entry) => {
            const edit = edits[entry.prefix] ?? { url: '', ref: 'main' }
            const linked = !!edit.url.trim()
            return (
              <div key={entry.prefix} className="subtree-row">
                <div className="subtree-row-head">
                  <strong>{entry.prefix}</strong>
                  {!entry.present && <span className="subtree-tag">{t('subtree.missing')}</span>}
                  {entry.lastSplit && <code title={t('subtree.lastSplit')}>{entry.lastSplit.slice(0, 7)}</code>}
                  {entry.url && (
                    <button
                      className="icon-btn tiny"
                      title={t('subtree.forget')}
                      onClick={() => void withBusy(entry.prefix, () => gitApi.subtreeForget(repoPath, entry.prefix))}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="subtree-row-fields">
                  <input
                    className="modal-input"
                    value={edit.url}
                    placeholder={t('subtree.urlPlaceholder')}
                    onChange={(e) => setEdits({ ...edits, [entry.prefix]: { ...edit, url: e.target.value } })}
                  />
                  <input
                    className="modal-input subtree-ref"
                    value={edit.ref}
                    placeholder="main"
                    onChange={(e) => setEdits({ ...edits, [entry.prefix]: { ...edit, ref: e.target.value } })}
                  />
                </div>
                <div className="subtree-row-actions">
                  {!linked && <span className="settings-hint">{t('subtree.needsSource')}</span>}
                  <button
                    className="btn ghost small"
                    disabled={!linked || !!busy}
                    onClick={() =>
                      void withBusy(entry.prefix, () =>
                        repoActions.subtreePull(repoPath, entry.prefix, edit.url, edit.ref, squash)
                      )
                    }
                  >
                    {busy === entry.prefix ? <Loader2 size={12} className="spin" /> : <ArrowDownToLine size={12} />}{' '}
                    {t('subtree.pull')}
                  </button>
                  <button
                    className="btn ghost small"
                    disabled={!linked || !!busy}
                    onClick={() =>
                      void withBusy(entry.prefix, () =>
                        repoActions.subtreePush(repoPath, entry.prefix, edit.url, edit.ref)
                      )
                    }
                  >
                    <Upload size={12} /> {t('subtree.push')}
                  </button>
                  <button className="btn ghost small" disabled={!!busy} onClick={() => split(entry)}>
                    <Scissors size={12} /> {t('subtree.split')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adding ? (
        <div className="subtree-add">
          <label className="modal-label">{t('subtree.prefix')}</label>
          <input
            autoFocus
            className="modal-input"
            value={draft.prefix}
            placeholder="vendor/library"
            onChange={(e) => setDraft({ ...draft, prefix: e.target.value })}
          />
          <label className="modal-label">{t('subtree.url')}</label>
          <input
            className="modal-input"
            value={draft.url}
            placeholder={t('subtree.urlPlaceholder')}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
          <label className="modal-label">{t('subtree.ref')}</label>
          <input
            className="modal-input"
            value={draft.ref}
            placeholder="main"
            onChange={(e) => setDraft({ ...draft, ref: e.target.value })}
          />
          <label className="clone-partial">
            <input type="checkbox" checked={squash} onChange={(e) => setSquash(e.target.checked)} />
            <span>
              {t('subtree.squash')}
              <span className="modal-hint">{t('subtree.squashHint')}</span>
            </span>
          </label>
          <div className="modal-actions">
            <button className="btn ghost" type="button" onClick={() => setAdding(false)}>
              {t('common.cancel')}
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={!draft.prefix.trim() || !draft.url.trim() || !draft.ref.trim() || busy === 'add'}
              onClick={add}
            >
              {busy === 'add' ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} {t('subtree.add')}
            </button>
          </div>
        </div>
      ) : (
        <div className="modal-actions">
          <button className="btn ghost" type="button" onClick={() => setAdding(true)}>
            <Plus size={13} /> {t('subtree.add')}
          </button>
        </div>
      )}
    </div>
  )
}
