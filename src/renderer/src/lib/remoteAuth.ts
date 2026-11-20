import type { DoctorStatus, RemoteAuthCheck, RemoteAuthSource } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

export interface RemoteAuthFinding {
  status: DoctorStatus
  key: TranslationKey
  vars?: Record<string, string>
}

const SOURCE: Record<RemoteAuthSource, TranslationKey> = {
  token: 'remoteAuth.src.token',
  gh: 'remoteAuth.src.gh',
  git: 'remoteAuth.src.git',
  helper: 'remoteAuth.src.helper',
  embedded: 'remoteAuth.src.embedded',
  ssh: 'remoteAuth.src.ssh',
  none: 'remoteAuth.src.none'
}

/** "Signs in with …" — one full sentence per source, so word order stays the translator's. */
export function remoteAuthSourceKey(c: RemoteAuthCheck): TranslationKey {
  return SOURCE[c.source]
}

/**
 * What the check means, worst first. A refused or missing credential ends the
 * list: nothing after it matters until that is fixed.
 */
export function remoteAuthFindings(c: RemoteAuthCheck): RemoteAuthFinding[] {
  if (c.source === 'ssh') return [{ status: 'ok', key: 'remoteAuth.ssh' }]
  if (c.source === 'none') return [{ status: 'fail', key: 'remoteAuth.noCred' }]
  if (c.rejected) return [{ status: 'fail', key: 'remoteAuth.rejected' }]
  if (c.linkMissing) return [{ status: 'fail', key: 'remoteAuth.linkMissing', vars: { login: c.login ?? '' } }]

  const out: RemoteAuthFinding[] = []
  if (c.source === 'embedded') out.push({ status: 'warn', key: 'remoteAuth.embedded' })
  if (c.canPush === false) out.push({ status: 'fail', key: 'remoteAuth.noPush' })
  if (c.canPushWorkflows === false) out.push({ status: 'warn', key: 'remoteAuth.noWorkflow' })
  if (c.source === 'helper' && !c.provider) out.push({ status: 'ok', key: 'remoteAuth.otherHost' })
  if (out.some((f) => f.status !== 'ok')) return out

  if (c.canPush) out.unshift({ status: 'ok', key: 'remoteAuth.ok' })
  else if ((c.provider === 'github' || c.provider === 'gitlab') && !c.scopes) {
    out.unshift({ status: 'ok', key: 'remoteAuth.okUnknown' })
  }
  return out
}

/** The row's colour: its worst finding. */
export function remoteAuthStatus(c: RemoteAuthCheck): DoctorStatus {
  const f = remoteAuthFindings(c)
  return f.some((x) => x.status === 'fail') ? 'fail' : f.some((x) => x.status === 'warn') ? 'warn' : 'ok'
}
