import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Trash2,
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
  Spline
} from 'lucide-react'
import hljs from 'highlight.js'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useUpdatesStore, hasPendingUpdate } from '../stores/updates'
import { gitApi, aiApi, settingsApi, analyticsApi, logApi, infoApi, vaultApi } from '../infrastructure/api'
import { AI_PROVIDERS, emptyAnalytics, defaultGraphStyle, type AIProvider, type Analytics, type AIUsageStat, type ActivityEvent, type RepoStats, type AppSettings, type BranchNamingStyle, type CommitStyle, type ConflictStyle, type ExplainStyle, type Profile, type SigningConfig, type SettingsBundle, type GraphStyle, type GraphPalette, type GraphEdgeStyle, type GraphDensity, type GraphLineWidth } from '../../../shared/types'
import { allGraphPalettes, findGraphPalette, colorForPalette, edgePath, DENSITY_ROW_H, LINE_WIDTH_PX, GRAPH_PALETTES } from '../graph/style'
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
import { LANGUAGES, useT, type TranslationKey } from '../i18n'
import { ShortcutEditor } from './CheatsheetModal'
import madLogo from '../assets/mad-high.png'

type SettingsPage = 'profile' | 'integrations' | 'ai' | 'themes' | 'general' | 'security' | 'shortcuts' | 'data'

