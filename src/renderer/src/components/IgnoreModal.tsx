import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { repoActions } from '../stores/repo'
import { useT, interp } from '../i18n'

export function IgnoreModal({ spec }: { spec: Extract<ModalSpec, { kind: 'ignore' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const { repoPath, targetPath, isFolder } = spec
  const t = useT()

  const slash = targetPath.lastIndexOf('/')
  const parent = slash >= 0 ? targetPath.slice(0, slash) : ''
  const base = slash >= 0 ? targetPath.slice(slash + 1) : targetPath
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot + 1) : ''
  const canLocation = parent !== ''

  type TypeOpt = { v: string; label: string }
  const typeOptions: TypeOpt[] = isFolder
    ? [
        { v: 'folder', label: t('ignore.thisFolder') },
        { v: 'name', label: interp(t('ignore.anyFolderNamed'), { name: base }) }
      ]
    : [
        { v: 'exact', label: t('ignore.thisFile') },
        ...(ext ? [{ v: 'ext', label: interp(t('ignore.allExt'), { ext }) }] : []),
        { v: 'name', label: interp(t('ignore.anyFileNamed'), { name: base }) }
      ]

  const [type, setType] = useState(typeOptions[0].v)
  const [location, setLocation] = useState<'closest' | 'root'>(canLocation ? 'closest' : 'root')
  const [stopTracking, setStopTracking] = useState(false)
  const [deleteDisk, setDeleteDisk] = useState(false)

  const dir = location === 'root' ? '' : parent
  const rel = location === 'root' ? targetPath : base
  const line = isFolder
    ? type === 'folder'
      ? `/${rel}/`
      : `${base}/`
    : type === 'exact'
      ? `/${rel}`
      : type === 'ext'
        ? `*.${ext}`
        : base
  const targetLabel = dir === '' ? '.gitignore (repo root)' : `${dir}/.gitignore`

  const apply = (): void => {
    closeModal()
    if (stopTracking) {
      void repoActions.ignoreAndUntrackAt(repoPath, dir, [line], [targetPath], deleteDisk, line)
    } else {
      void repoActions.addToGitignoreAt(repoPath, dir, [line], line)
    }
  }

  const applyLabel = stopTracking
    ? deleteDisk
      ? t('ignore.ignoreAndDelete')
      : t('ignore.ignoreAndUntrack')
    : t('ignore.addToGitignore')

  return (
    <>
      <h3>
        <EyeOff size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {isFolder ? t('ignore.ignoreFolder') : t('ignore.ignoreFile')}
      </h3>
      <p className="ig-target" title={targetPath}>
        {targetPath}
      </p>

      <div className="ig-group-label">{t('ignore.whatToIgnore')}</div>
      <div className="ig-options">
        {typeOptions.map((o) => (
          <label key={o.v} className="ig-radio">
            <input type="radio" name="ig-type" checked={type === o.v} onChange={() => setType(o.v)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>

      {canLocation && (
        <>
          <div className="ig-group-label">{t('ignore.whichGitignore')}</div>
          <div className="ig-options">
            <label className="ig-radio">
              <input
                type="radio"
                name="ig-loc"
                checked={location === 'closest'}
                onChange={() => setLocation('closest')}
              />
              <span>
                {interp(t('ignore.closestFolder'), { path: parent })}
              </span>
            </label>
            <label className="ig-radio">
              <input type="radio" name="ig-loc" checked={location === 'root'} onChange={() => setLocation('root')} />
              <span>{t('ignore.repoRoot')}</span>
            </label>
          </div>
        </>
      )}

      <div className="ig-preview">
        <span className="ig-preview-label">{interp(t('ignore.addsTo'), { target: targetLabel })}</span>
        <code>{line}</code>
      </div>

      <div className="ig-group-label">{t('ignore.also')}</div>
      <div className="ig-options">
        <label className="ig-check">
          <input
            type="checkbox"
            checked={stopTracking}
            onChange={(e) => {
              setStopTracking(e.target.checked)
              if (!e.target.checked) setDeleteDisk(false)
            }}
          />
          <span>{t('ignore.stopTracking')}</span>
        </label>
        <label className={`ig-check${stopTracking ? '' : ' disabled'}`}>
          <input
            type="checkbox"
            disabled={!stopTracking}
            checked={deleteDisk}
            onChange={(e) => setDeleteDisk(e.target.checked)}
          />
          <span>{t('ignore.deleteFromDisk')}</span>
        </label>
      </div>

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          {t('bisect.cancel')}
        </button>
        <button className={`btn ${deleteDisk ? 'danger' : 'primary'}`} onClick={apply}>
          {applyLabel}
        </button>
      </div>
    </>
  )
}
