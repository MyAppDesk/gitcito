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
  Square,
  FolderGit2,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  KeyRound as VaultIcon
} from 'lucide-react'
import { secureShareApi, vaultApi, gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'
import { tabRepos } from '../../../shared/types'
import type {
  SecureShareCandidate,
  SecureBundleHeader,
  SecureBundleOpened,
  SecureOpenedSection,
  SecureSharePreviewEntry,
  SecureExportSpec,
  SecureApplyPlan,
  SecureShareError
} from '../../../shared/types'

// Multi-section secure share, launched from the Global Vault: bundle the global
// vault's secrets and any open repositories' files into one password-encrypted
// .gitcito, and on import route each section to a repo (matched by git remote,
// then folder name) or into the global vault. Single-repo share still lives in
// Repo Settings → Vault (SecureShareModal); this is the workspace-wide door.

const MIN_PASSWORD = 8

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function baseName(p: string): string {
  return p.split(/[\\/]/).filter(Boolean).pop() ?? p
}

/** Normalise a git remote URL for equality matching across ssh/https forms:
 *  git@github.com:acme/api.git and https://github.com/acme/api → github.com/acme/api */
function normalizeRemote(url?: string): string {
  if (!url) return ''
  return url
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/^git@/i, '')
    .replace(/:/g, '/')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

interface LocalRepo {
  path: string
  name: string
  remote?: string
}

interface RepoExportState {
  on: boolean
  expanded: boolean
  candidates: SecureShareCandidate[] | null
  selected: Set<string>
}

export function SecureWorkspaceModal({
  initialMode
}: {
  initialMode?: 'export' | 'import'
}): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const closeModal = useUIStore((s) => s.closeModal)
  const repoMap = useRepoStore((s) => s.repos)
  const workspaces = useSettingsStore((s) => s.settings.workspaces ?? [])
  const [mode, setMode] = useState<'export' | 'import'>(initialMode ?? 'export')
  const [busy, setBusy] = useState(false)

  // Every known repo: repos saved in ANY workspace's tabs (from settings, so
  // they don't need to be loaded this session) overlaid with the session's
  // loaded repos (which contribute the remote URL for import matching).
  const localRepos = useMemo<LocalRepo[]>(() => {
    const map = new Map<string, LocalRepo>()
    for (const ws of workspaces) {
      for (const tab of ws.tabs) {
        for (const r of tabRepos(tab)) {
          map.set(r.path, { path: r.path, name: r.name || baseName(r.path) })
        }
      }
    }
    for (const r of Object.values(repoMap)) {
      if (r.notGit) continue
      map.set(r.path, {
        path: r.path,
        name: r.name || baseName(r.path),
        remote: (r.remotes.find((x) => x.name === 'origin') ?? r.remotes[0])?.url
      })
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [workspaces, repoMap])

  const repoByPath = useMemo(() => new Map(localRepos.map((r) => [r.path, r])), [localRepos])

  // One group per workspace (its repos, deduped, in tab order) plus a trailing
  // group for session-opened repos that belong to no workspace.
  const groups = useMemo(() => {
    const seenInGroups = new Set<string>()
    const list = workspaces
      .map((ws) => {
        const paths: string[] = []
        const seen = new Set<string>()
        for (const tab of ws.tabs) {
          for (const r of tabRepos(tab)) {
            if (!seen.has(r.path)) {
              seen.add(r.path)
              paths.push(r.path)
            }
          }
        }
        paths.forEach((p) => seenInGroups.add(p))
        return { id: ws.id, name: ws.name, repos: paths.map((p) => repoByPath.get(p)!).filter(Boolean) }
      })
      .filter((g) => g.repos.length > 0)
    const other = localRepos.filter((r) => !seenInGroups.has(r.path))
    if (other.length > 0) list.push({ id: '__other__', name: t('wshare.otherRepos'), repos: other })
    return list
  }, [workspaces, localRepos, repoByPath, t])

  const errText = (code: SecureShareError): string =>
    ({
      invalid: t('share.errInvalid'),
      'bad-password': t('share.errBadPassword'),
      'unsupported-version': t('share.errVersion'),
      'read-failed': t('share.errRead'),
      'write-failed': t('share.errWrite')
    })[code]

  // ── Export ─────────────────────────────────────────────────────────────────
  const [vaultCount, setVaultCount] = useState<number | null>(null)
  const [includeVault, setIncludeVault] = useState(false)
  const [repoState, setRepoState] = useState<Record<string, RepoExportState>>({})
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    void vaultApi.list('').then((d) => {
      const n = d.available ? d.global.length : 0
      setVaultCount(n)
      setIncludeVault(n > 0)
    })
  }, [])

  const ensureCandidates = async (repoPath: string): Promise<void> => {
    if (repoState[repoPath]?.candidates) return
    const list = await secureShareApi.candidates(repoPath)
    setRepoState((prev) => {
      const cur = prev[repoPath]
      return {
        ...prev,
        [repoPath]: {
          on: cur?.on ?? true,
          expanded: cur?.expanded ?? false,
          candidates: list,
          // First candidate load for this repo → preselect the likely secrets
          // (the user couldn't have hand-picked files before candidates existed;
          // keying off cur.selected here would see the empty set toggleRepo
          // seeds and skip the preselect).
          selected: cur?.candidates
            ? cur.selected
            : new Set(list.filter((c) => c.secret).map((c) => c.path))
        }
      }
    })
  }

  const setRepoOn = (repoPath: string, on: boolean): void => {
    setRepoState((prev) => {
      const cur = prev[repoPath]
      return {
        ...prev,
        [repoPath]: {
          on,
          expanded: cur?.expanded ?? false,
          candidates: cur?.candidates ?? null,
          selected: cur?.selected ?? new Set()
        }
      }
    })
    if (on) void ensureCandidates(repoPath)
  }

  const toggleRepo = (repoPath: string): void => setRepoOn(repoPath, !(repoState[repoPath]?.on ?? false))

  /** Workspace checkbox: all of the group's repos on ↔ all off. */
  const toggleGroup = (repos: LocalRepo[]): void => {
    const allOn = repos.every((r) => repoState[r.path]?.on)
    for (const r of repos) setRepoOn(r.path, !allOn)
  }

  const toggleExpand = (repoPath: string): void => {
    void ensureCandidates(repoPath)
    setRepoState((prev) => ({
      ...prev,
      [repoPath]: { ...prev[repoPath], expanded: !prev[repoPath]?.expanded }
    }))
  }

  const toggleFile = (repoPath: string, path: string): void =>
    setRepoState((prev) => {
      const st = prev[repoPath]
      if (!st) return prev
      const next = new Set(st.selected)
      next.has(path) ? next.delete(path) : next.add(path)
      return { ...prev, [repoPath]: { ...st, selected: next } }
    })

  const chosenRepos = localRepos.filter(
    (r) => repoState[r.path]?.on && (repoState[r.path]?.selected.size ?? 0) > 0
  )
  const passwordOk = password.length >= MIN_PASSWORD && password === confirm
  const hasSomething = (includeVault && (vaultCount ?? 0) > 0) || chosenRepos.length > 0
  const canExport = hasSomething && passwordOk && !busy

  const doExport = async (): Promise<void> => {
    setBusy(true)
    const specs: SecureExportSpec[] = []
    if (includeVault && (vaultCount ?? 0) > 0) specs.push({ kind: 'vault' })
    for (const r of chosenRepos) {
      // Workspace-only repos weren't loaded this session, so the store has no
      // remote for them — look it up now so import-side auto-match still works.
      let remote = r.remote
      if (!remote) {
        const rs = await gitApi.remotes(r.path).catch(() => [])
        remote = (rs.find((x) => x.name === 'origin') ?? rs[0])?.url
      }
      specs.push({
        kind: 'repo',
        repoPath: r.path,
        project: r.name,
        folder: baseName(r.path),
        remote,
        paths: [...(repoState[r.path]?.selected ?? [])]
      })
    }
    // A single repo and nothing else → name the bundle after it. Otherwise, if
    // every chosen repo sits in one workspace, use that workspace's name.
    const chosenPaths = chosenRepos.map((c) => c.path)
    const owningWs = groups.find(
      (g) => g.id !== '__other__' && chosenPaths.every((p) => g.repos.some((r) => r.path === p))
    )
    const label =
      specs.length === 1 && specs[0].kind === 'repo'
        ? specs[0].project
        : owningWs?.name || 'Workspace'
    try {
      const res = await secureShareApi.exportV2(specs, label, password)
      if ('error' in res) toast('error', errText(res.error))
      else if ('path' in res) {
        toast('success', `${t('share.exported')} ${res.path}`)
        closeModal()
      }
    } finally {
      setBusy(false)
    }
  }

  // ── Import ───────────────────────────────────────────────────────────────
  const [bundle, setBundle] = useState<{ path: string; header: SecureBundleHeader } | null>(null)
  const [importPassword, setImportPassword] = useState('')
  const [opened, setOpened] = useState<SecureBundleOpened | null>(null)
  // Per repo-section (by index): chosen target repo, its preview, and selection.
  const [targets, setTargets] = useState<Record<number, string>>({})
  const [previews, setPreviews] = useState<Record<number, SecureSharePreviewEntry[]>>({})
  const [repoSel, setRepoSel] = useState<Record<number, Set<string>>>({})
  const [vaultSel, setVaultSel] = useState<Record<number, Set<string>>>({})

  const pickFile = async (): Promise<void> => {
    const res = await secureShareApi.pick()
    if (!res) return
    if ('error' in res) {
      toast('error', errText(res.error))
      return
    }
    setBundle(res)
    setOpened(null)
    setImportPassword('')
    setTargets({})
    setPreviews({})
    setRepoSel({})
    setVaultSel({})
  }

  const autoMatch = (section: Extract<SecureOpenedSection, { kind: 'repo' }>): string => {
    const wantRemote = normalizeRemote(section.remote)
    if (wantRemote) {
      const byRemote = localRepos.find((r) => normalizeRemote(r.remote) === wantRemote)
      if (byRemote) return byRemote.path
    }
    const byFolder = localRepos.find((r) => baseName(r.path) === section.folder)
    return byFolder?.path ?? ''
  }

  const loadPreview = async (index: number, repoPath: string): Promise<void> => {
    if (!bundle || !repoPath) return
    const res = await secureShareApi.previewRepoV2(bundle.path, importPassword, index, repoPath)
    if ('error' in res) {
      toast('error', errText(res.error))
      return
    }
    setPreviews((prev) => ({ ...prev, [index]: res.files }))
    setRepoSel((prev) => ({
      ...prev,
      [index]: new Set(res.files.filter((f) => f.safe).map((f) => f.path))
    }))
  }

  const doUnlock = async (): Promise<void> => {
    if (!bundle) return
    setBusy(true)
    try {
      const res = await secureShareApi.openV2(bundle.path, importPassword)
      if ('error' in res) {
        toast('error', errText(res.error))
        return
      }
      setOpened(res)
      // Auto-match every repo section and load its preview; select all vault keys.
      const nextTargets: Record<number, string> = {}
      const nextVaultSel: Record<number, Set<string>> = {}
      for (let i = 0; i < res.sections.length; i++) {
        const s = res.sections[i]
        if (s.kind === 'repo') {
          const target = autoMatch(s)
          nextTargets[i] = target
          if (target) void loadPreview(i, target)
        } else {
          nextVaultSel[i] = new Set(s.entries.map((e) => e.key))
        }
      }
      setTargets(nextTargets)
      setVaultSel(nextVaultSel)
    } finally {
      setBusy(false)
    }
  }

  const setTarget = (index: number, repoPath: string): void => {
    setTargets((prev) => ({ ...prev, [index]: repoPath }))
    setPreviews((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    if (repoPath) void loadPreview(index, repoPath)
  }

  const toggleImportFile = (index: number, path: string): void =>
    setRepoSel((prev) => {
      const next = new Set(prev[index] ?? [])
      next.has(path) ? next.delete(path) : next.add(path)
      return { ...prev, [index]: next }
    })

  const toggleVaultKey = (index: number, key: string): void =>
    setVaultSel((prev) => {
      const next = new Set(prev[index] ?? [])
      next.has(key) ? next.delete(key) : next.add(key)
      return { ...prev, [index]: next }
    })

  const importPlanReady = useMemo(() => {
    if (!opened) return false
    let any = false
    for (let i = 0; i < opened.sections.length; i++) {
      const s = opened.sections[i]
      if (s.kind === 'vault') {
        if ((vaultSel[i]?.size ?? 0) > 0) any = true
      } else if ((repoSel[i]?.size ?? 0) > 0) {
        if (!targets[i]) return false // a chosen repo section still needs a target
        any = true
      }
    }
    return any
  }, [opened, vaultSel, repoSel, targets])

  const doApply = async (): Promise<void> => {
    if (!bundle || !opened) return
    const plan: SecureApplyPlan[] = []
    for (let i = 0; i < opened.sections.length; i++) {
      const s = opened.sections[i]
      if (s.kind === 'vault') {
        const keys = [...(vaultSel[i] ?? [])]
        if (keys.length > 0) plan.push({ kind: 'vault', sectionIndex: i, keys })
      } else {
        const paths = [...(repoSel[i] ?? [])]
        if (paths.length > 0 && targets[i]) {
          plan.push({ kind: 'repo', sectionIndex: i, targetRepoPath: targets[i], paths })
        }
      }
    }
    setBusy(true)
    try {
      const res = await secureShareApi.applyV2(bundle.path, importPassword, plan)
      if ('error' in res) toast('error', errText(res.error))
      else {
        toast('success', interp(t('wshare.done'), { files: res.filesWritten, secrets: res.secretsWritten }))
        closeModal()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="share-modal">
      <h3>
        <Lock size={16} /> {t('wshare.title')}
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
          <p className="settings-hint">{t('wshare.exportHint')}</p>
          <div className="share-list">
            {/* Global Vault section */}
            <button
              className="share-row"
              disabled={(vaultCount ?? 0) === 0}
              onClick={() => setIncludeVault((v) => !v)}
            >
              {includeVault && (vaultCount ?? 0) > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
              <VaultIcon size={13} />
              <span className="share-path">{t('wshare.includeVault')}</span>
              <span className="share-size">
                {vaultCount ?? 0} {t('wshare.secrets')}
              </span>
            </button>

            {/* Workspaces, each with its repos; a group checkbox selects/clears
                the whole workspace at once. */}
            {localRepos.length === 0 ? (
              <div className="vault-empty">{t('wshare.noRepos')}</div>
            ) : (
              groups.map((g) => {
                const allOn = g.repos.length > 0 && g.repos.every((r) => repoState[r.path]?.on)
                return (
                  <div key={g.id}>
                    <div className="wshare-group-label wshare-group-row">
                      <button
                        className="wshare-check"
                        title={t('wshare.selectWorkspaceTitle')}
                        onClick={() => toggleGroup(g.repos)}
                      >
                        {allOn ? <CheckSquare size={13} /> : <Square size={13} />}
                        <LayoutGrid size={12} />
                        <span>{g.name}</span>
                      </button>
                      <span className="share-size">
                        {g.repos.length} {t('wshare.repos').toLowerCase()}
                      </span>
                    </div>
                    {g.repos.map((r) => {
                const st = repoState[r.path]
                const on = st?.on ?? false
                return (
                  <div key={r.path} className="wshare-repo">
                    <div className="share-row wshare-repo-head">
                      <button className="wshare-check" onClick={() => toggleRepo(r.path)}>
                        {on ? <CheckSquare size={14} /> : <Square size={14} />}
                        <FolderGit2 size={13} />
                        <span className="share-path" title={r.path}>
                          {r.name}
                        </span>
                      </button>
                      {on && (
                        <button className="wshare-expand" onClick={() => toggleExpand(r.path)}>
                          <span className="share-size">
                            {st?.selected.size ?? 0} {t('share.files')}
                          </span>
                          {st?.expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      )}
                    </div>
                    {on && st?.expanded && (
                      <div className="wshare-files">
                        {!st.candidates ? (
                          <Loader2 size={14} className="spin" />
                        ) : st.candidates.length === 0 ? (
                          <div className="vault-empty">{t('share.noFiles')}</div>
                        ) : (
                          st.candidates.map((c) => (
                            <button key={c.path} className="share-row" onClick={() => toggleFile(r.path, c.path)}>
                              {st.selected.has(c.path) ? <CheckSquare size={13} /> : <Square size={13} />}
                              <span className="share-path mono" title={c.path}>
                                {c.path}
                              </span>
                              {c.secret && (
                                <span className="share-badge" title={t('share.secretBadge')}>
                                  <FileKey2 size={11} />
                                </span>
                              )}
                              <span className="share-size">{fmtSize(c.size)}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
                    })}
                  </div>
                )
              })
            )}
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
          {!hasSomething && <div className="settings-hint">{t('wshare.nothing')}</div>}
          <div className="modal-actions">
            <button className="btn primary" disabled={!canExport} onClick={() => void doExport()}>
              {busy ? <Loader2 size={14} className="spin" /> : <Lock size={14} />} {t('share.export')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="settings-hint">{t('wshare.importHint')}</p>
          <div className="share-pick">
            <button className="btn ghost" onClick={() => void pickFile()}>
              <FileDown size={14} /> {t('share.pickFile')}
            </button>
            {bundle && (
              <span className="share-bundle-info">
                <strong>{bundle.header.project}</strong> · {bundle.header.sections?.length ?? 1}{' '}
                {t('wshare.sections')} · {new Date(bundle.header.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {bundle && !opened && (
            <div className="share-passwords">
              <input
                className="modal-input"
                type="password"
                placeholder={t('share.password')}
                value={importPassword}
                autoFocus
                onChange={(e) => setImportPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && importPassword && void doUnlock()}
              />
              <button className="btn primary" disabled={!importPassword || busy} onClick={() => void doUnlock()}>
                {busy ? <Loader2 size={14} className="spin" /> : <KeyRound size={14} />} {t('share.unlock')}
              </button>
            </div>
          )}

          {opened && (
            <>
              {opened.sections.map((s, i) =>
                s.kind === 'vault' ? (
                  <div key={i} className="wshare-section">
                    <div className="wshare-section-head">
                      <VaultIcon size={13} /> <strong>{t('wshare.vaultSection')}</strong>
                      <span className="share-size">{t('wshare.mergeVault')}</span>
                    </div>
                    <div className="share-list">
                      {s.entries.map((e) => (
                        <button key={e.key} className="share-row" onClick={() => toggleVaultKey(i, e.key)}>
                          {vaultSel[i]?.has(e.key) ? <CheckSquare size={13} /> : <Square size={13} />}
                          <span className="share-path mono">{e.key}</span>
                          {e.note && <span className="vault-note">{e.note}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="wshare-section">
                    <div className="wshare-section-head">
                      <FolderGit2 size={13} /> <strong>{s.project}</strong>
                      {targets[i] && normalizeRemote(s.remote) && (
                        <span className="share-badge" title={t('wshare.matched')}>
                          {t('wshare.matched')}
                        </span>
                      )}
                    </div>
                    <div className="wshare-target">
                      <span className="settings-hint">{t('wshare.target')}</span>
                      <select
                        className="modal-input"
                        value={targets[i] ?? ''}
                        onChange={(e) => setTarget(i, e.target.value)}
                      >
                        <option value="">{t('wshare.pickTarget')}</option>
                        {localRepos.map((r) => (
                          <option key={r.path} value={r.path}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!targets[i] ? (
                      <div className="settings-hint">{t('wshare.selectRepoFirst')}</div>
                    ) : !previews[i] ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <div className="share-list">
                        {previews[i].map((f) => (
                          <button
                            key={f.path}
                            className={`share-row ${f.safe ? '' : 'unsafe'}`}
                            disabled={!f.safe}
                            onClick={() => toggleImportFile(i, f.path)}
                          >
                            {repoSel[i]?.has(f.path) ? <CheckSquare size={13} /> : <Square size={13} />}
                            <span className="share-path mono" title={f.path}>
                              {f.path}
                            </span>
                            {!f.safe && (
                              <span className="share-badge danger" title={t('share.unsafePath')}>
                                <ShieldAlert size={11} /> {t('share.unsafePath')}
                              </span>
                            )}
                            {f.safe && f.exists && (
                              <span className="share-badge warn" title={t('share.overwrite')}>
                                <TriangleAlert size={11} /> {t('share.overwrite')}
                              </span>
                            )}
                            <span className="share-size">{fmtSize(f.size)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
              <div className="modal-actions">
                <button className="btn primary" disabled={!importPlanReady || busy} onClick={() => void doApply()}>
                  {busy ? <Loader2 size={14} className="spin" /> : <FileDown size={14} />} {t('share.apply')}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
