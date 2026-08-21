import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useT, interp } from '../i18n'

type ResetMode = 'soft' | 'mixed' | 'hard'

const MODES: { id: ResetMode; labelKey: 'commitMenu.resetSoft' | 'commitMenu.resetMixed' | 'commitMenu.resetHard' }[] =
  [
    { id: 'soft', labelKey: 'commitMenu.resetSoft' },
    { id: 'mixed', labelKey: 'commitMenu.resetMixed' },
    { id: 'hard', labelKey: 'commitMenu.resetHard' }
  ]

export function ResetToCommitModal({
  spec
}: {
  spec: Extract<ModalSpec, { kind: 'reset-to-commit' }>
}): React.JSX.Element {
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const [mode, setMode] = useState<ResetMode>('mixed')
  const vars = { branch: spec.branch, sha: spec.shortSha }
  const hard = mode === 'hard'
  return (
    <>
      <h3 className="modal-title-row">
        <RotateCcw size={17} /> {t('commitMenu.resetTitle')}
      </h3>
      <p className="modal-message">{interp(t('commitMenu.resetMsg'), vars)}</p>
      <fieldset className="reset-mode-list" style={{ border: 0, margin: '12px 0', padding: 0 }} aria-label={t('commitMenu.resetTitle')}>
        {MODES.map((m) => (
          <label
            key={m.id}
            className="modal-label"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginTop: 8 }}
          >
            <input
              type="radio"
              name="reset-mode"
              value={m.id}
              checked={mode === m.id}
              onChange={() => setMode(m.id)}
            />
            <span>{t(m.labelKey)}</span>
          </label>
        ))}
      </fieldset>
      {spec.dirty && <p className="modal-message">{t('commitMenu.resetDirty')}</p>}
      {hard && <p className="modal-message">{interp(t('commitMenu.resetHardWarn'), vars)}</p>}
      <div className="modal-actions">
        <button className="btn ghost" type="button" onClick={closeModal}>
          {t('common.cancel')}
        </button>
        <button
          className={`btn ${hard ? 'danger' : 'primary'}`}
          type="button"
          onClick={() => {
            closeModal()
            spec.onReset(mode)
          }}
        >
          {hard ? t('commitMenu.resetHardConfirm') : t('commitMenu.resetConfirm')}
        </button>
      </div>
    </>
  )
}
