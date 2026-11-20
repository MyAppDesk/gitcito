/**
 * Keep a vanished reader of the main process's stdout/stderr from crashing it.
 *
 * The app keeps running when whoever read its output goes away: the terminal
 * that ran `npm run dev` is closed, `electron-vite -w` restarts and leaves the
 * old pipe behind, a launcher discards its end. The next write — and Electron
 * writes one itself, `console.error` for every IPC handler that throws, such as
 * a merge that stops on a conflict — fails with EPIPE. A stream error nobody
 * listens for is an uncaught exception, so a failed merge surfaced as "A
 * JavaScript error occurred in the main process" instead of its own message.
 *
 * Only the "nobody is reading any more" errors are swallowed; anything else
 * still throws, so a genuine problem is not hidden behind the log.
 */
const READER_GONE = new Set(['EPIPE', 'EIO', 'ERR_STREAM_DESTROYED'])

/** Something we can attach an `error` listener to — a process stream, or a stand-in in tests. */
interface ErrorEmitter {
  on(event: 'error', listener: (err: NodeJS.ErrnoException) => void): unknown
}

export function guardStdio(streams: ErrorEmitter[] = [process.stdout, process.stderr]): void {
  for (const stream of streams) {
    stream.on('error', (err) => {
      if (err && READER_GONE.has(err.code ?? '')) return
      // Not a closed reader: let it surface as it would have without us.
      process.nextTick(() => {
        throw err
      })
    })
  }
}