const PAGES: { id: SettingsPage; key: TranslationKey; icon: React.ReactNode }[] = [
  { id: 'general', key: 'settings.general', icon: <Settings2 size={13} /> },
  { id: 'profile', key: 'settings.profile', icon: <UserCircle2 size={13} /> },
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
      toast('success', `Signing settings saved for ${repo.name}`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h4>
        <BadgeCheck size={14} /> Commit signing{repo ? ` · ${repo.name}` : ''}
      </h4>
      {!repo ? (
        <p className="settings-hint">Open a repository to configure commit signing.</p>
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
              <strong>Sign all commits in this repository</strong>
              <span className="settings-hint">Sets commit.gpgsign so new commits are signed automatically.</span>
            </span>
          </label>
          <div className="form-row two">
            <label>
              Format
              <select value={cfg.format} onChange={(e) => setCfg({ ...cfg, format: e.target.value })}>
                <option value="openpgp">OpenPGP (GPG)</option>
                <option value="ssh">SSH</option>
                <option value="x509">X.509 (S/MIME)</option>
              </select>
            </label>
            <label>
              Signing key
              <input
                value={cfg.key}
                placeholder={cfg.format === 'ssh' ? '~/.ssh/id_ed25519.pub' : 'GPG key id'}
                onChange={(e) => setCfg({ ...cfg, key: e.target.value })}
              />
            </label>
          </div>
          <button className="btn ghost small" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 size={13} className="spin" /> : null} Save signing settings
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
      toast('info', 'Open a repository first')
      return
    }
    if (!profile.gitName || !profile.gitEmail) {
      toast('error', 'Set name and email first')
      return
    }
    await gitApi.setUser(repo.path, profile.gitName, profile.gitEmail)
    toast('success', `Applied ${profile.name} identity to ${repo.name}`)
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
    placeholder: 'PAT with Code (read) scope',
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
  edit
}: {
  profile: Profile
  edit: (p: Partial<Profile>) => void
}): React.JSX.Element {
  const t = useT()
  const [tab, setTab] = useState<(typeof INTEGRATIONS)[number]['id']>('github')
  const active = INTEGRATIONS.find((i) => i.id === tab) ?? INTEGRATIONS[0]
  const ActiveIcon = active.icon
  const token = profile[active.field]
  const connected = !!token.trim()

  return (
    <>
      <div className="integration-profile-banner">
        <UserCircle2 size={15} />
        <span>{t('settings.integrationsForProfile').replace('{name}', profile.name)}</span>
      </div>

      <div className="remote-tabs">
        {INTEGRATIONS.map((i) => {
          const Icon = i.icon
          const isConnected = !!profile[i.field].trim()
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

      <label>
        {active.kind === 'app' ? t('settings.appPassword') : t('settings.pat')}
        <input
          type="password"
          value={token}
          placeholder={active.placeholder}
          onChange={(e) => edit({ [active.field]: e.target.value } as Partial<Profile>)}
        />
      </label>
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
      if (list.length === 0) toast('info', 'Provider returned no models')
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
const APP_COLOR_FIELDS: { key: keyof AppThemeColors; label: string }[] = [
  { key: 'bg0', label: 'Background 0' },
  { key: 'bg1', label: 'Background 1' },
  { key: 'bg2', label: 'Background 2' },
  { key: 'bg3', label: 'Background 3' },
  { key: 'bg4', label: 'Background 4' },
  { key: 'border', label: 'Border' },
  { key: 'borderSoft', label: 'Border soft' },
  { key: 'text0', label: 'Text primary' },
  { key: 'text1', label: 'Text secondary' },
  { key: 'text2', label: 'Text muted' },
  { key: 'accent', label: 'Accent' },
  { key: 'green', label: 'Green' },
  { key: 'red', label: 'Red' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'purple', label: 'Purple' }
]

const CODE_COLOR_FIELDS: { key: keyof CodeThemeColors; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'comment', label: 'Comment' },
  { key: 'keyword', label: 'Keyword' },
  { key: 'string', label: 'String' },
  { key: 'number', label: 'Number' },
  { key: 'function', label: 'Function' },
  { key: 'title', label: 'Title/Class' },
  { key: 'variable', label: 'Variable' },
  { key: 'type', label: 'Type' },
  { key: 'builtin', label: 'Built-in' },
  { key: 'attr', label: 'Attribute' },
  { key: 'tag', label: 'Tag' },
  { key: 'operator', label: 'Operator' },
  { key: 'meta', label: 'Meta' }
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
      <div style={{ color: c.keyword }}>const <span style={{ color: c.function }}>fn</span> = () =&gt; {'{'}</div>
      <div style={{ color: c.comment }}>&nbsp;&nbsp;// note</div>
      <div>&nbsp;&nbsp;<span style={{ color: c.keyword }}>return</span> <span style={{ color: c.string }}>"hi"</span></div>
    </div>
  )
}

function CodePreview({ colors }: { colors: CodeThemeColors }): React.JSX.Element {
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
      <div className="code-preview-head">Live preview</div>
      <pre className="hljs" style={style} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

// ─── Graph style tab ─────────────────────────────────────────────────────────

const EDGE_STYLES: { id: GraphEdgeStyle; label: string }[] = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'sharp', label: 'Sharp' },
  { id: 'curved', label: 'Curved' },
  { id: 'straight', label: 'Straight' }
]
const DENSITIES: { id: GraphDensity; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'spacious', label: 'Spacious' }
]
const LINE_WIDTHS: { id: GraphLineWidth; label: string }[] = [
  { id: 'thin', label: 'Thin' },
  { id: 'normal', label: 'Normal' },
  { id: 'thick', label: 'Thick' }
]

const PALETTE_SLOTS = 8

/** Pad/truncate a colour list to exactly PALETTE_SLOTS for the editor grid. */
function toSlots(colors: string[]): string[] {
  const out = colors.slice(0, PALETTE_SLOTS)
  while (out.length < PALETTE_SLOTS) out.push(GRAPH_PALETTES[0].colors[out.length % GRAPH_PALETTES[0].colors.length])
  return out
}

// A small illustrative graph: trunk + a branch that diverges and merges back,
// plus a stash spur. Rows increase downward; an edge goes child → parent.
const PREVIEW_NODES: { row: number; lane: number; color: number; kind: 'commit' | 'merge' | 'stash' }[] = [
  { row: 0, lane: 0, color: 0, kind: 'commit' },
  { row: 1, lane: 1, color: 1, kind: 'commit' },
  { row: 2, lane: 2, color: 2, kind: 'stash' },
  { row: 3, lane: 1, color: 1, kind: 'commit' },
  { row: 4, lane: 0, color: 0, kind: 'merge' },
  { row: 5, lane: 0, color: 0, kind: 'commit' }
]
const PREVIEW_EDGES: { fromRow: number; fromLane: number; toRow: number; toLane: number; color: number; dashed?: boolean }[] = [
  { fromRow: 0, fromLane: 0, toRow: 4, toLane: 0, color: 0 }, // trunk
  { fromRow: 4, fromLane: 0, toRow: 5, toLane: 0, color: 0 }, // trunk continues
  { fromRow: 0, fromLane: 0, toRow: 1, toLane: 1, color: 1 }, // branch out
  { fromRow: 1, fromLane: 1, toRow: 3, toLane: 1, color: 1 }, // feature line
  { fromRow: 3, fromLane: 1, toRow: 4, toLane: 0, color: 1 }, // merge in
  { fromRow: 2, fromLane: 2, toRow: 3, toLane: 0, color: 2, dashed: true } // stash spur
]

function GraphMiniPreview({
  colors,
  edgeStyle,
  rowH,
  lineW
}: {
  colors: string[]
  edgeStyle: GraphEdgeStyle
  rowH: number
  lineW: number
}): React.JSX.Element {
  const laneW = 22
  const leftPad = 16
  const cf = colorForPalette(colors)
  const x = (lane: number): number => leftPad + lane * laneW
  const y = (row: number): number => row * rowH + rowH / 2
  const height = PREVIEW_NODES.length * rowH
  const width = leftPad + 2 * laneW + 18
  return (
    <svg className="graph-mini-svg" width={width} height={height}>
      {PREVIEW_EDGES.map((e, i) => (
        <path
          key={i}
          d={edgePath(x(e.fromLane), y(e.fromRow), x(e.toLane), y(e.toRow), edgeStyle)}
          stroke={cf(e.color)}
          strokeWidth={lineW}
          strokeLinecap="round"
          strokeDasharray={e.dashed ? '3 3' : undefined}
          fill="none"
          opacity={0.9}
        />
      ))}
      {PREVIEW_NODES.map((n, i) => {
        const cx = x(n.lane)
        const cy = y(n.row)
        const col = cf(n.color)
        if (n.kind === 'stash') {
          return (
            <g key={i}>
              <rect x={cx - 3.75} y={cy - 7.25} width={11} height={11} rx={3} fill="var(--bg-2)" stroke={col} strokeWidth={Math.max(1, lineW - 0.5)} opacity={0.55} />
              <rect x={cx - 7.25} y={cy - 3.75} width={11} height={11} rx={3} fill="var(--bg-2)" stroke={col} strokeWidth={lineW} />
              <circle cx={cx - 1.75} cy={cy + 1.75} r={1.4} fill={col} />
            </g>
          )
        }
        const r = n.kind === 'merge' ? 4 : 4.5
        return <circle key={i} cx={cx} cy={cy} r={r} fill={col} stroke="var(--bg-2)" strokeWidth={1.5} />
      })}
    </svg>
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
                    title="Delete palette"
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
                <span>{e.label}</span>
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
                <span>{d.label}</span>
              </button>
            ))}
          </div>

          <h4 style={{ marginTop: 18 }}>{t('settings.graphLineWidth')}</h4>
          <div className="theme-mode-switch">
            {LINE_WIDTHS.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`theme-mode-btn ${style.lineWidth === w.id ? 'active' : ''}`}
                onClick={() => setStyle({ lineWidth: w.id })}
              >
                <span>{w.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="graph-style-preview">
          <div className="code-preview-head">{t('settings.graphPreview')}</div>
          <div className="graph-mini-stage">
            <GraphMiniPreview colors={current.colors} edgeStyle={style.edgeStyle} rowH={rowH} lineW={lineW} />
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
              {generating ? <><Loader2 size={13} className="spin" /> {t('settings.generating')}</> : <><Sparkles size={13} /> Generate</>}
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
              <GraphMiniPreview colors={draft} edgeStyle={style.edgeStyle} rowH={rowH} lineW={lineW} />
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

function ThemesPage(): React.JSX.Element {
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
  const [tab, setTab] = useState<'theme' | 'graph'>('theme')

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
                title="Delete theme"
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
              {generatingApp ? <><Loader2 size={13} className="spin" /> {t('settings.generating')}</> : <><Sparkles size={13} /> Generate</>}
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
                  <span>{f.label}</span>
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
                title="Delete theme"
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
              {generatingCode ? <><Loader2 size={13} className="spin" /> {t('settings.generating')}</> : <><Sparkles size={13} /> Generate</>}
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
                  <span>{f.label}</span>
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

function detectSettingsSecrets(s: AppSettings): boolean {
  return (s.profiles ?? []).some(
    (p) => !!p.githubToken || !!p.azureToken || !!p.gitlabToken || !!p.bitbucketToken || !!p.ai?.apiKey
  )
}

function stripSettingsSecrets(s: AppSettings): AppSettings {
  return {
    ...s,
    profiles: s.profiles.map((p) => ({
      ...p,
      githubToken: '',
      azureToken: '',
      gitlabToken: '',
      bitbucketToken: '',
      ai: p.ai ? { ...p.ai, apiKey: '' } : p.ai
    }))
  }
}

function DataManagementSection(): React.JSX.Element {
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
      if (ok) toast('success', 'Settings exported')
    } catch {
      toast('error', 'Export failed')
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

      if (detectSettingsSecrets(incomingSettings)) {
        toast('info', 'Imported file contains tokens — they have been kept. Review in Integrations.')
      }
      if (incomingSettings) update((s) => ({ ...s, ...incomingSettings }))
      if (bundle?.info) await infoApi.importAll(bundle.info)
      if (bundle?.vault) await vaultApi.importAll(bundle.vault)
      toast('success', 'Settings imported')
    } catch {
      toast('error', 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <h4 className="settings-section-title">Import / Export</h4>
      <p className="settings-hint">
        Back up or move everything between machines — settings, profiles, themes and per-repo Info.
        Usage analytics stay local. API keys, tokens and the secrets Vault are stripped unless you opt in below.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button className="btn ghost small" onClick={() => void doImport()} disabled={importing}>
          {importing ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
          Import settings
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
          Export settings
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
          <strong>Include API keys, tokens & Vault secrets</strong>
          <span className="settings-hint">Keep the exported file secure — anyone with it can access your services and secrets.</span>
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
            <strong>This will include API keys, tokens and your Vault secrets in the exported file.</strong>
            <br />
            Keep the file secure — anyone with it can access your services.
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn danger small" onClick={() => { setShowExportWarn(false); void doExport() }}>Export anyway</button>
              <button className="btn ghost small" onClick={() => { setShowExportWarn(false); setExportIncludeSecrets(false) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
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
        <select
          value={settings.language}
          onChange={(e) => update((s) => ({ ...s, language: e.target.value as typeof s.language }))}
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
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
    </div>
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

function ShortcutsPage(): React.JSX.Element {
  return (
    <div className="settings-general">
      <ShortcutEditor />
    </div>
  )
}

function RepoDataSection(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const toast = useUIStore((s) => s.toast)
  const count = settings.recentRepos.length

  const clear = (): void => {
    update((s) => ({ ...s, recentRepos: [] }))
    toast('success', 'Recent repositories cleared')
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
        <span className="settings-hint">{count === 0 ? 'No cached repositories' : `${count} cached`}</span>
      </div>
    </div>
  )
}

const USAGE_FEATURE_LABELS: Record<string, string> = {
  commitMessage: 'Commit messages',
  explainCode: 'Explain code',
  resolveConflict: 'Conflict resolution',
  generateConfig: 'Config generation',
  suggestArtifacts: 'Artifact suggestions',
  smartStage: 'Smart staging',
  generateAppTheme: 'App themes',
  generateCodeTheme: 'Code themes',
  generateBranchName: 'Branch names',
  reviewPR: 'PR review'
}

const EVENT_LABELS: Record<ActivityEvent, string> = {
  commit: 'Commits',
  amend: 'Amends',
  push: 'Pushes',
  pull: 'Pulls',
  fetch: 'Fetches',
  branchCreate: 'Branches created',
  branchDelete: 'Branches deleted',
  merge: 'Merges',
  rebase: 'Rebases',
  stash: 'Stashes',
  stashPop: 'Stash pops',
  conflictResolved: 'Conflicts resolved',
  tagCreate: 'Tags created',
  cherryPick: 'Cherry-picks',
  revert: 'Reverts',
  repoOpen: 'Repos opened',
  clone: 'Clones',
  init: 'Repos initialized'
}

const RETENTION_OPTIONS: { label: string; value: number }[] = [
  { label: 'Keep forever', value: 0 },
  { label: '1 year', value: 365 },
  { label: '180 days', value: 180 },
  { label: '90 days', value: 90 },
  { label: '30 days', value: 30 }
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
  const toast = useUIStore((s) => s.toast)
  const [data, setData] = useState<Analytics>(emptyAnalytics())

  useEffect(() => {
    void analyticsApi.get().then(setData)
  }, [])

  const clear = async (): Promise<void> => {
    setData(await analyticsApi.clear())
    toast('success', 'Analytics cleared')
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
    .map(([key, count]) => ({ label: EVENT_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count)

  // Per-day activity bars: last 90 recorded days, summing all event types.
  const daily = data.days
    .slice(-90)
    .map((d) => ({ label: d.date, value: Object.values(d.events).reduce((s, n) => s + (n ?? 0), 0) }))
  const totalActions = events.reduce((s, e) => s + e.count, 0)

  const aiFeatures = Object.entries(data.aiByFeature)
    .map(([key, stat]) => ({ label: USAGE_FEATURE_LABELS[key] ?? key, stat }))
    .sort((a, b) => b.stat.totalTokens - a.stat.totalTokens)
  const aiHasData = data.aiTotal.requests > 0
  const knownCost = Object.values(data.aiByModel).some((s: AIUsageStat) => s.cost > 0)

  return (
    <div style={{ marginTop: 28 }}>
      <h4 className="settings-section-title">
        <Activity size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
        Activity analytics
      </h4>
      <p className="settings-hint">
        What you do in gitcito over time{data.since ? `, since ${new Date(data.since).toLocaleDateString()}` : ''}. Stored locally on this machine.
      </p>

      <label className="settings-field" style={{ maxWidth: 220, marginTop: 12 }}>
        <span className="settings-field-label">History retention</span>
        <select value={data.retentionDays} onChange={(e) => void setRetention(Number(e.target.value))}>
          {RETENTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="settings-hint">Older daily buckets are pruned automatically.</span>
      </label>

      {totalActions === 0 ? (
        <p className="settings-hint" style={{ marginTop: 12 }}>No activity recorded yet.</p>
      ) : (
        <>
          {daily.length > 1 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Daily activity ({daily.length} day{daily.length === 1 ? '' : 's'})</div>
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
          <h5 style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-0)' }}>AI usage</h5>
          <p className="settings-hint">
            Tokens consumed by AI features. Costs are rough estimates from public list prices and may not match your bill.
          </p>
          {!aiHasData ? (
            <p className="settings-hint" style={{ marginTop: 10 }}>No AI usage recorded yet.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
                <StatCard label="Requests" value={String(data.aiTotal.requests)} />
                <StatCard label="Total tokens" value={fmtTokens(data.aiTotal.totalTokens)} />
                <StatCard label="Prompt / Completion" value={`${fmtTokens(data.aiTotal.promptTokens)} / ${fmtTokens(data.aiTotal.completionTokens)}`} />
                <StatCard label="Est. cost" value={fmtCost(data.aiTotal.cost)} />
              </div>
              <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--text-2)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 6px', fontWeight: 500 }}>Feature</th>
                    <th style={{ padding: '4px 6px', fontWeight: 500, textAlign: 'right' }}>Requests</th>
                    <th style={{ padding: '4px 6px', fontWeight: 500, textAlign: 'right' }}>Tokens</th>
                    <th style={{ padding: '4px 6px', fontWeight: 500, textAlign: 'right' }}>Est. cost</th>
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
        Repository history
      </h4>
      <p className="settings-hint">
        Commit statistics read from the repository's git history.
      </p>

      {allRepos.length === 0 ? (
        <p className="settings-hint" style={{ marginTop: 12 }}>Open a repository to see its history.</p>
      ) : (
        <>
          <label className="settings-field" style={{ maxWidth: 320, marginTop: 12 }}>
            <span className="settings-field-label">Repository</span>
            <select value={selectedPath} onChange={(e) => setSelectedPath(e.target.value)}>
              {allRepos.map((r) => (
                <option key={r.path} value={r.path}>{r.name}</option>
              ))}
            </select>
          </label>

          {loading ? (
            <p className="settings-hint" style={{ marginTop: 12 }}>
              <Loader2 size={13} className="spin" style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Reading history…
            </p>
          ) : !stats || stats.totalCommits === 0 ? (
            <p className="settings-hint" style={{ marginTop: 12 }}>No commits found.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 12 }}>
                <StatCard label="Total commits" value={String(stats.totalCommits)} />
                <StatCard label="Authors" value={String(stats.authors.length)} />
                <StatCard label="First commit" value={stats.first ? new Date(stats.first * 1000).toLocaleDateString() : '—'} />
                <StatCard label="Latest commit" value={stats.last ? new Date(stats.last * 1000).toLocaleDateString() : '—'} />
              </div>

              {perDay.length > 1 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Commits per day (last {perDay.length})</div>
                  <MiniBars data={perDay} color="var(--green)" />
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Top authors</div>
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
const PAGE_IDS: SettingsPage[] = ['profile', 'integrations', 'ai', 'themes', 'general', 'data']

function readLastPage(): SettingsPage {
  const stored = localStorage.getItem(LAST_PAGE_KEY)
  return stored && (PAGE_IDS as string[]).includes(stored) ? (stored as SettingsPage) : 'general'
}

export function SettingsPanel({ initialPage }: { initialPage?: SettingsPage } = {}): React.JSX.Element {
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
          {page === 'integrations' && <IntegrationsPage profile={profile} edit={edit} />}
          {page === 'ai' && <AIPage profile={profile} edit={edit} />}
          {page === 'themes' && <ThemesPage />}
          {page === 'general' && <GeneralPage />}
          {page === 'security' && <SecurityPage />}
          {page === 'shortcuts' && <ShortcutsPage />}
          {page === 'data' && <DataPage />}
        </div>
      </div>
    </div>
  )
}
