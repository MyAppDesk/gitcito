import { describe, expect, it } from 'vitest'
import { githubRepoUrl } from '../src/renderer/src/lib/hosting'
import {
  applyRepoAlias,
  canonicalRepoName,
  canonicalRepoPath,
  migrateRepoAliases,
  repoDisplayName
} from '../src/renderer/src/lib/repoAlias'
import {
  openRepoSwitcherEntries,
  repoMenuActionTarget,
  repoMenuEntries,
  repoMenuIds,
  type RepoMenuCapabilities
} from '../src/renderer/src/lib/repositoryMenu'
import { defaultSettings, type AppSettings, type GroupTab, type RepoTab } from '../src/shared/types'

const caps = (over: Partial<RepoMenuCapabilities> = {}): RepoMenuCapabilities => ({
  path: '/Users/me/src/gitcito',
  canonicalName: 'gitcito',
  alias: null,
  pathAvailable: true,
  githubUrl: 'https://github.com/ThalesMMS/gitcito',
  editorAvailable: true,
  editorName: 'VS Code',
  terminalAvailable: true,
  gitBusy: false,
  platform: 'darwin',
  ...over
})

const actionIds = (c: RepoMenuCapabilities): string[] =>
  repoMenuEntries(c).flatMap((e) => (e.kind === 'action' ? [e.id] : [`sep`]))

describe('canonical repository identity', () => {
  it('uses the last path segment as the canonical name on POSIX and Windows', () => {
    expect(canonicalRepoName('/Users/me/src/gitcito')).toBe('gitcito')
    expect(canonicalRepoName('C:\\Users\\me\\src\\gitcito')).toBe('gitcito')
    expect(canonicalRepoName('C:/Users/me/src/gitcito/')).toBe('gitcito')
  })

  it('canonicalizes Windows and POSIX paths to one alias key', () => {
    expect(canonicalRepoPath('C:\\Users\\me\\src\\gitcito')).toBe('c:/Users/me/src/gitcito')
    expect(canonicalRepoPath('C:/Users/me/src/gitcito/')).toBe('c:/Users/me/src/gitcito')
    expect(canonicalRepoPath('/Users/me/src/gitcito/')).toBe('/Users/me/src/gitcito')
  })

  it('prefers the path-keyed alias over a leftover RepoRef.name', () => {
    const aliases = { '/repos/gitcito': 'Work' }
    expect(repoDisplayName('/repos/gitcito', aliases, 'old-chip-name')).toBe('Work')
    expect(repoDisplayName('/repos/gitcito', {}, 'old-chip-name')).toBe('old-chip-name')
    expect(repoDisplayName('/repos/gitcito', {}, undefined)).toBe('gitcito')
  })
})

describe('githubRepoUrl', () => {
  it('prefers origin when it is a GitHub remote', () => {
    expect(
      githubRepoUrl([
        { name: 'upstream', url: 'https://github.com/other/fork.git' },
        { name: 'origin', url: 'git@github.com:ThalesMMS/gitcito.git' }
      ])
    ).toBe('https://github.com/ThalesMMS/gitcito')
  })

  it('falls back to the first parseable GitHub remote when origin is not GitHub', () => {
    expect(
      githubRepoUrl([
        { name: 'origin', url: 'https://gitlab.com/acme/app.git' },
        { name: 'github', url: 'https://github.com/acme/app.git' }
      ])
    ).toBe('https://github.com/acme/app')
  })

  it('normalizes SSH, HTTPS and ssh:// GitHub remotes', () => {
    expect(githubRepoUrl([{ name: 'origin', url: 'git@github.com:o/r.git' }])).toBe('https://github.com/o/r')
    expect(githubRepoUrl([{ name: 'origin', url: 'https://github.com/o/r.git' }])).toBe('https://github.com/o/r')
    expect(githubRepoUrl([{ name: 'origin', url: 'ssh://git@github.com/o/r.git' }])).toBe('https://github.com/o/r')
  })

  it('returns undefined for GitLab-only or unparseable remotes', () => {
    expect(githubRepoUrl([{ name: 'origin', url: 'https://gitlab.com/acme/app.git' }])).toBeUndefined()
    expect(githubRepoUrl([{ name: 'origin', url: 'not-a-url' }])).toBeUndefined()
    expect(githubRepoUrl([])).toBeUndefined()
  })
})

