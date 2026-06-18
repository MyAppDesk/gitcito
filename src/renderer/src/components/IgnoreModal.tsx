import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { repoActions } from '../stores/repo'

export function IgnoreModal({ spec }: { spec: Extract<ModalSpec, { kind: 'ignore' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const { repoPath, targetPath, isFolder } = spec

  const slash = targetPath.lastIndexOf('/')
  const parent = slash >= 0 ? targetPath.slice(0, slash) : ''
  const base = slash >= 0 ? targetPath.slice(slash + 1) : targetPath
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot + 1) : ''
  const canLocation = parent !== ''

  type TypeOpt = { v: string; label: string }
  const typeOptions: TypeOpt[] = isFolder
    ? [
        { v: 'folder', label: 'This folder' },
        { v: 'name', label: `Any folder named “${base}”` }
      ]
    : [
        { v: 'exact', label: 'This exact file' },
        ...(ext ? [{ v: 'ext', label: `All *.${ext} files` }] : []),
        { v: 'name', label: `Any file named “${base}”` }
      ]

  const [type, setType] = useState(typeOptions[0].v)
  const [location, setLocation] = useState<'closest' | 'root'>(canLocation ? 'closest' : 'root')

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
    void repoActions.addToGitignoreAt(repoPath, dir, [line], line)
  }

  return (
    <>
      <h3>
        <EyeOff size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Ignore {isFolder ? 'folder' : 'file'}
      </h3>
      <p className="ig-target" title={targetPath}>
        {targetPath}
      </p>

      <div className="ig-group-label">What to ignore</div>
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
          <div className="ig-group-label">Which .gitignore</div>
          <div className="ig-options">
            <label className="ig-radio">
              <input
                type="radio"
                name="ig-loc"
                checked={location === 'closest'}
                onChange={() => setLocation('closest')}
              />
              <span>
                Closest folder <code>{parent}/.gitignore</code>
              </span>
            </label>
            <label className="ig-radio">
              <input type="radio" name="ig-loc" checked={location === 'root'} onChange={() => setLocation('root')} />
              <span>Repo root</span>
            </label>
          </div>
        </>
      )}

      <div className="ig-preview">
        <span className="ig-preview-label">Adds to {targetLabel}:</span>
        <code>{line}</code>
      </div>

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          Cancel
        </button>
        <button className="btn primary" onClick={apply}>
          Add to .gitignore
        </button>
      </div>
    </>
  )
}
