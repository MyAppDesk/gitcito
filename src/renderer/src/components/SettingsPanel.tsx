import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
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
  ExternalLink,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Download,
  Upload,
  AlertTriangle,
  HardDrive
} from 'lucide-react'
import hljs from 'highlight.js'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { gitApi, aiApi, settingsApi } from '../infrastructure/api'
import { AI_PROVIDERS, type AIProvider, type AppSettings, type BranchNamingStyle, type CommitStyle, type ConflictStyle, type ExplainStyle, type Profile } from '../../../shared/types'
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
import madLogo from '../assets/mad-high.png'

type SettingsPage = 'profile' | 'integrations' | 'ai' | 'themes' | 'general' | 'data'

const PAGES: { id: SettingsPage; key: TranslationKey; icon: React.ReactNode }[] = [
  { id: 'general', key: 'settings.general', icon: <Settings2 size={13} /> },
  { id: 'profile', key: 'settings.profile', icon: <UserCircle2 size={13} /> },
  { id: 'integrations', key: 'settings.integrations', icon: <Plug size={13} /> },
  { id: 'ai', key: 'settings.ai', icon: <Bot size={13} /> },
  { id: 'themes', key: 'settings.themes', icon: <Palette size={13} /> },
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

      <h4>{t('settings.commitStyle')}</h4>
      <label>
        <select
          value={ai.commitStyle}
          onChange={(e) => edit({ ai: { ...ai, commitStyle: e.target.value as CommitStyle } })}
        >
          {COMMIT_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.key)}
            </option>
          ))}
        </select>
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
  const [codeDraft, setCodeDraft] = useState<CodeThemeColors>(resolveCodeColors(currentCode, mode))
  const [codeName, setCodeName] = useState('My code theme')
  const [showAppEditor, setShowAppEditor] = useState(false)
  const [showCodeEditor, setShowCodeEditor] = useState(false)

  const [showAppAIPrompt, setShowAppAIPrompt] = useState(false)
  const [appAIPrompt, setAppAIPrompt] = useState('')
  const [generatingApp, setGeneratingApp] = useState(false)
  const [showCodeAIPrompt, setShowCodeAIPrompt] = useState(false)
  const [codeAIPrompt, setCodeAIPrompt] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)

  const generateAppThemeAI = async (): Promise<void> => {
    if (!appAIPrompt.trim()) return
    setGeneratingApp(true)
    try {
      const result = await aiApi.generateAppTheme(appAIPrompt.trim(), activeProfile.ai)
      setAppDraft(mode === 'dark' ? result.dark : result.light)
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
      light: appDraft,
      dark: appDraft
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
      light: codeDraft,
      dark: codeDraft
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
            onClick={() => { setAppDraft(resolveAppColors(currentApp, mode)); setShowAppEditor((v) => !v) }}
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
      )}
      {showAppEditor && (
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
      )}

      <div className="theme-section-header" style={{ marginTop: 22 }}>
        <h4><Palette size={14} /> {t('settings.codeTheme')}</h4>
        <div className="theme-section-actions">
          <button
            className="theme-icon-btn"
            title={t('settings.createCodeTheme')}
            onClick={() => { setCodeDraft(resolveCodeColors(currentCode, mode)); setShowCodeEditor((v) => !v) }}
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
      )}
      {showCodeEditor && (
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
      )}
    </>
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
      const data = exportIncludeSecrets ? settings : stripSettingsSecrets(settings)
      const ok = await settingsApi.exportFile(data)
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
      const raw = result as AppSettings
      const hasSecrets = detectSettingsSecrets(raw)
      if (hasSecrets) {
        toast('info', 'Imported file contains tokens — they have been kept. Review in Integrations.')
      }
      update((s) => ({ ...s, ...raw }))
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
        Share settings between machines. API keys and tokens are stripped by default on export.
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
          <strong>Include API keys and tokens</strong>
          <span className="settings-hint">Keep the exported file secure — anyone with it can access your services.</span>
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
            <strong>This will include API keys and tokens in the exported file.</strong>
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
  const [selectedId, setSelectedId] = useState(settings.activeProfileId)
  const [page, setPage] = useState<SettingsPage>(initialPage ?? readLastPage())
  const [version, setVersion] = useState('')
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

          <button
            className="settings-madeby"
            type="button"
            title="myappdesk.dev"
            onClick={() => void window.api.openExternal('https://myappdesk.dev')}
          >
            <img src={madLogo} alt="MyAppDesk" draggable={false} />
            <div className="settings-madeby-text">
              <span>{t('settings.madeBy')}</span>
              {version && <span className="settings-version">v{version}</span>}
            </div>
          </button>
        </aside>

        <div className="settings-form">
          {page === 'profile' && <ProfilePage profile={profile} edit={edit} />}
          {page === 'integrations' && <IntegrationsPage profile={profile} edit={edit} />}
          {page === 'ai' && <AIPage profile={profile} edit={edit} />}
          {page === 'themes' && <ThemesPage />}
          {page === 'general' && <GeneralPage />}
          {page === 'data' && <DataPage />}
        </div>
      </div>
    </div>
  )
}
