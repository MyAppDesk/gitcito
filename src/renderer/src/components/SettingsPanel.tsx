import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Copy,
  Terminal,
  Trash2,
  Pencil,
  LayoutGrid,
  X,
  UserCircle2,
  Bot,
  Github,
  Cloud,
  Gitlab,
  Server,
  BadgeCheck,
  Plug,
  RefreshCw,
  Loader2,
  ChevronDown,
  Palette,
  Check,
  Settings2,
  ShieldCheck,
  KeyRound,
  Keyboard as KeyboardIcon,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Download,
  Upload,
  AlertTriangle,
  HardDrive,
  Database,
  Activity,
  BarChart3,
  GitCommit,
  ScrollText,
  GitBranch,
  Spline,
  PanelBottom,
  RotateCcw
} from 'lucide-react'
import hljs from 'highlight.js'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { Avatar } from './Avatar'
import { useUpdatesStore, hasPendingUpdate } from '../stores/updates'
import { gitApi, aiApi, settingsApi, analyticsApi, logApi, infoApi, vaultApi, shellApi, hostingApi, keychainApi, editorApi, sshApi, diffToolApi } from '../infrastructure/api'
import type { DetectedEditor, EditorSetting } from '../../../shared/editors'
import type { SshKey, SshStatus, SshTest } from '../../../shared/sshKeys'
import type { DiffToolConfig, DiffToolInfo } from '../../../shared/diffTools'
import type { RerereStatus } from '../../../shared/types'
import { AI_PROVIDERS, emptyAnalytics, defaultGraphStyle, type AIProvider, type Analytics, type AIUsageStat, type ActivityEvent, type RepoStats, type AppSettings, type BranchNamingStyle, type CommitStyle, type ConflictStyle, type ExplainStyle, type Profile, type SigningConfig, type SettingsBundle, type GraphStyle, type GraphPalette, type GraphEdgeStyle, type GraphDensity, type GraphLineWidth, type GraphNodeStyle, type GraphTopology, type GraphCommit, type ConnectedAccount } from '../../../shared/types'
import { hasSettingsSecrets, stripSettingsSecrets } from '../../../shared/secrets'
import { tabActiveRepoPath } from '../../../shared/types'
import type { HoverModifier, KeychainConsent } from '../../../shared/types'
import { allGraphPalettes, findGraphPalette, colorForPalette, edgePath, spurPath, DENSITY_ROW_H, LINE_WIDTH_PX, GRAPH_PALETTES } from '../graph/style'
import { layoutGraph } from '../graph/layout'
import type {
  AppTheme,
  AppThemeColors,
  CodeTheme,
  CodeThemeColors,
  ThemeMode
} from '../../../shared/types'
import {
  APP_THEMES,
  CODE_THEMES,
  allAppThemes,
  allCodeThemes,
  findAppTheme,
  findCodeTheme,
  resolveAppColors,
  resolveCodeColors
} from '../theme/themes'
import { useT, interp, type TranslationKey } from '../i18n'
import { LanguagePicker } from './LanguagePicker'
import { ShortcutEditor } from './CheatsheetModal'
import madLogo from '../assets/mad-high.png'

type SettingsPage =
  | 'profile'
  | 'layout'
  | 'workspaces'
  | 'integrations'
  | 'ai'
  | 'themes'
  | 'general'
  | 'security'
  | 'shortcuts'
  | 'data'

const PAGES: { id: SettingsPage; key: TranslationKey; icon: React.ReactNode }[] = [
  { id: 'general', key: 'settings.general', icon: <Settings2 size={13} /> },
  { id: 'layout', key: 'settings.layout', icon: <PanelBottom size={13} /> },
  { id: 'profile', key: 'settings.profile', icon: <UserCircle2 size={13} /> },
  { id: 'workspaces', key: 'settings.workspaces', icon: <LayoutGrid size={13} /> },
  { id: 'integrations', key: 'settings.integrations', icon: <Plug size={13} /> },
  { id: 'ai', key: 'settings.ai', icon: <Bot size={13} /> },
  { id: 'themes', key: 'settings.themes', icon: <Palette size={13} /> },
  { id: 'security', key: 'settings.security', icon: <ShieldCheck size={13} /> },
  { id: 'shortcuts', key: 'settings.shortcuts', icon: <KeyboardIcon size={13} /> },
  { id: 'data', key: 'settings.data', icon: <HardDrive size={13} /> }
]

const COMMIT_STYLES: { id: CommitStyle; key: TranslationKey }[] = [
  { id: 'auto', key: 'commitStyle.auto' },
  { id: 'ticket', key: 'commitStyle.ticket' },
  { id: 'conventional', key: 'commitStyle.conventional' },
  { id: 'gitmoji', key: 'commitStyle.gitmoji' },
  { id: 'plain', key: 'commitStyle.plain' },
  { id: 'caveman', key: 'commitStyle.caveman' },
  { id: 'haiku', key: 'commitStyle.haiku' }
]

const EXPLAIN_STYLES: { id: ExplainStyle; key: TranslationKey }[] = [
  { id: 'normal', key: 'explainStyle.normal' },
  { id: 'concise', key: 'explainStyle.concise' },
  { id: 'detailed', key: 'explainStyle.detailed' },
  { id: 'eli5', key: 'explainStyle.eli5' },
  { id: 'caveman', key: 'explainStyle.caveman' },
  { id: 'pirate', key: 'explainStyle.pirate' },
  { id: 'formal', key: 'explainStyle.formal' }
]

const HOVER_MODIFIERS: { id: HoverModifier; key: TranslationKey }[] = [
  { id: 'shift', key: 'hoverKey.shift' },
  { id: 'alt', key: 'hoverKey.alt' },
  { id: 'ctrl', key: 'hoverKey.ctrl' },
  { id: 'meta', key: 'hoverKey.meta' },
  { id: 'none', key: 'hoverKey.none' }
]

const CONFLICT_STYLES: { id: ConflictStyle; key: TranslationKey }[] = [
  { id: 'clean', key: 'conflictStyle.clean' },
  { id: 'commented', key: 'conflictStyle.commented' },
  { id: 'conservative', key: 'conflictStyle.conservative' }
]

const BRANCH_NAMING_STYLES: { id: BranchNamingStyle; key: TranslationKey }[] = [
  { id: 'prefix/description', key: 'branchNamingStyle.prefix/description' },
  { id: 'prefix/ticket-description', key: 'branchNamingStyle.prefix/ticket-description' },
  { id: 'username/prefix/description', key: 'branchNamingStyle.username/prefix/description' },
  { id: 'plain', key: 'branchNamingStyle.plain' }
]

/**
 * Per-repo commit-signing controls (commit.gpgsign / gpg.format / user.signingkey).
 * Signing is a repository setting, not a profile one — it always targets the
 * currently active repo. Lives under the profile page next to the git identity.
 */
function SigningSection(): React.JSX.Element {
  const t = useT()
  const { activeRepo } = useSettingsStore()
  const toast = useUIStore((s) => s.toast)
  const repo = activeRepo()

  const [cfg, setCfg] = useState<SigningConfig | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!repo) {
      setCfg(null)
      return
    }
    let cancelled = false
    void gitApi.signingConfig(repo.path).then((c) => !cancelled && setCfg(c))
    return () => {
      cancelled = true
    }
  }, [repo])

  const save = async (): Promise<void> => {
    if (!repo || !cfg) return
    setBusy(true)
    try {
      await gitApi.setSigningConfig(repo.path, { sign: cfg.sign, format: cfg.format, key: cfg.key })
      toast('success', interp(t('signing.saved'), { repo: repo.name }))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h4>
        <BadgeCheck size={14} /> {t('signing.title')}
        {repo ? ` · ${repo.name}` : ''}
      </h4>
      {!repo ? (
        <p className="settings-hint">{t('signing.openRepo')}</p>
      ) : !cfg ? (
        <p className="settings-hint">
          <Loader2 size={13} className="spin" /> Loading…
        </p>
      ) : (
        <>
          <label className="settings-toggle-card">
            <input
              type="checkbox"
              checked={cfg.sign}
              onChange={(e) => setCfg({ ...cfg, sign: e.target.checked })}
            />
            <span className="settings-toggle-control" aria-hidden="true">
              <span className="settings-toggle-thumb" />
            </span>
            <span className="settings-toggle-copy">
              <strong>{t('signing.signAll')}</strong>
              <span className="settings-hint">{t('signing.signAllHint')}</span>
            </span>
          </label>
          <div className="form-row two">
            <label>
              {t('signing.format')}
              <select value={cfg.format} onChange={(e) => setCfg({ ...cfg, format: e.target.value })}>
                <option value="openpgp">{t('signing.openpgp')}</option>
                <option value="ssh">SSH</option>
                <option value="x509">X.509 (S/MIME)</option>
              </select>
            </label>
            <label>
              {t('signing.signingKey')}
              <input
                value={cfg.key}
                placeholder={cfg.format === 'ssh' ? '~/.ssh/id_ed25519.pub' : t('signing.gpgKeyId')}
                onChange={(e) => setCfg({ ...cfg, key: e.target.value })}
              />
            </label>
          </div>
          <button className="btn ghost small" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 size={13} className="spin" /> : null} {t('signing.save')}
          </button>
        </>
      )}
    </>
  )
}

function ProfilePage({ profile, edit }: { profile: Profile; edit: (p: Partial<Profile>) => void }): React.JSX.Element {
  const { settings, setActiveProfile, deleteProfile, activeRepo } = useSettingsStore()
  const toast = useUIStore((s) => s.toast)
  const t = useT()

  const applyToRepo = async (): Promise<void> => {
    const repo = activeRepo()
    if (!repo) {
      toast('info', t('settings.openRepoFirst'))
      return
    }
    if (!profile.gitName || !profile.gitEmail) {
      toast('error', t('settings.setNameEmailFirst'))
      return
    }
    await gitApi.setUser(repo.path, profile.gitName, profile.gitEmail)
    toast('success', interp(t('settings.identityApplied'), { profile: profile.name, repo: repo.name }))
  }

  return (
    <>
      <div className="form-row two">
        <label>
          {t('settings.profileName')}
          <input value={profile.name} onChange={(e) => edit({ name: e.target.value })} />
        </label>
        <div className="form-inline-actions">
          {profile.id !== settings.activeProfileId ? (
            <button className="btn ghost small" onClick={() => setActiveProfile(profile.id)}>
              {t('settings.makeActive')}
            </button>
          ) : (
            <span className="active-pill">{t('settings.activeProfile')}</span>
          )}
          {settings.profiles.length > 1 && (
            <button className="icon-btn danger" title={t('settings.deleteProfile')} onClick={() => deleteProfile(profile.id)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <h4>
        <UserCircle2 size={14} /> {t('settings.gitIdentity')}
      </h4>
      <div className="form-row two">
        <label>
          {t('settings.name')}
          <input value={profile.gitName} onChange={(e) => edit({ gitName: e.target.value })} />
        </label>
        <label>
          {t('settings.email')}
          <input value={profile.gitEmail} onChange={(e) => edit({ gitEmail: e.target.value })} />
        </label>
      </div>
      <button className="btn ghost small" onClick={() => void applyToRepo()}>
        {t('settings.applyIdentity')}
      </button>

      <SigningSection />

      <h4>{t('settings.preferences')}</h4>
      <label>
        {t('settings.commitStyle')}
        <select
          value={profile.ai.commitStyle}
          onChange={(e) => edit({ ai: { ...profile.ai, commitStyle: e.target.value as CommitStyle } })}
        >
          {COMMIT_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.key)}
            </option>
          ))}
        </select>
        <span className="settings-hint">{t('settings.commitStyleHint')}</span>
      </label>
    </>
  )
}

const INTEGRATIONS = [
  {
    id: 'github',
    label: 'GitHub',
    icon: Github,
    field: 'githubToken',
    kind: 'pat',
    placeholder: 'ghp_…',
    tokenUrl: 'https://github.com/settings/tokens/new?scopes=repo&description=Gitcito'
  },
  {
    id: 'azure',
    label: 'Azure DevOps',
    icon: Server,
    field: 'azureToken',
    kind: 'pat',
    placeholderKey: 'integrations.azurePatPlaceholder',
    tokenUrl:
      'https://learn.microsoft.com/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate#create-a-pat'
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    icon: Gitlab,
    field: 'gitlabToken',
    kind: 'pat',
    placeholder: 'glpat-…',
    tokenUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens?name=Gitcito&scopes=read_api,read_repository'
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket',
    icon: Cloud,
    field: 'bitbucketToken',
    kind: 'app',
    placeholder: 'username:app_password',
    tokenUrl: 'https://bitbucket.org/account/settings/app-passwords/'
  }
] as const

