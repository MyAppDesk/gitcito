import {
  Archive,
  EyeOff,
  FileMinus,
  FileOutput,
  FilePenLine,
  FilePlus,
  FilePlus2,
  FileX2,
  GitBranch,
  GitBranchPlus,
  GitCommit,
  Tag,
  Trash2,
  Wrench,
  type LucideIcon
} from 'lucide-react'
import type { AskAction, RepoChatAction } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

/** Icon + label for one proposed-action row, shared by the Ask tab and chat. */
export const ASK_ACTION_META: Record<AskAction['type'], { Icon: LucideIcon; labelKey: TranslationKey }> = {
  gitignore: { Icon: EyeOff, labelKey: 'askAction.gitignore' },
  stage: { Icon: FilePlus, labelKey: 'askAction.stage' },
  unstage: { Icon: FileMinus, labelKey: 'askAction.unstage' },
  commit: { Icon: GitCommit, labelKey: 'askAction.commit' },
  stash: { Icon: Archive, labelKey: 'askAction.stash' },
  discard: { Icon: Trash2, labelKey: 'askAction.discard' },
  branch: { Icon: GitBranch, labelKey: 'askAction.branch' },
  checkout: { Icon: GitBranchPlus, labelKey: 'askAction.checkout' },
  tag: { Icon: Tag, labelKey: 'askAction.tag' }
}

export const ASK_ACTION_FALLBACK_META: { Icon: LucideIcon; labelKey: TranslationKey } = {
  Icon: Wrench,
  labelKey: 'askAction.fallback'
}

type ActionMeta = { Icon: LucideIcon; labelKey: TranslationKey }

/** File metadata belongs only to repository chat; Ask remains Git-only. */
export function repoChatActionMeta(
  type: RepoChatAction['type'],
  writeMode?: 'create' | 'replace'
): ActionMeta {
  if (type === 'edit_file') return { Icon: FilePenLine, labelKey: 'askAction.editFile' }
  if (type === 'write_file') {
    return writeMode === 'create'
      ? { Icon: FilePlus2, labelKey: 'askAction.createFile' }
      : { Icon: FileOutput, labelKey: 'askAction.replaceFile' }
  }
  if (type === 'delete_file') return { Icon: FileX2, labelKey: 'askAction.deleteFile' }
  return ASK_ACTION_META[type as AskAction['type']] ?? ASK_ACTION_FALLBACK_META
}
