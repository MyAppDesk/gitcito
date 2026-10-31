import { describe, expect, it, vi } from 'vitest'
import type { TabState } from '../src/shared/types'

vi.mock('../src/renderer/src/infrastructure/api', () => ({
  settingsApi: { set: vi.fn(async () => undefined) },
  reposApi: {}
}))

import { useSettingsStore } from '../src/renderer/src/stores/settings'

const repo = (id: string): TabState =>
  ({ id, kind: 'repo', repos: [{ path: `/repos/${id}` }], activeRepo: `/repos/${id}` }) as unknown as TabState

describe('closeOtherTabs', () => {
  it('keeps only the chosen tab, makes it active, and ⌘⇧T brings the rest back in order', () => {
    const store = useSettingsStore.getState()
    const tabs = ['a', 'b', 'keep', 'c'].map(repo)
    store.update((s) => ({ ...s, workspaces: [], tabs, activeTabId: 'a' }))

    useSettingsStore.getState().closeOtherTabs('keep')
    let s = useSettingsStore.getState().settings
    expect(s.tabs.map((tab) => tab.id)).toEqual(['keep'])
    expect(s.activeTabId).toBe('keep')

    for (let i = 0; i < 3; i++) useSettingsStore.getState().reopenClosedTab()
    s = useSettingsStore.getState().settings
    expect(s.tabs.map((tab) => tab.id)).toEqual(['a', 'b', 'keep', 'c'])
  })

  it('keeps a batch larger than the usual ten-deep reopen stack', () => {
    const ids = Array.from({ length: 13 }, (_, i) => `t${i}`)
    useSettingsStore.getState().update((s) => ({ ...s, workspaces: [], tabs: ids.map(repo), activeTabId: 't0' }))
    useSettingsStore.getState().closeOtherTabs('t0')
    for (let i = 0; i < 12; i++) useSettingsStore.getState().reopenClosedTab()
    expect(useSettingsStore.getState().settings.tabs.map((tab) => tab.id)).toEqual(ids)
  })

  it('does nothing for an unknown tab or a lone one', () => {
    useSettingsStore.getState().update((s) => ({ ...s, workspaces: [], tabs: [repo('x')], activeTabId: 'x' }))
    const before = useSettingsStore.getState().settings
    useSettingsStore.getState().closeOtherTabs('x')
    useSettingsStore.getState().closeOtherTabs('missing')
    expect(useSettingsStore.getState().settings.tabs).toBe(before.tabs)
  })
})
