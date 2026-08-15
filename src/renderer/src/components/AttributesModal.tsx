import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileCog, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import type { AttributeCheck, AttributeFile, DiffDriverInfo, DiffDriverSuggestion } from '../../../shared/types'
import {
  ATTR_PRESETS,
  formatAttr,
  parseAttributes,
  removeRule,
  upsertRule,
  type Attr
} from '../lib/gitattributes'
import { useT, interp } from '../i18n'

/** Parse what someone typed into the attributes box back into tokens. */
function parseInput(text: string): Attr[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (token.startsWith('-')) return { name: token.slice(1), value: false as const }
      if (token.startsWith('!')) return { name: token.slice(1), value: null }
      const eq = token.indexOf('=')
      return eq === -1
        ? { name: token, value: true as const }
        : { name: token.slice(0, eq), value: token.slice(eq + 1) }
    })
}

/**
 * `.gitattributes`, with a UI.
 *
 * The least-known high-value file in git: it is how a repository teaches git
 * about its own contents — which files are binary, which should concatenate
 * rather than conflict, which never leave in an archive, what line endings are.
 * It travels with the clone, so one person fixing it fixes it for everyone.
 */
export function AttributesModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const [files, setFiles] = useState<AttributeFile[]>([])
  const [active, setActive] = useState('.gitattributes')
  const [drivers, setDrivers] = useState<DiffDriverInfo[]>([])
  const [suggestions, setSuggestions] = useState<DiffDriverSuggestion[]>([])
  const [pattern, setPattern] = useState('')
  const [attrText, setAttrText] = useState('')
  const [probe, setProbe] = useState('')
  const [checked, setChecked] = useState<AttributeCheck | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    const [found, configured, offered] = await Promise.all([
      gitApi.attributeFiles(repoPath).catch(() => [] as AttributeFile[]),
      gitApi.diffDrivers(repoPath).catch(() => [] as DiffDriverInfo[]),
      gitApi.diffDriverSuggestions(repoPath).catch(() => [] as DiffDriverSuggestion[])
    ])
    setFiles(found)
    setDrivers(configured)
    setSuggestions(offered)
  }, [repoPath])

  useEffect(() => {
    void load()
  }, [load])

  const current = files.find((f) => f.path === active) ?? { path: active, content: '', local: false }
  const rules = useMemo(() => parseAttributes(current.content), [current.content])

  const save = async (content: string): Promise<void> => {
    setBusy(true)
    try {
      await repoActions.attributeWrite(repoPath, current.path, content, current.content)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const add = (): void => {
    if (!pattern.trim() || !attrText.trim()) return
    void save(upsertRule(current.content, pattern.trim(), parseInput(attrText)))
    setPattern('')
    setAttrText('')
  }

  const drop = (rulePattern: string): void =>
    openModal({
      kind: 'confirm',
      danger: true,
      title: t('attrs.removeTitle'),
      message: interp(t('attrs.removeMessage'), { pattern: rulePattern }),
      confirmLabel: t('attrs.remove'),
      onConfirm: () => void save(removeRule(current.content, rulePattern))
    })

  const check = (): void => {
    if (!probe.trim()) return
    void gitApi
      .checkAttributes(repoPath, [probe.trim()])
      .then((results) => setChecked(results[0] ?? null))
      .catch(() => setChecked(null))
  }

  return (
    <div className="attrs-modal">
      <h3>
        <FileCog size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('attrs.title')}
      </h3>
      <p className="settings-hint">{t('attrs.intro')}</p>

      {files.length > 1 && (
        <div className="attrs-files">
          {files.map((file) => (
            <button
              key={file.path}
              className={`btn ${file.path === active ? 'primary' : 'ghost'} small`}
              onClick={() => setActive(file.path)}
            >
              {file.path}
            </button>
          ))}
        </div>
      )}
      {current.local && <p className="attrs-local">{t('attrs.localFile')}</p>}

      <div className="attrs-rules">
        {rules.length === 0 ? (
          <p className="settings-hint">{t('attrs.none')}</p>
        ) : (
          rules.map((rule) => (
            <div key={rule.pattern} className="attrs-row">
              <code className="attrs-pattern">{rule.pattern}</code>
              <span className="attrs-attrs">{rule.attrs.map(formatAttr).join(' ')}</span>
              <button
                className="icon-btn tiny"
                title={t('attrs.remove')}
                disabled={busy}
                onClick={() => drop(rule.pattern)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="attrs-presets">
        {ATTR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className="btn ghost tiny"
            title={preset.attrs.map(formatAttr).join(' ')}
            onClick={() => {
              setPattern(preset.pattern)
              setAttrText(preset.attrs.map(formatAttr).join(' '))
            }}
          >
            {t(`attrs.preset.${preset.id}` as 'attrs.preset.union')}
          </button>
        ))}
      </div>

      <div className="attrs-add">
        <input
          className="modal-input attrs-pattern-input"
          value={pattern}
          spellCheck={false}
          placeholder="*.md" // i18n-ignore a glob pattern, not prose
          onChange={(e) => setPattern(e.target.value)}
        />
        <input
          className="modal-input"
          value={attrText}
          spellCheck={false}
          placeholder="merge=union" // i18n-ignore a git attribute, not prose
          onChange={(e) => setAttrText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button className="btn primary small" disabled={busy || !pattern.trim() || !attrText.trim()} onClick={add}>
          <Plus size={13} /> {t('attrs.add')}
        </button>
      </div>

      <div className="attrs-section">
        <div className="attrs-section-head">
          <Search size={13} /> {t('attrs.checkTitle')}
        </div>
        <p className="settings-hint">{t('attrs.checkHint')}</p>
        <div className="attrs-add">
          <input
            className="modal-input"
            value={probe}
            spellCheck={false}
            placeholder="src/app.ts" // i18n-ignore a file path, not prose
            onChange={(e) => setProbe(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') check()
            }}
          />
          <button className="btn ghost small" disabled={!probe.trim()} onClick={check}>
            {t('attrs.check')}
          </button>
        </div>
        {checked && (
          <div className="attrs-check">
            {Object.entries(checked.attrs).filter(([, value]) => value !== 'unspecified').length === 0 ? (
              <span className="settings-hint">{t('attrs.checkNothing')}</span>
            ) : (
              Object.entries(checked.attrs)
                .filter(([, value]) => value !== 'unspecified')
                .map(([name, value]) => (
                  <code key={name}>
                    {name}: {value}
                  </code>
                ))
            )}
          </div>
        )}
      </div>

      <div className="attrs-section">
        <div className="attrs-section-head">
          <Wrench size={13} /> {t('attrs.driversTitle')}
        </div>
        <p className="settings-hint">{t('attrs.driversHint')}</p>
        {drivers.map((driver) => (
          <div key={`${driver.scope}:${driver.name}`} className="attrs-driver">
            <code>diff={driver.name}</code>
            <span className="attrs-driver-cmd" title={driver.textconv}>
              {driver.textconv}
            </span>
            {!driver.available && (
              <span className="attrs-missing">
                <AlertTriangle size={11} /> {t('attrs.driverMissing')}
              </span>
            )}
          </div>
        ))}
        <div className="attrs-presets">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.name}
              className="btn ghost tiny"
              disabled={busy || !suggestion.available}
              title={
                suggestion.available
                  ? suggestion.textconv
                  : interp(t('attrs.needsBinary'), { binary: suggestion.binary })
              }
              onClick={() => {
                void repoActions
                  .setDiffDriver(repoPath, suggestion.name, suggestion.textconv, false)
                  .then(() => {
                    // A driver nothing points at does nothing — write the rules too.
                    let content = current.content
                    for (const glob of suggestion.patterns) {
                      content = upsertRule(content, glob, [{ name: 'diff', value: suggestion.name }])
                    }
                    return save(content)
                  })
              }}
            >
              {suggestion.patterns.join(' ')} → diff={suggestion.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
