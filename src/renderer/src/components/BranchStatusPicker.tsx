import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  ChevronDown,
  Copy,
  FolderGit2,
  GitBranch,
  GitBranchPlus,
  GitMerge,
  Pencil,
  Search,
  Trash2
} from 'lucide-react'
import type { BranchInfo, RemoteBranchInfo } from '../../../shared/types'
import { branchContextActionIds, branchMergeWouldChange, branchWorktreePlan } from '../lib/branchMenu'
import { canonicalRepoName } from '../lib/repoAlias'
import { interp, useT } from '../i18n'
import { repoActions, type RepoData } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type MenuItem } from '../stores/ui'

type BranchTarget =
  | { kind: 'local'; branch: BranchInfo }
  | { kind: 'remote'; branch: RemoteBranchInfo }

interface PickerPosition {
  left: number
  top: number
  width: number
  maxHeight: number
}

export function BranchStatusPicker({ repo }: { repo: RepoData }): React.JSX.Element {
  const t = useT()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState<PickerPosition | null>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const { openContextMenu, openModal } = useUIStore()
  const path = repo.path

  const q = query.trim().toLowerCase()
  const locals = q
    ? repo.branches.locals.filter((branch) => branch.name.toLowerCase().includes(q))
    : repo.branches.locals
  const remotes = q
    ? repo.branches.remotes.filter(
        (branch) => branch.fullName.toLowerCase().includes(q) || branch.name.toLowerCase().includes(q)
      )
    : repo.branches.remotes
  // Flat arrow-key order across both sections — index i is rendered as
  // data-idx so the scroll-into-view effect can find the row.
  const navTargets: BranchTarget[] = [
    ...locals.map((branch): BranchTarget => ({ kind: 'local', branch })),
    ...remotes.map((branch): BranchTarget => ({ kind: 'remote', branch }))
  ]

  const close = (): void => {
    setPosition(null)
    setQuery('')
  }

  const activate = (target: BranchTarget): void => {
    close()
    if (target.kind === 'local') {
      if (!target.branch.isCurrent) void repoActions.checkout(path, target.branch.name)
    } else {
      void repoActions.checkoutRemote(path, target.branch.fullName, target.branch.name, target.branch.remote)
    }
  }

  useEffect(() => {
    if (!position) return
    const onMouseDown = (event: MouseEvent): void => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
    }
  }, [position])

  // Keep the highlighted row in view while arrow-keying, and — on open —
  // scroll the preselected current branch into the list's visible area.
  useEffect(() => {
    if (!position) return
    popoverRef.current
      ?.querySelector(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, position])

  const toggle = (): void => {
    if (position) {
      close()
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(440, window.innerWidth - 16)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const top = rect.bottom + 6
    setPosition({ left, top, width, maxHeight: window.innerHeight - top - 8 })
    setQuery('')
    // With no query the locals list is unfiltered, so the current branch's
    // index here is the same index it gets in navTargets.
    setActiveIndex(Math.max(0, repo.branches.locals.findIndex((branch) => branch.isCurrent)))
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  const onSearchKey = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (navTargets.length === 0) return
      setActiveIndex(
        (i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + navTargets.length) % navTargets.length
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const target = navTargets[Math.min(activeIndex, navTargets.length - 1)]
      if (target) activate(target)
    }
  }

  const contextItems = (target: BranchTarget): MenuItem[] => {
    const isLocal = target.kind === 'local'
    const branchName = target.branch.name
    const ref = isLocal ? branchName : target.branch.fullName
    const copyName = isLocal ? branchName : target.branch.fullName
    const current = repo.branches.locals.find((branch) => branch.isCurrent)
    const canMerge = branchMergeWouldChange(
      ref,
      target.branch.sha,
      current,
      target.branch.mergedIntoCurrent
    )
    const localExists = isLocal || repo.branches.locals.some((branch) => branch.name === branchName)
    const checkedOutInWorktree = repo.worktrees.some((worktree) => worktree.branch === branchName)
    const items: MenuItem[] = []

    for (const action of branchContextActionIds(target.kind, canMerge)) {
      if (action === 'delete' && items.length) items.push({ separator: true })
      switch (action) {
        case 'rename':
          items.push({
            label: t('sidebar.renameBranch'),
            icon: <Pencil size={14} />,
            onClick: () => {
              close()
              openModal({
                kind: 'input',
                title: t('sidebar.renameBranchTitle'),
                label: t('sidebar.renameBranchLabel'),
                initial: branchName,
                submitLabel: t('sidebar.renameBranchSubmit'),
                onSubmit: (name) => {
                  const next = name.trim()
                  if (next && next !== branchName) void repoActions.renameBranch(path, branchName, next)
                }
              })
            }
          })
          break
        case 'copy':
          items.push({
            label: t('sidebar.copyBranchName'),
            icon: <Copy size={14} />,
            onClick: () => {
              close()
              void navigator.clipboard.writeText(copyName)
            }
          })
          break
        case 'worktree':
          items.push({
            label: interp(t('sidebar.openInWorktree'), { branch: ref }),
            icon: <FolderGit2 size={14} />,
            disabled: checkedOutInWorktree,
            onClick: () => {
              close()
              const plan = branchWorktreePlan(path, branchName, ref, localExists)
              void repoActions
                .worktreeAdd(path, plan.dir, plan.branch, plan.newBranch, plan.startPoint)
                .then((ok) => {
                  if (ok) {
                    const rootPath = repo.worktrees.find((w) => w.isMain)?.path ?? path
                    const rootName = canonicalRepoName(rootPath)
                    useSettingsStore
                      .getState()
                      .openWorktreeRepo({ path: plan.dir, name: `${rootName} · ${branchName}` }, rootPath)
                  }
                })
            }
          })
          break
        case 'merge':
          items.push({
            label: interp(t('branch.mergeInto'), {
              ref,
              branch: repo.branches.current,
              current: repo.branches.current
            }),
            icon: <GitMerge size={14} />,
            onClick: () => {
              close()
              void repoActions.merge(path, ref)
            }
          })
          break
        case 'delete':
          items.push({
            label: isLocal ? t('sidebar.deleteBranch') : t('sidebar.deleteRemoteBranch'),
            icon: <Trash2 size={14} />,
            danger: true,
            disabled: isLocal && branchName === repo.branches.current,
            onClick: () => {
              close()
              if (target.kind === 'local') {
                openModal({
                  kind: 'confirm',
                  title: t('sidebar.deleteBranchTitle'),
                  message: interp(t('sidebar.deleteBranchMsg'), { name: branchName }),
                  danger: true,
                  confirmLabel: t('sidebar.deleteBranchConfirm'),
                  onConfirm: () => void repoActions.deleteBranch(path, branchName, target.branch.sha)
                })
                return
              }
              openModal({
                kind: 'confirm',
                title: t('sidebar.deleteRemoteBranchTitle'),
                message: interp(t('sidebar.deleteRemoteBranchMsg'), {
                  branch: branchName,
                  remote: target.branch.remote
                }),
                danger: true,
                confirmLabel: t('sidebar.deleteRemoteBranchConfirm'),
                onConfirm: () => void repoActions.deleteRemoteBranch(path, target.branch.remote, branchName)
              })
            }
          })
          break
      }
    }
    return items
  }

  const openBranchContextMenu = (event: React.MouseEvent, target: BranchTarget): void => {
    event.preventDefault()
    event.stopPropagation()
    openContextMenu(event.clientX, event.clientY, contextItems(target))
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="repo-pill"
        title={t('toolbar.switchBranch')}
        aria-haspopup="menu"
        aria-expanded={position !== null}
        onClick={toggle}
      >
        <span className="repo-pill-stack">
          <span className="repo-pill-label">{t('toolbar.branch')}</span>
          <strong>
            <GitBranch size={12} /> {repo.branches.current || t('toolbar.noBranch')}
          </strong>
        </span>
        <ChevronDown size={13} />
      </button>

      {position &&
        createPortal(
          <div
            ref={popoverRef}
            className="branch-picker-popover"
            role="menu"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight
            }}
          >
            <div className="branch-picker-search">
              <Search size={13} aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder={t('worktree.branchSearch')}
                aria-label={t('worktree.branchSearch')}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={onSearchKey}
              />
            </div>
            <div className="branch-picker-scroll">
              {navTargets.length === 0 && (
                <div className="branch-picker-empty">{t('cmdp.noMatches')}</div>
              )}
              {locals.length > 0 && (
                <>
                  <div className="branch-picker-heading">{t('sidebar.local')}</div>
                  {locals.map((branch, i) => (
                    <button
                      key={`local:${branch.name}`}
                      type="button"
                      data-idx={i}
                      className={`branch-picker-item ${branch.isCurrent ? 'active' : ''} ${i === activeIndex ? 'focused' : ''}`}
                      role="menuitem"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => activate({ kind: 'local', branch })}
                      onContextMenu={(event) => openBranchContextMenu(event, { kind: 'local', branch })}
                    >
                      <span className="branch-picker-check">{branch.isCurrent && <Check size={15} />}</span>
                      <span className="branch-picker-name">{branch.name}</span>
                      {branch.isCurrent && (
                        <span className="branch-picker-current">{t('worktree.currentBadge')}</span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {remotes.length > 0 && (
                <>
                  <div className="branch-picker-separator" />
                  <div className="branch-picker-heading">{t('sidebar.remotes')}</div>
                  {remotes.map((branch, j) => {
                    const idx = locals.length + j
                    return (
                      <button
                        key={`remote:${branch.fullName}`}
                        type="button"
                        data-idx={idx}
                        className={`branch-picker-item ${idx === activeIndex ? 'focused' : ''}`}
                        role="menuitem"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => activate({ kind: 'remote', branch })}
                        onContextMenu={(event) => openBranchContextMenu(event, { kind: 'remote', branch })}
                      >
                        <span className="branch-picker-check" />
                        <span className="branch-picker-name">{branch.fullName}</span>
                      </button>
                    )
                  })}
                </>
              )}
            </div>

            <div className="branch-picker-separator" />
            <button
              type="button"
              className="branch-picker-item branch-picker-new"
              role="menuitem"
              onClick={() => {
                close()
                openModal({ kind: 'create-branch', path, currentBranch: repo.branches.current })
              }}
            >
              <span className="branch-picker-check">
                <GitBranchPlus size={15} />
              </span>
              <span className="branch-picker-name">{t('tools.newBranch')}</span>
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
