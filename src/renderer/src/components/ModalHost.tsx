import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Globe, Github, Gitlab, Cloud, Server, Loader2, Search, Lock, ExternalLink, Plug, FolderGit2, Folder, Plus, Check, ChevronDown, Sparkles, GitBranchPlus } from 'lucide-react'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { hostingApi, gitApi, shellApi, aiApi } from '../infrastructure/api'
import { repoActions } from '../stores/repo'
import type { CreateRepoOpts, RemoteOwner, RemoteRepo, RepoHost } from '../../../shared/types'
import { SettingsPanel } from './SettingsPanel'
import { LauncherPanel, type LauncherItem } from './Welcome'
import { AIConfigWizard } from './AIConfigWizard'
import { useT } from '../i18n'

function CreateBranchModal({ spec }: { spec: Extract<ModalSpec, { kind: 'create-branch' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const t = useT()
  const activeProfileId = useSettingsStore((s) => s.settings.activeProfileId)
  const profiles = useSettingsStore((s) => s.settings.profiles)
  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
  const aiEnabled = profile.ai.enabled !== false

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)

  const generate = async (): Promise<void> => {
    if (!description.trim()) return
    setGenerating(true)
    try {
      const result = await aiApi.generateBranchName(description.trim(), profile.ai, { username: profile.gitName || undefined })
      setName(result)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  const submit = (): void => {
    if (!name.trim()) return
    closeModal()
    void repoActions.createBranch(spec.path, name.trim())
  }

  return (
    <>
      <h3 className="modal-title-row">
        <GitBranchPlus size={17} /> {t('branch.createTitle')}
      </h3>
      <p className="modal-message" style={{ marginBottom: 12 }}>
        {t('branch.fromLabel')}: <strong>{spec.currentBranch}</strong>
      </p>

      {aiEnabled && (
        <>
          <label className="modal-label">{t('branch.descriptionLabel')}</label>
          <textarea
            className="modal-input"
            rows={3}
            value={description}
            placeholder={t('branch.descriptionPlaceholder')}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              className="btn ghost small"
              disabled={!description.trim() || generating}
              onClick={() => void generate()}
              type="button"
            >
              {generating ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
              {t('branch.generateWithAI')}
            </button>
          </div>
        </>
      )}

      <label className="modal-label">{t('branch.nameLabel')}</label>
      <input
        autoFocus={!aiEnabled}
        className="modal-input"
        value={name}
        placeholder={t('branch.namePlaceholder')}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') closeModal()
        }}
      />

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} type="button">
          {t('common.cancel')}
        </button>
        <button className="btn primary" disabled={!name.trim()} onClick={submit} type="button">
          {t('branch.createCheckout')}
        </button>
      </div>
    </>
  )
}

function InputModal({ spec }: { spec: Extract<ModalSpec, { kind: 'input' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const [value, setValue] = useState(spec.initial ?? '')

  const submit = (): void => {
    if (!value.trim()) return
    closeModal()
    spec.onSubmit(value.trim())
  }

  return (
    <>
      <h3>{spec.title}</h3>
      <label className="modal-label">{spec.label}</label>
      <input
        autoFocus
        className="modal-input"
        value={value}
        placeholder={spec.placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') closeModal()
        }}
      />
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          Cancel
        </button>
        <button className="btn primary" disabled={!value.trim()} onClick={submit}>
          {spec.submitLabel ?? 'OK'}
        </button>
      </div>
    </>
  )
}

const REMOTE_PROVIDERS = [
  { id: 'url', label: 'URL' },
  { id: 'github', label: 'GitHub' },
  { id: 'gitlab', label: 'GitLab' },
  { id: 'bitbucket', label: 'Bitbucket' },
  { id: 'azure', label: 'Azure DevOps' }
] as const

type RemoteProviderId = (typeof REMOTE_PROVIDERS)[number]['id']

const HOST_META: Record<
  RepoHost,
  { label: string; tokenField: 'githubToken' | 'gitlabToken' | 'bitbucketToken' | 'azureToken'; tokenUrl: string; tokenHint: string }
> = {
  github: {
    label: 'GitHub',
    tokenField: 'githubToken',
    tokenUrl: 'https://github.com/settings/tokens/new?scopes=repo&description=Gitcito',
    tokenHint: 'Create a personal access token with the “repo” scope.'
  },
  gitlab: {
    label: 'GitLab',
    tokenField: 'gitlabToken',
    tokenUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens?name=Gitcito&scopes=read_api,read_repository',
    tokenHint: 'Create a token with the “read_api” and “read_repository” scopes.'
  },
  bitbucket: {
    label: 'Bitbucket',
    tokenField: 'bitbucketToken',
    tokenUrl: 'https://bitbucket.org/account/settings/app-passwords/',
    tokenHint: 'Create an app password with “Repositories: Read”, then store it as username:app_password.'
  },
  azure: {
    label: 'Azure DevOps',
    tokenField: 'azureToken',
    tokenUrl:
      'https://learn.microsoft.com/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate#create-a-pat',
    tokenHint: 'Create a PAT with the “Code (read)” scope.'
  }
}

const PROVIDER_ICONS: Record<RemoteProviderId, typeof Globe> = {
  url: Globe,
  github: Github,
  gitlab: Gitlab,
  bitbucket: Cloud,
  azure: Server
}

function repoToName(repo: RemoteRepo): string {
  return (
    repo.name
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/\.git$/, '') ?? 'origin'
  )
}

/** Integration-backed repository picker shown for provider tabs. */
function RepoPicker({
  host,
  onPick,
  selectedUrl,
  profileId,
  onProfile,
  matchName
}: {
  host: RepoHost
  onPick: (repo: RemoteRepo) => void
  selectedUrl: string
  profileId: string
  onProfile: (id: string) => void
  matchName?: string
}): React.JSX.Element {
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const profiles = useSettingsStore((s) => s.settings.profiles)
  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0]
  const meta = HOST_META[host]
  const token = profile[meta.tokenField]
  const connected = !!token.trim()
  const HostIcon = PROVIDER_ICONS[host]

  const [org, setOrg] = useState('')
  const [repos, setRepos] = useState<RemoteRepo[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const list = await hostingApi.listRepos(host, token, org)
      setRepos(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setRepos(null)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load for providers that don't need extra input.
  useEffect(() => {
    setRepos(null)
    setError(null)
    setSearch('')
    if (connected && host !== 'azure') void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, connected, profileId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!repos) return []
    const list = q ? repos.filter((r) => r.name.toLowerCase().includes(q)) : [...repos]
    const m = matchName?.trim().toLowerCase()
    if (!m) return list
    // Surface repos matching the local folder name without hiding the rest.
    const rank = (r: RemoteRepo): number => {
      const base = r.name.toLowerCase().split('/').pop() ?? r.name.toLowerCase()
      if (base === m) return 0
      if (base.includes(m) || m.includes(base)) return 1
      return 2
    }
    return list.sort((a, b) => rank(a) - rank(b))
  }, [repos, search, matchName])

  const profileSelector = profiles.length > 1 && (
    <label className="repo-profile">
      <span>Account</span>
      <select value={profileId} onChange={(e) => onProfile(e.target.value)}>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  )

  if (!connected) {
    return (
      <div className="repo-picker">
        {profileSelector}
        <div className="remote-connect">
          <Plug size={28} />
          <p>
            {profile.name} hasn’t connected {meta.label} yet.
          </p>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              closeModal()
              openModal({ kind: 'settings', page: 'integrations' })
            }}
          >
            Connect {meta.label}
          </button>
          <button className="link-btn" type="button" onClick={() => void window.api.openExternal(meta.tokenUrl)}>
            <ExternalLink size={12} /> Get a token
          </button>
          <span className="remote-connect-hint">{meta.tokenHint}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="repo-picker">
      {profileSelector}
      {host === 'azure' && (
        <div className="repo-org-row">
          <input
            className="modal-input"
            value={org}
            placeholder="Azure DevOps organization"
            onChange={(e) => setOrg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && org.trim() && void load()}
          />
          <button className="btn ghost" type="button" disabled={!org.trim() || loading} onClick={() => void load()}>
            Load
          </button>
        </div>
      )}

      {repos && repos.length > 0 && (
        <div className="repo-search">
          <Search size={13} />
          <input value={search} placeholder="Filter repositories…" onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      <div className="repo-list">
        {loading && (
          <div className="repo-list-state">
            <Loader2 size={16} className="spin" /> Loading repositories…
          </div>
        )}
        {!loading && error && (
          <div className="repo-list-state danger">
            {error}
            <button className="link-btn" type="button" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && repos && filtered.length === 0 && (
          <div className="repo-list-state">No repositories found.</div>
        )}
        {!loading &&
          !error &&
          filtered.map((repo) => (
            <button
              key={repo.url || repo.name}
              type="button"
              className={`repo-row ${selectedUrl === repo.url ? 'selected' : ''}`}
              onClick={() => onPick(repo)}
            >
              {repo.avatarUrl ? (
                <img className="repo-row-avatar" src={repo.avatarUrl} alt="" loading="lazy" />
              ) : (
                <span className="repo-row-avatar fallback">
                  <HostIcon size={13} />
                </span>
              )}
              <span className="repo-row-name">{repo.name}</span>
              {repo.private && <Lock size={11} className="repo-row-lock" />}
            </button>
          ))}
      </div>
    </div>
  )
}

/** Account/org/workspace selector backed by the host's `listOwners` API. */
function OwnerSelect({
  host,
  token,
  org,
  value,
  onChange
}: {
  host: RepoHost
  token: string
  org?: string
  value: RemoteOwner | null
  onChange: (owner: RemoteOwner | null) => void
}): React.JSX.Element {
  const [owners, setOwners] = useState<RemoteOwner[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const ddRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    let cancelled = false
    if (host === 'azure' && !org?.trim()) {
      setOwners(null)
      return
    }
    setLoading(true)
    setError(null)
    hostingApi
      .listOwners(host, token, org)
      .then((list) => {
        if (cancelled) return
        setOwners(list)
        if (list.length && !value) onChange(list[0])
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, token, org])

  if (loading) {
    return (
      <div className="repo-list-state">
        <Loader2 size={14} className="spin" /> Loading accounts…
      </div>
    )
  }
  if (error) return <div className="modal-hint danger">{error}</div>
  if (!owners?.length) return <div className="modal-hint">No accounts available.</div>

  const HostIcon = PROVIDER_ICONS[host]
  const avatar = (o: RemoteOwner | null): React.JSX.Element =>
    o?.avatarUrl ? (
      <img className="repo-row-avatar" src={o.avatarUrl} alt="" loading="lazy" />
    ) : (
      <span className="repo-row-avatar fallback">
        <HostIcon size={13} />
      </span>
    )

  return (
    <div className="owner-select" ref={ddRef}>
      <button type="button" className="owner-trigger" onClick={() => setOpen((v) => !v)}>
        {avatar(value)}
        <span className="owner-label">
          {value ? value.login : 'Select account'}
          {value && value.type !== 'user' && <span className="owner-tag">org</span>}
        </span>
        <ChevronDown size={14} className="owner-chevron" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="owner-menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            {owners.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`owner-option ${value?.id === o.id ? 'selected' : ''}`}
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                }}
              >
                {avatar(o)}
                <span className="owner-label">
                  {o.login}
                  {o.type !== 'user' && <span className="owner-tag">org</span>}
                </span>
                {value?.id === o.id && <Check size={13} className="owner-check" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Create-a-new-repo form for a host, with a fallback to attach an existing repo. */
function ProviderCreateForm({
  host,
  spec,
  profileId,
  onProfile
}: {
  host: RepoHost
  spec: Extract<ModalSpec, { kind: 'addRemote' }>
  profileId: string
  onProfile: (id: string) => void
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const profiles = useSettingsStore((s) => s.settings.profiles)
  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0]
  const token = profile[HOST_META[host].tokenField]

  const [mode, setMode] = useState<'create' | 'existing'>('create')
  const [owner, setOwner] = useState<RemoteOwner | null>(null)
  const [azureOrg, setAzureOrg] = useState('')
  const [repoName, setRepoName] = useState(spec.matchName ?? '')
  const [remoteName, setRemoteName] = useState(spec.defaultName || 'origin')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [busy, setBusy] = useState(false)
  // existing-repo path
  const [existingUrl, setExistingUrl] = useState('')

  const duplicate = spec.existingNames.includes(remoteName.trim())
  const canCreate = !!repoName.trim() && !!remoteName.trim() && !duplicate && !!owner && !busy
  const canAttach = !!existingUrl.trim() && !!remoteName.trim() && !duplicate && !busy

  const create = async (): Promise<void> => {
    if (!canCreate || !owner) return
    setBusy(true)
    try {
      const opts: CreateRepoOpts = {
        owner: host === 'azure' ? owner.id : owner.login,
        ownerType: owner.type,
        ownerId: host === 'gitlab' ? owner.id : undefined,
        project: host === 'azure' ? owner.login : undefined,
        name: repoName.trim(),
        description: description.trim() || undefined,
        private: isPrivate
      }
      const repo = await hostingApi.createRepo(host, token, opts, azureOrg)
      closeModal()
      await repoActions.addRemoteAndPush(spec.path, remoteName.trim(), repo.url)
    } catch (e) {
      setBusy(false)
      toast('error', e instanceof Error ? e.message : String(e))
    }
  }

  const attach = (): void => {
    if (!canAttach) return
    closeModal()
    void repoActions.addRemote(spec.path, remoteName.trim(), existingUrl.trim())
  }

  const remoteNameField = (
    <>
      <label className="modal-label">Remote Name</label>
      <input
        className="modal-input"
        value={remoteName}
        placeholder="origin"
        onChange={(e) => setRemoteName(e.target.value)}
      />
      {duplicate && <div className="modal-hint danger">A remote named “{remoteName.trim()}” already exists.</div>}
    </>
  )

  return (
    <>
      <div className="remote-mode-toggle">
        <button
          type="button"
          className={mode === 'create' ? 'active' : ''}
          onClick={() => setMode('create')}
        >
          <Plus size={13} /> Create new
        </button>
        <button
          type="button"
          className={mode === 'existing' ? 'active' : ''}
          onClick={() => setMode('existing')}
        >
          <Search size={13} /> Use existing
        </button>
      </div>

      {mode === 'create' ? (
        <>
          {host === 'azure' && (
            <>
              <label className="modal-label">Organization</label>
              <input
                className="modal-input"
                value={azureOrg}
                placeholder="my-azure-org"
                onChange={(e) => setAzureOrg(e.target.value)}
              />
            </>
          )}
          <label className="modal-label">{host === 'azure' ? 'Project' : 'Account'}</label>
          <OwnerSelect host={host} token={token} org={azureOrg} value={owner} onChange={setOwner} />

          <label className="modal-label">Repository Name</label>
          <input
            autoFocus
            className="modal-input"
            value={repoName}
            placeholder="my-repo"
            onChange={(e) => setRepoName(e.target.value)}
          />

          {remoteNameField}

          <label className="modal-label">Description</label>
          <input
            className="modal-input"
            value={description}
            placeholder="Optional"
            onChange={(e) => setDescription(e.target.value)}
          />

          <label className="modal-label">Access</label>
          <select className="modal-input" value={isPrivate ? 'private' : 'public'} onChange={(e) => setIsPrivate(e.target.value === 'private')}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>

          <div className="modal-actions">
            <button className="btn ghost" onClick={closeModal} type="button">
              Cancel
            </button>
            <button className="btn primary" disabled={!canCreate} onClick={() => void create()} type="button">
              {busy ? <Loader2 size={14} className="spin" /> : 'Create remote and push local refs'}
            </button>
          </div>
        </>
      ) : (
        <>
          <RepoPicker
            host={host}
            onPick={(repo) => setExistingUrl(repo.url)}
            selectedUrl={existingUrl}
            profileId={profileId}
            onProfile={onProfile}
            matchName={spec.matchName}
          />
          {remoteNameField}
          {existingUrl && <div className="modal-hint">{existingUrl}</div>}
          <div className="modal-actions">
            <button className="btn ghost" onClick={closeModal} type="button">
              Cancel
            </button>
            <button className="btn primary" disabled={!canAttach} onClick={attach} type="button">
              Add Remote
            </button>
          </div>
        </>
      )}
    </>
  )
}

function AddRemoteModal({ spec }: { spec: Extract<ModalSpec, { kind: 'addRemote' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const activeProfileId = useSettingsStore((s) => s.settings.activeProfileId)
  const [provider, setProvider] = useState<RemoteProviderId>('url')
  const [profileId, setProfileId] = useState(activeProfileId)
  // URL-tab state
  const [name, setName] = useState(spec.defaultName || 'origin')
  const [pullUrl, setPullUrl] = useState('')
  const [pushUrl, setPushUrl] = useState('')

  const duplicate = spec.existingNames.includes(name.trim())
  const urlValid = !!pullUrl.trim() && !!name.trim() && !duplicate

  const submitUrl = (): void => {
    if (!urlValid) return
    closeModal()
    void repoActions.addRemote(spec.path, name.trim(), pullUrl.trim(), pushUrl.trim() || undefined)
  }

  return (
    <>
      <h3 className="modal-title-row">
        <Cloud size={17} /> Add Remote
      </h3>

      <div className="remote-tabs">
        {REMOTE_PROVIDERS.map((p) => {
          const Icon = PROVIDER_ICONS[p.id]
          return (
            <button
              key={p.id}
              className={`remote-tab ${provider === p.id ? 'active' : ''}`}
              onClick={() => setProvider(p.id)}
              type="button"
            >
              <Icon size={20} />
              <span>{p.label}</span>
            </button>
          )
        })}
      </div>

      {provider === 'url' ? (
        <>
          <label className="modal-label">Name</label>
          <input
            autoFocus
            className="modal-input"
            value={name}
            placeholder="origin"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitUrl()
              if (e.key === 'Escape') closeModal()
            }}
          />
          {duplicate && <div className="modal-hint danger">A remote named “{name.trim()}” already exists.</div>}
          <label className="modal-label">Pull URL</label>
          <input
            className="modal-input"
            value={pullUrl}
            placeholder="https://github.com/me/repo.git"
            onChange={(e) => setPullUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitUrl()
              if (e.key === 'Escape') closeModal()
            }}
          />
          <label className="modal-label">Push URL</label>
          <input
            className="modal-input"
            value={pushUrl}
            placeholder="Leave blank to match the pull URL"
            onChange={(e) => setPushUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitUrl()
              if (e.key === 'Escape') closeModal()
            }}
          />
          <div className="modal-actions">
            <button className="btn ghost" onClick={closeModal} type="button">
              Cancel
            </button>
            <button className="btn primary" disabled={!urlValid} onClick={submitUrl} type="button">
              Add Remote
            </button>
          </div>
        </>
      ) : (
        <ProviderCreateForm host={provider} spec={spec} profileId={profileId} onProfile={setProfileId} />
      )}
    </>
  )
}

function EditRemoteModal({ spec }: { spec: Extract<ModalSpec, { kind: 'editRemote' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const [name, setName] = useState(spec.name)
  const [url, setUrl] = useState(spec.url)
  const [pushUrl, setPushUrl] = useState(spec.pushUrl ?? '')

  const valid = !!name.trim() && !!url.trim()
  const submit = (): void => {
    if (!valid) return
    closeModal()
    void repoActions.editRemote(spec.path, spec.name, name.trim(), url.trim(), pushUrl.trim() || undefined)
  }

  return (
    <>
      <h3 className="modal-title-row">
        <Cloud size={17} /> Edit Remote
      </h3>
      <label className="modal-label">Name</label>
      <input autoFocus className="modal-input" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="modal-label">Pull URL</label>
      <input className="modal-input" value={url} onChange={(e) => setUrl(e.target.value)} />
      <label className="modal-label">Push URL</label>
      <input
        className="modal-input"
        value={pushUrl}
        placeholder="Leave blank to match the pull URL"
        onChange={(e) => setPushUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') closeModal()
        }}
      />
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} type="button">
          Cancel
        </button>
        <button className="btn primary" disabled={!valid} onClick={submit} type="button">
          <Check size={14} /> Save
        </button>
      </div>
    </>
  )
}

function CloneModal({ spec }: { spec: Extract<ModalSpec, { kind: 'clone' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const profiles = useSettingsStore((s) => s.settings.profiles)
  const activeProfileId = useSettingsStore((s) => s.settings.activeProfileId)
  const [provider, setProvider] = useState<RemoteProviderId>('url')
  const [profileId, setProfileId] = useState(activeProfileId)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [dir, setDir] = useState('')
  const [cloning, setCloning] = useState(false)

  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0]
  const host: RepoHost | null = provider === 'url' ? null : provider
  const valid = !!url.trim() && !!name.trim() && !!dir.trim() && !cloning

  const changeProvider = (id: RemoteProviderId): void => {
    setProvider(id)
    setUrl('')
    if (!nameTouched) setName('')
  }

  const deriveName = (u: string): string => {
    const last = u.trim().replace(/\/+$/, '').split('/').pop() ?? ''
    return last.replace(/\.git$/, '')
  }

  const pickRepo = (repo: RemoteRepo): void => {
    setUrl(repo.url)
    if (!nameTouched) setName(repoToName(repo))
  }

  const browse = async (): Promise<void> => {
    const picked = await window.api.selectDirectory('Choose where to clone')
    if (picked) setDir(picked)
  }

  const submit = async (): Promise<void> => {
    if (!valid) return
    setCloning(true)
    try {
      const token = host ? profile[HOST_META[host].tokenField] : undefined
      const path = await gitApi.clone(dir.trim(), url.trim(), name.trim(), host ?? undefined, token)
      closeModal()
      spec.onClone({ path, name: name.trim() })
      toast('success', `Cloned ${name.trim()}`)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : String(e))
      setCloning(false)
    }
  }

  return (
    <>
      <h3 className="modal-title-row">
        <FolderGit2 size={17} /> Clone repository
      </h3>

      <div className="remote-tabs">
        {REMOTE_PROVIDERS.map((p) => {
          const Icon = PROVIDER_ICONS[p.id]
          return (
            <button
              key={p.id}
              className={`remote-tab ${provider === p.id ? 'active' : ''}`}
              onClick={() => changeProvider(p.id)}
              type="button"
            >
              <Icon size={20} />
              <span>{p.label}</span>
            </button>
          )
        })}
      </div>

      {provider === 'url' ? (
        <>
          <label className="modal-label">Repository URL</label>
          <input
            autoFocus
            className="modal-input"
            value={url}
            placeholder="https://github.com/me/repo.git"
            onChange={(e) => {
              setUrl(e.target.value)
              if (!nameTouched) setName(deriveName(e.target.value))
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeModal()
            }}
          />
        </>
      ) : (
        <RepoPicker host={provider} onPick={pickRepo} selectedUrl={url} profileId={profileId} onProfile={setProfileId} />
      )}

      <label className="modal-label">Clone into</label>
      <div className="repo-org-row">
        <input
          className="modal-input"
          value={dir}
          placeholder="Parent folder for the new repository"
          onChange={(e) => setDir(e.target.value)}
        />
        <button className="btn ghost" type="button" onClick={() => void browse()}>
          <Folder size={14} /> Browse
        </button>
      </div>

      <label className="modal-label">Folder name</label>
      <input
        className="modal-input"
        value={name}
        placeholder="repository"
        onChange={(e) => {
          setNameTouched(true)
          setName(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') closeModal()
        }}
      />
      {provider !== 'url' && url && <div className="modal-hint">{url}</div>}
      {dir && name && <div className="modal-hint">{`${dir.replace(/\/+$/, '')}/${name.trim()}`}</div>}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} type="button" disabled={cloning}>
          Cancel
        </button>
        <button className="btn primary" disabled={!valid} onClick={() => void submit()} type="button">
          {cloning ? (
            <>
              <Loader2 size={14} className="spin" /> Cloning…
            </>
          ) : (
            'Clone'
          )}
        </button>
      </div>
    </>
  )
}

function ConfirmModal({ spec }: { spec: Extract<ModalSpec, { kind: 'confirm' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  return (
    <>
      <h3>{spec.title}</h3>
      <p className="modal-message">{spec.message}</p>
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          Cancel
        </button>
        {spec.secondaryLabel && spec.onSecondary && (
          <button
            className={`btn ${spec.secondaryDanger ? 'danger' : 'ghost'}`}
            onClick={() => {
              closeModal()
              spec.onSecondary?.()
            }}
          >
            {spec.secondaryLabel}
          </button>
        )}
        <button
          className={`btn ${spec.danger ? 'danger' : 'primary'}`}
          onClick={() => {
            closeModal()
            spec.onConfirm()
          }}
        >
          {spec.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </>
  )
}

function CreateRepoModal({ spec }: { spec: Extract<ModalSpec, { kind: 'create-repo' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const [name, setName] = useState('')
  const [dir, setDir] = useState('')
  const [creating, setCreating] = useState(false)

  const valid = !!name.trim() && !!dir.trim() && !creating

  const browse = async (): Promise<void> => {
    const picked = await window.api.selectDirectory('Choose where to create the repository')
    if (picked) setDir(picked)
  }

  const submit = async (): Promise<void> => {
    if (!valid) return
    setCreating(true)
    try {
      const path = await gitApi.init(dir.trim(), name.trim())
      closeModal()
      spec.onCreate({ path, name: name.trim() })
      toast('success', `Created ${name.trim()}`)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : String(e))
      setCreating(false)
    }
  }

  return (
    <>
      <h3 className="modal-title-row">
        <FolderGit2 size={17} /> Create repository
      </h3>
      <label className="modal-label">Create in</label>
      <div className="repo-org-row">
        <input
          className="modal-input"
          value={dir}
          placeholder="Parent folder for the new repository"
          onChange={(e) => setDir(e.target.value)}
        />
        <button className="btn ghost" type="button" onClick={() => void browse()}>
          <Folder size={14} /> Browse
        </button>
      </div>
      <label className="modal-label">Repository name</label>
      <input
        autoFocus
        className="modal-input"
        value={name}
        placeholder="my-project"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit()
          if (e.key === 'Escape') closeModal()
        }}
      />
      {dir && name && <div className="modal-hint">{`${dir.replace(/\/+$/, '')}/${name.trim()}`}</div>}
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} type="button" disabled={creating}>
          Cancel
        </button>
        <button className="btn primary" disabled={!valid} onClick={() => void submit()} type="button">
          {creating ? <><Loader2 size={14} className="spin" /> Creating…</> : 'Create'}
        </button>
      </div>
    </>
  )
}

function LauncherModal({ spec }: { spec: Extract<ModalSpec, { kind: 'launcher' }> }): React.JSX.Element {
  const { closeModal, openModal } = useUIStore()
  const { settings, openRepoTab, createGroupTab, addRepoToGroup, removeRepoFromGroup, renameRepoInGroup, reorderReposInGroup } = useSettingsStore()

  const groupTab = spec.groupId ? settings.tabs.find((t) => t.id === spec.groupId) : undefined

  const openRepo = async (): Promise<void> => {
    const path = await window.api.selectDirectory()
    if (!path) return
    const repo = { path, name: path.split('/').pop() ?? path }
    if (spec.groupId) {
      addRepoToGroup(spec.groupId, repo)
    } else {
      closeModal()
      openRepoTab(repo)
    }
  }

  const cloneRepo = (): void => {
    closeModal()
    openModal({
      kind: 'clone',
      onClone: (repo) => {
        if (spec.groupId) addRepoToGroup(spec.groupId, repo)
        else openRepoTab(repo)
      }
    })
  }

  const createRepo = (): void => {
    closeModal()
    openModal({
      kind: 'create-repo',
      onCreate: (repo) => {
        if (spec.groupId) addRepoToGroup(spec.groupId, repo)
        else openRepoTab(repo)
      }
    })
  }

  const createGroup = (): void => {
    closeModal()
    openModal({
      kind: 'input',
      title: 'New group',
      label: 'Group name',
      placeholder: 'My projects',
      submitLabel: 'Create',
      onSubmit: (name) => createGroupTab(name)
    })
  }

  const items: LauncherItem[] = spec.groupId && groupTab
    ? groupTab.repos.map((r) => ({
        name: r.name,
        path: r.path,
        onRemove: () => removeRepoFromGroup(spec.groupId!, r.path),
        onRename: (newName) => renameRepoInGroup(spec.groupId!, r.path, newName)
      }))
    : settings.recentRepos.map((r) => ({
        name: r.name,
        path: r.path,
        onSelect: () => {
          closeModal()
          openRepoTab(r)
        }
      }))

  const recentItems: LauncherItem[] | undefined = spec.groupId && groupTab
    ? settings.recentRepos
        .filter((r) => !groupTab.repos.some((gr) => gr.path === r.path))
        .map((r) => ({
          name: r.name,
          path: r.path,
          onSelect: () => addRepoToGroup(spec.groupId!, r)
        }))
    : undefined

  const listTitle = spec.groupId
    ? groupTab?.repos.length ? 'REPOSITORIES' : undefined
    : settings.recentRepos.length ? 'RECENT' : undefined

  const emptyMessage = spec.groupId ? 'No repositories in this group.' : undefined

  return (
    <>
      <h3>{spec.groupId ? `Manage — ${groupTab?.name ?? 'Group'}` : 'Open Repository'}</h3>
      <LauncherPanel
        onOpen={() => void openRepo()}
        onClone={cloneRepo}
        onCreate={createRepo}
        onCreateGroup={spec.groupId ? undefined : createGroup}
        onReorder={spec.groupId ? (from, to) => reorderReposInGroup(spec.groupId!, from, to) : undefined}
        items={items}
        listTitle={listTitle}
        emptyMessage={emptyMessage}
        recentItems={recentItems}
      />
    </>
  )
}

export function ModalHost(): React.JSX.Element {
  const { modal, closeModal } = useUIStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeModal])

  return (
    <AnimatePresence>
      {modal && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <motion.div
            className={`modal ${modal.kind === 'settings' || modal.kind === 'ai-config-wizard' ? 'modal-wide' : ''}`}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <button className="modal-close" onClick={closeModal}>
              <X size={15} />
            </button>
            {modal.kind === 'input' && <InputModal spec={modal} />}
            {modal.kind === 'confirm' && <ConfirmModal spec={modal} />}
            {modal.kind === 'addRemote' && <AddRemoteModal spec={modal} />}
            {modal.kind === 'editRemote' && <EditRemoteModal spec={modal} />}
            {modal.kind === 'clone' && <CloneModal spec={modal} />}
            {modal.kind === 'settings' && <SettingsPanel initialPage={modal.page} />}
            {modal.kind === 'launcher' && <LauncherModal spec={modal} />}
            {modal.kind === 'create-repo' && <CreateRepoModal spec={modal} />}
            {modal.kind === 'ai-config-wizard' && <AIConfigWizard spec={modal} />}
            {modal.kind === 'create-branch' && <CreateBranchModal spec={modal} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
