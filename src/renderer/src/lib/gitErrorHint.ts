import type { TranslationKey } from '../i18n'

/**
 * Turn a raw git / host error into what it means and what to do about it.
 *
 * Errors reach a toast verbatim — git's English, wrapped in Electron's
 * "Error invoking remote method 'git': Error:" — which leaves the reader to
 * decode it, usually in a terminal. The common, well-understood ones get a
 * translated explanation with the next step; the raw text stays available as
 * the toast's details, and is still what "copy" and "report issue" use.
 *
 * Returns a dictionary key plus its values, never a string: the caller renders
 * it in the current language, and the matching stays testable on stable keys.
 * Null when nothing here recognises the error — the raw text is then shown.
 *
 * Not covered on purpose, because a dialog already handles them: a push
 * rejected as non-fast-forward (offers pull-and-retry) and a stale `.lock`
 * file (offers to remove it).
 */
export interface GitErrorHint {
  key: TranslationKey
  vars?: Record<string, string>
}

interface Rule {
  test: RegExp
  hint: (m: RegExpMatchArray) => GitErrorHint
}

const RULES: Rule[] = [
  {
    // GitHub refuses workflow edits from a credential without the workflow scope.
    // Which kind of credential it names decides the fix.
    test: /refusing to allow an? (OAuth App|Personal Access Token|GitHub App)[^`]*`([^`]+)` without `?workflow`? (?:scope|permission)/i,
    hint: (m) => ({
      key: /personal access token/i.test(m[1]) ? 'gitError.workflowScopeToken' : 'gitError.workflowScopeOAuth',
      vars: { file: m[2] }
    })
  },
  {
    test: /GH001: Large files detected|exceeds GitHub's file size limit/i,
    hint: (m) => {
      const file = /File (\S+) is [\d.]+ ?MB/i.exec(m.input ?? '')?.[1]
      return file ? { key: 'gitError.fileTooLarge', vars: { file } } : { key: 'gitError.fileTooLargeAny' }
    }
  },
  {
    test: /GH006: Protected branch update failed|protected branch hook declined|pre-receive hook declined.*protected/i,
    hint: () => ({ key: 'gitError.protectedBranch' })
  },
  {
    test: /could not read (?:Username|Password) for '([^']+)'|Authentication failed for '([^']+)'/i,
    hint: (m) => ({ key: 'gitError.noCredential', vars: { host: hostOf(m[1] ?? m[2] ?? '') } })
  },
  {
    test: /Permission to \S+ denied to|The requested URL returned error: 403/i,
    hint: () => ({ key: 'gitError.permissionDenied' })
  },
  {
    test: /remote: Repository not found|repository '[^']+' not found/i,
    hint: () => ({ key: 'gitError.repoNotFound' })
  },
  {
    test: /Permission denied \(publickey/i,
    hint: () => ({ key: 'gitError.sshKey' })
  }
]

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** Electron wraps every error thrown by a main-process handler in this prefix. */
const IPC_PREFIX = /^Error invoking remote method '[^']*': (?:\w*Error: )?/

/** The error without Electron's IPC wrapper — what the reader actually needs. */
export function withoutIpcPrefix(message: string): string {
  return message.replace(IPC_PREFIX, '')
}

export function explainGitError(message: string): GitErrorHint | null {
  for (const rule of RULES) {
    const m = rule.test.exec(message)
    if (m) return rule.hint(m)
  }
  return null
}
