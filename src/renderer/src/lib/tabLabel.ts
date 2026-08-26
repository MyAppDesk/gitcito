import type { PageContent, PageTab } from '../../../shared/types'
import { interp } from '../i18n/interp'
import type { TranslationKey } from '../i18n'

/**
 * The label a page tab shows.
 *
 * Derived at render time rather than stored, so the tab strip follows the
 * language the user is reading *now*. Storing it would freeze whichever
 * language happened to be active when the tab was opened.
 *
 * Only the fixed part is translated — a repository name, an issue title or a
 * release tag is data, and data reads the same in every language.
 */
export function pageTabLabel(page: PageContent, t: (key: TranslationKey) => string): string {
  switch (page.type) {
    case 'logs':
      return t('tab.logs')
    case 'notifications':
      return t('tab.notifications')
    case 'insights':
      return t('tab.insights')
    case 'vault':
      return t('tab.vault')
    case 'help':
      return t('tab.help')
    case 'changelog':
      return t('tab.changelog')
    case 'licenses':
      return t('tab.licenses')
    case 'devtools':
      // Both halves are data: the tool's own name and the session's.
      return `${page.tool} · ${page.label}`
    case 'wiki':
      return interp(t('tab.wiki'), { repo: basename(page.repoPath) })
    case 'issue':
      return `#${page.issue.number} ${page.issue.title}`
    case 'milestone':
      return `🏁 ${page.milestone.title}`
    case 'release':
      return `${basename(page.repoPath)} - ${page.release.tag || page.release.name || `#${page.release.id}`}`
  }
}

/** A tab's display name: what the user renamed it to, or the derived label. */
export function tabLabel(tab: PageTab, t: (key: TranslationKey) => string): string {
  return tab.renamed && tab.name ? tab.name : pageTabLabel(tab.page, t)
}

function basename(path: string): string {
  return path.split('/').pop() || path
}