export function IntegrationsPage({
  profile,
  edit,
  onGoToSecurity
}: {
  profile: Profile
  edit: (p: Partial<Profile>) => void
  /** Jump to the Security page, where SSH keys live. */
  onGoToSecurity?: () => void
}): React.JSX.Element {
  const t = useT()
  const [tab, setTab] = useState<(typeof INTEGRATIONS)[number]['id']>('github')
  const active = INTEGRATIONS.find((i) => i.id === tab) ?? INTEGRATIONS[0]
  const ActiveIcon = active.icon
  const token = profile[active.field]
  const azureOrg = profile.azureOrg ?? ''
  const whoAmIOrg = active.id === 'azure' ? azureOrg.trim() : undefined
  const azureOrgRequired = t('settings.azureOrgRequired')

  const sshNotice = t('settings.sshFromIntegrations').split('{link}')

  const [account, setAccount] = useState<ConnectedAccount | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [loadingAccount, setLoadingAccount] = useState(false)

  // A token is no longer the only way to be connected: git's own credential
  // helper may already hold one for this host. So the connected state is
  // "an account resolved", not "a token was typed".
  const connected = !!account

  const check = useCallback(
    (interactive: boolean): (() => void) => {
      let alive = true
      setAccount(null)
      setAccountError(null)
      if (active.id === 'azure' && !whoAmIOrg) {
        setLoadingAccount(false)
        setAccountError(azureOrgRequired)
        return () => {
          alive = false
        }
      }
      setLoadingAccount(true)
      void hostingApi
        .whoAmI(active.id, token, whoAmIOrg, interactive)
        .then((info) => {
          if (alive) setAccount(info)
        })
        .catch((err: Error) => {
          if (alive) setAccountError(err.message)
        })
        .finally(() => {
          if (alive) setLoadingAccount(false)
        })
      return () => {
        alive = false
      }
    },
    [active.id, token, whoAmIOrg, azureOrgRequired]
  )

  // Silent on mount — opening Settings must never pop four sign-in windows.
  useEffect(() => check(false), [check])

  return (
    <>
      <div className="integration-profile-banner">
        <UserCircle2 size={15} />
        <span>{t('settings.integrationsForProfile').replace('{name}', profile.name)}</span>
      </div>

      <p className="settings-hint">
        {sshNotice[0]}
        <button className="link-inline" type="button" onClick={onGoToSecurity}>
          {t('settings.security')}
        </button>
        {sshNotice[1]}
      </p>

      <div className="remote-tabs">
        {INTEGRATIONS.map((i) => {
          const Icon = i.icon
          // For the tab being viewed the resolved state is known; the others can
          // only report whether a token is configured, without probing them all.
          const isConnected = i.id === tab ? connected : !!profile[i.field].trim()
          return (
            <button
              key={i.id}
              className={`remote-tab ${tab === i.id ? 'active' : ''}`}
              onClick={() => setTab(i.id)}
              type="button"
            >
              <span className="tab-icon-wrap">
                <Icon size={20} />
                {isConnected && <span className="conn-dot" />}
              </span>
              <span>{i.label}</span>
            </button>
          )
        })}
      </div>

      <div className="integration-head">
        <h4>
          <ActiveIcon size={15} /> {active.label}
        </h4>
        {connected ? (
          <span className="conn-status connected">
            <span className="conn-pulse" />
            {t('settings.connected')}
          </span>
        ) : (
          <span className="conn-status">{t('settings.notConnected')}</span>
        )}
      </div>

      <div className="connected-account">
        {loadingAccount && <span className="settings-hint">{t('settings.loadingAccount')}</span>}
        {!loadingAccount && accountError && <span className="connected-account-error">{accountError}</span>}
        {!loadingAccount && !account && !(active.id === 'azure' && !whoAmIOrg) && (
          <button className="btn ghost small" type="button" onClick={() => check(true)}>
            {t('settings.signInWithGit')}
          </button>
        )}
        {!loadingAccount && account && (
          <>
            <div className="connected-account-row">
              {account.avatarUrl ? (
                <img className="connected-account-avatar" src={account.avatarUrl} alt="" />
              ) : (
                <span className="connected-account-avatar connected-account-avatar-fallback">
                  <UserCircle2 size={20} />
                </span>
              )}
              <div className="connected-account-info">
                <span className="connected-account-name">{account.name || account.login}</span>
                {account.name && account.name !== account.login && (
                  <span className="connected-account-login">@{account.login}</span>
                )}
              </div>
              {account.profileUrl && (
                <button
                  className="link-btn connected-account-link"
                  type="button"
                  onClick={() => void window.api.openExternal(account.profileUrl!)}
                >
                  <ExternalLink size={12} /> {t('settings.viewProfile')}
                </button>
              )}
            </div>
            {!!account.orgs?.length && (
              <details className="connected-account-orgs-details">
                <summary>
                  <ChevronDown size={13} /> {t('settings.organizations').replace('{count}', String(account.orgs.length))}
                </summary>
                <div className="connected-org-circles">
                  {account.orgs.map((o) => (
                    <button
                      key={o.login}
                      type="button"
                      className="connected-org-circle"
                      title={o.login}
                      onClick={() => o.url && void window.api.openExternal(o.url)}
                    >
                      {o.avatarUrl ? (
                        <img src={o.avatarUrl} alt={o.login} />
                      ) : (
                        <span className="connected-org-circle-fallback">{o.login.slice(0, 2).toUpperCase()}</span>
                      )}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>

      <label>
        {active.kind === 'app' ? t('settings.appPassword') : t('settings.pat')}
        <input
          type="password"
          value={token}
          placeholder={'placeholderKey' in active ? t(active.placeholderKey) : active.placeholder}
          onChange={(e) => edit({ [active.field]: e.target.value } as Partial<Profile>)}
        />
      </label>
      {active.id === 'azure' && (
        <label>
          {t('settings.azureOrg')} *
          <input
            type="text"
            value={azureOrg}
            placeholder={t('settings.azureOrgPlaceholder')}
            required
            aria-required="true"
            onChange={(e) => edit({ azureOrg: e.target.value })}
          />
          <span className="settings-hint">{t('settings.azureOrgHint')}</span>
        </label>
      )}
      <button className="link-btn" type="button" onClick={() => void window.api.openExternal(active.tokenUrl)}>
        <ExternalLink size={12} /> {t('settings.createToken')}
      </button>
      <p className="settings-hint">{t('settings.integrationsHint')}</p>
    </>
  )
}

export function AIPage({ profile, edit }: { profile: Profile; edit: (p: Partial<Profile>) => void }): React.JSX.Element {
  const toast = useUIStore((s) => s.toast)
  const t = useT()
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const ai = profile.ai
  const preset = AI_PROVIDERS.find((p) => p.id === ai.provider) ?? AI_PROVIDERS[0]
  const visibleModels = models.length > 0 ? models : preset.models

  const setProvider = (id: AIProvider): void => {
    const next = AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0]
    setModels([])
    edit({
      ai: {
        ...ai,
        provider: id,
        endpoint: next.endpoint || ai.endpoint,
        model: next.defaultModel || ai.model
      }
    })
  }

  const fetchModels = async (): Promise<void> => {
    setLoadingModels(true)
    try {
      const list = await aiApi.listModels(ai)
      setModels(list)
      if (list.length === 0) toast('info', t('settings.noModels'))
    } catch (err) {
      setModels([])
      toast('info', `${err instanceof Error ? err.message : String(err)} Using the built-in model list.`)
    } finally {
      setLoadingModels(false)
    }
  }

  return (
    <>
      <label className="settings-toggle-card">
        <input
          type="checkbox"
          checked={ai.enabled !== false}
          onChange={(e) => edit({ ai: { ...ai, enabled: e.target.checked } })}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.aiEnabled')}</strong>
          <span className="settings-hint">{t('settings.aiEnabledHint')}</span>
        </span>
      </label>

      <div style={ai.enabled === false ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
      <h4>
        <Bot size={14} /> {t('settings.provider')}
      </h4>
      <div className="form-row two">
        <label>
          {t('settings.provider')}
          <select value={ai.provider} onChange={(e) => setProvider(e.target.value as AIProvider)}>
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {preset.needsKey ? t('settings.apiKey') : t('settings.apiKeyOptional')}
          <input
            type="password"
            value={ai.apiKey}
            placeholder={preset.needsKey ? 'sk-…' : t('settings.notRequired')}
            onChange={(e) => edit({ ai: { ...ai, apiKey: e.target.value } })}
          />
        </label>
      </div>

      <label>
        {t('settings.model')}
        <div className="model-row">
          {visibleModels.length > 0 ? (
            <select value={ai.model} onChange={(e) => edit({ ai: { ...ai, model: e.target.value } })}>
              {!visibleModels.includes(ai.model) && ai.model && <option value={ai.model}>{ai.model}</option>}
              {visibleModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={ai.model}
              placeholder={preset.defaultModel || 'model-name'}
              onChange={(e) => edit({ ai: { ...ai, model: e.target.value } })}
            />
          )}
          <button
            className="btn ghost small"
            disabled={loadingModels}
            title={t('settings.fetchModelsTitle')}
            onClick={() => void fetchModels()}
          >
            {loadingModels ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} {t('settings.fetchModels')}
          </button>
        </div>
      </label>


      <label className="settings-toggle-card" style={{ marginTop: 12 }}>
        <input
          type="checkbox"
          checked={ai.generateDescription}
          onChange={(e) => edit({ ai: { ...ai, generateDescription: e.target.checked } })}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.generateDescription')}</strong>
          <span className="settings-hint">{t('settings.generateDescriptionHint')}</span>
        </span>
      </label>

      <h4>{t('settings.explainStyle')}</h4>
      <label>
        <select
          value={ai.explainStyle ?? 'normal'}
          onChange={(e) => edit({ ai: { ...ai, explainStyle: e.target.value as ExplainStyle } })}
        >
          {EXPLAIN_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.key)}
            </option>
          ))}
        </select>
      </label>
      <span className="settings-hint">{t('settings.explainStyleHint')}</span>

      <label className="settings-toggle-card" style={{ marginTop: 12 }}>
        <input
          type="checkbox"
          checked={ai.hoverExplain !== false}
          onChange={(e) => edit({ ai: { ...ai, hoverExplain: e.target.checked } })}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.hoverExplain')}</strong>
          <span className="settings-hint">{t('settings.hoverExplainHint')}</span>
        </span>
      </label>

      {ai.hoverExplain !== false && (
        <>
          <h4>{t('settings.hoverExplainKey')}</h4>
          <label>
            <select
              value={ai.hoverExplainKey ?? 'shift'}
              onChange={(e) => edit({ ai: { ...ai, hoverExplainKey: e.target.value as HoverModifier } })}
            >
              {HOVER_MODIFIERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {t(m.key)}
                </option>
              ))}
            </select>
          </label>
          <span className="settings-hint">{t('settings.hoverExplainKeyHint')}</span>
        </>
      )}

      <h4>{t('settings.conflictStyle')}</h4>
      <label>
        <select
          value={ai.conflictStyle ?? 'clean'}
          onChange={(e) => edit({ ai: { ...ai, conflictStyle: e.target.value as ConflictStyle } })}
        >
          {CONFLICT_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.key)}
            </option>
          ))}
        </select>
      </label>
      <span className="settings-hint">{t('settings.conflictStyleHint')}</span>

      <h4>{t('settings.branchNamingStyle')}</h4>
      <label>
        <select
          value={ai.branchNamingStyle ?? 'prefix/description'}
          onChange={(e) => edit({ ai: { ...ai, branchNamingStyle: e.target.value as BranchNamingStyle } })}
        >
          {BRANCH_NAMING_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.key)}
            </option>
          ))}
        </select>
      </label>
      <span className="settings-hint">{t('settings.branchNamingStyleHint')}</span>

      <details className="settings-advanced">
        <summary>
          <ChevronDown size={13} /> {t('settings.advanced')}
        </summary>
        <label>
          {t('settings.endpoint')}
          <input
            value={ai.endpoint}
            placeholder="https://api.openai.com/v1"
            disabled={ai.provider !== 'custom' && !!preset.endpoint}
            onChange={(e) => edit({ ai: { ...ai, endpoint: e.target.value } })}
          />
        </label>
        <label>
          {t('settings.customInstructions')}
          <textarea
            rows={3}
            value={ai.customInstructions}
            placeholder={t('settings.customInstructionsPlaceholder')}
            onChange={(e) => edit({ ai: { ...ai, customInstructions: e.target.value } })}
          />
        </label>

        <label className="settings-toggle-card" style={{ marginTop: 12 }}>
          <input
            type="checkbox"
            checked={ai.coAuthor !== false}
            onChange={(e) => edit({ ai: { ...ai, coAuthor: e.target.checked } })}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('settings.coAuthor')}</strong>
            <span className="settings-hint">{t('settings.coAuthorHint')}</span>
          </span>
        </label>
      </details>
      </div>
    </>
  )
}
const APP_COLOR_FIELDS: { key: keyof AppThemeColors; labelKey: TranslationKey }[] = [
  { key: 'bg0', labelKey: 'themeColor.bg0' },
  { key: 'bg1', labelKey: 'themeColor.bg1' },
  { key: 'bg2', labelKey: 'themeColor.bg2' },
  { key: 'bg3', labelKey: 'themeColor.bg3' },
  { key: 'bg4', labelKey: 'themeColor.bg4' },
  { key: 'border', labelKey: 'themeColor.border' },
  { key: 'borderSoft', labelKey: 'themeColor.borderSoft' },
  { key: 'text0', labelKey: 'themeColor.text0' },
  { key: 'text1', labelKey: 'themeColor.text1' },
  { key: 'text2', labelKey: 'themeColor.text2' },
  { key: 'accent', labelKey: 'themeColor.accent' },
  { key: 'green', labelKey: 'themeColor.green' },
  { key: 'red', labelKey: 'themeColor.red' },
  { key: 'yellow', labelKey: 'themeColor.yellow' },
  { key: 'purple', labelKey: 'themeColor.purple' }
]

const CODE_COLOR_FIELDS: { key: keyof CodeThemeColors; labelKey: TranslationKey }[] = [
  { key: 'text', labelKey: 'codeColor.text' },
  { key: 'comment', labelKey: 'codeColor.comment' },
  { key: 'keyword', labelKey: 'codeColor.keyword' },
  { key: 'string', labelKey: 'codeColor.string' },
  { key: 'number', labelKey: 'codeColor.number' },
  { key: 'function', labelKey: 'codeColor.function' },
  { key: 'title', labelKey: 'codeColor.title' },
  { key: 'variable', labelKey: 'codeColor.variable' },
  { key: 'type', labelKey: 'codeColor.type' },
  { key: 'builtin', labelKey: 'codeColor.builtin' },
  { key: 'attr', labelKey: 'codeColor.attr' },
  { key: 'tag', labelKey: 'codeColor.tag' },
  { key: 'operator', labelKey: 'codeColor.operator' },
  { key: 'meta', labelKey: 'codeColor.meta' }
]

const PREVIEW_CODE = `function greet(name) {
  // say hello to the user
  const msg = \`Hello, \${name}!\`
  return msg.length > 0 ? msg : null
}`

const uid = (): string => Math.random().toString(36).slice(2, 8)

/** True when a hex colour is light enough to read on a dark background. */
function isLightText(hex: string): boolean {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 140
}

function AppThemeSwatch({ colors }: { colors: AppThemeColors }): React.JSX.Element {
  const c = colors
  return (
    <div className="theme-swatch" style={{ background: c.bg1 }}>
      <div className="theme-swatch-row">
        <div className="theme-swatch-cell" style={{ background: c.bg0 }} />
        <div className="theme-swatch-cell" style={{ background: c.bg2 }} />
        <div className="theme-swatch-cell" style={{ background: c.bg3 }} />
      </div>
      <div className="theme-swatch-dots">
        <span className="theme-swatch-dot" style={{ background: c.accent }} />
        <span className="theme-swatch-dot" style={{ background: c.green }} />
        <span className="theme-swatch-dot" style={{ background: c.red }} />
        <span className="theme-swatch-dot" style={{ background: c.yellow }} />
        <span className="theme-swatch-dot" style={{ background: c.purple }} />
      </div>
    </div>
  )
}

function CodeThemeSwatch({ colors }: { colors: CodeThemeColors }): React.JSX.Element {
  const c = colors
  // Preview on a neutral backdrop that matches the palette's brightness so
  // light code themes stay legible.
  const bg = isLightText(c.text) ? '#14161f' : '#f4f5fb'
  return (
    <div className="theme-swatch" style={{ background: bg, padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 9 }}>
      {/* i18n-ignore code sample */}
      <div style={{ color: c.keyword }}>const <span style={{ color: c.function }}>fn</span> = () =&gt; {'{'}</div>
      {/* i18n-ignore code sample */}
      <div style={{ color: c.comment }}>&nbsp;&nbsp;// note</div>
      {/* i18n-ignore code sample */}
      <div>&nbsp;&nbsp;<span style={{ color: c.keyword }}>return</span> <span style={{ color: c.string }}>"hi"</span></div>
    </div>
  )
}

