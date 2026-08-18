import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Scale, Search, ExternalLink, ChevronRight } from 'lucide-react'
import { dependencyLicenses } from '../licenses'
import { useT, interp } from '../i18n'

const REPO_LICENSE = 'https://github.com/MyAppDesk/gitcito/blob/main/LICENSE'

/** The "Licenses" page tab: every third-party package this build ships, with
 *  the licence text it was published under. The list is generated at build
 *  time (scripts/gen-licenses.mjs) because a packaged app has no node_modules
 *  left to read the notices out of. */
export function LicensesPage(): React.JSX.Element {
  const t = useT()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const all = useMemo(() => dependencyLicenses(), [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((d) => d.name.toLowerCase().includes(q) || d.license.toLowerCase().includes(q))
  }, [all, query])

  return (
    <div className="licenses-page">
      <motion.div
        className="licenses-inner"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <header className="licenses-header">
          <div className="licenses-title">
            <Scale size={20} />
            <div>
              <h1>{t('licenses.title')}</h1>
              <span className="licenses-count">{interp(t('licenses.count'), { count: all.length })}</span>
            </div>
          </div>
          <button
            className="licenses-own"
            type="button"
            title={t('licenses.ownTitle')}
            onClick={() => void window.api.openExternal(REPO_LICENSE)}
          >
            <ExternalLink size={12} />
            <span>{t('licenses.own')}</span>
          </button>
        </header>

        <p className="licenses-lead">{t('licenses.lead')}</p>

        <div className="licenses-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('licenses.filter')}
            aria-label={t('licenses.filter')}
          />
        </div>

        {shown.length === 0 ? (
          <p className="licenses-empty">{interp(t('licenses.noMatch'), { query: query.trim() })}</p>
        ) : (
          <ul className="licenses-list">
            {shown.map((d) => {
              const id = `${d.name}@${d.version}`
              const expanded = open === id
              return (
                <li key={id} className={`licenses-row ${expanded ? 'expanded' : ''}`}>
                  <div className="licenses-row-head">
                    <button
                      className="licenses-row-btn"
                      type="button"
                      aria-expanded={expanded}
                      title={expanded ? t('licenses.hideText') : t('licenses.showText')}
                      onClick={() => setOpen(expanded ? null : id)}
                    >
                      <ChevronRight size={13} className="licenses-chevron" />
                      {/* i18n-ignore package name and version are data */}
                      <span className="licenses-name">{d.name}</span>
                      {/* i18n-ignore semver string */}
                      <span className="licenses-version">{d.version}</span>
                      {/* i18n-ignore SPDX identifier */}
                      <span className="licenses-spdx">{d.license}</span>
                    </button>
                    {d.homepage && (
                      <button
                        className="licenses-link"
                        type="button"
                        title={t('licenses.homepage')}
                        aria-label={t('licenses.homepage')}
                        onClick={() => void window.api.openExternal(d.homepage!)}
                      >
                        <ExternalLink size={13} />
                      </button>
                    )}
                  </div>
                  {expanded &&
                    (d.text ? (
                      <pre className="licenses-text">{d.text}</pre>
                    ) : (
                      <p className="licenses-text licenses-text-missing">
                        {interp(t('licenses.noText'), { license: d.license })}
                      </p>
                    ))}
                </li>
              )
            })}
          </ul>
        )}
      </motion.div>
    </div>
  )
}
