import { useCallback, useEffect, useState } from 'react'
import { Webhook, Loader2, Pencil, Trash2, Power, PowerOff, ChevronLeft, Info } from 'lucide-react'
import type { HookInfo, HooksInfo } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'

type HookState = 'active' | 'disabled' | 'sample' | 'none'

function hookState(h: HookInfo): HookState {
  if (h.exists) return h.executable ? 'active' : 'disabled'
  return h.sample ? 'sample' : 'none'
}

export function HooksModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const toast = useUIStore((s) => s.toast)
  const t = useT()

  const [info, setInfo] = useState<HooksInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const load = useCallback(async (): Promise<void> => {
    const next = await gitApi.hooksInfo(repoPath)
    setInfo(next)
  }, [repoPath])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const openEditor = async (name: string): Promise<void> => {
    setBusy(true)
    try {
      const content = await gitApi.readHook(repoPath, name)
      setDraft(content)
      setEditing(name)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const save = async (): Promise<void> => {
    if (!editing) return
    setBusy(true)
    try {
      await gitApi.writeHook(repoPath, editing, draft)
      await load()
      toast('success', interp(t('hooks.savedHook'), { name: editing }))
      setEditing(null)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (h: HookInfo): Promise<void> => {
    setBusy(true)
    try {
      await gitApi.setHookEnabled(repoPath, h.name, !h.executable)
      await load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = (h: HookInfo): void => {
    openModal({
      kind: 'confirm',
      title: t('hooks.deleteTitle'),
      message: interp(t('hooks.deleteMsg'), { name: h.name }),
      danger: true,
      confirmLabel: t('hooks.deleteConfirm'),
      onConfirm: () => {
        void gitApi
          .deleteHook(repoPath, h.name)
          .then(() => load())
          .then(() => toast('success', interp(t('hooks.deletedHook'), { name: h.name })))
          .catch((err) => toast('error', err instanceof Error ? err.message : String(err)))
      }
    })
  }

  if (editing) {
    return (
      <>
        <h3>
          <button className="hooks-back" onClick={() => setEditing(null)} title={t('hooks.backTitle')}>
            <ChevronLeft size={16} />
          </button>
          {t('hooks.editHeading').replace('{name}', editing)}
        </h3>
        <textarea
          className="hooks-editor"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          autoFocus
        />
        <p className="hooks-hint">{t('hooks.saveHint')}</p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => setEditing(null)} disabled={busy}>
            {t('rebase.cancel')}
          </button>
          <button className="btn primary" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 size={13} className="spin" /> : null} {t('hooks.saveHook')}
          </button>
        </div>
      </>
    )
  }

  const STATE_LABEL: Record<HookState, string> = {
    active: t('hooks.stateActive'),
    disabled: t('hooks.stateDisabled'),
    sample: t('hooks.stateSample'),
    none: t('hooks.stateNone')
  }

  return (
    <>
      <h3>
        <Webhook size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('hooks.title')}
      </h3>

      {loading ? (
        <div className="hooks-empty">
          <Loader2 size={15} className="spin" /> {t('hooks.loading')}
        </div>
      ) : !info ? (
        <div className="hooks-empty">{t('hooks.error')}</div>
      ) : (
        <>
          {(info.customHooksPath || info.preCommitFramework) && (
            <div className="hooks-banner">
              <Info size={14} />
              <span>
                {info.preCommitFramework && t('hooks.preCommitFramework')}
                {info.customHooksPath && t('hooks.customHooksPath')}
              </span>
            </div>
          )}
          <p className="hooks-dir" title={info.hooksDir}>
            {info.hooksDir}
          </p>
          <div className="hooks-list">
            {info.hooks.map((h) => {
              const state = hookState(h)
              return (
                <div key={h.name} className="hooks-row">
                  <code className="hooks-name">{h.name}</code>
                  <span className={`hooks-state hooks-${state}`}>{STATE_LABEL[state]}</span>
                  <span className="hooks-row-actions">
                    {h.exists && (
                      <button
                        className="icon-btn"
                        title={h.executable ? t('hooks.enableTitle') : t('hooks.disableTitle')}
                        onClick={() => void toggle(h)}
                        disabled={busy}
                      >
                        {h.executable ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      title={h.exists ? t('hooks.editBtnTitle') : t('hooks.createBtnTitle')}
                      onClick={() => void openEditor(h.name)}
                      disabled={busy}
                    >
                      <Pencil size={14} />
                    </button>
                    {h.exists && (
                      <button className="icon-btn danger" title={t('hooks.deleteConfirm')} onClick={() => remove(h)} disabled={busy}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          {t('rebase.cancel')}
        </button>
      </div>
    </>
  )
}
