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
  type ShortcutDef
} from '../lib/shortcuts'

export function CheatsheetModal(): React.JSX.Element {
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
        toast('info', 'Use a modifier (⌘/Ctrl or ⌥) in the shortcut.')
        return
      }
      const clash = Object.entries(bindings).find(([id, c]) => c === combo && id !== capturing)
      update((s) => {
        const next = { ...s.shortcuts, [capturing]: combo }
        if (clash) delete next[clash[0]] // freed; falls back to its default
        return { ...s, shortcuts: next }
      })
      if (clash) toast('info', `Reassigned — ${SHORTCUTS.find((x) => x.id === clash[0])?.label} reset to default.`)
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
      <span className="cheat-label">{def.label}</span>
      {capturing === def.id ? (
        <span className="cheat-capturing">Press keys… (Esc to cancel)</span>
      ) : (
        <kbd className="cheat-key" onClick={() => setCapturing(def.id)} title="Click to rebind">
          {formatCombo(bindings[def.id])}
        </kbd>
      )}
      <button
        className="cheat-reset"
        title="Reset to default"
        disabled={!isCustom(def.id)}
        onClick={() => reset(def.id)}
      >
        <RotateCcw size={13} />
      </button>
    </div>
  )

  // Group the fixed (reference) shortcuts by category.
  const fixedByCat = FIXED_SHORTCUTS.reduce<Record<string, typeof FIXED_SHORTCUTS>>((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="cheatsheet">
      <h3>
        <Keyboard size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Keyboard shortcuts
      </h3>
      <p className="settings-hint">Click a shortcut to rebind it. Customizations are saved per machine.</p>

      <div className="cheat-section">
        <h4>Customizable</h4>
        {SHORTCUTS.map(row)}
      </div>

      {Object.entries(fixedByCat).map(([cat, items]) => (
        <div className="cheat-section" key={cat}>
          <h4>{cat}</h4>
          {items.map((s) => (
            <div className="cheat-row" key={s.label}>
              <span className="cheat-label">{s.label}</span>
              <kbd className="cheat-key fixed">{formatCombo(s.combo)}</kbd>
              <span className="cheat-reset" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