describe('repository context menu builder', () => {
  it('keeps GitHub Desktop order and grouping', () => {
    expect(actionIds(caps())).toEqual([
      'createAlias',
      'showWorktrees',
      'newWorktree',
      'copyName',
      'copyPath',
      'sep',
      'viewOnGitHub',
      'openTerminal',
      'reveal',
      'openEditor',
      'sep',
      'remove'
    ])
  })

  it('offers Change Alias and Remove Alias when an alias exists', () => {
    expect(actionIds(caps({ alias: 'Work' }))).toEqual([
      'changeAlias',
      'removeAlias',
      'showWorktrees',
      'newWorktree',
      'copyName',
      'copyPath',
      'sep',
      'viewOnGitHub',
      'openTerminal',
      'reveal',
      'openEditor',
      'sep',
      'remove'
    ])
  })

  it('uses platform-specific reveal labels', () => {
    expect(repoMenuEntries(caps({ platform: 'darwin' })).find((e) => e.kind === 'action' && e.id === 'reveal'))
      .toMatchObject({ labelKey: 'repoMenu.revealFinder' })
    expect(repoMenuEntries(caps({ platform: 'win32' })).find((e) => e.kind === 'action' && e.id === 'reveal'))
      .toMatchObject({ labelKey: 'repoMenu.revealExplorer' })
    expect(repoMenuEntries(caps({ platform: 'linux' })).find((e) => e.kind === 'action' && e.id === 'reveal'))
      .toMatchObject({ labelKey: 'repoMenu.revealFileManager' })
  })

  it('keeps unavailable integrations visible but disabled', () => {
    const entries = repoMenuEntries(
      caps({ githubUrl: null, editorAvailable: false, terminalAvailable: false })
    )
    const byId = Object.fromEntries(
      entries.filter((e) => e.kind === 'action').map((e) => [e.id, e])
    )
    expect(byId.viewOnGitHub.disabled).toBe(true)
    expect(byId.openEditor.disabled).toBe(true)
    expect(byId.openTerminal.disabled).toBe(true)
    expect(repoMenuIds(entries)).toEqual(expect.arrayContaining(['viewOnGitHub', 'openEditor', 'openTerminal']))
  })

  it('disables open/inspect actions for a missing path but keeps copy, alias and remove', () => {
    const entries = repoMenuEntries(caps({ pathAvailable: false }))
    const byId = Object.fromEntries(
      entries.filter((e) => e.kind === 'action').map((e) => [e.id, e])
    )
    expect(byId.createAlias.disabled).toBe(false)
    expect(byId.copyName.disabled).toBe(false)
    expect(byId.copyPath.disabled).toBe(false)
    expect(byId.remove.disabled).toBe(false)
    expect(byId.showWorktrees.disabled).toBe(true)
    expect(byId.newWorktree.disabled).toBe(true)
    expect(byId.openTerminal.disabled).toBe(true)
    expect(byId.reveal.disabled).toBe(true)
    expect(byId.openEditor.disabled).toBe(true)
    expect(byId.viewOnGitHub.disabled).toBe(false)
  })

  it('disables worktree mutation during an incompatible git operation', () => {
    const entries = repoMenuEntries(caps({ gitBusy: true }))
    const byId = Object.fromEntries(
      entries.filter((e) => e.kind === 'action').map((e) => [e.id, e])
    )
    expect(byId.showWorktrees.disabled).toBe(false)
    expect(byId.newWorktree.disabled).toBe(true)
    expect(byId.reveal.disabled).toBe(false)
  })

  it('is repository-scoped: grouped and nested-folder surfaces share the same action ids', () => {
    const standalone = repoMenuIds(repoMenuEntries(caps()))
    const grouped = repoMenuIds(repoMenuEntries(caps({ path: '/repos/nested/app' })))
    expect(grouped).toEqual(standalone)
  })
})

describe('toolbar repository switcher entries', () => {
  it('lists standalone tabs and group members, skipping page tabs', () => {
    const { tabs } = settingsWithRepos()
    expect(openRepoSwitcherEntries(tabs)).toEqual([
      { tabId: 't1', tabKind: 'repo', groupName: null, path: '/repos/gitcito', name: 'gitcito' },
      { tabId: 'g1', tabKind: 'group', groupName: 'Work', path: '/repos/gitcito', name: 'gitcito' },
      { tabId: 'g1', tabKind: 'group', groupName: 'Work', path: '/repos/other', name: 'other' }
    ])
  })

  it('omits page tabs', () => {
    expect(
      openRepoSwitcherEntries([
        {
          id: 'p1',
          kind: 'page',
          name: 'Vault',
          page: { type: 'vault' }
        }
      ])
    ).toEqual([])
  })
})

