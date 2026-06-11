import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Globe, Github, Gitlab, Cloud, Server, Loader2, Search, Lock, ExternalLink, Plug, FolderGit2, Folder } from 'lucide-react'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { hostingApi, gitApi } from '../infrastructure/api'
import type { RemoteRepo, RepoHost } from '../../../shared/types'
import { SettingsPanel } from './SettingsPanel'

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
  onProfile
}: {
  host: RepoHost
  onPick: (repo: RemoteRepo) => void
  selectedUrl: string
  profileId: string
  onProfile: (id: string) => void
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
    return q ? repos.filter((r) => r.name.toLowerCase().includes(q)) : repos
  }, [repos, search])

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

function AddRemoteModal({ spec }: { spec: Extract<ModalSpec, { kind: 'addRemote' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const activeProfileId = useSettingsStore((s) => s.settings.activeProfileId)
  const [provider, setProvider] = useState<RemoteProviderId>('url')
  const [profileId, setProfileId] = useState(activeProfileId)
  const [url, setUrl] = useState('')
  const [name, setName] = useState(spec.defaultName)
  const [nameTouched, setNameTouched] = useState(false)

  const duplicate = spec.existingNames.includes(name.trim())
  const valid = !!url.trim() && !!name.trim() && !duplicate

  const changeProvider = (id: RemoteProviderId): void => {
    setProvider(id)
    setUrl('')
    if (!nameTouched) setName(spec.defaultName)
  }

  const pickRepo = (repo: RemoteRepo): void => {
    setUrl(repo.url)
    if (!nameTouched) setName(repoToName(repo))
  }

  const submit = (): void => {
    if (!valid) return
    closeModal()
    spec.onSubmit(name.trim(), url.trim())
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
          <label className="modal-label">Remote URL</label>
          <input
            autoFocus
            className="modal-input"
            value={url}
            placeholder="https://github.com/me/repo.git"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') closeModal()
            }}
          />
        </>
      ) : (
        <RepoPicker host={provider} onPick={pickRepo} selectedUrl={url} profileId={profileId} onProfile={setProfileId} />
      )}

      <label className="modal-label">Name</label>
      <input
        className="modal-input"
        value={name}
        placeholder="origin"
        onChange={(e) => {
          setNameTouched(true)
          setName(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') closeModal()
        }}
      />
      {duplicate && <div className="modal-hint danger">A remote named “{name.trim()}” already exists.</div>}
      {provider !== 'url' && url && <div className="modal-hint">{url}</div>}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} type="button">
          Cancel
        </button>
        <button className="btn primary" disabled={!valid} onClick={submit} type="button">
          Add Remote
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
            className={`modal ${modal.kind === 'settings' ? 'modal-wide' : ''}`}
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
            {modal.kind === 'clone' && <CloneModal spec={modal} />}
            {modal.kind === 'settings' && <SettingsPanel initialPage={modal.page} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
