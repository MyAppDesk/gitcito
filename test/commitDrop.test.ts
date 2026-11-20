import { describe, it, expect } from 'vitest'
import { commitDropActions } from '../src/renderer/src/lib/commitDrop'

const ids = (...a: Parameters<typeof commitDropActions>): string[] => commitDropActions(...a).map((x) => x.id)

describe('commitDropActions', () => {
  it('onto the current branch: cherry-pick here, or reset it to the commit', () => {
    expect(ids({ name: 'main', kind: 'local' }, { currentBranch: 'main', commit: 'abc' })).toEqual(['cherryPick', 'resetCurrent'])
  })

  it('onto another local branch: check it out and cherry-pick, or move it', () => {
    expect(ids({ name: 'feat', kind: 'local' }, { currentBranch: 'main', commit: 'abc' })).toEqual(['checkoutCherryPick', 'moveBranch'])
  })

  it('offers nothing for remote branches, tags, or the commit the branch already points at', () => {
    expect(ids({ name: 'origin/main', kind: 'remote' }, { currentBranch: 'main', commit: 'abc' })).toEqual([])
    expect(ids({ name: 'v1.0', kind: 'tag' }, { currentBranch: 'main', commit: 'abc' })).toEqual([])
    expect(ids({ name: 'feat', kind: 'local' }, { currentBranch: 'main', targetHead: 'abc', commit: 'abc' })).toEqual([])
  })
})
