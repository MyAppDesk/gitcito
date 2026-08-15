import { useMemo, useState } from 'react'
import { GitMerge, Loader2 } from 'lucide-react'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import { RefPicker, type RefOption } from './RefPicker'
import type { MergeOptions } from '../../../shared/types'
import { useT, interp } from '../i18n'

/**
 * A merge with the switches showing.
 *
 * Every one of these is a documented `git merge` flag that turns a specific
 * painful merge into a routine one — a lockfile that always clashes, a
 * reindented file, a vendored subtree whose paths do not line up. The plain
 * menu entry still runs a plain merge; this is where you go when it failed.
 */
export function MergeOptionsModal({
  repoPath,
  source
}: {
  repoPath: string
  source?: string
}): React.JSX.Element {
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const current = repo?.branches.current || 'HEAD'

  const [ref, setRef] = useState(source ?? '')
  const [busy, setBusy] = useState(false)
  const [commit, setCommit] = useState<'default' | 'noFf' | 'ffOnly' | 'squash' | 'noCommit'>('default')
  const [favour, setFavour] = useState<'' | 'ours' | 'theirs'>('')
  const [ignoreSpace, setIgnoreSpace] = useState<'' | 'change' | 'all' | 'eol'>('')
  const [strategy, setStrategy] = useState<'ort' | 'subtree' | 'resolve'>('ort')

  const refOptions = useMemo<RefOption[]>(() => {
    const out: RefOption[] = []
    for (const l of repo?.branches.locals ?? []) if (l.name !== current) out.push({ value: l.name, kind: 'local' })
    for (const r of repo?.branches.remotes ?? []) out.push({ value: r.fullName, kind: 'remote' })
    for (const tg of repo?.branches.tags ?? []) out.push({ value: tg.name, kind: 'tag' })
    return out
  }, [repo?.branches, current])

  const options: MergeOptions = {
    noFf: commit === 'noFf',
    ffOnly: commit === 'ffOnly',
    squash: commit === 'squash',
    noCommit: commit === 'noCommit',
    strategy,
    favour: favour || undefined,
    ignoreSpace: ignoreSpace || undefined
  }

  // The command, spelled out. Someone has to be able to check this against the
  // manual — and to run it themselves next time.
  const preview = [
    'git merge',
    commit === 'noFf' ? '--no-ff' : '',
    commit === 'ffOnly' ? '--ff-only' : '',
    commit === 'squash' ? '--squash' : '',
    commit === 'noCommit' ? '--no-commit' : '',
    strategy !== 'ort' ? `-s ${strategy}` : '',
    favour ? `-X ${favour}` : '',
    ignoreSpace ? `-X ignore-space-${ignoreSpace === 'eol' ? 'at-eol' : ignoreSpace}` : '',
    ref.trim() || '<branch>'
  ]
    .filter(Boolean)
    .join(' ')

  const run = (): void => {
    if (!ref.trim()) return
    setBusy(true)
    void repoActions
      .merge(repoPath, ref.trim(), options)
      .then((ok) => {
        if (ok) closeModal()
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="mergeopt-modal">
      <h3>
        <GitMerge size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('mergeOpt.title')}
      </h3>
      <p className="settings-hint">{interp(t('mergeOpt.intro'), { current })}</p>

      <div className="export-field">
        <label className="modal-label">{t('mergeOpt.source')}</label>
        <RefPicker value={ref} options={refOptions} onChange={setRef} />
      </div>

      <div className="export-field">
        <label className="modal-label">{t('mergeOpt.commit')}</label>
        <select
          className="modal-input"
          value={commit}
          onChange={(e) => setCommit(e.target.value as typeof commit)}
        >
          <option value="default">{t('mergeOpt.commitDefault')}</option>
          <option value="noFf">{t('mergeOpt.commitNoFf')}</option>
          <option value="ffOnly">{t('mergeOpt.commitFfOnly')}</option>
          <option value="squash">{t('mergeOpt.commitSquash')}</option>
          <option value="noCommit">{t('mergeOpt.commitNoCommit')}</option>
        </select>
      </div>

      <div className="export-field">
        <label className="modal-label">{t('mergeOpt.favour')}</label>
        <select className="modal-input" value={favour} onChange={(e) => setFavour(e.target.value as typeof favour)}>
          <option value="">{t('mergeOpt.favourNone')}</option>
          <option value="ours">{interp(t('mergeOpt.favourOurs'), { current })}</option>
          <option value="theirs">{t('mergeOpt.favourTheirs')}</option>
        </select>
        <span className="modal-hint">{t('mergeOpt.favourHint')}</span>
      </div>

      <div className="export-field">
        <label className="modal-label">{t('mergeOpt.whitespace')}</label>
        <select
          className="modal-input"
          value={ignoreSpace}
          onChange={(e) => setIgnoreSpace(e.target.value as typeof ignoreSpace)}
        >
          <option value="">{t('mergeOpt.wsNone')}</option>
          <option value="change">{t('mergeOpt.wsChange')}</option>
          <option value="all">{t('mergeOpt.wsAll')}</option>
          <option value="eol">{t('mergeOpt.wsEol')}</option>
        </select>
      </div>

      <div className="export-field">
        <label className="modal-label">{t('mergeOpt.strategy')}</label>
        <select
          className="modal-input"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value as typeof strategy)}
        >
          <option value="ort">{t('mergeOpt.stratOrt')}</option>
          <option value="subtree">{t('mergeOpt.stratSubtree')}</option>
          <option value="resolve">{t('mergeOpt.stratResolve')}</option>
        </select>
        <span className="modal-hint">{t('mergeOpt.strategyHint')}</span>
      </div>

      <pre className="mergeopt-preview">{preview}</pre>

      <div className="modal-actions">
        <button className="btn ghost" type="button" onClick={closeModal}>
          {t('common.cancel')}
        </button>
        <button className="btn primary" type="button" disabled={!ref.trim() || busy} onClick={run}>
          {busy ? <Loader2 size={13} className="spin" /> : <GitMerge size={13} />} {t('mergeOpt.merge')}
        </button>
      </div>
    </div>
  )
}