function CodePreview({ colors }: { colors: CodeThemeColors }): React.JSX.Element {
  const t = useT()
  let html: string
  try {
    html = hljs.highlight(PREVIEW_CODE, { language: 'javascript' }).value
  } catch {
    html = PREVIEW_CODE
  }
  const c = colors
  const style = {
    '--code-text': c.text,
    '--code-comment': c.comment,
    '--code-keyword': c.keyword,
    '--code-string': c.string,
    '--code-number': c.number,
    '--code-function': c.function,
    '--code-title': c.title,
    '--code-variable': c.variable,
    '--code-type': c.type,
    '--code-builtin': c.builtin,
    '--code-attr': c.attr,
    '--code-tag': c.tag,
    '--code-operator': c.operator,
    '--code-meta': c.meta
  } as React.CSSProperties
  return (
    <div className="code-preview">
      <div className="code-preview-head">{t('theme.livePreview')}</div>
      <pre className="hljs" style={style} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

// ─── Graph style tab ─────────────────────────────────────────────────────────

const EDGE_STYLES: { id: GraphEdgeStyle; labelKey: TranslationKey }[] = [
  { id: 'rounded', labelKey: 'graphEdge.rounded' },
  { id: 'sharp', labelKey: 'graphEdge.sharp' },
  { id: 'curved', labelKey: 'graphEdge.curved' },
  { id: 'straight', labelKey: 'graphEdge.straight' }
]
const DENSITIES: { id: GraphDensity; labelKey: TranslationKey }[] = [
  { id: 'compact', labelKey: 'graphDensity.compact' },
  { id: 'comfortable', labelKey: 'graphDensity.comfortable' },
  { id: 'spacious', labelKey: 'graphDensity.spacious' }
]
const LINE_WIDTHS: { id: GraphLineWidth; labelKey: TranslationKey }[] = [
  { id: 'thin', labelKey: 'graphWidth.thin' },
  { id: 'normal', labelKey: 'graphWidth.normal' },
  { id: 'thick', labelKey: 'graphWidth.thick' }
]
const NODE_STYLES: { id: GraphNodeStyle; key: TranslationKey }[] = [
  { id: 'normal', key: 'graphNodeStyle.normal' },
  { id: 'compact', key: 'graphNodeStyle.compact' }
]
const TOPOLOGIES: { id: GraphTopology; key: TranslationKey }[] = [
  { id: 'full', key: 'graphTopology.full' },
  { id: 'simple', key: 'graphTopology.simple' },
  { id: 'minimal', key: 'graphTopology.minimal' }
]

const PALETTE_SLOTS = 8

/** Pad/truncate a colour list to exactly PALETTE_SLOTS for the editor grid. */
function toSlots(colors: string[]): string[] {
  const out = colors.slice(0, PALETTE_SLOTS)
  while (out.length < PALETTE_SLOTS) out.push(GRAPH_PALETTES[0].colors[out.length % GRAPH_PALETTES[0].colors.length])
  return out
}

// A realistic little repo used to preview the graph style: a trunk with a
// merge that brings a feature branch back in, plus three stashes saved at
// different points. Rows increase downward (newest first); every edge runs
// child → parent. Running it through the real `layoutGraph` means the preview
// mirrors the actual renderer — including how each topology lays out stashes.
const mk = (hash: string, parents: string[], subject: string): GraphCommit => ({
  hash,
  parents,
  author: '',
  email: '',
  date: 0,
  refs: [],
  subject
})
const PREVIEW_COMMITS: GraphCommit[] = [
  mk('a', ['b'], 'Polish release notes'),
  mk('s1', ['e'], 'WIP: experiment'),
  mk('s2', ['f1'], 'On feature: tweaks'),
  mk('b', ['c', 'f2'], "Merge branch 'feature'"),
  mk('c', ['d'], 'Wire up settings'),
  mk('f2', ['f1'], 'Feature polish'),
  mk('f1', ['d'], 'Start feature'),
  mk('s3', ['d'], 'On master: quick save'),
  mk('d', ['e'], 'Add graph module'),
  mk('e', [], 'Initial commit')
]
const PREVIEW_SPURS = new Set(['s1', 's2', 's3'])

// Sample identities for the live preview's avatar nodes, so it mirrors the
// real graph (Gravatar when available, generated avatar otherwise).
const PREVIEW_EMAILS = ['team@myappdesk.dev', 'alex@myappdesk.dev', 'sam@myappdesk.dev', 'jordan@myappdesk.dev']

/** Dashed, diagonally-hatched box used for stash nodes in compact mode. */
function StashHatchBox({ cx, cy, color, idSuffix }: { cx: number; cy: number; color: string; idSuffix: string }): React.JSX.Element {
  const size = 13
  const bx = cx - size / 2
  const by = cy - size / 2
  const clipId = `stash-hatch-${idSuffix}`
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={bx} y={by} width={size} height={size} rx={2.5} />
        </clipPath>
      </defs>
      <rect x={bx} y={by} width={size} height={size} rx={2.5} fill="var(--bg-2)" />
      <g clipPath={`url(#${clipId})`}>
        {[-size, -size / 2, 0, size / 2, size].map((off, k) => (
          <line
            key={k}
            x1={bx + off}
            y1={by + size}
            x2={bx + off + size}
            y2={by}
            stroke={color}
            strokeWidth={1.5}
            opacity={0.7}
          />
        ))}
      </g>
      <rect x={bx} y={by} width={size} height={size} rx={2.5} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="2.5 2" />
    </g>
  )
}

function GraphMiniPreview({
  colors,
  edgeStyle,
  rowH,
  lineW,
  nodeStyle,
  topology
}: {
  colors: string[]
  edgeStyle: GraphEdgeStyle
  rowH: number
  lineW: number
  nodeStyle: GraphNodeStyle
  topology: GraphTopology
}): React.JSX.Element {
  const laneW = 22
  const leftPad = 16
  const compact = nodeStyle === 'compact'
  const uid = useId().replace(/:/g, '')
  const cf = colorForPalette(colors)
  const layout = useMemo(() => layoutGraph(PREVIEW_COMMITS, PREVIEW_SPURS, topology), [topology])
  const rowOf = useMemo(() => new Map(PREVIEW_COMMITS.map((c, i) => [c.hash, i])), [])
  const x = (lane: number): number => leftPad + lane * laneW
  const y = (row: number): number => row * rowH + rowH / 2
  const height = PREVIEW_COMMITS.length * rowH
  const width = leftPad + (layout.laneCount + 0.5) * laneW + 18
  const avaSize = 17
  // Deeper rails first so the trunk sits on top of the branches it spawns.
  const edges = [...layout.edges].sort(
    (a, b) => Math.max(b.fromLane, b.toLane) - Math.max(a.fromLane, a.toLane)
  )
  let avaIdx = 0
  return (
    <div className="graph-mini-wrap" style={{ position: 'relative', width, height }}>
      <svg className="graph-mini-svg" width={width} height={height}>
        {edges.map((e, i) => {
          const isSpur = e.kind === 'spur'
          const d = isSpur
            ? spurPath(x(e.fromLane), y(e.fromRow), x(e.toLane), y(e.toRow), edgeStyle)
            : edgePath(x(e.fromLane), y(e.fromRow), x(e.toLane), y(e.toRow), edgeStyle)
          return (
            <path
              key={i}
              d={d}
              stroke={cf(e.color)}
              strokeWidth={lineW}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isSpur ? '5 3' : undefined}
              fill="none"
              opacity={isSpur ? 0.85 : 0.95}
            />
          )
        })}
        {PREVIEW_COMMITS.map((c, i) => {
          const n = layout.nodes.get(c.hash)
          if (!n) return null
          const cx = x(n.lane)
          const cy = y(n.row)
          const col = cf(n.color)
          if (PREVIEW_SPURS.has(c.hash)) {
            // Compact: a dashed, hatched box. Normal: a stacked-cards glyph.
            if (compact) return <StashHatchBox key={i} cx={cx} cy={cy} color={col} idSuffix={`${uid}-${i}`} />
            return (
              <g key={i}>
                <rect x={cx - 3.75} y={cy - 7.25} width={11} height={11} rx={3} fill="var(--bg-2)" stroke={col} strokeWidth={Math.max(1, lineW - 0.5)} opacity={0.55} />
                <rect x={cx - 7.25} y={cy - 3.75} width={11} height={11} rx={3} fill="var(--bg-2)" stroke={col} strokeWidth={lineW} />
                <circle cx={cx - 1.75} cy={cy + 1.75} r={1.4} fill={col} />
              </g>
            )
          }
          if (c.parents.length >= 2) {
            return <circle key={i} cx={cx} cy={cy} r={4} fill={col} stroke="var(--bg-2)" strokeWidth={1.5} />
          }
          // Compact commits are dots a touch larger than merge dots. Normal
          // commits are drawn as HTML avatar nodes overlaid below.
          if (compact) {
            return <circle key={i} cx={cx} cy={cy} r={5} fill={col} stroke="var(--bg-2)" strokeWidth={1.5} />
          }
          return null
        })}
      </svg>
      {!compact &&
        PREVIEW_COMMITS.filter((c) => !PREVIEW_SPURS.has(c.hash) && c.parents.length < 2).map((c, i) => {
          const n = layout.nodes.get(c.hash)
          if (!n) return null
          const cx = x(n.lane)
          const cy = y(n.row)
          const col = cf(n.color)
          const email = PREVIEW_EMAILS[avaIdx++ % PREVIEW_EMAILS.length]
          return (
            <div
              key={i}
              className="node-ava"
              style={{ left: cx, top: cy, boxShadow: `0 0 0 2px ${col}` }}
            >
              <Avatar email={email} size={avaSize} />
            </div>
          )
        })}
    </div>
  )
}

function PaletteSwatch({ colors }: { colors: string[] }): React.JSX.Element {
  return (
    <div className="palette-swatch">
      {colors.slice(0, 8).map((c, i) => (
        <span key={i} className="palette-swatch-bar" style={{ background: c }} />
      ))}
    </div>
  )
}

