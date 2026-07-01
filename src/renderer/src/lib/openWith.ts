import type { AppSettings } from '../../../shared/types'
import type { MenuItem } from '../stores/ui'
import { shellApi } from '../infrastructure/api'

export type DefaultOpenApp = AppSettings['defaultOpenApp']

/** Builds the "Open with <App>" + "Open With…" menu items shared by the file
 *  tree, repo tabs and status bar. `path` may be a file or a folder — both
 *  `shellApi.openWithApp` and the native picker accept either. */
export function openWithMenuItems(
  path: string,
  defaultApp: DefaultOpenApp,
  labels: { openWithDefault: (name: string) => string; openWith: string }
): MenuItem[] {
  const items: MenuItem[] = []
  if (defaultApp?.path) {
    items.push({
      label: labels.openWithDefault(defaultApp.name),
      onClick: () => void shellApi.openWithApp(path, defaultApp.path)
    })
  }
  items.push({ label: labels.openWith, onClick: () => void shellApi.openWithPicker(path) })
  return items
}

/** Full folder-scope menu: Open Folder, Open with <App> (if set), Open With…
 *  Used by repo tabs, the group-repo menu, the Files header and the status bar. */
export function folderOpenMenuItems(
  path: string,
  defaultApp: DefaultOpenApp,
  labels: { openFolder: string; openWithDefault: (name: string) => string; openWith: string }
): MenuItem[] {
  return [
    { label: labels.openFolder, onClick: () => void shellApi.openPath(path) },
    ...openWithMenuItems(path, defaultApp, labels)
  ]
}
