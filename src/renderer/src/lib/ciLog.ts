/** The end of a CI log, where a failure is: at most `maxLines`, and how many were left out. */
export function logTail(text: string, maxLines = 3000): { text: string; dropped: number } {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
  if (lines.length <= maxLines) return { text: lines.join('\n'), dropped: 0 }
  return { text: lines.slice(-maxLines).join('\n'), dropped: lines.length - maxLines }
}