function GraphStyleTab(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const activeProfile = useSettingsStore((s) => s.activeProfile())
  const update = useSettingsStore((s) => s.update)
  const toast = useUIStore((s) => s.toast)
  const t = useT()

  const style = settings.graphStyle ?? defaultGraphStyle()
  const customPalettes = settings.customGraphPalettes ?? []
  const palettes = allGraphPalettes(customPalettes)
  const current = findGraphPalette(style.paletteId, customPalettes)
  const aiEnabled = activeProfile.ai.enabled

  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState<string[]>(() => toSlots(current.colors))
  const [name, setName] = useState('My palette')
  const [showAIPrompt, setShowAIPrompt] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  const setStyle = (patch: Partial<GraphStyle>): void =>
    update((s) => ({ ...s, graphStyle: { ...(s.graphStyle ?? defaultGraphStyle()), ...patch } }))

  const selectPalette = (id: string): void => setStyle({ paletteId: id })

  const openCreate = (): void => {
    setDraft(toSlots(current.colors))
    setName('My palette')
    setShowAIPrompt(false)
    setShowEditor((v) => !v)
  }

  const savePalette = (): void => {
    const pal: GraphPalette = { id: `custom-graph-${uid()}`, name: name || 'Custom', colors: draft }
    update((s) => ({
      ...s,
      customGraphPalettes: [...(s.customGraphPalettes ?? []), pal],
      graphStyle: { ...(s.graphStyle ?? defaultGraphStyle()), paletteId: pal.id }
    }))
    setShowEditor(false)
    toast('success', `${t('settings.savedPalette')} “${pal.name}”`)
  }

  const deletePalette = (id: string): void =>
    update((s) => ({
      ...s,
      customGraphPalettes: (s.customGraphPalettes ?? []).filter((p) => p.id !== id),
      graphStyle:
        (s.graphStyle ?? defaultGraphStyle()).paletteId === id
          ? { ...(s.graphStyle ?? defaultGraphStyle()), paletteId: GRAPH_PALETTES[0].id }
          : (s.graphStyle ?? defaultGraphStyle())
    }))

  const generatePaletteAI = async (): Promise<void> => {
    if (!aiPrompt.trim()) return
    setGenerating(true)
    try {
      const result = await aiApi.generateGraphPalette(aiPrompt.trim(), activeProfile.ai)
      setDraft(toSlots(result.colors))
      setName(result.name)
      setShowAIPrompt(false)
      setAiPrompt('')
      setShowEditor(true)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'AI palette generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const rowH = DENSITY_ROW_H[style.density]
  const lineW = LINE_WIDTH_PX[style.lineWidth]

  return (
    <>
      <div className="graph-style-layout">
        <div className="graph-style-controls">
          <div className="theme-section-header">
            <h4><GitBranch size={14} /> {t('settings.graphPalette')}</h4>
            <div className="theme-section-actions">
              <button className="theme-icon-btn" title={t('settings.createPalette')} onClick={openCreate}>
                <Plus size={14} />
              </button>
              {aiEnabled && (
                <button
                  className="theme-icon-btn"
                  title={t('settings.generateWithAI')}
                  onClick={() => { setShowAIPrompt((v) => !v); setShowEditor(false) }}
                >
                  <Sparkles size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="palette-grid">
            {palettes.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                className={`theme-card ${p.id === style.paletteId ? 'selected' : ''}`}
                onClick={() => selectPalette(p.id)}
                onKeyDown={(e) => e.key === 'Enter' && selectPalette(p.id)}
              >
                <PaletteSwatch colors={p.colors} />
                <div className="theme-card-label">
                  <span>{p.name}</span>
                  {p.id === style.paletteId && <Check size={13} className="theme-check" />}
                </div>
                {!p.builtin && (
                  <button
                    className="theme-card-delete"
                    title={t('settings.deletePalette')}
                    onClick={(e) => { e.stopPropagation(); deletePalette(p.id) }}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <h4 style={{ marginTop: 20 }}><Spline size={14} /> {t('settings.graphCorners')}</h4>
          <div className="theme-mode-switch">
            {EDGE_STYLES.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`theme-mode-btn ${style.edgeStyle === e.id ? 'active' : ''}`}
                onClick={() => setStyle({ edgeStyle: e.id })}
              >
                <span>{t(e.labelKey)}</span>
              </button>
            ))}
          </div>

          <h4 style={{ marginTop: 18 }}>{t('settings.graphDensity')}</h4>
          <div className="theme-mode-switch">
            {DENSITIES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`theme-mode-btn ${style.density === d.id ? 'active' : ''}`}
                onClick={() => setStyle({ density: d.id })}
              >
                <span>{t(d.labelKey)}</span>
              </button>
            ))}
          </div>

          <h4 style={{ marginTop: 18 }}>{t('settings.graphNodeStyle')}</h4>
          <div className="theme-mode-switch">
            {NODE_STYLES.map((nstyle) => (
              <button
                key={nstyle.id}
                type="button"
                className={`theme-mode-btn ${style.nodeStyle === nstyle.id ? 'active' : ''}`}
                onClick={() => setStyle({ nodeStyle: nstyle.id })}
              >
                <span>{t(nstyle.key)}</span>
              </button>
            ))}
          </div>

          <h4 style={{ marginTop: 18 }}><GitBranch size={14} /> {t('settings.graphTopology')}</h4>
          <div className="theme-mode-switch">
            {TOPOLOGIES.map((topo) => (
              <button
                key={topo.id}
                type="button"
                className={`theme-mode-btn ${(style.topology ?? 'full') === topo.id ? 'active' : ''}`}
                onClick={() => setStyle({ topology: topo.id })}
              >
                <span>{t(topo.key)}</span>
              </button>
            ))}
          </div>
          <p className="settings-hint">{t(`graphTopology.${style.topology ?? 'full'}.desc` as TranslationKey)}</p>

          <h4 style={{ marginTop: 18 }}>{t('settings.graphLineWidth')}</h4>
          <div className="theme-mode-switch">
            {LINE_WIDTHS.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`theme-mode-btn ${style.lineWidth === w.id ? 'active' : ''}`}
                onClick={() => setStyle({ lineWidth: w.id })}
              >
                <span>{t(w.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="graph-style-preview">
          <div className="code-preview-head">{t('settings.graphPreview')}</div>
          <div className="graph-mini-stage">
            <GraphMiniPreview colors={current.colors} edgeStyle={style.edgeStyle} rowH={rowH} lineW={lineW} nodeStyle={style.nodeStyle} topology={style.topology ?? 'full'} />
          </div>
        </div>
      </div>

      {showAIPrompt && (
        <ThemeDialog
          title={<><Sparkles size={15} /> {t('settings.generateWithAI')}</>}
          onClose={() => { setShowAIPrompt(false); setAiPrompt('') }}
        >
          <div className="theme-ai-prompt">
            <input
              autoFocus
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t('settings.aiThemePromptPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && !generating && generatePaletteAI()}
            />
            <button className="btn primary small" onClick={generatePaletteAI} disabled={generating || !aiPrompt.trim()}>
              {generating ? <><Loader2 size={13} className="spin" /> {t('settings.generating')}</> : <><Sparkles size={13} /> {t('settings.generate')}</>}
            </button>
            <button className="btn ghost small" onClick={() => { setShowAIPrompt(false); setAiPrompt('') }}>
              {t('common.cancel')}
            </button>
          </div>
        </ThemeDialog>
      )}

      {showEditor && (
        <ThemeDialog
          title={<><GitBranch size={15} /> {t('settings.createPalette')}</>}
          onClose={() => setShowEditor(false)}
        >
          <div className="theme-custom-editor">
            <label>
              {t('settings.paletteName')}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="theme-color-grid">
              {draft.map((c, i) => (
                <label key={i} className="theme-color-field">
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <span>Lane {i + 1}</span>
                </label>
              ))}
            </div>
            <div className="graph-mini-stage" style={{ marginTop: 12 }}>
              <GraphMiniPreview colors={draft} edgeStyle={style.edgeStyle} rowH={rowH} lineW={lineW} nodeStyle={style.nodeStyle} topology={style.topology ?? 'full'} />
            </div>
            <div className="theme-editor-actions">
              <button className="btn primary small" onClick={savePalette}>
                {t('settings.savePalette')}
              </button>
              <button className="btn ghost small" onClick={() => setShowEditor(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </ThemeDialog>
      )}
    </>
  )
}

function ThemesPage({ initialTab }: { initialTab?: 'theme' | 'graph' } = {}): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const activeProfile = useSettingsStore((s) => s.activeProfile())
  const update = useSettingsStore((s) => s.update)
  const toast = useUIStore((s) => s.toast)
  const t = useT()

  const mode = settings.themeMode
  const appThemes = allAppThemes(settings.customAppThemes)
  const codeThemes = allCodeThemes(settings.customCodeThemes)
  const currentApp = findAppTheme(settings.appThemeId, settings.customAppThemes)
  const currentCode = findCodeTheme(settings.codeThemeId, settings.customCodeThemes)
  const currentCodeColors = resolveCodeColors(currentCode, mode)
  const aiEnabled = activeProfile.ai.enabled

  // Custom editor drafts (seeded from the current selection in the active mode).
  const [appDraft, setAppDraft] = useState<AppThemeColors>(resolveAppColors(currentApp, mode))
  const [appName, setAppName] = useState('My theme')
  // AI-generated counterpart for the mode NOT currently being edited (null for manual edits).
  const [appOther, setAppOther] = useState<AppThemeColors | null>(null)
  const [codeDraft, setCodeDraft] = useState<CodeThemeColors>(resolveCodeColors(currentCode, mode))
  const [codeName, setCodeName] = useState('My code theme')
  const [codeOther, setCodeOther] = useState<CodeThemeColors | null>(null)
  const [showAppEditor, setShowAppEditor] = useState(false)
  const [showCodeEditor, setShowCodeEditor] = useState(false)

  const [showAppAIPrompt, setShowAppAIPrompt] = useState(false)
  const [appAIPrompt, setAppAIPrompt] = useState('')
  const [generatingApp, setGeneratingApp] = useState(false)
  const [showCodeAIPrompt, setShowCodeAIPrompt] = useState(false)
  const [codeAIPrompt, setCodeAIPrompt] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)
  const [tab, setTab] = useState<'theme' | 'graph'>(initialTab ?? 'theme')

  const generateAppThemeAI = async (): Promise<void> => {
    if (!appAIPrompt.trim()) return
    setGeneratingApp(true)
    try {
      const result = await aiApi.generateAppTheme(appAIPrompt.trim(), activeProfile.ai)
      setAppDraft(mode === 'dark' ? result.dark : result.light)
      setAppOther(mode === 'dark' ? result.light : result.dark)
      setAppName(result.name)
      setShowAppAIPrompt(false)
      setAppAIPrompt('')
      setShowAppEditor(true)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'AI theme generation failed.')
    } finally {
      setGeneratingApp(false)
    }
  }

  const generateCodeThemeAI = async (): Promise<void> => {
    if (!codeAIPrompt.trim()) return
    setGeneratingCode(true)
    try {
      const result = await aiApi.generateCodeTheme(codeAIPrompt.trim(), activeProfile.ai)
      setCodeDraft(mode === 'dark' ? result.dark : result.light)
      setCodeOther(mode === 'dark' ? result.light : result.dark)
      setCodeName(result.name)
      setShowCodeAIPrompt(false)
      setCodeAIPrompt('')
      setShowCodeEditor(true)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'AI theme generation failed.')
    } finally {
      setGeneratingCode(false)
    }
  }

  const setMode = (m: ThemeMode): void => update((s) => ({ ...s, themeMode: m }))
  const selectApp = (id: string): void => update((s) => ({ ...s, appThemeId: id }))
  const selectCode = (id: string): void => update((s) => ({ ...s, codeThemeId: id }))

  const MODES: { id: ThemeMode; key: TranslationKey; icon: React.ReactNode }[] = [
    { id: 'light', key: 'settings.modeLight', icon: <Sun size={13} /> },
    { id: 'dark', key: 'settings.modeDark', icon: <Moon size={13} /> },
    { id: 'auto', key: 'settings.modeAuto', icon: <Monitor size={13} /> }
  ]

  const saveAppTheme = (): void => {
    const theme: AppTheme = {
      id: `custom-app-${uid()}`,
      name: appName || 'Custom',
      light: mode === 'dark' ? (appOther ?? appDraft) : appDraft,
      dark: mode === 'dark' ? appDraft : (appOther ?? appDraft)
    }
    update((s) => ({
      ...s,
      customAppThemes: [...s.customAppThemes, theme],
      appThemeId: theme.id
    }))
    setShowAppEditor(false)
    toast('success', `${t('settings.savedTheme')} “${theme.name}”`)
  }

  const saveCodeTheme = (): void => {
    const theme: CodeTheme = {
      id: `custom-code-${uid()}`,
      name: codeName || 'Custom',
      light: mode === 'dark' ? (codeOther ?? codeDraft) : codeDraft,
      dark: mode === 'dark' ? codeDraft : (codeOther ?? codeDraft)
    }
    update((s) => ({
      ...s,
      customCodeThemes: [...s.customCodeThemes, theme],
      codeThemeId: theme.id
    }))
    setShowCodeEditor(false)
    toast('success', `${t('settings.savedCodeTheme')} “${theme.name}”`)
  }

  const deleteAppTheme = (id: string): void =>
    update((s) => ({
      ...s,
      customAppThemes: s.customAppThemes.filter((t) => t.id !== id),
      appThemeId: s.appThemeId === id ? APP_THEMES[0].id : s.appThemeId
    }))

  const deleteCodeTheme = (id: string): void =>
    update((s) => ({
      ...s,
      customCodeThemes: s.customCodeThemes.filter((t) => t.id !== id),
      codeThemeId: s.codeThemeId === id ? CODE_THEMES[0].id : s.codeThemeId
    }))

  return (
    <>
      <div className="theme-tabs">
        <button
          type="button"
          className={`theme-tab ${tab === 'theme' ? 'active' : ''}`}
          onClick={() => setTab('theme')}
        >
          <Palette size={13} /> {t('settings.tabTheme')}
        </button>
        <button
          type="button"
          className={`theme-tab ${tab === 'graph' ? 'active' : ''}`}
          onClick={() => setTab('graph')}
        >
          <GitBranch size={13} /> {t('settings.tabGraph')}
        </button>
      </div>

      {tab === 'graph' ? (
        <GraphStyleTab />
      ) : (
      <>
      <h4>
        <Palette size={14} /> {t('settings.appearance')}
      </h4>
      <p className="settings-hint">{t('settings.appearanceHint')}</p>
      <div className="theme-mode-switch">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`theme-mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.icon}
            <span>{t(m.key)}</span>
          </button>
        ))}
      </div>

      <div className="theme-section-header" style={{ marginTop: 22 }}>
        <h4><Palette size={14} /> {t('settings.appTheme')}</h4>
        <div className="theme-section-actions">
          <button
            className="theme-icon-btn"
            title={t('settings.createAppTheme')}
            onClick={() => { setAppDraft(resolveAppColors(currentApp, mode)); setAppOther(null); setShowAppEditor((v) => !v) }}
          >
            <Plus size={14} />
          </button>
          {aiEnabled && (
            <button
              className="theme-icon-btn"
              title={t('settings.generateWithAI')}
              onClick={() => { setShowAppAIPrompt((v) => !v); setShowAppEditor(false) }}
            >
              <Sparkles size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="theme-grid">
        {appThemes.map((th) => (
          <div
            key={th.id}
            role="button"
            tabIndex={0}
            className={`theme-card ${th.id === settings.appThemeId ? 'selected' : ''}`}
            onClick={() => selectApp(th.id)}
            onKeyDown={(e) => e.key === 'Enter' && selectApp(th.id)}
          >
            <AppThemeSwatch colors={resolveAppColors(th, mode)} />
            <div className="theme-card-label">
              <span>{th.name}</span>
              {th.id === settings.appThemeId && <Check size={13} className="theme-check" />}
            </div>
            {!th.builtin && (
              <button
                className="theme-card-delete"
                title={t('settings.deleteTheme')}
                onClick={(e) => { e.stopPropagation(); deleteAppTheme(th.id) }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
      {showAppAIPrompt && (
        <ThemeDialog
          title={<><Sparkles size={15} /> {t('settings.generateWithAI')}</>}
          onClose={() => { setShowAppAIPrompt(false); setAppAIPrompt('') }}
        >
          <div className="theme-ai-prompt">
            <input
              autoFocus
              value={appAIPrompt}
              onChange={(e) => setAppAIPrompt(e.target.value)}
              placeholder={t('settings.aiThemePromptPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && !generatingApp && generateAppThemeAI()}
            />
            <button className="btn primary small" onClick={generateAppThemeAI} disabled={generatingApp || !appAIPrompt.trim()}>
              {generatingApp ? <><Loader2 size={13} className="spin" /> {t('settings.generating')}</> : <><Sparkles size={13} /> {t('settings.generate')}</>}
            </button>
            <button className="btn ghost small" onClick={() => { setShowAppAIPrompt(false); setAppAIPrompt('') }}>
              {t('common.cancel')}
            </button>
          </div>
        </ThemeDialog>
      )}
      {showAppEditor && (
        <ThemeDialog
          title={<><Palette size={15} /> {t('settings.createAppTheme')}</>}
          onClose={() => setShowAppEditor(false)}
        >
          <div className="theme-custom-editor">
            <label>
              {t('settings.themeName')}
              <input value={appName} onChange={(e) => setAppName(e.target.value)} />
            </label>
            <div className="theme-color-grid">
              {APP_COLOR_FIELDS.map((f) => (
                <label key={f.key} className="theme-color-field">
                  <input
                    type="color"
                    value={appDraft[f.key]}
                    onChange={(e) => setAppDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                  <span>{t(f.labelKey)}</span>
                </label>
              ))}
            </div>
            <div className="theme-editor-actions">
              <button className="btn primary small" onClick={saveAppTheme}>
                {t('settings.saveTheme')}
              </button>
              <button className="btn ghost small" onClick={() => setShowAppEditor(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </ThemeDialog>
      )}

      <div className="theme-section-header" style={{ marginTop: 22 }}>
        <h4><Palette size={14} /> {t('settings.codeTheme')}</h4>
        <div className="theme-section-actions">
          <button
            className="theme-icon-btn"
            title={t('settings.createCodeTheme')}
            onClick={() => { setCodeDraft(resolveCodeColors(currentCode, mode)); setCodeOther(null); setShowCodeEditor((v) => !v) }}
          >
            <Plus size={14} />
          </button>
          {aiEnabled && (
            <button
              className="theme-icon-btn"
              title={t('settings.generateWithAI')}
              onClick={() => { setShowCodeAIPrompt((v) => !v); setShowCodeEditor(false) }}
            >
              <Sparkles size={14} />
            </button>
          )}
          <div className="theme-font-size-inline">
            <span>{settings.codeFontSize}px</span>
            <input
              type="range"
              min={10}
              max={20}
              value={settings.codeFontSize}
              onChange={(e) => update((s) => ({ ...s, codeFontSize: Number(e.target.value) }))}
            />
          </div>
        </div>
      </div>
      <div className="theme-grid">
        {codeThemes.map((th) => (
          <div
            key={th.id}
            role="button"
            tabIndex={0}
            className={`theme-card ${th.id === settings.codeThemeId ? 'selected' : ''}`}
            onClick={() => selectCode(th.id)}
            onKeyDown={(e) => e.key === 'Enter' && selectCode(th.id)}
          >
            <CodeThemeSwatch colors={resolveCodeColors(th, mode)} />
            <div className="theme-card-label">
              <span>{th.name}</span>
              {th.id === settings.codeThemeId && <Check size={13} className="theme-check" />}
            </div>
            {!th.builtin && (
              <button
                className="theme-card-delete"
                title={t('settings.deleteTheme')}
                onClick={(e) => { e.stopPropagation(); deleteCodeTheme(th.id) }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      <CodePreview colors={currentCodeColors} />
      {showCodeAIPrompt && (
        <ThemeDialog
          title={<><Sparkles size={15} /> {t('settings.generateWithAI')}</>}
          onClose={() => { setShowCodeAIPrompt(false); setCodeAIPrompt('') }}
        >
          <div className="theme-ai-prompt">
            <input
              autoFocus
              value={codeAIPrompt}
              onChange={(e) => setCodeAIPrompt(e.target.value)}
              placeholder={t('settings.aiThemePromptPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && !generatingCode && generateCodeThemeAI()}
            />
            <button className="btn primary small" onClick={generateCodeThemeAI} disabled={generatingCode || !codeAIPrompt.trim()}>
              {generatingCode ? <><Loader2 size={13} className="spin" /> {t('settings.generating')}</> : <><Sparkles size={13} /> {t('settings.generate')}</>}
            </button>
            <button className="btn ghost small" onClick={() => { setShowCodeAIPrompt(false); setCodeAIPrompt('') }}>
              {t('common.cancel')}
            </button>
          </div>
        </ThemeDialog>
      )}
      {showCodeEditor && (
        <ThemeDialog
          title={<><Palette size={15} /> {t('settings.createCodeTheme')}</>}
          onClose={() => setShowCodeEditor(false)}
        >
          <div className="theme-custom-editor">
            <label>
              {t('settings.themeName')}
              <input value={codeName} onChange={(e) => setCodeName(e.target.value)} />
            </label>
            <div className="theme-color-grid">
              {CODE_COLOR_FIELDS.map((f) => (
                <label key={f.key} className="theme-color-field">
                  <input
                    type="color"
                    value={codeDraft[f.key]}
                    onChange={(e) => setCodeDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                  <span>{t(f.labelKey)}</span>
                </label>
              ))}
            </div>
            <CodePreview colors={codeDraft} />
            <div className="theme-editor-actions">
              <button className="btn primary small" onClick={saveCodeTheme}>
                {t('settings.saveCodeTheme')}
              </button>
              <button className="btn ghost small" onClick={() => setShowCodeEditor(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </ThemeDialog>
      )}
      </>
      )}
    </>
  )
}

function ThemeDialog({
  title,
  onClose,
  children
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
}): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="modal-backdrop"
      style={{ zIndex: 1000 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={15} />
        </button>
        <div className="modal-title-row" style={{ marginBottom: 14 }}>
          {title}
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

function DataManagementSection(): React.JSX.Element {
  const t = useT()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const toast = useUIStore((s) => s.toast)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exportIncludeSecrets, setExportIncludeSecrets] = useState(false)
  const [showExportWarn, setShowExportWarn] = useState(false)

  const doExport = async (): Promise<void> => {
    setExporting(true)
    try {
      // Bundle everything except the machine-local analytics/usage ledger (it
      // lives in its own store and is never part of settings). Secrets — profile
      // API tokens AND the vault — only go in when the user opts in.
      const bundle: SettingsBundle = {
        __gitcito: 'settings-export',
        version: 1,
        settings: exportIncludeSecrets ? settings : stripSettingsSecrets(settings),
        info: await infoApi.exportAll()
      }
      if (exportIncludeSecrets) bundle.vault = await vaultApi.exportAll()
      const ok = await settingsApi.exportFile(bundle)
      if (ok) toast('success', t('settings.exported'))
    } catch {
      toast('error', t('settings.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  const doImport = async (): Promise<void> => {
    setImporting(true)
    try {
      const result = await settingsApi.importFile()
      if (!result) return
      // New format is a SettingsBundle; older exports are a bare AppSettings.
      const isBundle = !!result && typeof result === 'object' && '__gitcito' in result
      const bundle = isBundle ? (result as SettingsBundle) : null
      const incomingSettings = bundle ? bundle.settings : (result as AppSettings)

      if (hasSettingsSecrets(incomingSettings)) {
        toast('info', t('settings.importKeptTokens'))
      }
      if (incomingSettings) update((s) => ({ ...s, ...incomingSettings }))
      if (bundle?.info) await infoApi.importAll(bundle.info)
      if (bundle?.vault) await vaultApi.importAll(bundle.vault)
      toast('success', t('settings.imported'))
    } catch {
      toast('error', t('settings.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <h4 className="settings-section-title">{t('settings.importExport')}</h4>
      <p className="settings-hint">{t('settings.importExportHint')}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button className="btn ghost small" onClick={() => void doImport()} disabled={importing}>
          {importing ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
          {t('settings.importSettings')}
        </button>
        <button
          className="btn ghost small"
          onClick={() => {
            if (exportIncludeSecrets) setShowExportWarn(true)
            else void doExport()
          }}
          disabled={exporting}
        >
          {exporting ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
          {t('settings.exportSettings')}
        </button>
      </div>
      <label className="settings-toggle-card" style={{ marginTop: 12 }}>
        <input
          type="checkbox"
          checked={exportIncludeSecrets}
          onChange={(e) => {
            setExportIncludeSecrets(e.target.checked)
            if (!e.target.checked) setShowExportWarn(false)
          }}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.includeSecrets')}</strong>
          <span className="settings-hint">{t('settings.includeSecretsHint')}</span>
        </span>
      </label>
      {showExportWarn && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10,
          background: 'color-mix(in srgb, var(--yellow) 10%, var(--bg-3))',
          border: '1px solid color-mix(in srgb, var(--yellow) 25%, transparent)',
          borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--text-1)'
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} color="var(--yellow)" />
          <div>
            <strong>{t('settings.exportWarnTitle')}</strong>
            <br />
            {t('settings.exportWarnBody')}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn danger small" onClick={() => { setShowExportWarn(false); void doExport() }}>{t('settings.exportAnyway')}</button>
              <button className="btn ghost small" onClick={() => { setShowExportWarn(false); setExportIncludeSecrets(false) }}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WorkspacesPage(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const createWorkspace = useSettingsStore((s) => s.createWorkspace)
  const renameWorkspace = useSettingsStore((s) => s.renameWorkspace)
  const deleteWorkspace = useSettingsStore((s) => s.deleteWorkspace)
  const switchWorkspace = useSettingsStore((s) => s.switchWorkspace)
  const openModal = useUIStore((s) => s.openModal)
  const t = useT()

  const workspaces = settings.workspaces ?? []
  const wsFallback = (): string => interp(t('ws.placeholder'), { n: workspaces.length + 1 })
  const newWorkspace = (): void =>
    openModal({
      kind: 'input',
      title: t('ws.new'),
      label: t('ws.name'),
      placeholder: wsFallback(),
      submitLabel: t('ws.create'),
      onSubmit: (name) => createWorkspace(name.trim() || wsFallback())
    })
  const editWorkspace = (id: string, current: string): void =>
    openModal({
      kind: 'input',
      title: t('ws.rename'),
      label: t('ws.name'),
      initial: current,
      submitLabel: t('ws.renameAction'),
      onSubmit: (name) => renameWorkspace(id, name.trim() || current)
    })
  const removeWorkspace = (id: string, name: string): void =>
    openModal({
      kind: 'confirm',
      title: t('ws.delete'),
      message: interp(t('ws.deleteConfirm'), { name }),
      danger: true,
      confirmLabel: t('ws.deleteAction'),
      onConfirm: () => deleteWorkspace(id)
    })

  return (
    <div className="settings-general">
      <div className="settings-general-header">
        <h4>
          <LayoutGrid size={14} /> {t('ws.title')}
        </h4>
        <p className="settings-hint">{t('ws.settingsHint')}</p>
      </div>

      <div className="settings-workspace-list">
        {workspaces.map((w) => {
          const isActive = w.id === settings.activeWorkspaceId
          return (
            <div key={w.id} className={`settings-workspace-row ${isActive ? 'active' : ''}`}>
              <button
                type="button"
                className="settings-workspace-name"
                onClick={() => switchWorkspace(w.id)}
                title={isActive ? t('ws.activeTitle') : t('ws.switchTitle')}
              >
                <span className="settings-workspace-check">{isActive ? <Check size={13} /> : null}</span>
                <span className="settings-workspace-label">{w.name}</span>
                <span className="settings-workspace-count">
                  {interp(t(w.tabs.length === 1 ? 'ws.tabCountOne' : 'ws.tabCountMany'), { n: w.tabs.length })}
                </span>
              </button>
              <button
                type="button"
                className="icon-btn"
                title={t('ws.rename')}
                onClick={() => editWorkspace(w.id, w.name)}
              >
                <Pencil size={13} />
              </button>
              {workspaces.length > 1 && (
                <button
                  type="button"
                  className="icon-btn"
                  title={t('ws.delete')}
                  onClick={() => removeWorkspace(w.id, w.name)}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button type="button" className="btn ghost small" onClick={newWorkspace}>
        <Plus size={13} /> {t('ws.new')}
      </button>
    </div>
  )
}

/** Miniature schematic of the workspace that mirrors the real layout for the
 *  currently-selected placement / sidebar side / full-height options. */
function LayoutPreview({
  placement,
  sbSide,
  rpFull
}: {
  placement: 'bottom' | 'center' | 'right'
  sbSide: 'left' | 'right'
  rpFull: boolean
}): React.JSX.Element {
  const sidebar = <span className="lp lp-sidebar" />
  const right = <span className="lp lp-right" />
  const term = <span className="lp lp-term" />
  const center = (
    <span className="lp-center">
      <span className="lp lp-graph" />
      {placement === 'center' && term}
    </span>
  )

  if (placement === 'bottom' && rpFull) {
    return (
      <div className={`layout-preview rpfull sidebar-${sbSide}`}>
        <span className="lp-maincol">
          <span className="lp-mainrow">
            {sbSide === 'left' && sidebar}
            {center}
            {sbSide === 'right' && sidebar}
          </span>
          {term}
        </span>
        {right}
      </div>
    )
  }

  return (
    <div className={`layout-preview placement-${placement} sidebar-${sbSide}`}>
      <span className="lp-row">
        {sbSide === 'left' && sidebar}
        {center}
        {right}
        {placement === 'right' && term}
        {sbSide === 'right' && sidebar}
      </span>
      {placement === 'bottom' && term}
    </div>
  )
}

function LayoutPage(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const t = useT()
  const placement = settings.terminalPlacement
  const sbSide = settings.sidebarSide
  const rpFull = settings.rightPanelFullHeight

  const placements: { id: 'bottom' | 'center' | 'right'; label: TranslationKey; hint: TranslationKey }[] = [
    { id: 'bottom', label: 'settings.termPlaceBottom', hint: 'settings.termPlaceBottomHint' },
    { id: 'center', label: 'settings.termPlaceCenter', hint: 'settings.termPlaceCenterHint' },
    { id: 'right', label: 'settings.termPlaceRight', hint: 'settings.termPlaceRightHint' }
  ]

  return (
    <div className="settings-general">
      <div className="settings-general-header">
        <h4>
          <PanelBottom size={14} /> {t('settings.layout')}
        </h4>
        <p className="settings-hint">{t('settings.layoutIntro')}</p>
      </div>

      <div className="layout-preview-wrap">
        <span className="settings-field-label">{t('settings.livePreview')}</span>
        <LayoutPreview placement={placement} sbSide={sbSide} rpFull={rpFull} />
      </div>

      <label className="settings-field">
        <span className="settings-field-label">{t('settings.terminalPlacement')}</span>
        <span className="settings-hint">{t('settings.terminalPlacementHint')}</span>
        <div className="layout-segmented three">
          {placements.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`layout-seg-btn ${placement === p.id ? 'active' : ''}`}
              onClick={() => update((s) => ({ ...s, terminalPlacement: p.id }))}
            >
              <strong>{t(p.label)}</strong>
              <span>{t(p.hint)}</span>
            </button>
          ))}
        </div>
      </label>

      <label className="settings-field">
        <span className="settings-field-label">{t('settings.sidebarSide')}</span>
        <span className="settings-hint">{t('settings.sidebarSideHint')}</span>
        <div className="layout-segmented two">
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              type="button"
              className={`layout-seg-btn ${sbSide === side ? 'active' : ''}`}
              onClick={() => update((s) => ({ ...s, sidebarSide: side }))}
            >
              <strong>{t(side === 'left' ? 'settings.sidebarLeft' : 'settings.sidebarRight')}</strong>
            </button>
          ))}
        </div>
      </label>

      <div className="settings-toggle-list">
        <label className={`settings-toggle-card ${placement !== 'bottom' ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            checked={rpFull}
            disabled={placement !== 'bottom'}
            onChange={(e) => update((s) => ({ ...s, rightPanelFullHeight: e.target.checked }))}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('settings.rightPanelFullHeight')}</strong>
            <span className="settings-hint">{t('settings.rightPanelFullHeightHint')}</span>
          </span>
        </label>
      </div>

      <div className="settings-field">
        <span className="settings-field-label">{t('settings.resetPanelSizes')}</span>
        <span className="settings-hint">{t('settings.resetPanelSizesHint')}</span>
        <button
          type="button"
          className="btn small layout-reset-btn"
          onClick={() => {
            useUIStore.getState().resetLayout()
            useUIStore.getState().toast('success', t('settings.resetPanelSizesDone'))
          }}
        >
          <RotateCcw size={13} /> {t('settings.resetPanelSizes')}
        </button>
      </div>
    </div>
  )
}

function GeneralPage(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const t = useT()

  return (
    <div className="settings-general">
      <div className="settings-general-header">
        <h4>
          <Settings2 size={14} /> {t('settings.general')}
        </h4>
        <p className="settings-hint">{t('settings.generalIntro')}</p>
      </div>

      <label className="settings-field">
        <span className="settings-field-label">{t('settings.language')}</span>
        <LanguagePicker
          value={settings.language}
          onChange={(language) => update((s) => ({ ...s, language }))}
        />
      </label>

      <h4 className="settings-section-title">{t('settings.graph')}</h4>
      <p className="settings-hint">{t('settings.graphIntro')}</p>

      <div className="settings-grid two">
        <label className="settings-field">
          <span className="settings-field-label">{t('settings.initialCommitCount')}</span>
          <input
            type="number"
            min={50}
            max={5000}
            step={50}
            value={settings.initialCommitCount}
            onChange={(e) =>
              update((s) => ({ ...s, initialCommitCount: Math.max(50, Number(e.target.value) || 50) }))
            }
          />
          <span className="settings-hint">{t('settings.initialCommitCountHint')}</span>
        </label>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.loadMoreCount')}</span>
          <input
            type="number"
            min={50}
            max={5000}
            step={50}
            value={settings.loadMoreCount}
            onChange={(e) => update((s) => ({ ...s, loadMoreCount: Math.max(50, Number(e.target.value) || 50) }))}
          />
        </label>
      </div>

      <div className="settings-toggle-list">
        <label className="settings-toggle-card">
          <input
            type="checkbox"
            checked={settings.autoLoadOnScroll}
            onChange={(e) => update((s) => ({ ...s, autoLoadOnScroll: e.target.checked }))}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('settings.autoLoadOnScroll')}</strong>
            <span className="settings-hint">{t('settings.autoLoadOnScrollHint')}</span>
          </span>
        </label>

        <label className="settings-toggle-card">
          <input
            type="checkbox"
            checked={settings.relativeDates}
            onChange={(e) => update((s) => ({ ...s, relativeDates: e.target.checked }))}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('settings.relativeDates')}</strong>
            <span className="settings-hint">{t('settings.relativeDatesHint')}</span>
          </span>
        </label>

        <label className="settings-toggle-card">
          <input
            type="checkbox"
            checked={settings.commitAvatars}
            onChange={(e) => update((s) => ({ ...s, commitAvatars: e.target.checked }))}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('settings.commitAvatars')}</strong>
            <span className="settings-hint">{t('settings.commitAvatarsHint')}</span>
          </span>
        </label>

        <label className="settings-toggle-card">
          <input
            type="checkbox"
            checked={settings.groupBranches}
            onChange={(e) => update((s) => ({ ...s, groupBranches: e.target.checked }))}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('settings.groupBranches')}</strong>
            <span className="settings-hint">{t('settings.groupBranchesHint')}</span>
          </span>
        </label>
      </div>

      <h4 className="settings-section-title">{t('settings.behaviour')}</h4>
      <p className="settings-hint">{t('settings.behaviourIntro')}</p>

      <div className="settings-grid">
        <label className="settings-field">
          <span className="settings-field-label">{t('settings.autoFetch')}</span>
          <input
            type="number"
            min={0}
            max={120}
            step={1}
            value={settings.autoFetchMinutes}
            onChange={(e) => update((s) => ({ ...s, autoFetchMinutes: Math.max(0, Number(e.target.value) || 0) }))}
          />
          <span className="settings-hint">{t('settings.autoFetchHint')}</span>
        </label>

        <label className="settings-field">
          <span className="settings-field-label">{t('settings.warnOnClose')}</span>
          <select
            value={settings.warnOnClose ?? 'always'}
            onChange={(e) => update((s) => ({ ...s, warnOnClose: e.target.value as AppSettings['warnOnClose'] }))}
          >
            <option value="always">{t('settings.warnOnClose.always')}</option>
            <option value="wip">{t('settings.warnOnClose.wip')}</option>
            <option value="never">{t('settings.warnOnClose.never')}</option>
          </select>
          <span className="settings-hint">{t('settings.warnOnCloseHint')}</span>
        </label>
      </div>

      <label className="settings-toggle-card">
        <input
          type="checkbox"
          checked={settings.confirmForcePush}
          onChange={(e) => update((s) => ({ ...s, confirmForcePush: e.target.checked }))}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.confirmForcePush')}</strong>
          <span className="settings-hint">{t('settings.confirmForcePushHint')}</span>
        </span>
      </label>

      <label className="settings-toggle-card">
        <input
          type="checkbox"
          checked={settings.desktopNotifications ?? false}
          onChange={(e) => update((s) => ({ ...s, desktopNotifications: e.target.checked }))}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.desktopNotifications')}</strong>
          <span className="settings-hint">{t('settings.desktopNotificationsHint')}</span>
        </span>
      </label>

      <label className="settings-toggle-card">
        <input
          type="checkbox"
          checked={settings.mergeCommit}
          onChange={(e) => update((s) => ({ ...s, mergeCommit: e.target.checked }))}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.mergeCommit')}</strong>
          <span className="settings-hint">{t('settings.mergeCommitHint')}</span>
        </span>
      </label>

      <label className="settings-toggle-card">
        <input
          type="checkbox"
          checked={settings.autoOpenChangelog}
          onChange={(e) => update((s) => ({ ...s, autoOpenChangelog: e.target.checked }))}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.autoOpenChangelog')}</strong>
          <span className="settings-hint">{t('settings.autoOpenChangelogHint')}</span>
        </span>
      </label>

      <label className="settings-toggle-card">
        <input
          type="checkbox"
          checked={settings.enableLaunchJson}
          onChange={(e) => update((s) => ({ ...s, enableLaunchJson: e.target.checked }))}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.launchEnabled')}</strong>
          <span className="settings-hint">{t('settings.launchEnabledHint')}</span>
        </span>
      </label>

      <h4 className="settings-section-title">{t('rerere.title')}</h4>
      <p className="settings-hint">{t('rerere.intro')}</p>
      <RerereCard />

      <h4 className="settings-section-title">{t('difftool.title')}</h4>
      <p className="settings-hint">{t('difftool.intro')}</p>
      <DiffToolCard />

      <h4 className="settings-section-title">{t('settings.editor')}</h4>
      <p className="settings-hint">{t('settings.editorHint')}</p>
      <EditorCard />

      <h4 className="settings-section-title">{t('settings.defaultOpenApp')}</h4>
      <p className="settings-hint">{t('settings.defaultOpenAppHint')}</p>
      <div className="settings-app-picker">
        <span className="settings-app-picker-name">
          <ExternalLink size={13} />
          {settings.defaultOpenApp?.name ?? t('settings.noAppSet')}
        </span>
        <button
          type="button"
          className="btn ghost small"
          onClick={async () => {
            const app = await shellApi.pickApplication()
            if (app) update((s) => ({ ...s, defaultOpenApp: app }))
          }}
        >
          {t('settings.chooseApp')}
        </button>
        {settings.defaultOpenApp && (
          <button
            type="button"
            className="icon-btn"
            title={t('settings.clearApp')}
            onClick={() => update((s) => ({ ...s, defaultOpenApp: undefined }))}
          >
            <X size={13} />
          </button>
        )}
      </div>

    </div>
  )
}

