import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Download,
  Flame,
  FolderGit2,
  Layers,
  Loader2,
  Play,
  Plus,
  Radar,
  Snowflake,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Users
} from 'lucide-react'
import type { AppSettings, HackRepoRole, HackTemplate, PortableHackSession } from '../../../shared/types'
import { tabRepos } from '../../../shared/types'
import { BUILTIN_HACK_TEMPLATES, findHackTemplate } from '../../../shared/hackTemplates'
import { draftCodeowners } from '../../../shared/codeowners'
import { gitApi, aiApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useHackStore } from '../stores/hack'
import {
  fromPortable,
  matchPortableRepos,
  parsePortableSession,
  sessionFromTemplate,
  toPortable
} from '../lib/hackSession'
import { MIN_FETCH_SECONDS } from '../lib/fetchScheduler'
import { useT, interp, type TranslationKey } from '../i18n'

const uid = (): string => Math.random().toString(36).slice(2, 10)

/** A template's display name: built-ins translate, saved ones do not. */
function templateName(tpl: HackTemplate, t: (k: TranslationKey) => string): string {
  return tpl.nameKey ? t(tpl.nameKey as TranslationKey) : (tpl.name ?? tpl.id)
}

/**
 * Create, run, edit and end a hack session.
 *
 * The shape of the form follows one rule: **a template is a starting point, not
 * a commitment.** Every value it fills in is editable here, before the session
 * starts and while it runs — being trapped by a preset chosen in the second
 * minute of an event is exactly the failure the templates exist to avoid.
 */
