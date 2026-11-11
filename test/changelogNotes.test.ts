import { describe, it, expect } from 'vitest'
import { changelogSection, whatsNewTimeline } from '../src/renderer/src/lib/changelogNotes'
import type { AppRelease } from '../src/shared/types'

const CHANGELOG = `

## [4.22.2-beta](https://github.com/o/r/compare/v4.22.1...v4.22.2-beta) (2026-11-11)


### Features

* **composer:** full gitmoji catalogue

## [4.22.1](https://github.com/o/r/compare/v4.22.0...v4.22.1) (2026-11-10)


### Performance Improvements

* **terminal:** batch pty IPC
`

const rel = (tag: string, prerelease = false): AppRelease => ({
  tag,
  name: null,
  body: `notes ${tag}`,
  publishedAt: '2026-11-10T00:00:00Z',
  url: `https://example.com/${tag}`,
  prerelease
})

describe('changelogSection', () => {
  it('returns one version section without its heading or the next one', () => {
    expect(changelogSection(CHANGELOG, '4.22.2-beta')).toBe('### Features\n\n* **composer:** full gitmoji catalogue')
    expect(changelogSection(CHANGELOG, 'v4.22.1')).toBe('### Performance Improvements\n\n* **terminal:** batch pty IPC')
  })

  it('does not let 4.22.2 match the 4.22.2-beta section', () => {
    expect(changelogSection(CHANGELOG, '4.22.2')).toBeNull()
    expect(changelogSection(CHANGELOG, '')).toBeNull()
  })
})

describe('whatsNewTimeline', () => {
  it('adds the installed build GitHub has not published yet, newest first, from the bundled notes', () => {
    const tl = whatsNewTimeline([rel('v4.22.1'), rel('v4.22.0')], '4.22.2-beta', CHANGELOG)
    expect(tl.map((r) => r.tag)).toEqual(['v4.22.2-beta', 'v4.22.1', 'v4.22.0'])
    expect(tl[0].body).toContain('full gitmoji catalogue')
    expect(tl[0].url).toBe('')
  })

  it('leaves the timeline alone when the installed version is published', () => {
    const tl = whatsNewTimeline([rel('v4.22.0'), rel('v4.22.1')], '4.22.1', CHANGELOG)
    expect(tl.map((r) => r.tag)).toEqual(['v4.22.1', 'v4.22.0'])
  })

  it('keeps a published pre-release only when it is the installed one', () => {
    const releases = [rel('v4.22.1'), rel('v4.23.0-rc.1', true)]
    expect(whatsNewTimeline(releases, '4.22.1', CHANGELOG).map((r) => r.tag)).toEqual(['v4.22.1'])
    expect(whatsNewTimeline(releases, '4.23.0-rc.1', CHANGELOG).map((r) => r.tag)).toEqual([
      'v4.23.0-rc.1',
      'v4.22.1'
    ])
  })

  it('adds nothing when the bundled changelog has no section for the installed build', () => {
    expect(whatsNewTimeline([rel('v4.22.1')], '9.9.9', CHANGELOG).map((r) => r.tag)).toEqual(['v4.22.1'])
  })
})