/**
 * The `rerere.*` switches. Like the diff tool, these are git's own config keys,
 * written globally — someone who wants git to remember their resolutions wants
 * that in the terminal too.
 */
function RerereCard(): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const tabs = useSettingsStore((s) => s.settings.tabs)
  const activeTabId = useSettingsStore((s) => s.settings.activeTabId)
  const repoPath = useMemo(() => {
    const tab = tabs.find((tb) => tb.id === activeTabId) ?? tabs.find((tb) => tb.kind !== 'page')
    return tab ? tabActiveRepoPath(tab) : null
  }, [tabs, activeTabId])
  const [status, setStatus] = useState<RerereStatus | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    if (!repoPath) return
    setStatus(await gitApi.rerereStatus(repoPath).catch(() => null))
  }, [repoPath])
  useEffect(() => {
    void reload()
  }, [reload])

  if (!repoPath) return <p className="settings-hint">{t('settings.needsRepo')}</p>
  if (!status) return <p className="settings-hint">{t('common.loading')}</p>

  const save = (values: { enabled?: boolean; autoUpdate?: boolean }): void => {
    setStatus({ ...status, ...values })
    void gitApi
      .setRerere(repoPath, values)
      .then(reload)
      .catch((err) => toast('error', String(err)))
  }

  return (
    <>
      <label className="settings-toggle-card">
        <input type="checkbox" checked={status.enabled} onChange={(e) => save({ enabled: e.target.checked })} />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('rerere.enable')}</strong>
          <span className="settings-hint">{t('rerere.enableHint')}</span>
        </span>
      </label>

      {status.enabled && (
        <label className="settings-toggle-card">
          <input type="checkbox" checked={status.autoUpdate} onChange={(e) => save({ autoUpdate: e.target.checked })} />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('rerere.autoUpdate')}</strong>
            <span className="settings-hint">{t('rerere.autoUpdateHint')}</span>
          </span>
        </label>
      )}

      <div className="settings-app-picker">
        <span className="settings-app-picker-name">
          {interp(t('rerere.recorded'), { n: String(status.recorded) })}
        </span>
        <button
          type="button"
          className="btn ghost small"
          disabled={!status.recorded}
          onClick={() => {
            void gitApi.rerereClear(repoPath).then(() => {
              toast('success', t('rerere.cleared'))
              void reload()
            })
          }}
        >
          {t('rerere.clear')}
        </button>
      </div>
      {status.perRepo && <p className="settings-hint">{t('rerere.perRepo')}</p>}
    </>
  )
}

