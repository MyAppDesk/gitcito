import { FILE_TOO_LARGE_PREFIX } from '../../../shared/types'

/** Byte count from a FILE_TOO_LARGE refusal, or null when it's another error.
 *  IPC wraps thrown errors ("Error invoking remote handler…"), so this scans
 *  for the marker anywhere in the message rather than matching the prefix. */
export function parseTooLargeError(message: string): number | null {
  const i = message.indexOf(FILE_TOO_LARGE_PREFIX)
  if (i < 0) return null
  const n = parseInt(message.slice(i + FILE_TOO_LARGE_PREFIX.length), 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Human-readable byte size, e.g. 7.3 MB. */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}
