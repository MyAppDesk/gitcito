import { CheckCircle2, XCircle, Clock, MinusCircle } from 'lucide-react'
import type { CiState } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

/** What each rolled-up check state is called. */
export const CI_STATE_KEY: Record<CiState, TranslationKey> = {
  success: 'graph.ciSuccess',
  failure: 'graph.ciFailure',
  pending: 'graph.ciPending',
  neutral: 'graph.ciNeutral'
}

/**
 * The one glyph for a check state, shared by the graph's CI badge and the
 * pull-request rows — a green tick in one place and a green dot in another
 * would be two vocabularies for the same fact.
 */
export function ciIcon(state: CiState, size: number, cls = ''): React.JSX.Element {
  if (state === 'success') return <CheckCircle2 size={size} className={`${cls} ci-success`} />
  if (state === 'failure') return <XCircle size={size} className={`${cls} ci-failure`} />
  if (state === 'pending') return <Clock size={size} className={`${cls} ci-pending ci-pulse`} />
  return <MinusCircle size={size} className={`${cls} ci-neutral`} />
}
