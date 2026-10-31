import type { TranslationKey } from '../i18n'

/** The palette group tabs, folders and repository sections choose from. */
export const GROUP_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#06b6d4'
]

const NAME_KEYS: Record<string, TranslationKey> = {
  '#6366f1': 'color.indigo',
  '#ec4899': 'color.pink',
  '#f59e0b': 'color.amber',
  '#10b981': 'color.green',
  '#3b82f6': 'color.blue',
  '#8b5cf6': 'color.violet',
  '#ef4444': 'color.red',
  '#14b8a6': 'color.teal',
  '#f97316': 'color.orange',
  '#06b6d4': 'color.cyan'
}

/** The dictionary key naming a palette colour, or null for a custom one. */
export function colorNameKey(color: string): TranslationKey | null {
  return NAME_KEYS[color.toLowerCase()] ?? null
}

/**
 * A colour for a new group: one no open group wears yet, picked at random so
 * the first group is not always the same one. Once all are taken, any will do.
 */
export function pickGroupColor(used: readonly (string | undefined)[], random: () => number = Math.random): string {
  const taken = new Set(used.filter(Boolean).map((c) => c!.toLowerCase()))
  const free = GROUP_COLORS.filter((c) => !taken.has(c))
  const pool = free.length > 0 ? free : GROUP_COLORS
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}
