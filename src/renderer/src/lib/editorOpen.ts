import type { EditorSetting, EditorTarget } from '../../../shared/editors'
import { supportsLine } from '../../../shared/editors'
import type { MenuItem } from '../stores/ui'
import { useUIStore } from '../stores/ui'
import { editorApi } from '../infrastructure/api'
import { t, interp } from '../i18n'

/**
 * The "Open in <editor>" menu entries. Labels are resolved here rather than
 * passed in by each caller: the same two keys would otherwise be restated at
 * every one of the dozen menus that offer this, and a menu is built on click,
 * so the non-reactive `t()` is already the right tool.
 */

/** Launch the editor and toast whatever went wrong — a failed launch is a
 *  nuisance, not something to unwind state for. */
export async function openInEditor(setting: EditorSetting, target: EditorTarget): Promise<void> {
  const error = await editorApi.open(setting, target)
  if (error) useUIStore.getState().toast('error', interp(t('editor.openFailed'), { error }))
}

/**
 * One entry for a file or folder. Returns nothing when no editor is configured,
 * so menus stay clean until the user picks one in Settings.
 */
export function editorMenuItems(editor: EditorSetting | undefined, target: EditorTarget): MenuItem[] {
  if (!editor?.command) return []
  return [
    {
      label: interp(t('editor.openIn'), { app: editor.name }),
      onClick: () => void openInEditor(editor, target)
    }
  ]
}

/**
 * The line-precise variant, for code rows in the file and blame views. Falls
 * back to the plain entry when the editor was found as a macOS bundle, which
 * cannot be told where to land.
 */
export function editorLineMenuItems(
  editor: EditorSetting | undefined,
  target: EditorTarget & { line: number }
): MenuItem[] {
  if (!editor?.command) return []
  if (!supportsLine(editor)) return editorMenuItems(editor, { ...target, line: undefined })
  return [
    {
      label: interp(t('editor.openInAtLine'), { app: editor.name, line: String(target.line) }),
      onClick: () => void openInEditor(editor, target)
    }
  ]
}
