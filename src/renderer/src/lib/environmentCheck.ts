import type { EnvCheck, EnvCheckId } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

const NAMES: Record<EnvCheckId, TranslationKey> = {
  git: 'env.name.git',
  lfs: 'env.name.lfs',
  terminal: 'env.name.terminal',
  credentialHelper: 'env.name.credentialHelper',
  gh: 'env.name.gh',
  inotify: 'env.name.inotify'
}

export function envCheckNameKey(id: EnvCheckId): TranslationKey {
  return NAMES[id]
}

/** The sentence under a row. A status a check never reports falls back to the ok text. */
export function envCheckDetailKey(c: EnvCheck): TranslationKey {
  switch (c.id) {
    case 'git':
      return c.status === 'fail' ? 'env.git.fail' : c.status === 'warn' ? 'env.git.warn' : 'env.git.ok'
    case 'lfs':
      return c.status === 'ok' ? 'env.lfs.ok' : 'env.lfs.warn'
    case 'terminal':
      return c.status === 'ok' ? 'env.terminal.ok' : 'env.terminal.warn'
    case 'credentialHelper':
      // Two different warnings: no helper at all, or the plain-text one.
      if (c.status === 'ok') return c.perHost ? 'env.credentialHelper.perHost' : 'env.credentialHelper.ok'
      return c.actual === 'store' ? 'env.credentialHelper.plain' : 'env.credentialHelper.none'
    case 'gh':
      return c.status === 'ok' ? 'env.gh.ok' : 'env.gh.warn'
    case 'inotify':
      return c.status === 'ok' ? 'env.inotify.ok' : 'env.inotify.warn'
  }
}
