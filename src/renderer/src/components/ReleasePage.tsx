import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Rocket, Github, Tag as TagIcon, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { renderMarkdown } from '../preview/markdown'
import { shellApi } from '../infrastructure/api'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { useT } from '../i18n'
import type { PageTab, ReleaseInfo } from '../../../shared/types'

/** A page tab for a single platform release. Renders the release notes as
 *  markdown (GitHub-flavoured), matching the "What's new" changelog layout,
 *  with prev/next navigation across the repo's other releases. */
export function ReleasePage({ tab }: { tab: PageTab }): React.JSX.Element | null {
  const t = useT()
  const navigatePageTab = useSettingsStore((s) => s.navigatePageTab)
  // `tab.page` is the discriminated PageContent; this component only renders
  // for release tabs, but narrow defensively so the hooks below stay typed.
  const page = tab.page.type === 'release' ? tab.page : null
  const repoPath = page?.repoPath ?? ''
  const releases = useRepoStore((s) => s.repos[repoPath]?.releases) ?? []

  const release = page?.release
  const html = useMemo(
    () => renderMarkdown(release?.body?.trim() || `_${t('release.noNotes')}_`),
    [release?.body, t]
  )

  if (!page || !release) return null

  const title = release.name || release.tag || `#${release.id}`
  const date = release.publishedAt ? release.publishedAt.slice(0, 10) : ''
  // The releases array is newest-first (GitHub API order), so the "older"
  // sibling sits at a higher index and the "newer" one at a lower index.
  const idx = releases.findIndex((r) => r.id === release.id)
  const older = idx >= 0 ? releases[idx + 1] : undefined
  const newer = idx > 0 ? releases[idx - 1] : undefined
  const relLabel = (r: ReleaseInfo): string => r.tag || r.name || `#${r.id}`

  return (
    <div className="changelog-page">
      <motion.div
        className="changelog-inner"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <header className="changelog-header">
          <div className="changelog-title">
            <Rocket size={20} />
            <div>
              <h1>{title}</h1>
              <div className="release-meta">
                {release.tag && (
                  <span className="release-meta-tag">
                    <TagIcon size={11} /> {release.tag}
                  </span>
                )}
                {date && <span className="changelog-version">{date}</span>}
                {release.prerelease && <span className="badge release-pre">pre-release</span>}
                {release.draft && <span className="badge release-draft">draft</span>}
              </div>
            </div>
          </div>
          <span
            className="changelog-source"
            role="button"
            title={t('release.openOnWeb')}
            onClick={() => void shellApi.openExternal(release.url)}
          >
            <Github size={12} /> {t('release.openOnWeb')} <ExternalLink size={11} />
          </span>
        </header>

        {(older || newer) && (
          <nav className="release-nav">
            <button
              className="release-nav-btn"
              disabled={!older}
              title={older ? relLabel(older) : undefined}
              onClick={() =>
                older && navigatePageTab(tab.id, { type: 'release', release: older, repoPath })
              }
            >
              <ChevronLeft size={14} />
              <span>{older ? relLabel(older) : ''}</span>
            </button>
            <span className="release-nav-current">{relLabel(release)}</span>
            <button
              className="release-nav-btn right"
              disabled={!newer}
              title={newer ? relLabel(newer) : undefined}
              onClick={() =>
                newer && navigatePageTab(tab.id, { type: 'release', release: newer, repoPath })
              }
            >
              <span>{newer ? relLabel(newer) : ''}</span>
              <ChevronRight size={14} />
            </button>
          </nav>
        )}

        <article
          className="changelog-body md-preview"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </motion.div>
    </div>
  )
}
