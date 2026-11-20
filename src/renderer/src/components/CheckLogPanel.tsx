import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { hostingApi, shellApi } from '../infrastructure/api'
import { ansiToSpans } from '../lib/ansi'
import { logTail } from '../lib/ciLog'
import { interp, useT } from '../i18n'

/**
 * A CI job's log under its check row, read by the app (Forgejo Actions). When
 * the server will not hand it to the token, says so and offers the browser.
 */
export function CheckLogPanel({
  remoteUrl,
  tokens,
  url
}: {
  remoteUrl: string
  tokens: { github?: string; gitlab?: string; forgejo?: string }
  url: string
}): React.JSX.Element {
  const t = useT()
  const [log, setLog] = useState<string | null | undefined>(undefined)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    hostingApi
      .prCheckLog(remoteUrl, tokens, url)
      .then((text) => live && setLog(text))
      .catch(() => live && setLog(null))
    return () => {
      live = false
    }
  }, [remoteUrl, tokens, url])

  const tail = useMemo(() => (log ? logTail(log) : null), [log])
  // The failure is at the bottom: start there.
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [tail])

  if (log === undefined) {
    return (
      <div className="prp-check-log prp-muted">
        <Loader2 size={13} className="spin" /> {t('prDetail.loading')}
      </div>
    )
  }
  if (log === null || !tail) {
    return (
      <div className="prp-check-log prp-muted">
        {t('prPage.logUnavailable')}{' '}
        <button className="prp-link" onClick={() => void shellApi.openExternal(url)}>
          {t('common.openInBrowser')} <ExternalLink size={11} />
        </button>
      </div>
    )
  }
  return (
    <div className="prp-check-log">
      {tail.dropped > 0 && (
        <div className="prp-muted prp-check-log-note">{interp(t('prPage.logTrimmed'), { count: String(tail.dropped) })}</div>
      )}
      <pre>
        {ansiToSpans(tail.text).map((s, i) => (
          <span key={i} style={s.style}>
            {s.text}
          </span>
        ))}
      </pre>
      <div ref={end} />
    </div>
  )
}
