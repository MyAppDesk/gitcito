import { withoutIpcPrefix } from './gitErrorHint'

const ISSUES_NEW_URL = 'https://github.com/MyAppDesk/gitcito/issues/new'

/** Hosts anyone can see: naming them in a report gives nothing away. */
const PUBLIC_HOSTS = new Set([
  'github.com',
  'api.github.com',
  'gitlab.com',
  'bitbucket.org',
  'api.bitbucket.org',
  'dev.azure.com',
  'api.openai.com',
  'api.anthropic.com',
  'api.groq.com',
  'api.mistral.ai',
  'generativelanguage.googleapis.com'
])

/** Token shapes the hosts and AI providers issue — replaced wherever they appear. */
const TOKENS: RegExp[] = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{16,}\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  // A credential after its scheme word has a digit somewhere; prose such as
  // "a token authentication" does not, and git's hint stays readable.
  /\b(Bearer|Basic|token)\s+(?=[A-Za-z._~+/=-]*\d)[A-Za-z0-9._~+/=-]{12,}/gi
]

/**
 * What an error message may carry that is not the reader's business: a
 * credential in a URL, a token, the home folder (and so the user name), a
 * private server, its repositories, an e-mail or a LAN address. Opening the
 * pre-filled issue already sends the text to GitHub in the URL — before the
 * user decides to post it — so it is stripped here, not left to them.
 */
export function redactForReport(text: string): string {
  let out = text
  // Credentials written into a URL, before anything else reads the URL.
  out = out.replace(/([a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, '$1')
  for (const re of TOKENS) out = out.replace(re, '<redacted>')
  // URLs: a public host stays (it helps the diagnosis), a private one does not;
  // the path names repositories and organisations either way.
  out = out.replace(/\b([a-z][a-z0-9+.-]*):\/\/([a-z0-9[][^/\s?#'"`<>)]*)([^\s'"`<>)]*)/gi, (_m, scheme: string, host: string, rest: string) => {
    const bare = host.toLowerCase().replace(/:\d+$/, '')
    const shownHost = PUBLIC_HOSTS.has(bare) ? host : '<host>'
    return `${scheme}://${shownHost}${rest && rest !== '/' ? '/…' : ''}`
  })
  // A host named outside a URL: git, curl and ssh say which one they could not
  // reach, and so does the refusal to send an AI key over http.
  out = out.replace(
    /\b(resolve host:?|resolve hostname|connect to host|Failed to connect to|send the API key to)(\s+)([a-z0-9][\w.-]*(?::\d+)?)/gi,
    (_m, lead: string, gap: string, host: string) =>
      `${lead}${gap}${PUBLIC_HOSTS.has(host.toLowerCase().replace(/:\d+$/, '')) ? host : '<host>'}`
  )
  // scp-style git remotes: git@host:owner/repo.git
  out = out.replace(/\b[\w.-]+@([\w.-]+):[\w./~-]+/g, (_m, host: string) =>
    PUBLIC_HOSTS.has(host.toLowerCase()) ? `git@${host}:…` : 'git@<host>:…'
  )
  // `git@` is the SSH user every host shares, not a person — and the remotes
  // above were already reduced to it.
  out = out.replace(/(?<![\w.+-])(?!git@)[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, '<email>')
  // The home folder names the user: keep the path from there on.
  out = out.replace(/\/home\/[^/\s'"]+/g, '~').replace(/\/Users\/[^/\s'"]+/g, '~')
  out = out.replace(/\b[A-Za-z]:\\Users\\[^\\\s'"]+/g, '~')
  out = out.replace(/\b(10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})\b/g, '<lan-ip>')
  return out
}

/** The title for a reported error: its first line, without the IPC wrapper that
 *  would otherwise use up the room before the actual problem. */
export function issueTitle(message: string): string {
  const firstLine = withoutIpcPrefix(redactForReport(message).split('\n')[0]).trim()
  return firstLine.length > 120 ? `${firstLine.slice(0, 119)}…` : firstLine
}

/** Pre-fills a GitHub issue with the failing error message, so a bug report
 *  takes one click instead of the user retyping what they just saw. The body
 *  keeps the whole message, wrapper included — it names the failing call —
 *  with private details removed first (see redactForReport). */
export function reportIssueUrl(message: string): string {
  const body = `**Error**\n\n\`\`\`\n${redactForReport(message)}\n\`\`\`\n`
  const params = new URLSearchParams({ title: issueTitle(message), body })
  return `${ISSUES_NEW_URL}?${params.toString()}`
}
