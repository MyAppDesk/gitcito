import type { WebContents } from 'electron'

/** Flush immediately once the pending buffer reaches this size — keeps any
 *  single IPC message bounded even under an output flood. */
const FLUSH_BYTES = 64 * 1024
/** How long a sub-threshold buffer may sit before it is sent anyway. Shorter
 *  than a frame (16ms) so interactive echo still feels immediate; long enough
 *  that a repaint burst (PSReadLine/posh) collapses into one message. */
const FLUSH_MS = 8

/**
 * Coalesces pty output into batched IPC messages.
 *
 * node-pty delivers ConPTY reads as individual chunks, and each used to be a
 * separate `wc.send` — under a repaint storm (PSReadLine echo, oh-my-posh
 * prompts, build output) that is hundreds of IPC dispatches per second, each
 * a full renderer event-loop turn ending in one xterm write. Batching turns
 * the same bytes into a handful of messages.
 */
export function makeBatchedSender(
  wc: WebContents,
  channel: string
): { push(data: string): void; flush(): void; dispose(): void } {
  let pending = ''
  let timer: NodeJS.Timeout | null = null

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pending) return
    const data = pending
    pending = ''
    if (!wc.isDestroyed()) wc.send(channel, data)
  }

  return {
    push(data: string): void {
      pending += data
      if (pending.length >= FLUSH_BYTES) {
        flush()
        return
      }
      if (!timer) timer = setTimeout(flush, FLUSH_MS)
    },
    flush,
    dispose(): void {
      flush()
    }
  }
}
