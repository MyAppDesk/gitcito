import { useEffect, useRef, useState } from 'react'
import { RefreshCw, ExternalLink, ArrowLeft } from 'lucide-react'
import { useT, interp } from '../i18n'
import { useLaunchStore } from '../stores/launch'

/** `<webview>` is Electron's element, so React needs to be told it exists. */
const Webview = 'webview' as unknown as React.FC<{
  ref: React.Ref<WebviewElement>
  className: string
  src: string
}>

/** The bit of `<webview>` this page drives. Electron's element, not React's. */
interface WebviewElement extends HTMLElement {
  src: string
  reload(): void
  goBack(): void
  canGoBack(): boolean
}

/**
 * Flutter DevTools, embedded.
 *
 * DevTools is a Flutter-web app served on loopback, so the network view, the
 * timeline, the widget inspector and the memory profiler are all already
 * written — what Gitcito adds is not re-implementing them. `flutter run`
 * announces the address on its output; the launch session captures it and this
 * page loads it.
 *
 * The `<webview>` is leashed in the main process: no preload, no node
 * integration, and any navigation off loopback is refused. A link inside
 * DevTools opens in the real browser instead.
 */
export function DevToolsPage({
  launchId,
  url: opened,
  label,
  tool
}: {
  launchId: number
  url: string
  label: string
  tool: string
}): React.JSX.Element {
  const t = useT()
  // While the session lives it owns the address — a hot restart publishes a new
  // one. Once it is gone, the address the tab was opened with is all there is.
  const live = useLaunchStore((s) => s.sessions.find((x) => x.launchId === launchId)?.devToolsUrl)
  const url = live ?? opened
  const ref = useRef<WebviewElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const view = ref.current
    if (!view) return
    const done = (): void => setLoading(false)
    const fail = (): void => {
      setLoading(false)
      setFailed(true)
    }
    view.addEventListener('did-finish-load', done)
    view.addEventListener('did-fail-load', fail)
    return () => {
      view.removeEventListener('did-finish-load', done)
      view.removeEventListener('did-fail-load', fail)
    }
  }, [])

  // A restart hands us a new address; reload rather than remount, so the tab
  // does not flash.
  useEffect(() => {
    setLoading(true)
    setFailed(false)
    if (ref.current) ref.current.src = url
  }, [url])

  return (
    <div className="devtools-page">
      <header className="devtools-bar">
        <button
          className="icon-btn"
          title={t('devtools.back')}
          onClick={() => {
            const view = ref.current
            if (view?.canGoBack()) view.goBack()
          }}
        >
          <ArrowLeft size={14} />
        </button>
        <button className="icon-btn" title={t('devtools.reload')} onClick={() => ref.current?.reload()}>
          <RefreshCw size={14} />
        </button>
        <span className="devtools-label">{tool}</span>
        <span className="devtools-session">{interp(t('devtools.session'), { name: label })}</span>
        <span className="devtools-url" title={url}>
          {url}
        </span>
        <button
          className="icon-btn"
          title={t('devtools.openExternal')}
          onClick={() => void window.api.openExternal(url)}
        >
          <ExternalLink size={14} />
        </button>
      </header>
      {failed && <p className="devtools-note">{interp(t('devtools.failed'), { tool })}</p>}
      {loading && !failed && <p className="devtools-note">{interp(t('devtools.loading'), { tool })}</p>}
      <Webview ref={ref} className="devtools-view" src={url} />
    </div>
  )
}
