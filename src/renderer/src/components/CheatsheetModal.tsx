import { useEffect, useMemo, useState } from 'react'
import { Keyboard, RotateCcw } from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import {
  SHORTCUTS,
  FIXED_SHORTCUTS,
  effectiveBindings,
  formatCombo,
  comboFromEvent,
  isReservedCombo,
  type ShortcutDef
} from '../lib/shortcuts'
import { useT, interp, type TranslationKey } from '../i18n'

export function CheatsheetModal(): React.JSX.Element {
  const t = useT()
  return (
    <div className="cheatsheet">
      <h3>
        <Keyboard size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('cheat.title')}
      </h3>
      <ShortcutEditor />
    </div>
  )
}

/** The shortcut list + rebinding UI, reused by the cheatsheet modal and the
 *  Settings → Shortcuts tab. */
export function ShortcutEditor(): React.JSX.Element {
  const t = useT()
  const custom = useSettingsStore((s) => s.settings.shortcuts)
  const update = useSettingsStore((s) => s.update)
  const toast = useUIStore((s) => s.toast)
  const [capturing, setCapturing] = useState<string | null>(null)

  const bindings = useMemo(() => effectiveBindings(custom), [custom])

  // While capturing, the next non-modifier keypress becomes the new binding.
  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setCapturing(null)
        return
      }
      const combo = comboFromEvent(e)
      if (!combo) return // modifier only — keep waiting
      // Require at least one modifier so a bare letter can't shadow typing.
      if (!/(^|\+)(mod|alt)(\+|$)/.test(combo)) {
        toast('info', t('cheat.needModifier'))
        return
      }
      // Fixed shortcuts win before the registry is consulted, so accepting one
      // here would leave a binding that looks set but never fires.
      if (isReservedCombo(combo)) {
        toast('info', interp(t('cheat.reservedCombo'), { combo: formatCombo(combo) }))
        return
      }
      const clash = Object.entries(bindings).find(([id, c]) => c === combo && id !== capturing)
      update((s) => {
        const next = { ...s.shortcuts, [capturing]: combo }
        if (clash) delete next[clash[0]] // freed; falls back to its default
        return { ...s, shortcuts: next }
      })
      if (clash) {
        const clashKey = SHORTCUTS.find((x) => x.id === clash[0])?.labelKey
        toast('info', `${clashKey ? t(clashKey) : ''} — ${t('cheat.resetMsg')}`)
      }
      setCapturing(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturing, bindings, update, toast])

  const reset = (id: string): void =>
    update((s) => {
      const next = { ...s.shortcuts }
      delete next[id]
      return { ...s, shortcuts: next }
    })

  const isCustom = (id: string): boolean => !!custom?.[id]

  const row = (def: ShortcutDef): React.JSX.Element => (
    <div className="cheat-row" key={def.id}>
      <span className="cheat-label">{t(def.labelKey)}</span>
      {capturing === def.id ? (
        <span className="cheat-capturing">{t('cheat.pressKeys')}</span>
      ) : (
        <kbd className="cheat-key" onClick={() => setCapturing(def.id)} title={t('cheat.clickRebind')}>
          {formatCombo(bindings[def.id])}
        </kbd>
      )}
      <button
        className="cheat-reset"
        title={t('cheat.resetDefault')}
        disabled={!isCustom(def.id)}
        onClick={() => reset(def.id)}
      >
        <RotateCcw size={13} />
      </button>
    </div>
  )

  // Group the fixed (reference) shortcuts by category key.
  const fixedByCat = FIXED_SHORTCUTS.reduce<Record<string, typeof FIXED_SHORTCUTS>>((acc, s) => {
    ;(acc[s.categoryKey] ??= []).push(s)
    return acc
  }, {})

  return (
    <>
      <p className="settings-hint">{t('cheat.hint')}</p>

      <div className="cheat-section">
        <h4>{t('cheat.customizable')}</h4>
        {SHORTCUTS.map(row)}
      </div>

      {Object.entries(fixedByCat).map(([cat, items]) => (
        <div className="cheat-section" key={cat}>
          <h4>{t(cat as TranslationKey)}</h4>
          {items.map((s) => (
            <div className="cheat-row" key={s.labelKey}>
              <span className="cheat-label">{t(s.labelKey)}</span>
              <kbd className="cheat-key fixed">{formatCombo(s.combo)}</kbd>
              <span className="cheat-reset" />
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