/**
 * Chooses `diff.tool` and `merge.tool`. The lists come from git itself, so a
 * tool someone added by hand with `difftool.<name>.cmd` shows up here without
 * Gitcito knowing anything about it.
 *
 * Needs a repository only because git config is read through one — the values
 * are written globally, since a favourite comparison app is a property of the
 * person, not of one checkout.
 */
function DiffToolCard(): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const tabs = useSettingsStore((s) => s.settings.tabs)
  const activeTabId = useSettingsStore((s) => s.settings.activeTabId)
  const repoPath = useMemo(() => {
    const tab = tabs.find((tb) => tb.id === activeTabId) ?? tabs.find((tb) => tb.kind !== 'page')
    return tab ? tabActiveRepoPath(tab) : null
  }, [tabs, activeTabId])
  const [cfg, setCfg] = useState<DiffToolConfig | null>(null)

  useEffect(() => {
    if (!repoPath) return
    void diffToolApi
      .config(repoPath)
      .then(setCfg)
      .catch(() => setCfg(null))
  }, [repoPath])

  if (!repoPath) return <p className="settings-hint">{t('settings.needsRepo')}</p>
  if (!cfg) return <p className="settings-hint">{t('common.loading')}</p>

  const save = (values: { diffTool?: string; mergeTool?: string; keepBackup?: boolean }): void => {
    setCfg({ ...cfg, ...values })
    void diffToolApi.set(repoPath, values).catch((err) => toast('error', String(err)))
  }

  const picker = (
    label: string,
    value: string,
    tools: DiffToolInfo[],
    onPick: (id: string) => void
  ): React.JSX.Element => (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      <select value={value} onChange={(e) => onPick(e.target.value)}>
        <option value="">{t('difftool.none')}</option>
        {/* A configured tool git cannot find still has to appear, or selecting
            the dropdown would silently change the user's config. */}
        {value && !tools.some((tool) => tool.id === value) && <option value={value}>{value}</option>}
        {tools.map((tool) => (
          <option key={tool.id} value={tool.id}>
            {tool.available ? tool.id : `${tool.id} — ${t('difftool.notInstalled')}`}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <>
      <div className="form-row two">
        {picker(t('difftool.diffTool'), cfg.diffTool, cfg.diffTools, (diffTool) => save({ diffTool }))}
        {picker(t('difftool.mergeTool'), cfg.mergeTool, cfg.mergeTools, (mergeTool) => save({ mergeTool }))}
      </div>
      <p className="settings-hint">{t('difftool.scopeHint')}</p>
      <label className="settings-toggle-card">
        <input type="checkbox" checked={cfg.keepBackup} onChange={(e) => save({ keepBackup: e.target.checked })} />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('difftool.keepBackup')}</strong>
          <span className="settings-hint">{t('difftool.keepBackupHint')}</span>
        </span>
      </label>
    </>
  )
}

/**
 * Picks the external editor used by every "Open in <editor>" action. Detection
 * runs each time the card mounts rather than being cached: installing an editor
 * while Gitcito is open should be one settings visit away, not a restart.
 */
function EditorCard(): React.JSX.Element {
  const editor = useSettingsStore((s) => s.settings.editor)
  const update = useSettingsStore((s) => s.update)
  const t = useT()
  const [found, setFound] = useState<DetectedEditor[]>([])

  useEffect(() => {
    void editorApi.detect().then(setFound)
  }, [])

  const custom = editor?.id === 'custom'
  const setEditor = (next: EditorSetting | undefined): void => update((s) => ({ ...s, editor: next }))

  const pick = (value: string): void => {
    if (value === 'none') return setEditor(undefined)
    if (value === 'custom') {
      return setEditor({ id: 'custom', name: t('settings.editorCustom'), command: '', source: 'cli', fileArgs: '{path}', folderArgs: '{path}' })
    }
    const hit = found.find((f) => f.id === value)
    if (hit) setEditor({ id: hit.id, name: hit.name, command: hit.command, source: hit.source })
  }

  return (
    <>
      <label className="settings-field">
        <span className="settings-field-label">{t('settings.editorChoice')}</span>
        <select value={editor?.id ?? 'none'} onChange={(e) => pick(e.target.value)}>
          <option value="none">{t('settings.editorNone')}</option>
          {found.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
          <option value="custom">{t('settings.editorCustom')}</option>
        </select>
      </label>

      {editor && !custom && editor.source === 'app' && (
        <p className="settings-hint">{interp(t('settings.editorNoCli'), { app: editor.name })}</p>
      )}

      {custom && editor && (
        <div className="form-row two">
          <label>
            {t('settings.editorCommand')}
            <input
              value={editor.command}
              placeholder="/usr/local/bin/code"
              onChange={(e) => setEditor({ ...editor, command: e.target.value })}
            />
          </label>
          <label>
            {t('settings.editorName')}
            <input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
          </label>
          <label>
            {t('settings.editorFileArgs')}
            <input
              value={editor.fileArgs ?? ''}
              placeholder={/* i18n-ignore CLI argv template */ '-g {path}:{line}:{col}'}
              onChange={(e) => setEditor({ ...editor, fileArgs: e.target.value })}
            />
          </label>
          <label>
            {t('settings.editorFolderArgs')}
            <input
              value={editor.folderArgs ?? ''}
              placeholder={/* i18n-ignore CLI argv template */ '{path}'}
              onChange={(e) => setEditor({ ...editor, folderArgs: e.target.value })}
            />
          </label>
        </div>
      )}
      {custom && <p className="settings-hint">{t('settings.editorArgsHint')}</p>}
    </>
  )
}

function KeychainCard(): React.JSX.Element {
  const [status, setStatus] = useState<{ consent: KeychainConsent; available: boolean | null } | null>(null)
  const load = useSettingsStore((s) => s.load)
  const t = useT()

  const refresh = (): void => {
    void keychainApi.status().then(setStatus)
  }
  useEffect(refresh, [])

  const set = async (granted: boolean): Promise<void> => {
    await keychainApi.set(granted)
    // Enabling also unlocks whatever is already stored, so the token fields
    // stop looking empty; disabling just re-reads what is left in memory.
    await load(granted ? { unlock: true } : undefined)
    refresh()
  }

  const consent = status?.consent ?? 'unset'
  const message =
    consent === 'granted'
      ? status?.available === false
        ? t('keychain.statusUnavailable')
        : t('keychain.statusGranted')
      : consent === 'declined'
        ? t('keychain.statusDeclined')
        : t('keychain.statusUnset')

  return (
    <>
      <h4 style={{ marginTop: 18 }}>
        <KeyRound size={14} /> {t('keychain.settingsTitle')}
      </h4>
      <div className="kc-status">
        <span className={`kc-dot ${consent}`} />
        <span className="settings-hint kc-status-text">{message}</span>
        {consent === 'granted' ? (
          <button className="btn ghost small" onClick={() => void set(false)}>
            {t('keychain.disable')}
          </button>
        ) : (
          <button className="btn ghost small" onClick={() => void set(true)}>
            {t('keychain.enable')}
          </button>
        )}
      </div>
    </>
  )
}

function SecurityPage(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const openPageTab = useSettingsStore((s) => s.openPageTab)
  const closeModal = useUIStore((s) => s.closeModal)
  const t = useT()

  const openVault = (): void => {
    openPageTab({ type: 'vault' })
    closeModal()
  }

  return (
    <div className="settings-general">
      <div className="settings-general-header">
        <h4>
          <ShieldCheck size={14} /> {t('settings.security')}
        </h4>
      </div>

      <label className="settings-toggle-card">
        <input
          type="checkbox"
          checked={settings.maskSecrets}
          onChange={(e) => update((s) => ({ ...s, maskSecrets: e.target.checked }))}
        />
        <span className="settings-toggle-control" aria-hidden="true">
          <span className="settings-toggle-thumb" />
        </span>
        <span className="settings-toggle-copy">
          <strong>{t('settings.maskSecrets')}</strong>
          <span className="settings-hint">{t('settings.maskSecretsHint')}</span>
        </span>
      </label>

      <label style={{ marginTop: 12 }}>
        {t('settings.largeFileWarn')}
        <input
          type="number"
          min={0}
          step={1}
          value={Math.round((settings.largeFileKb ?? 0) / 1024)}
          onChange={(e) => update((s) => ({ ...s, largeFileKb: Math.max(0, Number(e.target.value) || 0) * 1024 }))}
          style={{ maxWidth: 120 }}
        />
      </label>
      <span className="settings-hint">{t('settings.largeFileWarnHint')}</span>

      <span className="settings-hint" style={{ display: 'block', marginTop: 12 }}>{t('settings.protectedBranchesMoved')}</span>

      <KeychainCard />

      <SshKeysCard />

      <h4 style={{ marginTop: 18 }}>
        <KeyRound size={14} /> {t('settings.vault')}
      </h4>
      <div>
        <button className="btn ghost small" onClick={openVault}>
          <KeyRound size={13} /> {t('settings.openVault')}
        </button>
        <span className="settings-hint" style={{ display: 'block', marginTop: 6 }}>{t('settings.openVaultHint')}</span>
      </div>
    </div>
  )
}

/** Hosts the connection test can reach, and where their key settings live. */
const SSH_HOSTS: { id: string; label: string; url: string }[] = [
  { id: 'github', label: 'GitHub', url: 'https://github.com/settings/keys' },
  { id: 'gitlab', label: 'GitLab', url: 'https://gitlab.com/-/user_settings/ssh_keys' },
  { id: 'bitbucket', label: 'Bitbucket', url: 'https://bitbucket.org/account/settings/ssh-keys/' },
  { id: 'azure', label: 'Azure DevOps', url: 'https://dev.azure.com' }
]

/**
 * SSH keys are machine state, not profile state — a `git@` remote authenticates
 * through the system ssh whichever profile is active — so this lives in
 * Security rather than under Integrations.
 */
function SshKeysCard(): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const openModal = useUIStore((s) => s.openModal)
  const profile = useSettingsStore((s) => s.activeProfile())
  const [status, setStatus] = useState<SshStatus | null>(null)
  const [busy, setBusy] = useState('')
  const [host, setHost] = useState('github')
  const [test, setTest] = useState<SshTest | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    setStatus(await sshApi.status().catch(() => null))
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])

  const withBusy = async (id: string, fn: () => Promise<void>): Promise<void> => {
    setBusy(id)
    try {
      await fn()
    } finally {
      setBusy('')
    }
  }

  const generate = (): void => {
    openModal({
      kind: 'input',
      title: t('ssh.generateTitle'),
      label: t('ssh.generateLabel'),
      placeholder: 'id_ed25519',
      initial: 'id_ed25519',
      submitLabel: t('ssh.generate'),
      onSubmit: (name) => {
        void withBusy('generate', async () => {
          try {
            // The comment is what identifies the key on the host's list later,
            // so it defaults to the profile's git identity.
            await sshApi.generate(name, profile.gitEmail || profile.gitName || 'gitcito', '')
            toast('success', t('ssh.generated'))
            await reload()
          } catch (err) {
            toast('error', err instanceof Error ? err.message : String(err))
          }
        })
      }
    })
  }

  const addToAgent = (key: SshKey): void => {
    openModal({
      kind: 'input',
      title: t('ssh.addToAgent'),
      label: t('ssh.passphraseLabel'),
      placeholder: t('ssh.passphrasePlaceholder'),
      allowEmpty: true,
      submitLabel: t('ssh.addToAgent'),
      onSubmit: (passphrase) => {
        void withBusy(key.file, async () => {
          const error = await sshApi.addToAgent(key.path, passphrase)
          if (error) toast('error', error)
          else toast('success', t('ssh.added'))
          await reload()
        })
      }
    })
  }

  const upload = (key: SshKey): void => {
    const token = profile.githubToken?.trim()
    if (!token) return toast('error', t('ssh.needsGithubToken'))
    openModal({
      kind: 'confirm',
      title: t('confirm.uploadSshKey.title'),
      message: interp(t('confirm.uploadSshKey.message'), { fingerprint: key.fingerprint }),
      confirmLabel: t('confirm.uploadSshKey.ok'),
      onConfirm: () => {
        void withBusy(key.file, async () => {
          try {
            await hostingApi.uploadSshKey(token, key.comment || key.file, key.publicKey)
            toast('success', t('ssh.uploaded'))
          } catch (err) {
            toast('error', err instanceof Error ? err.message : String(err))
          }
        })
      }
    })
  }

  const runTest = (): void =>
    void withBusy('test', async () => {
      setTest(await sshApi.test(host))
    })

  const keys = status?.keys ?? []

  return (
    <>
      <h4 style={{ marginTop: 18 }}>
        <Terminal size={14} /> {t('ssh.title')}
      </h4>
      <p className="settings-hint">{t('ssh.intro')}</p>

      {keys.length === 0 ? (
        <p className="settings-hint">{t('ssh.none')}</p>
      ) : (
        <div className="ssh-list">
          {keys.map((key) => (
            <div key={key.file} className="ssh-key">
              <div className="ssh-key-head">
                <strong>{key.file}</strong>
                <span className="ssh-key-meta">
                  {key.type} {key.bits}
                </span>
                <span className={`ssh-badge ${key.inAgent ? 'ok' : 'warn'}`}>
                  {key.inAgent ? t('ssh.inAgent') : t('ssh.notInAgent')}
                </span>
              </div>
              <code className="ssh-key-fp">{key.fingerprint}</code>
              {key.comment && <span className="settings-hint">{key.comment}</span>}
              <div className="ssh-key-actions">
                <button
                  className="btn ghost small"
                  onClick={() => {
                    void navigator.clipboard.writeText(key.publicKey)
                    toast('success', t('ssh.copied'))
                  }}
                >
                  <Copy size={12} /> {t('ssh.copyPublic')}
                </button>
                {key.hasPrivate && !key.inAgent && (
                  <button className="btn ghost small" disabled={!!busy} onClick={() => addToAgent(key)}>
                    <Plus size={12} /> {t('ssh.addToAgent')}
                  </button>
                )}
                <button className="btn ghost small" disabled={!!busy} onClick={() => upload(key)}>
                  <Upload size={12} /> {t('ssh.uploadGithub')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ssh-actions">
        <button className="btn ghost small" disabled={busy === 'generate'} onClick={generate}>
          <Plus size={13} /> {t('ssh.generate')}
        </button>
        <select value={host} onChange={(e) => setHost(e.target.value)}>
          {SSH_HOSTS.map((h) => (
            <option key={h.id} value={h.id}>
              {h.label}
            </option>
          ))}
        </select>
        <button className="btn ghost small" disabled={busy === 'test'} onClick={runTest}>
          {busy === 'test' ? <Loader2 size={13} className="spin" /> : <Plug size={13} />} {t('ssh.test')}
        </button>
        <button
          className="link-btn"
          onClick={() => void shellApi.openExternal(SSH_HOSTS.find((h) => h.id === host)?.url ?? '')}
        >
          <ExternalLink size={12} /> {t('ssh.hostKeySettings')}
        </button>
      </div>

      {test && (
        <div className={`ssh-test ${test.result}`}>
          <strong>
            {test.result === 'ok'
              ? t('ssh.testOk')
              : test.result === 'denied'
                ? t('ssh.testDenied')
                : test.result === 'unreachable'
                  ? t('ssh.testUnreachable')
                  : t('ssh.testUnknown')}
          </strong>
          {test.output && <pre>{test.output}</pre>}
        </div>
      )}

      <p className="settings-hint">{t('ssh.privateNever')}</p>
    </>
  )
}

function ShortcutsPage(): React.JSX.Element {
  return (
    <div className="settings-general">
      <ShortcutEditor />
    </div>
  )
}

function RepoDataSection(): React.JSX.Element {
  const t = useT()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const toast = useUIStore((s) => s.toast)
  const count = settings.recentRepos.length

  const clear = (): void => {
    update((s) => ({ ...s, recentRepos: [] }))
    toast('success', t('settings.recentCleared'))
  }

  return (
    <div style={{ marginTop: 28 }}>
      <h4 className="settings-section-title">
        <Database size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
        Cached repositories
      </h4>
      <p className="settings-hint">
        The list of recently opened repositories used for quick access. Clearing it does not touch any repository on disk.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button className="btn ghost small" onClick={clear} disabled={count === 0}>
          <Trash2 size={13} />
          Clear recent repositories
        </button>
        <span className="settings-hint">{count === 0 ? t('settings.noCachedRepos') : interp(t('settings.nCached'), { n: count })}</span>
      </div>
    </div>
  )
}

const USAGE_FEATURE_KEYS: Record<string, TranslationKey> = {
  commitMessage: 'aiFeature.commitMessage',
  explainCode: 'aiFeature.explainCode',
  resolveConflict: 'aiFeature.resolveConflict',
  generateConfig: 'aiFeature.generateConfig',
  suggestArtifacts: 'aiFeature.suggestArtifacts',
  smartStage: 'aiFeature.smartStage',
  generateAppTheme: 'aiFeature.generateAppTheme',
  generateCodeTheme: 'aiFeature.generateCodeTheme',
  generateBranchName: 'aiFeature.generateBranchName',
  reviewPR: 'aiFeature.reviewPR'
}

const EVENT_KEYS: Record<ActivityEvent, TranslationKey> = {
  commit: 'activityEvent.commit',
  amend: 'activityEvent.amend',
  push: 'activityEvent.push',
  pull: 'activityEvent.pull',
  fetch: 'activityEvent.fetch',
  branchCreate: 'activityEvent.branchCreate',
  branchDelete: 'activityEvent.branchDelete',
  merge: 'activityEvent.merge',
  rebase: 'activityEvent.rebase',
  stash: 'activityEvent.stash',
  stashPop: 'activityEvent.stashPop',
  conflictResolved: 'activityEvent.conflictResolved',
  tagCreate: 'activityEvent.tagCreate',
  cherryPick: 'activityEvent.cherryPick',
  revert: 'activityEvent.revert',
  repoOpen: 'activityEvent.repoOpen',
  clone: 'activityEvent.clone',
  init: 'activityEvent.init'
}

const RETENTION_OPTIONS: { labelKey: TranslationKey; value: number }[] = [
  { labelKey: 'retention.forever', value: 0 },
  { labelKey: 'retention.year', value: 365 },
  { labelKey: 'retention.d180', value: 180 },
  { labelKey: 'retention.d90', value: 90 },
  { labelKey: 'retention.d30', value: 30 }
]

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtCost(n: number): string {
  if (n <= 0) return '—'
  return n < 0.01 ? '<$0.01' : `$${n.toFixed(2)}`
}

function StatCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-0)', marginTop: 2 }}>{value}</div>
    </div>
  )
}

/** Compact bar chart. Each bar's height is proportional to value; hover for the exact figure. */
function MiniBars({ data, color }: { data: { label: string; value: number }[]; color: string }): React.JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64, marginTop: 10 }}>
      {data.map((d, i) => (
        <div
          key={i}
          title={`${d.label}: ${d.value}`}
          style={{
            flex: 1,
            minWidth: 2,
            height: `${d.value ? Math.max(4, (d.value / max) * 100) : 2}%`,
            background: d.value ? color : 'var(--border-soft)',
            borderRadius: 2
          }}
        />
      ))}
    </div>
  )
}

