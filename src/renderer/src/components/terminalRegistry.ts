import { Terminal, type IMarker } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { useTermTitlesStore } from '../stores/termTitles'

export interface TermHandle {
  term: Terminal
  fit: FitAddon
  container: HTMLDivElement
  ptyId: number | null
  // Scroll position snapshotted by the host component just before the
  // container leaves the DOM — the only moment viewportY is guaranteed to
  // reflect what the user actually saw. Consumed by the next fitSafely.
  suspendViewportY: number | null
  suspendAtBottom: boolean
  suspend(): void
  fitSafely(): void
  pasteText(text: string): void
  dispose(): void
}

// Persisted across React mounts / repo switches. xterm instance + PTY survive
// because the DOM container is moved in/out of the live tree, never destroyed.
const registry = new Map<string, TermHandle>()

const THEME = {
  background: '#0f1220',
  foreground: '#d6dbe8',
  cursor: '#6c5ce7',
  selectionBackground: '#2b3759',
  black: '#1c1f2b',
  blue: '#6c5ce7',
  green: '#00e6a8',
  red: '#ff5c7a',
  yellow: '#ff7a1a',
  magenta: '#00d4ff',
  cyan: '#00d4ff'
}

export function getOrCreateTerm(panelId: string, cwd: string, launchId?: number): TermHandle {
  const existing = registry.get(panelId)
  if (existing) return existing

  const container = document.createElement('div')
  container.className = 'terminal-host-inner'
  // Paint the container with the terminal bg so xterm's row-rounding leftover
  // never shows the app background — stays correct if THEME changes.
  container.style.background = THEME.background

  const term = new Terminal({
    fontFamily: 'SF Mono, JetBrains Mono, Menlo, monospace',
    fontSize: 12.5,
    cursorBlink: true,
    scrollback: 5000,
    theme: THEME
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  // Make http(s) URLs in the output clickable — open in the default browser.
  term.loadAddon(
    new WebLinksAddon((event, uri) => {
      event.preventDefault()
      void window.api.openExternal(uri)
    })
  )
  term.open(container)

  // Clipboard. xterm copies and pastes through DOM 'copy'/'paste' events,
  // which on Windows/Linux nothing ever emits — the frameless window carries
  // no Edit menu for the OS to route them through. Drive the same handlers
  // from the keyboard and the mouse instead.
  const copySelectionToClipboard = (): boolean => {
    if (!term.hasSelection()) return false
    void navigator.clipboard.writeText(term.getSelection())
    return true
  }
  const pasteFromClipboard = (): void => {
    void navigator.clipboard.readText().then(
      (text) => {
        if (!text || !term.element) return
        const data = new DataTransfer()
        data.setData('text/plain', text)
        // Route through xterm's own paste listener so multi-line text gets the
        // same sanitising and bracketed-paste treatment as an OS-level paste.
        term.element.dispatchEvent(
          new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
        )
      },
      () => undefined
    )
  }
  term.attachCustomKeyEventHandler((e) => {
    // Only the keys xterm itself scrolls the viewport with (Shift+PageUp/
    // PageDown) count as scroll intent. Marking on every keystroke — or on
    // selection keys — left the intent window open while the user typed, so
    // any coincidental trim/clamp event was recorded as a "user scroll" and
    // poisoned the anchor: the spontaneous auto-scrolls afterwards.
    if (e.type === 'keydown' && e.shiftKey && (e.code === 'PageUp' || e.code === 'PageDown')) {
      lastUserScrollAt = Date.now()
    }
    if (e.type !== 'keydown' || e.metaKey || e.altKey) return true
    if (e.ctrlKey && e.code === 'KeyC') {
      // Ctrl+Shift+C always copies; a bare Ctrl+C only steals the key while a
      // selection exists, so it keeps meaning SIGINT otherwise.
      if (e.shiftKey) {
        copySelectionToClipboard()
        return false
      }
      return !copySelectionToClipboard()
    }
    if (e.ctrlKey && e.code === 'KeyV') {
      // Ctrl+V pastes like everywhere else in the app (and VS Code's
      // terminal); Ctrl+Shift+V does the same for terminal purists.
      e.preventDefault()
      pasteFromClipboard()
      return false
    }
    if (e.code === 'Insert') {
      if (e.shiftKey && !e.ctrlKey) {
        // Chromium already binds Shift+Insert to a native paste — without
        // preventDefault the synthetic paste below lands on top of it and
        // every paste arrives twice.
        e.preventDefault()
        pasteFromClipboard()
        return false
      }
      if (e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        copySelectionToClipboard()
        return false
      }
    }
    return true
  })
  container.addEventListener('contextmenu', (e) => {
    // Windows Terminal style: right-click copies the selection, or pastes
    // when there is none.
    e.preventDefault()
    if (!copySelectionToClipboard()) pasteFromClipboard()
  })

  const isLaunch = launchId != null
  const cleanups: (() => void)[] = []

  // The anchor is the ONLY source of truth for where the user is reading. It
  // moves on exactly two inputs: a scroll event with a real gesture behind it
  // (within the lastUserScrollAt window), or output-following (y reaches
  // baseY). Every other scroll event — DOM scrollTop clamps during resize,
  // reflow corrections, scrollback trims, our own restores — carries no user
  // intent and must never touch it. buf.viewportY is explicitly NOT trusted:
  // xterm collapses it to 0 the moment the DOM offset is clamped, which is
  // precisely when an anchor is needed.
  //
  // A parked line is tracked by an xterm Marker, not the raw index: markers
  // follow the content through reflow wraps and scrollback trims on their
  // own, so a long-running command cannot drift the anchor out from under
  // the reader.
  type ScrollAnchor = { kind: 'bottom' } | { kind: 'line'; y: number }
  let anchor: ScrollAnchor = { kind: 'bottom' }
  let anchorMarker: IMarker | null = null
  let lastUserScrollAt = 0
  // Extended on every fitSafely. xterm maps ydisp proportionally to the DOM
  // scroll range (scrollTop / max * baseY), so a resize that shrinks the
  // range — a taller panel, or a wider one reflowing to fewer wrapped rows —
  // clamps scrollTop to the new max and fires a scroll event reading
  // exactly baseY. A fixed window after the last fit is not enough: a slow
  // drag spaces fits further apart than the window, and an in-between clamp
  // event then passes as a real output-follow and poisons the anchor to
  // 'bottom'. A rolling deadline stays open for the whole drag instead.
  let resizeQuietUntil = 0
  // Opt-in scroll forensics for the resize-autoscroll hunt: launch with
  // GITCITO_SCROLL_DEBUG=1 and every decision the listener makes is streamed
  // to userData/gitcito-scroll-debug.log (readable on packaged builds where
  // DevTools is unavailable) and kept in a ring dumpable from DevTools via
  // __termScrollLog() on dev builds. Off by default.
  const sdbg = ((): ((msg: string) => void) => {
    const on = !!window.api?.scrollDebug?.enabled
    const ring: string[] = []
    const g = window as unknown as { __termScrollLog?: () => string[] }
    const prev = g.__termScrollLog
    g.__termScrollLog = () => [...(prev?.() ?? []), ...ring]
    if (!on) return () => {}
    return (msg: string): void => {
      const line = `t+${Date.now() % 100000} [${panelId}] ${msg}`
      ring.push(line)
      if (ring.length > 400) ring.splice(0, ring.length - 400)
      window.api.scrollDebug.push(line)
    }
  })()
  const markUserScroll = (): void => {
    lastUserScrollAt = Date.now()
  }
  const parkAt = (y: number): void => {
    anchor = { kind: 'line', y }
    anchorMarker?.dispose()
    anchorMarker = null
    const buf = term.buffer.active
    // registerMarker anchors at the cursor's absolute line (baseY + cursorY)
    // plus an offset; the parked viewport line is absolute index y. Alternate
    // buffers have no scrollback — nothing worth marking.
    if (buf.type === 'normal') {
      try {
        anchorMarker = term.registerMarker(y - buf.baseY - buf.cursorY) ?? null
      } catch {
        anchorMarker = null // anchor.y still works; only reflow/trim tracking is lost
      }
    }
  }
  // If the DOM offset and the buffer disagree, the scroll delta xterm
  // computes from scrollTop is garbage — reconcile before its own handlers
  // (wheel deltas, scrollbar drags) can read the stale value. Safe to write:
  // the scroll event it triggers resolves to a ~0-line scrollLines.
  const reconcileScrollTop = (): void => {
    const vp = container.querySelector('.xterm-viewport')
    if (!(vp instanceof HTMLElement)) return
    const buf = term.buffer.active
    const max = vp.scrollHeight - vp.clientHeight
    if (max <= 0 || buf.baseY <= 0) return
    const expected = Math.round((buf.viewportY / buf.baseY) * max)
    // Only repair a STRUCTURAL collapse — an offset pinned to an edge while
    // the buffer sits elsewhere — never a mere disagreement. The compositor
    // applies each wheel tick before xterm's scroll event for it is
    // processed, so the DOM legitimately leads the buffer mid-gesture; a
    // "helpful" write then stomps the in-flight delta and snaps the viewport
    // back — the scrolls-down-jumps-up bug. A gesture delta is small and
    // mid-range; it can never look like stuck-at-edge.
    const collapsed =
      (vp.scrollTop <= 2 && expected > 10) || (vp.scrollTop >= max - 2 && expected < max - 10)
    if (collapsed) vp.scrollTop = expected
  }
  // Only reconcile at the START of a gesture. Mid-gesture the DOM scrollTop
  // legitimately leads the buffer — the browser has already applied the
  // user's tick but xterm's scroll event for it is still queued — and
  // "reconciling" then stomps the in-flight delta, which is exactly the
  // scroll-down-then-jumps-up race. A gap this long means nothing can be in
  // flight, so a disagreement there is a real collapse worth fixing.
  let lastGestureAt = 0
  const gestureStarted = (): boolean => {
    const now = Date.now()
    const fresh = now - lastGestureAt > 200
    lastGestureAt = now
    markUserScroll()
    return fresh
  }
  container.addEventListener(
    'wheel',
    () => {
      if (gestureStarted()) reconcileScrollTop()
    },
    true
  )
  // A scrollbar drag is a scroll gesture; a plain click (focus the pane,
  // place the cursor, start a selection) is not — but marking it as one
  // opened the intent window for coincidental trim/clamp events to poison
  // the anchor. Only the pointer landing on the viewport's own scrollbar
  // track (target === the scroll element itself, near its right edge) and
  // moves while that drag is held count.
  let scrollbarDrag = false
  const isScrollbarHit = (e: PointerEvent): boolean => {
    const vp = container.querySelector('.xterm-viewport')
    if (!(vp instanceof HTMLElement) || e.target !== vp) return false
    return e.clientX >= vp.getBoundingClientRect().right - 20
  }
  container.addEventListener(
    'pointerdown',
    (e) => {
      if (!isScrollbarHit(e)) return
      scrollbarDrag = true
      if (gestureStarted()) reconcileScrollTop()
    },
    true
  )
  container.addEventListener(
    'pointermove',
    (e) => {
      if (e.buttons === 0) {
        scrollbarDrag = false
        return
      }
      if (scrollbarDrag) {
        markUserScroll()
        return
      }
      // Drag-selecting near the viewport edge makes xterm auto-scroll — those
      // scroll events are real user intent (unmarking them would let
      // snap-back fight the selection). Anywhere else a held-button drag is
      // just text selection and must not open the intent window. Only an
      // actual in-progress selection counts: a splitter drag passing through
      // the edge zone with the button held selects nothing and would
      // otherwise mark every resize clamp event as a genuine scroll.
      const vp = container.querySelector('.xterm-viewport')
      if (!(vp instanceof HTMLElement) || !term.hasSelection()) return
      const r = vp.getBoundingClientRect()
      if (e.clientY < r.top + 30 || e.clientY > r.bottom - 30) markUserScroll()
    },
    true
  )
  // The rendered rows follow buffer.ydisp, but wheel/scrollbar deltas are
  // computed from the DOM scrollTop — and xterm only syncs scrollTop from
  // ydisp on a later animation frame. A scrollTop left behind at 0 (detach,
  // clamp) turns the user's first wheel tick into `amount = 0 - ydisp` and
  // the viewport jumps to the top while the content looked right. Write the
  // offset back synchronously: a scroll event from it computes amount ~= 0,
  // which is a no-op — so this can never fight xterm.
  const syncDomScrollTop = (line?: number): void => {
    const vp = container.querySelector('.xterm-viewport')
    if (!(vp instanceof HTMLElement)) return
    const buf = term.buffer.active
    const y = line ?? buf.viewportY
    const max = vp.scrollHeight - vp.clientHeight
    if (max <= 0 || buf.baseY <= 0) return
    const st = Math.round((Math.min(y, buf.baseY) / buf.baseY) * max)
    if (Math.abs(vp.scrollTop - st) > 2) {
      sdbg(`dom st ${vp.scrollTop}->${st} max=${max}`)
      vp.scrollTop = st
    }
  }

  // Restore a mid-scroll position after xterm lost it: scrollLines with a
  // negative amount is the only path that re-arms the buffer's
  // "user is scrolling" flag — without it the next write drags the viewport
  // back to the bottom no matter where we scrolled to.
  const restoreLine = (line: number): void => {
    const buf = term.buffer.active
    const target = Math.min(line, buf.baseY)
    term.scrollToLine(target)
    if (target < buf.baseY) {
      term.scrollLines(1)
      term.scrollToLine(target)
    }
    syncDomScrollTop(target)
  }

  // Where the anchor wants the viewport, against the NORMAL buffer — the
  // alternate buffer has no scrollback, so anchor math on it is meaningless
  // and its scroll events are not allowed to touch anything.
  const anchorTarget = (): number => {
    const buf = term.buffer.normal
    if (anchor.kind === 'bottom') return buf.baseY
    // The marker rode every reflow/trim since the park, so it points at the
    // same content no matter how the buffer renumbered itself. A disposed
    // marker means the parked line was trimmed out of scrollback entirely —
    // anchor.y is a stale index by then (the buffer renumbered), so the top
    // is the closest valid position left.
    if (anchorMarker) {
      if (anchorMarker.isDisposed) return 0
      return Math.min(anchorMarker.line, buf.baseY)
    }
    // Registration failed (or the park predates markers) — the raw index is
    // all we have.
    return Math.max(0, Math.min(anchor.y, buf.baseY))
  }
  const restoreAnchor = (): void => {
    if (term.buffer.active.type !== 'normal') return
    // A live gesture owns the viewport. Restoring mid-gesture yanks it back
    // to a stale anchor, and our own restore events would land inside the
    // intent window and be parkAt'd — hijacking the anchor. Defer; the
    // gesture's own events drive the position.
    if (scrollbarDrag || Date.now() - lastUserScrollAt <= 150) {
      scheduleSnapBack()
      return
    }
    if (anchor.kind === 'bottom') {
      term.scrollToBottom()
      return
    }
    const target = anchorTarget()
    if (term.buffer.active.viewportY !== target) restoreLine(target)
  }

  // A collapsed scroll event with no fit coming to correct it. Checked on a
  // short delay — never inside the scroll handler, where re-scrolling feeds
  // the same clamped offset straight back in — and only against the anchor,
  // so it converges instead of chasing a stale index.
  // During a resize the anchor was never poisoned but the clamp is VISIBLE:
  // the viewport paints the bottom for ~50ms per drag step before the
  // timeout snap-back lands. Restore on the next animation frame instead —
  // before the bad frame paints — so the drag produces no flicker at all.
  // The timeout still runs as a backstop for occluded renderers where rAF
  // is throttled, and both firings are idempotent.
  let snapBackTimer = 0
  let snapBackRaf = 0
  const snapBackNow = (): void => {
    if (!container.isConnected || container.clientHeight === 0) return
    if (term.buffer.active.type !== 'normal') return
    if (Date.now() - lastUserScrollAt <= 500) return
    const buf = term.buffer.normal
    if (buf.viewportY !== anchorTarget()) restoreAnchor()
    syncDomScrollTop()
  }
  const scheduleSnapBack = (): void => {
    if (Date.now() < resizeQuietUntil && !snapBackRaf) {
      snapBackRaf = requestAnimationFrame(() => {
        snapBackRaf = 0
        snapBackNow()
      })
    }
    if (snapBackTimer) return
    snapBackTimer = window.setTimeout(() => {
      snapBackTimer = 0
      snapBackNow()
    }, Date.now() < resizeQuietUntil ? 120 : 50)
  }

  const scrollListener = term.onScroll((y) => {
    if (!container.isConnected || container.clientHeight === 0) return
    // Alternate-buffer apps (vim, less, agent TUIs) scroll their own screen
    // with no scrollback — every event there reports y >= baseY = 0 and would
    // poison the anchor with 'bottom', forgetting the parked position the
    // user returns to when the app exits.
    if (term.buffer.active.type !== 'normal') return
    const buf = term.buffer.active
    // Inside the resize quiet window with no gesture behind it, every event
    // is a clamp artefact of the last fit — there is nothing to do: the fit
    // already re-asserted the anchor synchronously, and the anchor is
    // untouched. Answering here is what creates the continuous scrolling the
    // user sees mid-drag: our snap-back writes the offset, the next clamp
    // rewrites it, another event, another snap — an endless clamp↔restore
    // loop. Suppressed events keep the drag silent; anything still wrong
    // when the window closes converges through the normal path below.
    if (
      Date.now() < resizeQuietUntil &&
      !scrollbarDrag &&
      Date.now() - lastUserScrollAt > 500
    ) {
      sdbg(`ev y=${y} base=${buf.baseY} a=${anchor.kind}${anchor.kind === 'line' ? ':' + anchor.y : ''} -> quiet-suppress`)
      return
    }
    sdbg(
      `ev y=${y} base=${buf.baseY} a=${anchor.kind}${anchor.kind === 'line' ? ':' + anchor.y : ''} ` +
        `g=${Date.now() - lastUserScrollAt}ms sd=${scrollbarDrag} q=${resizeQuietUntil - Date.now()}ms`
    )
    // Following output — whether xterm auto-scrolled for a write or the user
    // scrolled down to it, reaching baseY always means "at the bottom".
    // But a PARKED anchor cannot legitimately arrive at baseY without a
    // gesture: output-following only holds the bottom when the anchor is
    // 'bottom' already, so a parked anchor reading baseY is always a clamp
    // artefact — during a resize, a reflow, or a scrollback trim. Letting it
    // flip the anchor to 'bottom' is the resize auto-scroll the user keeps
    // reporting; snap back instead. (A dead marker already resolves to the
    // top via anchorTarget, so restoring is still the honest fallback.)
    if (y >= buf.baseY) {
      if (anchor.kind === 'line' && !scrollbarDrag && Date.now() - lastUserScrollAt > 500) {
        sdbg('  -> fake-bottom snapback')
        scheduleSnapBack()
        return
      }
      if (anchor.kind !== 'bottom') sdbg('  -> anchor=bottom')
      anchor = { kind: 'bottom' }
      anchorMarker?.dispose()
      anchorMarker = null
      return
    }
    // A real gesture somewhere above the bottom — including the very top,
    // which collapses cannot fake because gestures are timestamped.
    // scrollbarDrag stands in for the timestamp during native scrollbar
    // drags: Chrome swallows pointermove while the compositor owns the
    // drag, so the 500ms window alone would expire mid-drag and snap-back
    // would fight the user's hand.
    if (scrollbarDrag || Date.now() - lastUserScrollAt <= 500) {
      sdbg(`  -> park y=${y}`)
      parkAt(y)
      return
    }
    // No gesture, not the bottom: a DOM clamp, a reflow clamp, a trim
    // adjustment, or one of our own restores. The anchor stays (the marker
    // already followed any trim), and if no ResizeObserver fit is coming to
    // fix a collapsed position, the snap-back does. A bottom-follower gets
    // the restore immediately — scrollToBottom is clamp-safe and idempotent
    // inside the handler, and every 50ms of deferral is a visible
    // "drift then snap" bounce on each output burst or resize step.
    if (anchor.kind === 'bottom') {
      sdbg('  -> bottom-follow restore')
      restoreAnchor()
    } else {
      sdbg('  -> snapback')
      scheduleSnapBack()
    }
  })
  cleanups.push(() => {
    scrollListener.dispose()
    anchorMarker?.dispose()
    if (snapBackTimer) window.clearTimeout(snapBackTimer)
    if (snapBackRaf) cancelAnimationFrame(snapBackRaf)
  })

  // Programs push their own tab title via OSC 0/2 (claude, vim, ssh…); prefer
  // it over the polled process name, which can be meaningless for some
  // binaries. Disposed together with the terminal.
  term.onTitleChange((title) => useTermTitlesStore.getState().setOsc(panelId, title.trim()))

  const handle: TermHandle = {
    term,
    fit,
    container,
    ptyId: null,
    suspendViewportY: null,
    suspendAtBottom: false,
    suspend() {
      // Called by the host just before detaching, while the terminal is still
      // laid out. Snapshot the NORMAL buffer — parking in it survives an app
      // holding the alternate screen. When the live offset already collapsed,
      // trust the anchor instead.
      const buf = term.buffer.normal
      const expected = anchorTarget()
      handle.suspendViewportY = buf.viewportY === expected ? buf.viewportY : expected
      handle.suspendAtBottom = anchor.kind === 'bottom' || buf.viewportY >= buf.baseY
    },
    fitSafely() {
      try {
        // A hidden (display:none) or detached host has no usable size; fitting
        // to it collapses the terminal into a degenerate resize that reflows
        // the scrollback and throws the scroll position away — the visible bug
        // when switching terminal groups or repo tabs.
        if (!container.isConnected || container.clientWidth === 0 || container.clientHeight === 0) {
          return
        }
        // A snapshot taken at suspend time becomes the new anchor — the DOM
        // may already have rewritten the offset behind our back.
        if (handle.suspendViewportY != null) {
          if (handle.suspendAtBottom) {
            anchor = { kind: 'bottom' }
          } else {
            parkAt(handle.suspendViewportY)
          }
          handle.suspendViewportY = null
        }
        fit.fit()
        // Reflow shifts buffer lines on resize and a reattached viewport may
        // have lost its DOM offset entirely; put the scroll position back —
        // pinned to the bottom when it was already following output, parked
        // on the marker-tracked line otherwise.
        restoreAnchor()
        syncDomScrollTop()
        sdbg(`fit ${term.cols}x${term.rows} -> a=${anchor.kind}`)
        // The clamp events the fit just caused are delivered asynchronously
        // (the viewport's scroll event follows the scrollArea's style change
        // on a later frame) — and a drag produces a fit per step, so roll
        // the quiet window forward from each fit rather than timing it from
        // the first.
        resizeQuietUntil = Date.now() + 250
      } catch {
        /* element not visible / zero-size */
      }
    },
    pasteText(text) {
      if (handle.ptyId == null || !text) return
      const send = isLaunch ? window.api.launch.input : window.api.term.input
      send(handle.ptyId, text)
    },
    dispose() {
      cleanups.forEach((c) => c())
      if (handle.ptyId != null) {
        if (isLaunch) window.api.launch.stop(handle.ptyId)
        else window.api.term.kill(handle.ptyId)
      }
      useTermTitlesStore.getState().clear(panelId)
      term.dispose()
      container.remove()
      registry.delete(panelId)
    }
  }
  registry.set(panelId, handle)

  if (isLaunch) {
    // Bind to the already-spawned launch pty (created in main by launch:run).
    handle.ptyId = launchId!
    cleanups.push(window.api.launch.onData(launchId!, (data) => term.write(data)))
    cleanups.push(
      window.api.launch.onExit(launchId!, (code) =>
        term.write(`\r\n\x1b[90m[process exited with code ${code}]\x1b[0m\r\n`)
      )
    )
    term.onData((data) => window.api.launch.input(launchId!, data))
    term.onResize(({ cols, rows }) => {
      if (cols > 0 && rows > 0) window.api.launch.resize(launchId!, cols, rows)
    })
    // The pty was spawned before this terminal existed — ask for what it has
    // already printed, or a fast program's whole banner is lost.
    window.api.launch.attach(launchId!)
    return handle
  }

  // Defer fit until the container is attached & sized.
  void window.api.term.create(cwd, term.cols || 80, term.rows || 24).then((id) => {
    handle.ptyId = id
    cleanups.push(window.api.term.onData(id, (data) => term.write(data)))
    cleanups.push(
      window.api.term.onExit(id, () =>
        term.write('\r\n\x1b[90m[process exited]\x1b[0m\r\n')
      )
    )
    term.onData((data) => window.api.term.input(id, data))
    term.onResize(({ cols, rows }) => {
      if (cols > 0 && rows > 0) window.api.term.resize(id, cols, rows)
    })

    // Poll the foreground process name (VSCode-style auto title).
    const poll = (): void => {
      void window.api.term.procName(id).then((name) => {
        if (name) useTermTitlesStore.getState().set(panelId, name)
      })
    }
    poll()
    const timer = window.setInterval(poll, 2000)
    cleanups.push(() => window.clearInterval(timer))
  })

  return handle
}

export function disposeTerm(panelId: string): void {
  registry.get(panelId)?.dispose()
}
