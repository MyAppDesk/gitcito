import type { AppRelease } from '../../../shared/types'
import { compareVersions } from '../../../shared/version'

const stripV = (s: string): string => s.trim().replace(/^v/i, '')

/**
 * The body of one version's section in a CHANGELOG.md written by
 * conventional-changelog (`## [4.22.1](compare-url) (date)` headings), without
 * the heading. Null when the version has no section or the section is empty.
 */
export function changelogSection(markdown: string, version: string): string | null {
  const want = stripV(version)
  if (!want) return null
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => {
    const m = /^##\s+\[?v?([^\]\s(]+)\]?/.exec(line)
    return !!m && m[1] === want
  })
  if (start < 0) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^##\s/.test(line))
  const body = (end < 0 ? rest : rest.slice(0, end)).join('\n').trim()
  return body || null
}

/**
 * The What's-new timeline: published releases (pre-releases left out), plus the
 * installed version when GitHub has not published it yet — a beta or a local
 * build. Without that entry the page opened on the newest *published* release
 * and the notes of the build actually running were never shown. The added entry
 * carries the bundled CHANGELOG section as its body and no date or URL.
 */
export function whatsNewTimeline(
  releases: AppRelease[],
  installed: string,
  bundledChangelog: string
): AppRelease[] {
  const published = releases.filter((r) => !r.prerelease)
  const want = stripV(installed)
  const known = want ? releases.find((r) => stripV(r.tag) === want) : undefined
  let timeline = published
  if (known && known.prerelease) {
    // Installed a published pre-release: keep it browsable, it is what is running.
    timeline = [...published, known]
  } else if (want && !known) {
    const body = changelogSection(bundledChangelog, want)
    if (body) {
      timeline = [...published, { tag: `v${want}`, name: null, body, publishedAt: '', url: '', prerelease: true }]
    }
  }
  return [...timeline].sort((a, b) => -compareVersions(a.tag, b.tag))
}