export function HackModeModal(): React.JSX.Element {
  const t = useT()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const openModal = useUIStore((s) => s.openModal)
  const repos = useRepoStore((s) => s.repos)
  const hack = useHackStore()

  const running = settings.hackSession

  // The event's repositories, grouped the way the user already grouped them.
  //
  // A flat checkbox list ignores the structure that is right there: a group tab
  // IS the set of repositories someone decided belong together, and picking one
  // in one click is the difference between a form and a decision. Standalone
  // tabs come last, under their own heading.
  const sections = useMemo(() => {
    const out: { id: string; name: string; kind: 'group' | 'loose'; repos: { path: string; name: string }[] }[] = []
    const seen = new Set<string>()
    const loose: { path: string; name: string }[] = []
    for (const tab of settings.tabs) {
      if (tab.kind === 'page') continue
      const repos = tabRepos(tab).filter((r) => !seen.has(r.path))
      for (const r of repos) seen.add(r.path)
      if (repos.length === 0) continue
      if (tab.kind === 'group') {
        out.push({ id: tab.id, name: tab.name, kind: 'group', repos: repos.map((r) => ({ path: r.path, name: r.name })) })
      } else {
        loose.push(...repos.map((r) => ({ path: r.path, name: r.name })))
      }
    }
    if (loose.length) out.push({ id: '__loose', name: '', kind: 'loose', repos: loose })
    return out
  }, [settings.tabs])

  const available = useMemo(() => sections.flatMap((s) => s.repos), [sections])

  /** Which saved workspace this picker is showing — switching swaps the tab
   *  strip, so it swaps what a session can cover. */
  const workspaces = settings.workspaces ?? []
  const activeWorkspace = workspaces.find((w) => w.id === settings.activeWorkspaceId)

  const templates = useMemo<HackTemplate[]>(
    () => [...BUILTIN_HACK_TEMPLATES, ...(settings.hackTemplates ?? [])],
    [settings.hackTemplates]
  )

  // ─── Draft state (creation) ───
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? 'hackathon-36h')
  const [name, setName] = useState('')
  const [me, setMe] = useState('')
  const [picked, setPicked] = useState<Set<string>>(() => new Set(available.map((r) => r.path)))
  const [roles, setRoles] = useState<HackRepoRole[]>([])
  const [detecting, setDetecting] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)

  const template = findHackTemplate(templateId, settings.hackTemplates ?? []) ?? BUILTIN_HACK_TEMPLATES[0]

  /**
   * Propose roles and contract files by reading each repo's manifests.
   *
   * Detection rather than a catalogue of stacks: an unrecognised project simply
   * proposes nothing and the user names its contract files by hand, and the
   * feature is whole either way. A curated list of frameworks would be a
   * promise that ages and a hole for everything not on it.
   */
  const detect = useCallback(
    async (paths: string[]): Promise<void> => {
      setDetecting(true)
      try {
        const found: HackRepoRole[] = []
        for (const repoPath of paths) {
          const detected = await gitApi.detectRepoRoles(repoPath).catch(() => [])
          for (const d of detected) {
            found.push({
              // A role in a subdirectory is what makes a monorepo work without
              // a monorepo concept: several roles, one repository.
              path: d.dir ? `${repoPath}/${d.dir}` : repoPath,
              label: d.label,
              contracts: d.contracts
            })
          }
        }
        setRoles(found)
      } finally {
        setDetecting(false)
      }
    },
    []
  )

  // Detect as soon as the dialog opens on a fresh session — a blank form at
  // minute two of an event is a form nobody fills in.
  useEffect(() => {
    if (running) return
    void detect([...picked])
    // Only on open: re-detecting on every checkbox would throw away edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Optional AI pass: sharpen the proposal using the repo's own history. */
  const askAI = async (): Promise<void> => {
    const cfg = useSettingsStore.getState().activeProfile().ai
    if (!cfg?.enabled) {
      toast('info', t('hack.aiUnavailable'))
      return
    }
    setAiBusy(true)
    try {
      for (const repoPath of picked) {
        const mine = roles.filter((r) => r.path === repoPath || r.path.startsWith(`${repoPath}/`))
        if (mine.length === 0) continue
        const stats = await gitApi.repoInsights(repoPath).catch(() => null)
        if (!stats) continue
        const detected = mine.map((r) => ({
          dir: r.path === repoPath ? '' : r.path.slice(repoPath.length + 1),
          label: r.label,
          contracts: r.contracts
        }))
        const proposal = await aiApi
          .proposeSessionPlan(
            repoPath.split('/').pop() ?? repoPath,
            detected,
            stats.hotspots.map((h) => ({ path: h.path, commits: h.commits })),
            stats.authors.map((a) => ({ name: a.name, commits: a.commits })),
            cfg
          )
          .catch(() => null)
        if (!proposal) continue
        setRoles((prev) =>
          prev.map((r) => {
            if (!(r.path === repoPath || r.path.startsWith(`${repoPath}/`))) return r
            const dir = r.path === repoPath ? '' : r.path.slice(repoPath.length + 1)
            const hit = proposal.roles.find((p) => p.dir === dir)
            if (!hit) return r
            return {
              ...r,
              label: hit.label || r.label,
              contracts: [...new Set([...r.contracts, ...hit.contracts])]
            }
          })
        )
      }
      toast('success', t('hack.aiProposed'))
    } finally {
      setAiBusy(false)
    }
  }

  const start = async (): Promise<void> => {
    const chosen = [...picked]
    if (chosen.length === 0) {
      toast('error', t('hack.needRepo'))
      return
    }
    const session = sessionFromTemplate(template, {
      id: uid(),
      name: name.trim() || templateName(template, t),
      repos: chosen,
      roles: roles.filter((r) => chosen.some((p) => r.path === p || r.path.startsWith(`${p}/`))),
      me: me.trim(),
      now: Date.now()
    })
    await hack.start(session)
    toast('success', interp(t('hack.started'), { name: session.name }))
    closeModal()
  }

  const stop = (): void => {
    openModal({
      kind: 'confirm',
      title: t('hack.endTitle'),
      message: t('hack.endMessage'),
      confirmLabel: t('hack.endKeepWip'),
      onConfirm: () => void hack.end({ cleanWip: false }).then(() => closeModal()),
      secondaryLabel: t('hack.endCleanWip'),
      secondaryDanger: true,
      onSecondary: () => void hack.end({ cleanWip: true }).then(() => closeModal())
    })
  }

  // ─── Invite ───
  // No backend, so "invite" is an artefact you hand over: a file that travels by
  // Slack, AirDrop or a USB stick. Deliberately not a URL scheme — a link that
  // reconfigures the app is a click-to-configure surface reachable from any web
  // page, while a file is something the recipient chose to open.
  const exportSession = async (): Promise<void> => {
    const s = running
    if (!s) return
    const info = s.repos.map((p) => ({
      path: p,
      name: repos[p]?.name ?? (p.split('/').pop() ?? p),
      remote: repos[p]?.remotes.find((r) => r.name === 'origin')?.url
    }))
    const payload = toPortable(s, info)
    const file = await window.api.choosePath(t('hack.exportTitle'), `${s.name.replace(/[^\w.-]+/g, '-')}.gitcito-session`, [
      { name: 'Gitcito session', extensions: ['gitcito-session', 'json'] }
    ])
    if (!file) return
    await window.api.saveBinary(file, new TextEncoder().encode(JSON.stringify(payload, null, 2)))
    toast('success', t('hack.exported'))
  }

  const importSession = async (): Promise<void> => {
    const picked2 = await window.api.openPatch()
    if (!picked2) return
    let parsed: PortableHackSession | null = null
    try {
      parsed = parsePortableSession(JSON.parse(picked2.content))
    } catch {
      parsed = null
    }
    if (!parsed) {
      toast('error', t('hack.importInvalid'))
      return
    }
    // Everything that survived parsing is inside IMPORT_LIMITS. A shared preset
    // may change what Gitcito shows, never what it runs.
    const local = available.map((r) => ({
      path: r.path,
      name: r.name,
      remote: repos[r.path]?.remotes.find((x) => x.name === 'origin')?.url
    }))
    const { matched, missing } = matchPortableRepos(parsed, local)
    if (matched.length === 0) {
      toast('error', t('hack.importNoRepos'))
      return
    }
    const session = fromPortable(parsed, matched, { id: uid(), me: me.trim(), now: Date.now() })
    await hack.start(session)
    if (missing.length > 0) {
      // Never silently shrink the session: say which repos still need cloning.
      toast('info', interp(t('hack.importMissing'), { n: String(missing.length), repos: missing.map((m) => m.name).join(', ') }))
    }
    toast('success', interp(t('hack.started'), { name: session.name }))
    closeModal()
  }

  /** Offer a CODEOWNERS for a repo that has none, from its own history. */
  const generateOwners = async (repoPath: string): Promise<void> => {
    const stats = await gitApi.repoInsights(repoPath).catch(() => null)
    if (!stats) return
    // Top-level directory → whoever has touched it most. Shallow on purpose:
    // this is a starting point a team edits, not a claim to have worked out
    // who owns what.
    const byDir = new Map<string, Map<string, number>>()
    for (const h of stats.hotspots) {
      const dir = h.path.split('/')[0]
      if (!dir || dir === h.path) continue
      const inner = byDir.get(dir) ?? new Map<string, number>()
      inner.set(stats.authors[0]?.name ?? '', (inner.get(stats.authors[0]?.name ?? '') ?? 0) + h.commits)
      byDir.set(dir, inner)
    }
    const entries = [...byDir.entries()].map(([dir, authors]) => ({
      dir,
      owner: [...authors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    }))
    const content = draftCodeowners(entries)
    openModal({
      kind: 'confirm',
      title: t('hack.ownersWriteTitle'),
      message: interp(t('hack.ownersWriteMessage'), { repo: repoPath.split('/').pop() ?? repoPath, preview: content }),
      confirmLabel: t('hack.ownersWriteOk'),
      onConfirm: () => {
        void gitApi.writeCodeowners(repoPath, content).then(() => {
          void hack.loadOwners(repoPath)
          toast('success', t('hack.ownersWritten'))
        })
      }
    })
  }

  const setSessionField = <K extends keyof NonNullable<AppSettings['hackSession']>>(
    key: K,
    value: NonNullable<AppSettings['hackSession']>[K]
  ): void => hack.update({ [key]: value })

  // ─── Running session: settings, invite, teardown ───
  if (running) {
    return (
      <div className="hack-modal">
        <div className="hack-modal-head">
          <Flame size={16} />
          <h3>{running.name}</h3>
          <span className="settings-hint">{templateName(template, t)}</span>
        </div>

        <div className="settings-grid">
          <label className="settings-field">
            <span className="settings-field-label">{t('hack.fetchSeconds')}</span>
            <input
              type="number"
              min={MIN_FETCH_SECONDS}
              max={3600}
              value={running.fetchSeconds}
              onChange={(e) => setSessionField('fetchSeconds', Math.max(0, Number(e.target.value) || 0))}
            />
            <span className="settings-hint">{t('hack.fetchSecondsHint')}</span>
          </label>

          <label className="settings-field">
            <span className="settings-field-label">{t('hack.motion')}</span>
            <select
              value={running.motion}
              onChange={(e) => setSessionField('motion', e.target.value as typeof running.motion)}
            >
              <option value="anime">{t('hack.motionAnime')}</option>
              <option value="calm">{t('hack.motionCalm')}</option>
              <option value="off">{t('hack.motionOff')}</option>
            </select>
            <span className="settings-hint">{t('hack.motionHint')}</span>
          </label>

          <label className="settings-field">
            <span className="settings-field-label">{t('hack.freezeFrom')}</span>
            <input
              type="number"
              min={0}
              max={72}
              value={running.freezeFromHours}
              onChange={(e) => setSessionField('freezeFromHours', Math.max(0, Number(e.target.value) || 0))}
            />
            <span className="settings-hint">{t('hack.freezeFromHint')}</span>
          </label>

          <label className="settings-field">
            <span className="settings-field-label">{t('hack.wipMinutes')}</span>
            <input
              type="number"
              min={0}
              max={240}
              value={running.wipPushMinutes}
              onChange={(e) => setSessionField('wipPushMinutes', Math.max(0, Number(e.target.value) || 0))}
            />
            <span className="settings-hint">{t('hack.wipMinutesHint')}</span>
          </label>
        </div>

        <label className="settings-field">
          <span className="settings-field-label">{t('hack.freezeAllowlist')}</span>
          <textarea
            rows={3}
            value={running.freezeAllowlist.join('\n')}
            onChange={(e) =>
              setSessionField(
                'freezeAllowlist',
                e.target.value.split('\n').map((l) => l.trim()).filter(Boolean)
              )
            }
          />
          <span className="settings-hint">{t('hack.freezeAllowlistHint')}</span>
        </label>

        <label className="settings-toggle-card">
          <input
            type="checkbox"
            checked={running.wipPush}
            onChange={(e) => setSessionField('wipPush', e.target.checked)}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('hack.wipPush')}</strong>
            <span className="settings-hint">{t('hack.wipPushHint')}</span>
          </span>
        </label>

        <label className="settings-toggle-card">
          <input
            type="checkbox"
            checked={running.radarNotify}
            onChange={(e) => setSessionField('radarNotify', e.target.checked)}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('hack.radarNotify')}</strong>
            <span className="settings-hint">{t('hack.radarNotifyHint')}</span>
          </span>
        </label>

        <label className="settings-toggle-card">
          <input
            type="checkbox"
            checked={running.semanticCollisions}
            onChange={(e) => setSessionField('semanticCollisions', e.target.checked)}
          />
          <span className="settings-toggle-control" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
          <span className="settings-toggle-copy">
            <strong>{t('hack.semantic')}</strong>
            <span className="settings-hint">{t('hack.semanticHint')}</span>
          </span>
        </label>

        <div className="hack-repo-list">
          {running.repos.map((p) => (
            <div key={p} className="hack-repo-row">
              <Radar size={12} />
              <span className="hack-repo-name">{p.split('/').pop()}</span>
              <button className="btn ghost small" onClick={() => void generateOwners(p)}>
                <Users size={12} /> {t('hack.ownersGenerate')}
              </button>
            </div>
          ))}
        </div>

        <div className="hack-modal-actions">
          <button className="btn ghost" onClick={() => void exportSession()}>
            <Upload size={13} /> {t('hack.export')}
          </button>
          <button className="btn danger" onClick={stop}>
            <Square size={13} /> {t('hack.end')}
          </button>
        </div>
      </div>
    )
  }

  // ─── Creation ───
  return (
    <div className="hack-modal">
      <div className="hack-modal-head">
        <Flame size={16} />
        <h3>{t('hack.createTitle')}</h3>
      </div>
      <p className="settings-hint">{t('hack.createIntro')}</p>

      <div className="hack-template-row">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            className={`hack-template ${tpl.id === templateId ? 'active' : ''}`}
            onClick={() => setTemplateId(tpl.id)}
          >
            <strong>{templateName(tpl, t)}</strong>
            <span>
              {interp(t('hack.templateSummary'), {
                hours: String(tpl.durationHours),
                seconds: String(tpl.fetchSeconds)
              })}
            </span>
            <span className="hack-template-tags">
              <span className={`hack-tag hack-tag--${tpl.motion}`}>
                {tpl.motion === 'anime'
                  ? t('hack.tagAnime')
                  : tpl.motion === 'calm'
                    ? t('hack.tagCalm')
                    : t('hack.tagPlain')}
              </span>
              {tpl.freezeFromHours > 0 && (
                <span className="hack-tag">
                  <Snowflake size={9} /> {interp(t('hack.tagFreeze'), { h: String(tpl.freezeFromHours) })}
                </span>
              )}
              {tpl.wipPushMinutes > 0 && (
                <span className="hack-tag">{interp(t('hack.tagWip'), { m: String(tpl.wipPushMinutes) })}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="settings-grid">
        <label className="settings-field">
          <span className="settings-field-label">{t('hack.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={templateName(template, t)} />
        </label>
        <label className="settings-field">
          <span className="settings-field-label">{t('hack.me')}</span>
          <input value={me} onChange={(e) => setMe(e.target.value)} placeholder="@you" />
          <span className="settings-hint">{t('hack.meHint')}</span>
        </label>
      </div>

      <h4 className="settings-section-title">
        {t('hack.repos')}
        {activeWorkspace && workspaces.length > 1 && (
          <span className="hack-ws-chip" title={t('hack.workspaceHint')}>
            <Layers size={11} /> {activeWorkspace.name}
          </span>
        )}
      </h4>
      {workspaces.length > 1 && <p className="settings-hint">{t('hack.workspaceHint')}</p>}

      <div className="hack-sections">
        {available.length === 0 && <p className="settings-hint">{t('hack.noRepos')}</p>}
        {sections.map((section) => {
          const all = section.repos.every((r) => picked.has(r.path))
          const some = !all && section.repos.some((r) => picked.has(r.path))
          return (
            <div key={section.id} className={`hack-section ${all ? 'all' : some ? 'some' : ''}`}>
              <button
                className="hack-section-head"
                onClick={() =>
                  setPicked((prev) => {
                    const next = new Set(prev)
                    for (const r of section.repos) {
                      if (all) next.delete(r.path)
                      else next.add(r.path)
                    }
                    return next
                  })
                }
              >
                {section.kind === 'group' ? <Layers size={12} /> : <FolderGit2 size={12} />}
                <strong>{section.kind === 'group' ? section.name : t('hack.looseRepos')}</strong>
                <span className="hack-section-count">
                  {section.repos.filter((r) => picked.has(r.path)).length}/{section.repos.length}
                </span>
                <span className="hack-section-toggle">{all ? t('hack.none') : t('hack.all')}</span>
              </button>
              <div className="hack-section-body">
                {section.repos.map((r) => (
                  <label key={r.path} className={`hack-repo-row ${picked.has(r.path) ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={picked.has(r.path)}
                      onChange={(e) =>
                        setPicked((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(r.path)
                          else next.delete(r.path)
                          return next
                        })
                      }
                    />
                    <span className="hack-repo-name">{r.name}</span>
                    <span className="settings-hint">{r.path}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <h4 className="settings-section-title">
        {t('hack.rolesTitle')}
        <button className="btn ghost small" disabled={detecting} onClick={() => void detect([...picked])}>
          {detecting ? <Loader2 size={12} className="spin" /> : <Radar size={12} />} {t('hack.redetect')}
        </button>
        <button className="btn ghost small" disabled={aiBusy} onClick={() => void askAI()}>
          {aiBusy ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} {t('hack.aiPropose')}
        </button>
      </h4>
      <p className="settings-hint">{t('hack.rolesHint')}</p>

      <div className="hack-role-list">
        {roles.length === 0 && !detecting && <p className="settings-hint">{t('hack.noRoles')}</p>}
        {roles.map((role, i) => (
          <div key={role.path} className="hack-role">
            <div className="hack-role-head">
              <input
                className="hack-role-label"
                value={role.label}
                onChange={(e) =>
                  setRoles((prev) => prev.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))
                }
              />
              <span className="settings-hint">{role.path}</span>
              <button
                className="btn ghost small"
                title={t('hack.removeRole')}
                onClick={() => setRoles((prev) => prev.filter((_, j) => j !== i))}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <textarea
              rows={Math.min(5, Math.max(2, role.contracts.length + 1))}
              value={role.contracts.join('\n')}
              onChange={(e) =>
                setRoles((prev) =>
                  prev.map((r, j) =>
                    j === i
                      ? { ...r, contracts: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) }
                      : r
                  )
                )
              }
            />
          </div>
        ))}
        <button
          className="btn ghost small"
          onClick={() =>
            setRoles((prev) => [...prev, { path: [...picked][0] ?? '', label: 'repo', contracts: [] }])
          }
        >
          <Plus size={12} /> {t('hack.addRole')}
        </button>
      </div>

      <div className="hack-modal-actions">
        <button className="btn ghost" onClick={() => void importSession()}>
          <Download size={13} /> {t('hack.import')}
        </button>
        <button className="btn primary" onClick={() => void start()}>
          <Play size={13} /> {t('hack.start')}
        </button>
      </div>

      <p className="settings-hint hack-modal-foot">
        <Snowflake size={11} /> {t('hack.createFoot')}
      </p>
    </div>
  )
}
