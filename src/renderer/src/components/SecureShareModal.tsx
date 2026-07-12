import { useEffect, useMemo, useState } from 'react'
import {
  Lock,
  FileUp,
  FileDown,
  KeyRound,
  Loader2,
  ShieldAlert,
  TriangleAlert,
  FileKey2,
  CheckSquare,
  Square
} from 'lucide-react'
import { secureShareApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'
import type {
  SecureShareCandidate,
  SecureBundleHeader,
  SecureSharePreviewEntry,
  SecureShareError
} from '../../../shared/types'

// Export a chosen set of repo files (typically .env and friends) as a
// password-encrypted .gitcito bundle, or import one into this repo — files
// land at the same relative paths they were exported from.

const MIN_PASSWORD = 8

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function baseName(p: string): string {
  return p.split(/[\\/]/).filter(Boolean).pop() ?? p
}

export function SecureShareModal({
  repoPath,
  initialMode
}: {
  repoPath: string
  initialMode?: 'export' | 'import'
}): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const closeModal = useUIStore((s) => s.closeModal)
  const [mode, setMode] = useState<'export' | 'import'>(initialMode ?? 'export')

  const errText = (code: SecureShareError): string =>
    ({
      invalid: t('share.errInvalid'),
      'bad-password': t('share.errBadPassword'),
      'unsupported-version': t('share.errVersion'),
      'read-failed': t('share.errRead'),
      'write-failed': t('share.errWrite')
    })[code]

  // ── Export state ──────────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState<SecureShareCandidate[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void secureShareApi.candidates(repoPath).then((list) => {
      setCandidates(list)
      // Likely secrets are what you came here to share — preselect them.
      setSelected(new Set(list.filter((c) => c.secret).map((c) => c.path)))
    })
  }, [repoPath])

  const shown = useMemo(() => {
    if (!candidates) return []
    const q = filter.trim().toLowerCase()
    return q ? candidates.filter((c) => c.path.toLowerCase().includes(q)) : candidates
  }, [candidates, filter])

  const toggle = (path: string): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })

  const passwordOk = password.length >= MIN_PASSWORD && password === confirm
  const canExport = selected.size > 0 && passwordOk && !busy

  const doExport = async (): Promise<void> => {
    setBusy(true)
    try {
      const res = await secureShareApi.export(repoPath, baseName(repoPath), [...selected], password)
      if ('error' in res) toast('error', errText(res.error))
      else if ('path' in res) {
        toast('success', `${t('share.exported')} ${res.path}`)
        closeModal()
      }
    } finally {
      setBusy(false)
    }
  }

  // ── Import state ──────────────────────────────────────────────────────────
  const [bundle, setBundle] = useState<{ path: string; header: SecureBundleHeader } | null>(null)
  const [importPassword, setImportPassword] = useState('')
  const [preview, setPreview] = useState<SecureSharePreviewEntry[] | null>(null)
  const [importSel, setImportSel] = useState<Set<string>>(new Set())

  const pickFile = async (): Promise<void> => {
    const res = await secureShareApi.pick()
    if (!res) return
    if ('error' in res) {
      toast('error', errText(res.error))
      return
    }
    setBundle(res)
    setPreview(null)
    setImportPassword('')
  }

  const doPreview = async (): Promise<void> => {
    if (!bundle) return
    setBusy(true)
    try {
      const res = await secureShareApi.preview(bundle.path, importPassword, repoPath)
      if ('error' in res) {
        toast('error', errText(res.error))
        return
      }
      setPreview(res.files)
      setImportSel(new Set(res.files.filter((f) => f.safe).map((f) => f.path)))
    } finally {
      setBusy(false)
    }
  }

  const toggleImport = (path: string): void =>
    setImportSel((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })

  const doApply = async (): Promise<void> => {
    if (!bundle) return
    setBusy(true)
    try {
      const res = await secureShareApi.apply(bundle.path, importPassword, repoPath, [...importSel])
      if ('error' in res) toast('error', errText(res.error))
      else {
        toast('success', `${res.written.length} ${t('share.applied')}`)
        closeModal()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="share-modal">
      <h3>
        <Lock size={16} /> {t('share.title')}
      </h3>
      <div className="share-tabs">
        <button className={`btn small ${mode === 'export' ? 'primary' : 'ghost'}`} onClick={() => setMode('export')}>
          <FileUp size={13} /> {t('share.exportTab')}
        </button>
        <button className={`btn small ${mode === 'import' ? 'primary' : 'ghost'}`} onClick={() => setMode('import')}>
          <FileDown size={13} /> {t('share.importTab')}
        </button>
      </div>

      {mode === 'export' ? (
        <>
          <p className="settings-hint">{t('share.exportHint')}</p>
          <input
            className="modal-input"
            placeholder={t('share.filter')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            spellCheck={false}
          />
          {!candidates ? (
            <div className="share-loading">
              <Loader2 size={15} className="spin" />
            </div>
          ) : shown.length === 0 ? (
            <div className="vault-empty">{t('share.noFiles')}</div>
          ) : (
            <div className="share-list">
              {shown.map((c) => (
                <button key={c.path} className="share-row" onClick={() => toggle(c.path)}>
                  {selected.has(c.path) ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span className="share-path mono" title={c.path}>
                    {c.path}
                  </span>
                  {c.secret && (
                    <span className="share-badge" title={t('share.secretBadge')}>
                      <FileKey2 size={12} />
                    </span>
                  )}
                  <span className="share-size">{fmtSize(c.size)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="share-count">
            {selected.size} {t('share.selected')}
          </div>
          <div className="share-passwords">
            <input
              className="modal-input"
              type="password"
              placeholder={t('share.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="modal-input"
              type="password"
              placeholder={t('share.confirmPassword')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {password.length > 0 && password.length < MIN_PASSWORD && (
            <div className="share-warn">
              <ShieldAlert size={13} /> {t('share.passwordShort')}
            </div>
          )}
          {confirm.length > 0 && password !== confirm && (
            <div className="share-warn">
              <ShieldAlert size={13} /> {t('share.passwordMismatch')}
            </div>
          )}
          <div className="modal-actions">
            <button className="btn primary" disabled={!canExport} onClick={() => void doExport()}>
              {busy ? <Loader2 size={14} className="spin" /> : <Lock size={14} />} {t('share.export')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="settings-hint">{t('share.importHint')}</p>
          <div className="share-pick">
            <button className="btn ghost" onClick={() => void pickFile()}>
              <FileDown size={14} /> {t('share.pickFile')}
            </button>
            {bundle && (
              <span className="share-bundle-info">
                <strong>{bundle.header.project}</strong> · {bundle.header.fileCount} {t('share.files')} ·{' '}
                {new Date(bundle.header.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {bundle && !preview && (
            <div className="share-passwords">
              <input
                className="modal-input"
                type="password"
                placeholder={t('share.password')}
                value={importPassword}
                autoFocus
                onChange={(e) => setImportPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && importPassword && void doPreview()}
              />
              <button className="btn primary" disabled={!importPassword || busy} onClick={() => void doPreview()}>
                {busy ? <Loader2 size={14} className="spin" /> : <KeyRound size={14} />} {t('share.unlock')}
              </button>
            </div>
          )}
          {preview && (
            <>
              <div className="share-list">
                {preview.map((f) => (
                  <button
                    key={f.path}
                    className={`share-row ${f.safe ? '' : 'unsafe'}`}
                    disabled={!f.safe}
                    onClick={() => toggleImport(f.path)}
                  >
                    {importSel.has(f.path) ? <CheckSquare size={14} /> : <Square size={14} />}
                    <span className="share-path mono" title={f.path}>
                      {f.path}
                    </span>
                    {!f.safe && (
                      <span className="share-badge danger" title={t('share.unsafePath')}>
                        <ShieldAlert size={12} /> {t('share.unsafePath')}
                      </span>
                    )}
                    {f.safe && f.exists && (
                      <span className="share-badge warn" title={t('share.overwrite')}>
                        <TriangleAlert size={12} /> {t('share.overwrite')}
                      </span>
                    )}
                    <span className="share-size">{fmtSize(f.size)}</span>
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <button className="btn primary" disabled={importSel.size === 0 || busy} onClick={() => void doApply()}>
                  {busy ? <Loader2 size={14} className="spin" /> : <FileDown size={14} />} {t('share.apply')} (
                  {importSel.size})
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
