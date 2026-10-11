const ISSUES_NEW_URL = 'https://github.com/MyAppDesk/gitcito/issues/new'

/** Electron wraps every error thrown by a main-process handler in this prefix. */
const IPC_PREFIX = /^Error invoking remote method '[^']*': (?:\w*Error: )?/

/** The title for a reported error: its first line, without the IPC wrapper that
 *  would otherwise use up the room before the actual problem. */
export function issueTitle(message: string): string {
  const firstLine = message.split('\n')[0].replace(IPC_PREFIX, '').trim()
  return firstLine.length > 120 ? `${firstLine.slice(0, 119)}…` : firstLine
}

/** Pre-fills a GitHub issue with the failing error message, so a bug report
 *  takes one click instead of the user retyping what they just saw. The body
 *  keeps the whole message, wrapper included — it names the failing call. */
export function reportIssueUrl(message: string): string {
  const body = `**Error**\n\n\`\`\`\n${message}\n\`\`\`\n`
  const params = new URLSearchParams({ title: issueTitle(message), body })
  return `${ISSUES_NEW_URL}?${params.toString()}`
}
