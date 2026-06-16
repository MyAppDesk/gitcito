import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  User, Bot, Palette, Plug, Check, ChevronRight, ChevronLeft,
  Upload, AlertTriangle, Sun, Moon, Monitor, Loader2
} from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import {
  defaultProfile,
  type AIConfig,
  type AppSettings,
  type Profile,
  type ThemeMode
} from '../../../shared/types'
import { APP_THEMES, applyAppTheme, findAppTheme } from '../theme/themes'
import { settingsApi } from '../infrastructure/api'
import { AIPage, IntegrationsPage } from './SettingsPanel'
import gitcitoLaunch from '../assets/gitcito-launch.png'

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectSecrets(s: AppSettings): boolean {
  return (s.profiles ?? []).some(
    (p) => !!p.githubToken || !!p.azureToken || !!p.gitlabToken || !!p.bitbucketToken || !!p.ai?.apiKey
  )
}

function stripSecrets(s: AppSettings): AppSettings {
  return {
    ...s,
    profiles: (s.profiles ?? []).map((p) => ({
      ...p,
      githubToken: '',
      azureToken: '',
      gitlabToken: '',
      bitbucketToken: '',
      ai: p.ai ? { ...p.ai, apiKey: '' } : p.ai
    }))
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WizardData {
  profileName: string
  gitName: string
  gitEmail: string
  ai: AIConfig
  themeId: string
  themeMode: ThemeMode
  githubToken: string
  gitlabToken: string
  azureToken: string
  bitbucketToken: string
  importData: AppSettings | null
  importHasSecrets: boolean
  importIncludeSecrets: boolean
}

const TOTAL_STEPS = 4

const slideVariants = {
  enter: (d: number) => ({ x: d * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -32, opacity: 0 })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildProfile(data: WizardData): Profile {
  return {
    ...defaultProfile(),
    name: data.profileName || 'Default',
    gitName: data.gitName,
    gitEmail: data.gitEmail,
    githubToken: data.githubToken,
    gitlabToken: data.gitlabToken,
    azureToken: data.azureToken,
    bitbucketToken: data.bitbucketToken,
    ai: data.ai
  }
}

// ── Step sub-components ───────────────────────────────────────────────────────

function WelcomeStep({
  data,
  patch,
  onImport,
  onApplyImport,
  importing
}: {
  data: WizardData
  patch: (p: Partial<WizardData>) => void
  onImport: () => void
  onApplyImport: () => void
  importing: boolean
}): React.JSX.Element {
  return (
    <div className="onboarding-welcome">
      <div className="onboarding-logo">
        <img src={gitcitoLaunch} alt="" draggable={false} className="onboarding-art" />
      </div>
      <div className="onboarding-title">Welcome to gitcito</div>
      <div className="onboarding-subtitle">Let's get you set up in a few steps.</div>

      <div className="onboarding-import-box">
        {data.importData ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Check size={16} color="var(--green)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>Settings file loaded</span>
            </div>
            {data.importHasSecrets && (
              <div className="onboarding-warning">
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>This file contains API keys and tokens.</strong>
                  <br />
                  By default they will be stripped. Check the box to keep them.
                  <label className="onboarding-secret-check">
                    <input
                      type="checkbox"
                      checked={data.importIncludeSecrets}
                      onChange={(e) => patch({ importIncludeSecrets: e.target.checked })}
                    />
                    Include API keys and tokens
                  </label>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn primary" onClick={onApplyImport}>
                <Check size={14} /> Apply &amp; continue
              </button>
              <button
                className="btn ghost"
                onClick={() => patch({ importData: null, importHasSecrets: false, importIncludeSecrets: false })}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="onboarding-import-empty">
            <Upload size={22} color="var(--text-2)" />
            <p>Already have a gitcito settings file?</p>
            <button className="btn ghost" onClick={onImport} disabled={importing}>
              {importing ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
              Import settings
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileStep({
  data,
  patch
}: {
  data: WizardData
  patch: (p: Partial<WizardData>) => void
}): React.JSX.Element {
  return (
    <div>
      <div className="onboarding-step-header">
        <User size={20} color="var(--accent)" />
        <div className="onboarding-title">Your profile</div>
        <div className="onboarding-subtitle">How you appear in commits and the app.</div>
      </div>

      <div className="onboarding-section">DISPLAY NAME</div>
      <input
        className="modal-input"
        placeholder="e.g. Work Profile"
        value={data.profileName}
        onChange={(e) => patch({ profileName: e.target.value })}
      />

      <div className="onboarding-section">GIT IDENTITY</div>
      <input
        className="modal-input"
        placeholder="Your name"
        value={data.gitName}
        onChange={(e) => patch({ gitName: e.target.value })}
      />
      <input
        className="modal-input"
        placeholder="you@example.com"
        value={data.gitEmail}
        onChange={(e) => patch({ gitEmail: e.target.value })}
        style={{ marginTop: 8 }}
      />
      <p className="onboarding-hint">Used for git commits. Must match your git config to get credit on GitHub.</p>
    </div>
  )
}

function AIStep({
  data,
  patch
}: {
  data: WizardData
  patch: (p: Partial<WizardData>) => void
}): React.JSX.Element {
  return (
    <>
      <div className="onboarding-step-header">
        <Bot size={20} color="var(--accent)" />
        <div className="onboarding-title">AI features</div>
        <div className="onboarding-subtitle">Commit messages, branch names, conflict resolution.</div>
      </div>
      <div className="settings-form">
        <AIPage
          profile={buildProfile(data)}
          edit={(partial) => {
            if (partial.ai !== undefined) patch({ ai: { ...data.ai, ...partial.ai } })
          }}
        />
      </div>
    </>
  )
}

function ThemeStep({
  data,
  patch
}: {
  data: WizardData
  patch: (p: Partial<WizardData>) => void
}): React.JSX.Element {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const effectiveMode = data.themeMode === 'auto' ? (systemDark ? 'dark' : 'light') : data.themeMode

  return (
    <div>
      <div className="onboarding-step-header">
        <Palette size={20} color="var(--accent)" />
        <div className="onboarding-title">Choose your theme</div>
        <div className="onboarding-subtitle">You can always change this in Settings.</div>
      </div>

      <div className="onboarding-theme-grid">
        {APP_THEMES.map((theme) => {
          const c = theme[effectiveMode]
          const selected = data.themeId === theme.id
          return (
            <button
              key={theme.id}
              className={`onboarding-theme-card${selected ? ' selected' : ''}`}
              onClick={() => patch({ themeId: theme.id })}
            >
              <div className="onboarding-theme-swatch" style={{ background: c.bg0 }}>
                <div className="onboarding-theme-sidebar" style={{ background: c.bg1, borderRight: `1px solid ${c.border}` }} />
                <div className="onboarding-theme-content" style={{ background: c.bg2 }}>
                  <div className="onboarding-theme-bar" style={{ background: c.accent }} />
                  <div className="onboarding-theme-bar" style={{ background: c.bg3, width: '80%' }} />
                  <div className="onboarding-theme-bar" style={{ background: c.bg3, width: '55%' }} />
                </div>
              </div>
              {selected && (
                <div className="onboarding-theme-check">
                  <Check size={10} />
                </div>
              )}
              <div className="onboarding-theme-name">{theme.name}</div>
            </button>
          )
        })}
      </div>

      <div className="onboarding-mode-toggle">
        {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['auto', 'Auto', Monitor]] as const).map(
          ([id, label, Icon]) => (
            <button
              key={id}
              className={`onboarding-mode-btn${data.themeMode === id ? ' selected' : ''}`}
              onClick={() => patch({ themeMode: id })}
            >
              <Icon size={13} /> {label}
            </button>
          )
        )}
      </div>
    </div>
  )
}

function IntegrationsStep({
  data,
  patch
}: {
  data: WizardData
  patch: (p: Partial<WizardData>) => void
}): React.JSX.Element {
  return (
    <>
      <div className="onboarding-step-header">
        <Plug size={20} color="var(--accent)" />
        <div className="onboarding-title">Connect your services</div>
        <div className="onboarding-subtitle">All optional — configure anytime in Settings.</div>
      </div>
      <div className="settings-form">
        <IntegrationsPage
          profile={buildProfile(data)}
          edit={(partial) => {
            const p = partial as Partial<WizardData>
            patch({
              ...(p.githubToken !== undefined && { githubToken: p.githubToken }),
              ...(p.azureToken !== undefined && { azureToken: p.azureToken }),
              ...(p.gitlabToken !== undefined && { gitlabToken: p.gitlabToken }),
              ...(p.bitbucketToken !== undefined && { bitbucketToken: p.bitbucketToken })
            })
          }}
        />
      </div>
    </>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function OnboardingWizard(): React.JSX.Element {
  const profile = useSettingsStore((s) => s.activeProfile())
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const toast = useUIStore((s) => s.toast)

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [importing, setImporting] = useState(false)

  const [data, setData] = useState<WizardData>({
    profileName: profile.name,
    gitName: profile.gitName,
    gitEmail: profile.gitEmail,
    ai: { ...profile.ai },
    themeId: settings.appThemeId,
    themeMode: settings.themeMode,
    githubToken: profile.githubToken,
    gitlabToken: profile.gitlabToken,
    azureToken: profile.azureToken,
    bitbucketToken: profile.bitbucketToken,
    importData: null,
    importHasSecrets: false,
    importIncludeSecrets: false
  })

  const patch = (partial: Partial<WizardData>): void => setData((d) => ({ ...d, ...partial }))

  useEffect(() => {
    if (step === 3) applyAppTheme(findAppTheme(data.themeId, []), data.themeMode)
  }, [data.themeId, data.themeMode, step])

  const next = (): void => { setDir(1); setStep((s) => s + 1) }
  const back = (): void => { setDir(-1); setStep((s) => s - 1) }

  const doImport = async (): Promise<void> => {
    setImporting(true)
    try {
      const result = await settingsApi.importFile()
      if (!result) return
      const hasSecrets = detectSecrets(result as AppSettings)
      patch({ importData: result as AppSettings, importHasSecrets: hasSecrets })
    } catch {
      toast('error', 'Could not read settings file')
    } finally {
      setImporting(false)
    }
  }

  const applyImport = (): void => {
    const raw = data.importData!
    const toApply = data.importIncludeSecrets ? raw : stripSecrets(raw)
    update((s) => ({ ...s, ...toApply, onboardingCompleted: true }))
    toast('success', 'Settings imported')
  }

  const finish = (): void => {
    update((s) => ({
      ...s,
      appThemeId: data.themeId,
      themeMode: data.themeMode,
      onboardingCompleted: true,
      profiles: s.profiles.map((p) =>
        p.id === s.activeProfileId
          ? {
              ...p,
              name: data.profileName || p.name,
              gitName: data.gitName,
              gitEmail: data.gitEmail,
              githubToken: data.githubToken,
              gitlabToken: data.gitlabToken,
              azureToken: data.azureToken,
              bitbucketToken: data.bitbucketToken,
              ai: { ...p.ai, ...data.ai }
            }
          : p
      )
    }))
  }

  return (
    <div className="onboarding-overlay">
      <motion.div
        className="onboarding-card"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        {step > 0 && (
          <div className="onboarding-progress">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`onboarding-dot${i + 1 < step ? ' done' : i + 1 === step ? ' active' : ''}`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.16, ease: 'easeInOut' }}
            className="onboarding-body"
          >
            {step === 0 && (
              <WelcomeStep
                data={data}
                patch={patch}
                onImport={() => void doImport()}
                onApplyImport={applyImport}
                importing={importing}
              />
            )}
            {step === 1 && <ProfileStep data={data} patch={patch} />}
            {step === 2 && <AIStep data={data} patch={patch} />}
            {step === 3 && <ThemeStep data={data} patch={patch} />}
            {step === 4 && <IntegrationsStep data={data} patch={patch} />}
          </motion.div>
        </AnimatePresence>

        <div className="onboarding-footer">
          {step === 0 ? (
            <button className="btn primary onboarding-start-btn" onClick={next}>
              Get started <ChevronRight size={15} />
            </button>
          ) : (
            <>
              <button className="btn ghost" onClick={back}>
                <ChevronLeft size={14} /> Back
              </button>
              {step < TOTAL_STEPS ? (
                <button className="btn primary" onClick={next}>
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button className="btn primary" onClick={finish}>
                  <Check size={14} /> Let's go!
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