describe('repository menu action routing', () => {
  it('copies the canonical name, not the display alias', () => {
    expect(repoMenuActionTarget('copyName', caps({ alias: 'Work', canonicalName: 'gitcito' }))).toEqual({
      copy: 'gitcito'
    })
  })

  it('copies the absolute repository path', () => {
    expect(repoMenuActionTarget('copyPath', caps({ path: 'C:\\src\\gitcito' }))).toEqual({
      copy: 'C:\\src\\gitcito'
    })
  })

  it('opens the normalized GitHub web URL', () => {
    expect(
      repoMenuActionTarget('viewOnGitHub', caps({ githubUrl: 'https://github.com/ThalesMMS/gitcito' }))
    ).toEqual({ url: 'https://github.com/ThalesMMS/gitcito' })
  })

  it('targets the repository root for terminal, reveal and editor', () => {
    const path = '/Users/me/src/gitcito'
    expect(repoMenuActionTarget('openTerminal', caps({ path }))).toEqual({ path })
    expect(repoMenuActionTarget('reveal', caps({ path }))).toEqual({ path })
    expect(repoMenuActionTarget('openEditor', caps({ path }))).toEqual({ path })
  })
})

function settingsWithRepos(): AppSettings {
  const path = '/repos/gitcito'
  const other = '/repos/other'
  const repoTab: RepoTab = {
    id: 't1',
    kind: 'repo',
    name: 'gitcito',
    repos: [{ path, name: 'gitcito' }],
    activeRepoPath: path
  }
  const groupTab: GroupTab = {
    id: 'g1',
    kind: 'group',
    name: 'Work',
    repos: [
      { path, name: 'gitcito' },
      { path: other, name: 'other' }
    ],
    folders: [{ id: 'f1', name: 'Nested', paths: [path], folders: [] }],
    activeRepoPath: path
  }
  return {
    ...defaultSettings(),
    tabs: [repoTab, groupTab],
    recentRepos: [{ path, name: 'gitcito' }],
    workspaces: [
      { id: 'default', name: 'Gitcito', tabs: [repoTab, groupTab], activeTabId: 't1' },
      {
        id: 'personal',
        name: 'Personal',
        tabs: [
          {
            id: 't2',
            kind: 'repo',
            name: 'gitcito',
            repos: [{ path, name: 'gitcito' }],
            activeRepoPath: path
          }
        ],
        activeTabId: 't2'
      }
    ]
  }
}

describe('path-keyed aliases', () => {
  it('persists one display alias across standalone tabs, groups, nested folders and workspaces', () => {
    const next = applyRepoAlias(settingsWithRepos(), '/repos/gitcito', 'Work alias')
    expect(next.repoAliases[canonicalRepoPath('/repos/gitcito')]).toBe('Work alias')
    expect(next.tabs[0].name).toBe('Work alias')
    expect(next.tabs[0].kind === 'repo' && next.tabs[0].repos[0].name).toBe('Work alias')
    expect(next.tabs[1].kind === 'group' && next.tabs[1].repos[0].name).toBe('Work alias')
    expect(next.tabs[1].kind === 'group' && next.tabs[1].repos[1].name).toBe('other')
    expect(next.recentRepos[0].name).toBe('Work alias')
    const otherWs = next.workspaces.find((w) => w.id === 'personal')
    expect(otherWs?.tabs[0].name).toBe('Work alias')
    expect(otherWs?.tabs[0].kind === 'repo' && otherWs.tabs[0].repos[0].name).toBe('Work alias')
  })

  it('removing an alias restores the canonical folder name without touching the directory', () => {
    const aliased = applyRepoAlias(settingsWithRepos(), '/repos/gitcito', 'Work alias')
    const next = applyRepoAlias(aliased, '/repos/gitcito', null)
    expect(next.repoAliases['/repos/gitcito']).toBeUndefined()
    expect(next.tabs[0].name).toBe('gitcito')
    expect(next.tabs[0].kind === 'repo' && next.tabs[0].repos[0].name).toBe('gitcito')
  })

  it('migrates per-group RepoRef.name custom names into the shared alias map', () => {
    const s = settingsWithRepos()
    if (s.tabs[1].kind === 'group') {
      s.tabs[1] = {
        ...s.tabs[1],
        repos: s.tabs[1].repos.map((r) => (r.path === '/repos/gitcito' ? { ...r, name: 'Old group name' } : r))
      }
    }
    const next = migrateRepoAliases(s)
    expect(next.repoAliases['/repos/gitcito']).toBe('Old group name')
    expect(next.tabs[0].kind === 'repo' && next.tabs[0].repos[0].name).toBe('Old group name')
    expect(next.tabs[1].kind === 'group' && next.tabs[1].repos[0].name).toBe('Old group name')
  })

  it('does not treat the canonical folder name as an alias', () => {
    expect(migrateRepoAliases(settingsWithRepos()).repoAliases).toEqual({})
  })
})
