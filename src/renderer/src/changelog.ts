import type { AppRelease } from '../../shared/types'
// Bundled at build time so the changelog always works offline and matches the
// installed build. Live GitHub release notes are layered on top when reachable.
import bundled from '../../../CHANGELOG.md?raw'

/** The CHANGELOG.md shipped with this build, as raw markdown. */
export function bundledChangelog(): string {
  return bundled
}

/** Turn fetched GitHub releases into a single markdown document. Each release
 *  body is already markdown; renderMarkdown sanitizes it before display. */
export function releasesToMarkdown(releases: AppRelease[]): string {
  return releases
    .map((r) => {
      const title = r.name?.trim() || r.tag
      const date = r.publishedAt ? r.publishedAt.slice(0, 10) : ''
      const heading = `## ${title}${r.prerelease ? ' _(pre-release)_' : ''}${date ? ` — ${date}` : ''}`
      const body = r.body?.trim() || '_No release notes._'
      return `${heading}\n\n${body}`
    })
    .join('\n\n---\n\n')
}
