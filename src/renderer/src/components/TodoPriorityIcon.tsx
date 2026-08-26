import { SignalHigh, SignalLow, SignalMedium } from 'lucide-react'
import type { TodoPriority } from '../../../shared/types'
import { useT, type TranslationKey } from '../i18n'

/** One glyph per priority, read as signal bars: more bars, louder todo. Bars
 *  rather than arrows on purpose — an arrow next to a reorderable row reads as
 *  "move me", and the level still survives a greyscale or colourblind view. */
const GLYPH: Record<TodoPriority, typeof SignalLow> = {
  low: SignalLow,
  normal: SignalMedium,
  high: SignalHigh
}

const LABEL: Record<TodoPriority, TranslationKey> = {
  low: 'todos.priorityLow',
  normal: 'todos.priorityNormal',
  high: 'todos.priorityHigh'
}

export function TodoPriorityIcon({
  priority,
  size = 13
}: {
  priority: TodoPriority
  size?: number
}): React.JSX.Element {
  const t = useT()
  const Icon = GLYPH[priority]
  const label = t(LABEL[priority])
  return <Icon className={`todo-prio-icon ${priority}`} size={size} aria-label={label}>
    <title>{label}</title>
  </Icon>
}
