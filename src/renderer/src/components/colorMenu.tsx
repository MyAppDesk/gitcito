import { Palette } from 'lucide-react'
import { t } from '../i18n'
import { useUIStore, type MenuItem } from '../stores/ui'
import { GROUP_COLORS, colorNameKey } from '../lib/groupColors'

/** A colour's name for its tooltip; a custom colour is named by its hex. */
export function colorName(color: string): string {
  const key = colorNameKey(color)
  return key ? t(key) : color
}

/**
 * The palette as a row of dots right in the menu, plus "Custom Color…" for
 * anything else — the only part that still needs a dialog. Shared by group
 * tabs, their folders and repository sections.
 */
export function colorMenuItems(current: string | undefined, onPick: (color: string) => void): MenuItem[] {
  return [
    {
      swatches: { colors: GROUP_COLORS, current, label: t('modal.groupColor'), nameOf: colorName, onPick }
    },
    {
      label: t('titlebar.customColor'),
      icon: <Palette size={15} />,
      onClick: () => useUIStore.getState().openModal({ kind: 'group-color', current, onSelect: onPick })
    }
  ]
}