export function AnalyticsSection({ aiEnabled }: { aiEnabled: boolean }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const [data, setData] = useState<Analytics>(emptyAnalytics())

  useEffect(() => {
    void analyticsApi.get().then(setData)
  }, [])

  const clear = async (): Promise<void> => {
    setData(await analyticsApi.clear())
    toast('success', t('settings.analyticsCleared'))
  }

  const setRetention = async (days: number): Promise<void> => {
    setData(await analyticsApi.setRetention(days))
  }

  // Aggregate event counts across every recorded day.
  const eventTotals: Partial<Record<ActivityEvent, number>> = {}
  for (const day of data.days) {
    for (const [k, v] of Object.entries(day.events)) {
      eventTotals[k as ActivityEvent] = (eventTotals[k as ActivityEvent] ?? 0) + (v ?? 0)
    }
  }
  const events = (Object.entries(eventTotals) as [ActivityEvent, number][])
    .map(([key, count]) => ({ label: EVENT_KEYS[key] ? t(EVENT_KEYS[key]) : key, count }))
    .sort((a, b) => b.count - a.count)

  // Per-day activity bars: last 90 recorded days, summing all event types.
  const daily = data.days
    .slice(-90)
    .map((d) => ({ label: d.date, value: Object.values(d.events).reduce((s, n) => s + (n ?? 0), 0) }))
  const totalActions = events.reduce((s, e) => s + e.count, 0)

  const aiFeatures = Object.entries(data.aiByFeature)
    .map(([key, stat]) => ({ label: USAGE_FEATURE_KEYS[key] ? t(USAGE_FEATURE_KEYS[key]) : key, stat }))
    .sort((a, b) => b.stat.totalTokens - a.stat.totalTokens)
  const aiHasData = data.aiTotal.requests > 0
  const knownCost = Object.values(data.aiByModel).some((s: AIUsageStat) => s.cost > 0)

  return (
    <div style={{ marginTop: 28 }}>
      <h4 className="settings-section-title">
        <Activity size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
        {t('analytics.title')}
      </h4>
      <p className="settings-hint">
        {interp(t('analytics.subtitle'), {
          since: data.since
            ? interp(t('analytics.since'), { date: new Date(data.since).toLocaleDateString() })
            : ''
        })}
      </p>

      <label className="settings-field" style={{ maxWidth: 220, marginTop: 12 }}>
        <span className="settings-field-label">{t('analytics.retention')}</span>
        <select value={data.retentionDays} onChange={(e) => void setRetention(Number(e.target.value))}>
          {RETENTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
        <span className="settings-hint">{t('analytics.retentionHint')}</span>
      </label>

      {totalActions === 0 ? (
        <p className="settings-hint" style={{ marginTop: 12 }}>
          {t('analytics.noActivity')}
        </p>
      ) : (
        <>
          {daily.length > 1 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                {interp(t('analytics.dailyActivity'), {
                  n: daily.length,
                  dayWord: daily.length === 1 ? t('analytics.day') : t('analytics.days')
                })}
              </div>
              <MiniBars data={daily} color="var(--accent)" />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16 }}>
            {events.map((e) => (
              <StatCard key={e.label} label={e.label} value={String(e.count)} />
            ))}
          </div>
        </>
      )}

      {aiEnabled && (
        <div style={{ marginTop: 24 }}>
          <h5 style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-0)' }}>{t('analytics.aiUsage')}</h5>
          <p className="settings-hint">{t('analytics.aiUsageHint')}</p>
          {!aiHasData ? (
            <p className="settings-hint" style={{ marginTop: 10 }}>
              {t('analytics.noAiUsage')}
            </p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
                <StatCard label={t('analytics.requests')} value={String(data.aiTotal.requests)} />
                <StatCard label={t('analytics.totalTokens')} value={fmtTokens(data.aiTotal.totalTokens)} />
                <StatCard label={t('analytics.promptCompletion')} value={`${fmtTokens(data.aiTotal.promptTokens)} / ${fmtTokens(data.aiTotal.completionTokens)}`} />
                <StatCard label={t('analytics.estCost')} value={fmtCost(data.aiTotal.cost)} />
              </div>
              <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--text-2)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 6px', fontWeight: 500 }}>{t('analytics.feature')}</th>
                    <th style={{ padding: '4px 6px', fontWeight: 500, textAlign: 'right' }}>{t('analytics.requests')}</th>
                    <th style={{ padding: '4px 6px', fontWeight: 500, textAlign: 'right' }}>{t('analytics.tokens')}</th>
                    <th style={{ padding: '4px 6px', fontWeight: 500, textAlign: 'right' }}>{t('analytics.estCost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {aiFeatures.map((f) => (
                    <tr key={f.label} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '5px 6px', color: 'var(--text-1)' }}>{f.label}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>{f.stat.requests}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>{fmtTokens(f.stat.totalTokens)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>{fmtCost(f.stat.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!knownCost && (
                <p className="settings-hint" style={{ marginTop: 8 }}>
                  No cost estimate available for the model(s) in use — only token counts are tracked.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <button className="btn ghost small" onClick={() => void clear()}>
          <Trash2 size={13} />
          Clear analytics
        </button>
      </div>
    </div>
  )
}

export function RepoHistorySection(): React.JSX.Element {
  const t = useT()
  const activeRepo = useSettingsStore((s) => s.activeRepo())
  const recentRepos = useSettingsStore((s) => s.settings.recentRepos)

  // Include the active repo in the list even if it isn't in recentRepos yet
  const allRepos = useMemo(() => {
    if (!activeRepo || recentRepos.some((r) => r.path === activeRepo.path)) return recentRepos
    return [activeRepo, ...recentRepos]
  }, [activeRepo, recentRepos])

  const [selectedPath, setSelectedPath] = useState<string>(() => activeRepo?.path ?? recentRepos[0]?.path ?? '')
  const [stats, setStats] = useState<RepoStats | null>(null)
  const [loading, setLoading] = useState(false)

  // Follow the active repo when the user switches tabs
  useEffect(() => {
    if (activeRepo?.path) setSelectedPath(activeRepo.path)
  }, [activeRepo?.path])

  useEffect(() => {
    if (!selectedPath) {
      setStats(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setStats(null)
    void gitApi
      .repoStats(selectedPath)
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPath])

  const perDay = stats ? stats.perDay.slice(-90).map((d) => ({ label: d.date, value: d.count })) : []
  const topAuthors = stats ? stats.authors.slice(0, 6) : []

  return (
    <div style={{ marginTop: 28 }}>
      <h4 className="settings-section-title">
        <BarChart3 size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
        {t('repoHistory.title')}
      </h4>
      <p className="settings-hint">{t('repoHistory.subtitle')}</p>

      {allRepos.length === 0 ? (
        <p className="settings-hint" style={{ marginTop: 12 }}>
          {t('repoHistory.openRepo')}
        </p>
      ) : (
        <>
          <label className="settings-field" style={{ maxWidth: 320, marginTop: 12 }}>
            <span className="settings-field-label">{t('logs.repository')}</span>
            <select value={selectedPath} onChange={(e) => setSelectedPath(e.target.value)}>
              {allRepos.map((r) => (
                <option key={r.path} value={r.path}>{r.name}</option>
              ))}
            </select>
          </label>

          {loading ? (
            <p className="settings-hint" style={{ marginTop: 12 }}>
              <Loader2 size={13} className="spin" style={{ verticalAlign: '-2px', marginRight: 6 }} />
              {t('repoHistory.reading')}
            </p>
          ) : !stats || stats.totalCommits === 0 ? (
            <p className="settings-hint" style={{ marginTop: 12 }}>
              {t('repoHistory.noCommits')}
            </p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 12 }}>
                <StatCard label={t('repoHistory.totalCommits')} value={String(stats.totalCommits)} />
                <StatCard label={t('repoHistory.authors')} value={String(stats.authors.length)} />
                <StatCard label={t('repoHistory.firstCommit')} value={stats.first ? new Date(stats.first * 1000).toLocaleDateString() : '—'} />
                <StatCard label={t('repoHistory.latestCommit')} value={stats.last ? new Date(stats.last * 1000).toLocaleDateString() : '—'} />
              </div>

              {perDay.length > 1 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                    {interp(t('repoHistory.commitsPerDay'), { n: perDay.length })}
                  </div>
                  <MiniBars data={perDay} color="var(--green)" />
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>
                  {t('repoHistory.topAuthors')}
                </div>
                {topAuthors.map((a) => (
                  <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderTop: '1px solid var(--border-soft)' }}>
                    <span style={{ color: 'var(--text-1)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <GitCommit size={12} /> {a.name}
                    </span>
                    <span style={{ color: 'var(--text-2)' }}>{a.commits}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/** Summary card for the operation log; the full, filterable log opens as a page tab. */
export function OperationLogSection(): React.JSX.Element {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    void logApi.get().then((e) => setCount(e.length))
  }, [])

  const open = (): void => {
    useSettingsStore.getState().openPageTab({ type: 'logs' })
    useUIStore.getState().closeModal()
  }

  return (
    <div style={{ marginTop: 28 }}>
      <h4 className="settings-section-title">
        <ScrollText size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
        Operation log
      </h4>
      <p className="settings-hint">
        Every git operation gitcito ran, with success/failure, filterable by repository. Stored locally on this machine.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
        <button className="btn ghost small" onClick={open}>
          <ScrollText size={13} />
          Open operation log
        </button>
        {count !== null && (
          <span className="settings-hint">
            {count === 0 ? 'No operations recorded yet.' : `${count} operation${count === 1 ? '' : 's'} recorded.`}
          </span>
        )}
      </div>
    </div>
  )
}

function DataPage(): React.JSX.Element {
  const t = useT()
  return (
    <div className="settings-general">
      <div className="settings-general-header">
        <h4>
          <HardDrive size={14} /> {t('settings.data')}
        </h4>
        <p className="settings-hint">{t('settings.dataIntro')}</p>
      </div>
      <DataManagementSection />
      <RepoDataSection />
      <p className="settings-hint" style={{ marginTop: 12 }}>{t('settings.analyticsMoved')}</p>
    </div>
  )
}

const LAST_PAGE_KEY = 'gitcito.settings.lastPage'
const PAGE_IDS: SettingsPage[] = ['profile', 'workspaces', 'integrations', 'ai', 'themes', 'general', 'data']

function readLastPage(): SettingsPage {
  const stored = localStorage.getItem(LAST_PAGE_KEY)
  return stored && (PAGE_IDS as string[]).includes(stored) ? (stored as SettingsPage) : 'general'
}

export function SettingsPanel({ initialPage, initialThemeTab }: { initialPage?: SettingsPage; initialThemeTab?: 'theme' | 'graph' } = {}): React.JSX.Element {
  const { settings, addProfile, deleteProfile } = useSettingsStore()
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const [selectedId, setSelectedId] = useState(settings.activeProfileId)
  const [page, setPage] = useState<SettingsPage>(initialPage ?? readLastPage())
  const [version, setVersion] = useState('')
  const updateStatus = useUpdatesStore((s) => s.status)
  const updateInfo = useUpdatesStore((s) => s.info)
  const revealUpdate = useUpdatesStore((s) => s.reveal)
  const pendingUpdate = hasPendingUpdate(
    { status: updateStatus, info: updateInfo } as never,
    settings.skippedUpdateVersion
  )
  const t = useT()

  useEffect(() => {
    localStorage.setItem(LAST_PAGE_KEY, page)
  }, [page])

  // Tokens are left encrypted at start-up, so this dialog is where they get
  // decrypted — but only when access was already granted and explained. If it
  // wasn't, the fields stay empty and Security offers to turn it on, rather
  // than replacing this dialog with the consent one the moment it opens.
  useEffect(() => {
    void keychainApi.status().then((st) => {
      if (st.consent === 'granted' && st.explained) void useSettingsStore.getState().load({ unlock: true })
    })
  }, [])

  useEffect(() => {
    void window.api.appVersion().then(setVersion)
  }, [])

  const profile = settings.profiles.find((p) => p.id === selectedId) ?? settings.profiles[0]
  const edit = (partial: Partial<Profile>): void =>
    useSettingsStore.getState().saveProfile({ ...profile, ...partial })

  const confirmDeleteProfile = (id: string, name: string): void =>
    openModal({
      kind: 'confirm',
      title: t('settings.deleteProfile'),
      message: t('settings.deleteProfileConfirm').replace('{name}', name),
      danger: true,
      confirmLabel: t('common.delete'),
      onConfirm: () => {
        deleteProfile(id)
        setSelectedId(useSettingsStore.getState().settings.activeProfileId)
      }
    })

  return (
    <div className="settings">
      <h3>{t('settings.title')}</h3>
      <div className="settings-body">
        <aside className="settings-profiles">
          <div className="settings-side-scroll">
            <div className="settings-side-header">
              <span>{t('settings.profilesHeader')}</span>
              <button
                className="icon-btn"
                title={t('settings.newProfile')}
                onClick={() => {
                  addProfile(`Profile ${settings.profiles.length + 1}`)
                  setSelectedId(useSettingsStore.getState().settings.activeProfileId)
                }}
              >
                <Plus size={14} />
              </button>
            </div>
            {settings.profiles.map((p) => (
              <div key={p.id} className={`profile-row ${p.id === selectedId ? 'selected' : ''}`}>
                <button
                  className="profile-item"
                  onClick={() => setSelectedId(p.id)}
                >
                  <UserCircle2 size={15} />
                  <span>{p.name}</span>
                  {p.id === settings.activeProfileId && <BadgeCheck size={13} className="profile-active-mark" />}
                </button>
                {settings.profiles.length > 1 && (
                  <button
                    className="icon-btn danger profile-delete"
                    title={t('settings.deleteProfile')}
                    onClick={(e) => {
                      e.stopPropagation()
                      confirmDeleteProfile(p.id, p.name)
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}

            <div className="settings-side-header pages">
              <span>{t('settings.sectionsHeader')}</span>
            </div>
            {PAGES.map((p) => (
              <button
                key={p.id}
                className={`profile-item ${page === p.id ? 'selected' : ''}`}
                onClick={() => setPage(p.id)}
              >
                {p.icon}
                <span>{t(p.key)}</span>
              </button>
            ))}
          </div>

          <div className="settings-footer">
            <button
              className="settings-madeby"
              type="button"
              title="myappdesk.dev"
              onClick={() => void window.api.openExternal('https://myappdesk.dev')}
            >
              <img src={madLogo} alt="MyAppDesk" draggable={false} />
              <span>{t('settings.madeBy')}</span>
            </button>
            {version && pendingUpdate && updateInfo ? (
              <button
                className="settings-version-btn settings-update-btn"
                type="button"
                title={t('update.available.title')}
                onClick={() => {
                  revealUpdate()
                  closeModal()
                }}
              >
                <Download size={12} />
                <span className="settings-version">v{version}</span>
                <span className="settings-version-cta">
                  {t('update.updateTo')} v{updateInfo.version}
                </span>
              </button>
            ) : (
              version && (
                <button
                  className="settings-version-btn"
                  type="button"
                  title={t('settings.viewChangelog')}
                  onClick={() => {
                    useSettingsStore.getState().openPageTab({ type: 'changelog' })
                    closeModal()
                  }}
                >
                  <Sparkles size={12} />
                  <span className="settings-version">v{version}</span>
                  <span className="settings-version-cta">{t('settings.viewChangelog')}</span>
                </button>
              )
            )}
          </div>
        </aside>

        <div className="settings-form">
          {page === 'profile' && <ProfilePage profile={profile} edit={edit} />}
          {page === 'workspaces' && <WorkspacesPage />}
          {page === 'integrations' && (
            <IntegrationsPage profile={profile} edit={edit} onGoToSecurity={() => setPage('security')} />
          )}
          {page === 'ai' && <AIPage profile={profile} edit={edit} />}
          {page === 'themes' && <ThemesPage initialTab={initialThemeTab} />}
          {page === 'general' && <GeneralPage />}
          {page === 'layout' && <LayoutPage />}
          {page === 'security' && <SecurityPage />}
          {page === 'shortcuts' && <ShortcutsPage />}
          {page === 'data' && <DataPage />}
        </div>
      </div>
    </div>
  )
}
