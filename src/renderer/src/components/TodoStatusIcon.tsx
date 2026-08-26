import { Ban, Circle, CircleCheckBig, CirclePlay, FlaskConical } from 'lucide-react'
import type { TodoStatus } from '../../../shared/types'
import { useT, type TranslationKey } from '../i18n'

/** One glyph per board column. The column a todo is in is the first thing the
 *  sidebar has to say about it, so it gets a shape, not only a colour. */
const GLYPH: Record<TodoStatus, typeof Circle> = {
  todo: Circle,
  progress: CirclePlay,
  blocked: Ban,
  qa: FlaskConical,
  done: CircleCheckBig
}

export const TODO_STATUS_LABEL: Record<TodoStatus, TranslationKey> = {
  todo: 'todos.statusTodo',
  progress: 'todos.statusProgress',
  blocked: 'todos.statusBlocked',
  qa: 'todos.statusQa',
  done: 'todos.statusDone'
}

export function TodoStatusIcon({
  status,
  size = 13
}: {
  status: TodoStatus
  size?: number
}): React.JSX.Element {
  const t = useT()
  const Icon = GLYPH[status]
  const label = t(TODO_STATUS_LABEL[status])
  return (
    <Icon className={`todo-status-icon ${status}`} size={size} aria-label={label}>
      <title>{label}</title>
    </Icon>
  )
}
