/**
 * Azure Boards work items: the branch a work item suggests, and where `AB#123`
 * (or, in an Azure repo, `#123`) points.
 */

export interface WorkItem {
  id: number
  title: string
  type: string
  state?: string
}

/** Lower-case ASCII words joined by dashes — accents dropped, symbols gone. */
export function slugify(text: string, max = 50): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length <= max ? slug : slug.slice(0, max).replace(/-[^-]*$/, '') || slug.slice(0, max)
}

/** `bugfix/123-title` for a bug, `feature/123-title` for anything else. */
export function workItemBranchName(item: WorkItem): string {
  const prefix = /bug/i.test(item.type) ? 'bugfix' : 'feature'
  const slug = slugify(item.title)
  return slug ? `${prefix}/${item.id}-${slug}` : `${prefix}/${item.id}`
}

/** The Azure DevOps organization a repository web URL belongs to, or null. */
export function azureOrgOf(repoWebUrl: string | undefined): string | null {
  if (!repoWebUrl) return null
  const dev = /^https:\/\/dev\.azure\.com\/([^/]+)\//i.exec(repoWebUrl)
  if (dev) return decodeURIComponent(dev[1])
  const vs = /^https:\/\/([^./]+)\.visualstudio\.com\//i.exec(repoWebUrl)
  return vs ? vs[1] : null
}

/** A work item's page — org-level, so no project is needed. */
export function workItemUrl(org: string, id: number | string): string {
  return `https://dev.azure.com/${encodeURIComponent(org)}/_workitems/edit/${id}`
}
