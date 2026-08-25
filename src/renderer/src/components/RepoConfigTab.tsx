import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wand2,
  XCircle
} from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useRepoStore } from '../stores/repo'
import { BranchMultiSelect } from './BranchMultiSelect'
import { useT, interp } from '../i18n'
import { REPO_CONFIG_FILE, emptyRepoConfig } from '../../../shared/repoConfig'
import { doctorCheckKey, doctorDetailKey, repoConfigIssueKey, ticketSegments } from '../lib/repoConfig'
import type { DoctorCheck, DoctorFix, RepoConfig, RepoConfigFileReq, RepoConfigLink } from '../../../shared/types'

/** Drop the keys a config no longer needs, so an emptied section does not leave
 *  `"protect": []` behind in a file people read. */
function prune(config: RepoConfig): RepoConfig {
  const out: RepoConfig = { version: config.version }
  if (config.protect?.length) out.protect = config.protect
  if (config.links?.tickets?.length) out.links = { tickets: config.links.tickets }
  const commit: NonNullable<RepoConfig['commit']> = {}
  if (config.commit?.scopes?.length) commit.scopes = config.commit.scopes
  if (config.commit?.trailers?.length) commit.trailers = config.commit.trailers
  if (config.commit?.ticketFromBranch) commit.ticketFromBranch = true
  if (Object.keys(commit).length) out.commit = commit
  const requires: NonNullable<RepoConfig['requires']> = {}
  if (config.requires?.node) requires.node = config.requires.node
  if (config.requires?.submodules) requires.submodules = true
  if (config.requires?.lfs) requires.lfs = true
  if (config.requires?.hooksPath) requires.hooksPath = config.requires.hooksPath
  const files = (config.requires?.files ?? []).filter((f) => f.path.trim())
  if (files.length) requires.files = files
  if (Object.keys(requires).length) out.requires = requires
  const checklist = (config.checklist?.push ?? []).filter((l) => l.trim())
  if (checklist.length) out.checklist = { push: checklist }
  return out
}

