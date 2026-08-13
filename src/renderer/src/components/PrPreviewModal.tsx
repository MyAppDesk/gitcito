import { useEffect, useMemo, useState } from 'react'
import { GitPullRequestArrow, Loader2, Search, GitBranch, GitMerge, AlertTriangle, Check } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { repoActions, useRepoStore } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'
import { parsePrNumber, defaultPreviewBranch } from '../../../shared/prRefs'
import type { PrPreviewMode, PrRefProbe } from '../../../shared/types'

type Source = 'pr' | 'branch'

/**
 * Try someone else's work locally without adopting it: fetch a pull request
 * head (or any branch on a remote) and either park it on a local branch or
 * merge it into the current one without committing.
 *
 * The PR side works off the ref every forge publishes on the *target*
 * repository, so a fork's PR is previewable without adding the fork as a
 * remote and without an API token. The branch side is the escape hatch for
 * forges that publish no such refs.
 */
export function PrPreviewModal({
  repoPath,
  initialNumber,
  initialRemote,
  initialBranch
}: {
  repoPath: string
  initialNumber?: number
  initialRemote?: string
  initialBranch?: string
}): React.JSX.Element {
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const repo = useRepoStore((s) => s.repos[repoPath])

  const remotes = useMemo(() => repo?.remotes.map((r) => r.name) ?? [], [repo])
  const [remote, setRemote] = useState(initialRemote ?? (remotes.includes('origin') ? 'origin' : remotes[0] ?? ''))
  const [source, setSource] = useState<Source>(initialBranch && !initialNumber ? 'branch' : 'pr')
  const [prInput, setPrInput] = useState(initialNumber != null ? String(initialNumber) : '')
  const [branch, setBranch] = useState(initialBranch ?? '')
  const [mode, setMode] = useState<PrPreviewMode>('checkout')
  const [localBranch, setLocalBranch] = useState(
    defaultPreviewBranch({ number: initialNumber, branch: initialBranch })
  )
  const [touchedBranchName, setTouchedBranchName] = useState(false)
  const [probing, setProbing] = useState(false)
  const [probe, setProbe] = useState<PrRefProbe | null>(null)
  const [error, setError] = useState('')

  const number = parsePrNumber(prInput)
  // Branch names the chosen remote already has, for the datalist.
  const remoteBranches = useMemo(
    () => (repo?.branches.remotes ?? []).filter((b) => b.remote === remote).map((b) => b.name),
    [repo, remote]
  )
  const localNames = useMemo(() => (repo?.branches.locals ?? []).map((b) => b.name), [repo])

  // Keep the suggested branch name in step with the source until the user
  // types their own — after that it is theirs to control.
  useEffect(() => {
    if (touchedBranchName) return
    setLocalBranch(defaultPreviewBranch(source === 'pr' ? { number: number ?? undefined } : { branch }))
  }, [source, number, branch, touchedBranchName])

  const runProbe = async (): Promise<void> => {
    // A second probe while one is in flight would queue behind it for no gain —
    // and the Enter key can fire one even while the button is disabled.
    if (number == null || !remote || probing) return
    setProbing(true)
    setError('')
    setProbe(null)
    try {
      const found = await gitApi.resolvePrRef(repoPath, remote, number)
      if (found) setProbe(found)
      else setError(interp(t('prPreview.notFound'), { n: String(number), remote }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProbing(false)
    }
  }

  // A prefilled number means the modal was opened from a PR — resolve it right
  // away so the user only has to press the apply button.
  useEffect(() => {
    if (initialNumber != null) void runProbe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ref = source === 'pr' ? probe?.ref : branch.trim() ? `refs/heads/${branch.trim()}` : ''
  const needsName = mode === 'checkout'
  const ready = !!remote && !!ref && (!needsName || !!localBranch.trim()) && !probing

  const apply = (): void => {
    if (!ready || !ref) return
    const name = needsName ? localBranch.trim() : undefined
    const label =
      source === 'pr'
        ? interp(mode === 'merge' ? t('act.previewedPrMerge') : t('act.previewedPr'), { n: String(number) })
        : interp(mode === 'merge' ? t('act.previewedRefMerge') : t('act.previewedRef'), { ref: branch.trim() })
    const go = (): void => {
      void repoActions.previewRef(repoPath, remote, ref, mode, name, label)
      closeModal()
    }
    // `checkout` resets the branch with `-B`, so an existing branch of that
    // name loses whatever was on it — that is worth a confirmation.
    if (name && localNames.includes(name)) {
      openModal({
        kind: 'confirm',
        title: t('prPreview.overwriteTitle'),
        message: interp(t('prPreview.overwriteMessage'), { name }),
        danger: true,
        confirmLabel: t('prPreview.overwriteConfirm'),
        onConfirm: go
      })
      return
    }
    go()
  }

  return (
    <div className="pr-preview">
      <h3>
        <GitPullRequestArrow size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('prPreview.title')}
      </h3>
      <p className="settings-hint">{t('prPreview.intro')}</p>

      <div className="pr-preview-tabs">
        <button
          className={`btn ghost${source === 'pr' ? ' active' : ''}`}
          onClick={() => setSource('pr')}
        >
          <GitPullRequestArrow size={13} /> {t('prPreview.sourcePr')}
        </button>
        <button
          className={`btn ghost${source === 'branch' ? ' active' : ''}`}
          onClick={() => setSource('branch')}
        >
          <GitBranch size={13} /> {t('prPreview.sourceBranch')}
        </button>
      </div>

      <label className="settings-field">
        <span className="settings-field-label">{t('prPreview.remoteLabel')}</span>
        <select className="modal-input" value={remote} onChange={(e) => { setRemote(e.target.value); setProbe(null) }}>
          {remotes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      {source === 'pr' ? (
        <label className="settings-field">
          <span className="settings-field-label">
            {t('prPreview.numberLabel')} <span className="settings-hint">{t('prPreview.numberHint')}</span>
          </span>
          <div className="pr-preview-probe">
            <input
              className="modal-input"
              autoFocus
              spellCheck={false}
              placeholder={t('prPreview.numberPlaceholder')}
              value={prInput}
              onChange={(e) => { setPrInput(e.target.value); setProbe(null); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && void runProbe()}
            />
            <button className="btn ghost" onClick={() => void runProbe()} disabled={number == null || probing}>
              {probing ? <Loader2 size={13} className="spin" /> : <Search size={13} />} {t('prPreview.find')}
            </button>
          </div>
        </label>
      ) : (
        <label className="settings-field">
          <span className="settings-field-label">
            {t('prPreview.branchLabel')} <span className="settings-hint">{t('prPreview.branchHint')}</span>
          </span>
          <input
            className="modal-input"
            autoFocus
            spellCheck={false}
            list="pr-preview-branches"
            placeholder={t('prPreview.branchPlaceholder')}
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
          <datalist id="pr-preview-branches">
            {remoteBranches.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>
      )}

      {source === 'pr' && probe && (
        <p className="pr-preview-found">
          <Check size={13} /> {interp(t('prPreview.found'), { ref: probe.ref, sha: probe.sha.slice(0, 8) })}
        </p>
      )}
      {error && (
        <p className="pr-preview-error">
          <AlertTriangle size={13} /> {error}
        </p>
      )}

      <div className="settings-field">
        <span className="settings-field-label">{t('prPreview.modeLabel')}</span>
        <label className="pr-preview-mode">
          <input type="radio" checked={mode === 'checkout'} onChange={() => setMode('checkout')} />
          <GitBranch size={13} />
          <span>
            <strong>{t('prPreview.modeCheckout')}</strong>
            <em>{t('prPreview.modeCheckoutHint')}</em>
          </span>
        </label>
        <label className="pr-preview-mode">
          <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} />
          <GitMerge size={13} />
          <span>
            <strong>{t('prPreview.modeMerge')}</strong>
            <em>{t('prPreview.modeMergeHint')}</em>
          </span>
        </label>
      </div>

      {needsName && (
        <label className="settings-field">
          <span className="settings-field-label">{t('prPreview.localBranchLabel')}</span>
          <input
            className="modal-input"
            spellCheck={false}
            value={localBranch}
            onChange={(e) => { setLocalBranch(e.target.value); setTouchedBranchName(true) }}
          />
        </label>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          {t('bisect.cancel')}
        </button>
        <button className="btn primary" onClick={apply} disabled={!ready}>
          {mode === 'merge' ? <GitMerge size={14} /> : <GitBranch size={14} />} {t('prPreview.apply')}
        </button>
      </div>
    </div>
  )
}