/** A list of free-text lines with add/remove — trailers, checklist entries. */
function LineList({
  values,
  onChange,
  placeholder,
  addLabel
}: {
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
  addLabel: string
}): React.JSX.Element {
  const t = useT()
  return (
    <div className="rc-list">
      {values.map((line, i) => (
        <div className="rc-row" key={i}>
          <input
            className="rc-input"
            value={line}
            placeholder={placeholder}
            onChange={(e) => onChange(values.map((v, j) => (j === i ? e.target.value : v)))}
          />
          <button
            className="btn ghost small rc-del"
            title={t('repoConfig.remove')}
            onClick={() => onChange(values.filter((_, j) => j !== i))}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button className="btn ghost small" onClick={() => onChange([...values, ''])}>
        <Plus size={12} /> {addLabel}
      </button>
    </div>
  )
}

/** One doctor row: what the repository asked for, what this machine has, and
 *  the one-click repair when there is one. */
function DoctorRow({ check, repoPath }: { check: DoctorCheck; repoPath: string }): React.JSX.Element {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const Icon = check.status === 'ok' ? CheckCircle2 : check.status === 'warn' ? AlertTriangle : XCircle

  const applyFix = async (fix: DoctorFix): Promise<void> => {
    setBusy(true)
    await useRepoStore
      .getState()
      .run(
        repoPath,
        t('doctor.busyFix'),
        () => gitApi.applyDoctorFix(repoPath, fix),
        undefined,
        null,
        undefined,
        ['status', 'treeStatus', 'submodules']
      )
    await useRepoStore.getState().refreshDoctor(repoPath)
    setBusy(false)
  }

  const fixTitle = (fix: DoctorFix): string => {
    switch (fix.kind) {
      case 'submodules':
        return t('doctor.fixSubmodules')
      case 'lfsPull':
        return t('doctor.fixLfsPull')
      case 'hooksPath':
        return interp(t('doctor.fixHooksPath'), { value: fix.value })
      case 'copyFile':
        return interp(t('doctor.fixCopyFile'), { from: fix.from, to: fix.to })
    }
  }

  return (
    <div className={`rc-doctor-row is-${check.status}`}>
      <Icon size={14} className="rc-doctor-icon" />
      <span className="rc-doctor-name">
        {check.kind === 'file' ? interp(t('doctor.file'), { name: check.expected ?? '' }) : t(doctorCheckKey(check))}
      </span>
      <span className="rc-doctor-detail">
        {interp(t(doctorDetailKey(check)), { expected: check.expected ?? '', actual: check.actual ?? '' })}
        {check.why ? ` — ${check.why}` : ''}
      </span>
      {check.fix && (
        <button className="btn ghost small" disabled={busy} title={fixTitle(check.fix)} onClick={() => void applyFix(check.fix as DoctorFix)}>
          {busy ? <Loader2 size={12} className="spin" /> : <Wand2 size={12} />} {t('doctor.fix')}
        </button>
      )}
    </div>
  )
}

/**
 * The repository's own `.gitcito.json`, edited as a form.
 *
 * Editing it here rather than in a text editor is the point: the file is a
 * schema most people will meet once, and a form is what makes its fields
 * discoverable. Saving writes the file into the working tree — it is tracked
 * like any other file, so sharing the rules means committing it.
 */
export function RepoConfigTab({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const repo = useRepoStore((s) => s.repos[repoPath])
  const stored = repo?.config ?? null
  const doctor = repo?.doctor ?? []
  const branchOptions = useMemo(() => repo?.branches.locals.map((b) => b.name) ?? [], [repo])
  const [draft, setDraft] = useState<RepoConfig>(() => stored?.config ?? emptyRepoConfig())
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [checking, setChecking] = useState(false)
  const [sample, setSample] = useState('')

  // Adopt whatever landed on disk — a save, a branch switch, an external edit.
  const storedJson = JSON.stringify(stored?.config ?? null)
  useEffect(() => {
    setDraft(stored?.config ?? emptyRepoConfig())
    // storedJson, not `stored`: the object identity changes on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedJson])

  useEffect(() => {
    void useRepoStore.getState().refreshDoctor(repoPath)
  }, [repoPath])

  useEffect(() => {
    if (!sample) setSample(repo?.commits[0]?.subject ?? '')
  }, [repo, sample])

  const pruned = useMemo(() => prune(draft), [draft])
  const dirty = JSON.stringify(pruned) !== JSON.stringify(stored?.config ?? emptyRepoConfig())

  const patch = (fn: (cur: RepoConfig) => RepoConfig): void => setDraft((cur) => fn(cur))
  const links = draft.links?.tickets ?? []
  const files = draft.requires?.files ?? []

  const setLink = (i: number, next: Partial<RepoConfigLink>): void =>
    patch((cur) => ({
      ...cur,
      links: { tickets: links.map((l, j) => (j === i ? { ...l, ...next } : l)) }
    }))
  const setFile = (i: number, next: Partial<RepoConfigFileReq>): void =>
    patch((cur) => ({
      ...cur,
      requires: { ...cur.requires, files: files.map((f, j) => (j === i ? { ...f, ...next } : f)) }
    }))

  const save = async (): Promise<void> => {
    setSaving(true)
    await useRepoStore.getState().saveRepoConfig(repoPath, pruned)
    setSaving(false)
  }

  const generate = async (): Promise<void> => {
    setGenerating(true)
    const proposal = await gitApi.suggestRepoConfig(repoPath).catch(() => null)
    if (proposal) setDraft(proposal)
    setGenerating(false)
  }

  const recheck = async (): Promise<void> => {
    setChecking(true)
    await useRepoStore.getState().refreshDoctor(repoPath)
    setChecking(false)
  }

  const preview = ticketSegments(sample, links.filter((l) => l.match && l.url))

  return (
    <div className="rc">
      <span className="settings-hint">{interp(t('repoConfig.intro'), { file: REPO_CONFIG_FILE })}</span>

      {stored && !stored.exists && (
        <div className="rc-empty">
          <p className="settings-hint">{interp(t('repoConfig.none'), { file: REPO_CONFIG_FILE })}</p>
          <button className="btn" disabled={generating} onClick={() => void generate()}>
            {generating ? <Loader2 size={13} className="spin" /> : <Wand2 size={13} />} {t('repoConfig.generate')}
          </button>
          <span className="settings-hint">{t('repoConfig.generateHint')}</span>
        </div>
      )}

      {stored && stored.issues.length > 0 && (
        <div className="rc-issues">
          <h4>{t('repoConfig.issuesTitle')}</h4>
          {stored.issues.map((issue, i) => (
            <div className="rc-issue" key={`${issue.field}-${i}`}>
              <code>{issue.field}</code>
              <span>{t(repoConfigIssueKey(issue.code))}</span>
            </div>
          ))}
        </div>
      )}

      {doctor.length > 0 && (
        <section className="rc-section">
          <h4>
            {t('doctor.title')}
            <button className="btn ghost small rc-head-btn" disabled={checking} onClick={() => void recheck()}>
              {checking ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />} {t('doctor.recheck')}
            </button>
          </h4>
          <span className="settings-hint">{t('doctor.hint')}</span>
          {doctor.map((c) => (
            <DoctorRow key={c.id} check={c} repoPath={repoPath} />
          ))}
        </section>
      )}

      <section className="rc-section">
        <h4>{t('repoConfig.protect')}</h4>
        <span className="settings-hint">{t('repoConfig.protectHint')}</span>
        <BranchMultiSelect
          options={branchOptions}
          value={draft.protect ?? []}
          onChange={(protect) => patch((cur) => ({ ...cur, protect }))}
        />
      </section>

      <section className="rc-section">
        <h4>{t('repoConfig.links')}</h4>
        <span className="settings-hint">{t('repoConfig.linksHint')}</span>
        <div className="rc-list">
          {links.map((link, i) => (
            <div className="rc-row" key={i}>
              <input
                className="rc-input rc-narrow"
                value={link.match}
                placeholder={t('repoConfig.linkMatch')}
                onChange={(e) => setLink(i, { match: e.target.value })}
              />
              <input
                className="rc-input"
                value={link.url}
                placeholder={t('repoConfig.linkUrl')}
                onChange={(e) => setLink(i, { url: e.target.value })}
              />
              <input
                className="rc-input rc-narrow"
                value={link.label ?? ''}
                placeholder={t('repoConfig.linkLabel')}
                onChange={(e) => setLink(i, { label: e.target.value })}
              />
              <button
                className="btn ghost small rc-del"
                title={t('repoConfig.remove')}
                onClick={() => patch((cur) => ({ ...cur, links: { tickets: links.filter((_, j) => j !== i) } }))}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            className="btn ghost small"
            onClick={() => patch((cur) => ({ ...cur, links: { tickets: [...links, { match: '', url: '' }] } }))}
          >
            <Plus size={12} /> {t('repoConfig.addLink')}
          </button>
        </div>
        {links.length > 0 && (
          <div className="rc-preview">
            <input
              className="rc-input"
              value={sample}
              placeholder={t('repoConfig.previewPlaceholder')}
              onChange={(e) => setSample(e.target.value)}
            />
            <div className="rc-preview-out">
              {preview.map((seg, i) =>
                seg.href ? (
                  <a key={i} href={seg.href} title={seg.label ?? seg.href}>
                    {seg.text}
                  </a>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rc-section">
        <h4>{t('repoConfig.commit')}</h4>
        <span className="settings-hint">{t('repoConfig.scopesHint')}</span>
        <BranchMultiSelect
          options={[]}
          value={draft.commit?.scopes ?? []}
          placeholder={t('repoConfig.scopesPlaceholder')}
          onChange={(scopes) => patch((cur) => ({ ...cur, commit: { ...cur.commit, scopes } }))}
        />
        <label className="rc-check">
          <input
            type="checkbox"
            checked={draft.commit?.ticketFromBranch ?? false}
            onChange={(e) => patch((cur) => ({ ...cur, commit: { ...cur.commit, ticketFromBranch: e.target.checked } }))}
          />
          <span>{t('repoConfig.ticketFromBranch')}</span>
        </label>
        <span className="settings-hint">{t('repoConfig.trailersHint')}</span>
        <LineList
          values={draft.commit?.trailers ?? []}
          placeholder={t('repoConfig.trailerPlaceholder')}
          addLabel={t('repoConfig.addTrailer')}
          onChange={(trailers) => patch((cur) => ({ ...cur, commit: { ...cur.commit, trailers } }))}
        />
      </section>

      <section className="rc-section">
        <h4>{t('repoConfig.requires')}</h4>
        <span className="settings-hint">{t('repoConfig.requiresHint')}</span>
        <div className="rc-row">
          <label className="rc-label">{t('repoConfig.reqNode')}</label>
          <input
            className="rc-input rc-narrow"
            value={draft.requires?.node ?? ''}
            placeholder={t('repoConfig.reqNodePlaceholder')}
            onChange={(e) => patch((cur) => ({ ...cur, requires: { ...cur.requires, node: e.target.value } }))}
          />
          <label className="rc-label">{t('repoConfig.reqHooksPath')}</label>
          <input
            className="rc-input rc-narrow"
            value={draft.requires?.hooksPath ?? ''}
            placeholder={t('repoConfig.reqHooksPlaceholder')}
            onChange={(e) => patch((cur) => ({ ...cur, requires: { ...cur.requires, hooksPath: e.target.value } }))}
          />
        </div>
        <label className="rc-check">
          <input
            type="checkbox"
            checked={draft.requires?.submodules ?? false}
            onChange={(e) => patch((cur) => ({ ...cur, requires: { ...cur.requires, submodules: e.target.checked } }))}
          />
          <span>{t('repoConfig.reqSubmodules')}</span>
        </label>
        <label className="rc-check">
          <input
            type="checkbox"
            checked={draft.requires?.lfs ?? false}
            onChange={(e) => patch((cur) => ({ ...cur, requires: { ...cur.requires, lfs: e.target.checked } }))}
          />
          <span>{t('repoConfig.reqLfs')}</span>
        </label>
        <span className="settings-hint">{t('repoConfig.reqFilesHint')}</span>
        <div className="rc-list">
          {files.map((f, i) => (
            <div className="rc-row" key={i}>
              <input
                className="rc-input rc-narrow"
                value={f.path}
                placeholder={t('repoConfig.filePath')}
                onChange={(e) => setFile(i, { path: e.target.value })}
              />
              <input
                className="rc-input rc-narrow"
                value={f.from ?? ''}
                placeholder={t('repoConfig.fileFrom')}
                onChange={(e) => setFile(i, { from: e.target.value })}
              />
              <input
                className="rc-input"
                value={f.why ?? ''}
                placeholder={t('repoConfig.fileWhy')}
                onChange={(e) => setFile(i, { why: e.target.value })}
              />
              <button
                className="btn ghost small rc-del"
                title={t('repoConfig.remove')}
                onClick={() =>
                  patch((cur) => ({ ...cur, requires: { ...cur.requires, files: files.filter((_, j) => j !== i) } }))
                }
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            className="btn ghost small"
            onClick={() =>
              patch((cur) => ({ ...cur, requires: { ...cur.requires, files: [...files, { path: '' }] } }))
            }
          >
            <Plus size={12} /> {t('repoConfig.addFile')}
          </button>
        </div>
      </section>

      <section className="rc-section">
        <h4>{t('repoConfig.checklist')}</h4>
        <span className="settings-hint">{t('repoConfig.checklistHint')}</span>
        <LineList
          values={draft.checklist?.push ?? []}
          placeholder={t('repoConfig.checklistPlaceholder')}
          addLabel={t('repoConfig.addChecklistItem')}
          onChange={(push) => patch((cur) => ({ ...cur, checklist: { push } }))}
        />
      </section>

      <div className="modal-actions rc-actions">
        <span className="settings-hint">{interp(t('repoConfig.dirtyHint'), { file: REPO_CONFIG_FILE })}</span>
        <button className="btn ghost" disabled={!dirty || saving} onClick={() => setDraft(stored?.config ?? emptyRepoConfig())}>
          {t('repoConfig.revert')}
        </button>
        <button className="btn primary" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? <Loader2 size={14} className="spin" /> : null} {t('repoConfig.save')}
        </button>
      </div>
    </div>
  )
}
