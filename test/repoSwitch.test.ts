import { describe, it, expect } from 'vitest'
import { trackRepoSwitch, type RepoSwitchSlot } from '../src/renderer/src/lib/repoSwitch'

const slot = (): RepoSwitchSlot & { value: string | null } => {
  const s = {
    value: null as string | null,
    get: () => s.value,
    set: (p: string | null) => {
      s.value = p
    }
  }
  return s
}

const deferred = (): { promise: Promise<void>; resolve: () => void; reject: (e: Error) => void } => {
  let resolve!: () => void
  let reject!: (e: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('trackRepoSwitch', () => {
  it('marks the repository while its refresh runs, and clears it when the data is in', async () => {
    const s = slot()
    const work = deferred()
    const tracked = trackRepoSwitch('/a', work.promise, s)
    expect(s.value).toBe('/a')
    work.resolve()
    await tracked
    expect(s.value).toBeNull()
  })

  it("a slower, earlier refresh never clears a newer switch's marker (A → B → A)", async () => {
    const s = slot()
    const firstA = deferred()
    const b = deferred()
    const secondA = deferred()
    const t1 = trackRepoSwitch('/a', firstA.promise, s)
    const t2 = trackRepoSwitch('/b', b.promise, s)
    const t3 = trackRepoSwitch('/a', secondA.promise, s)
    b.resolve()
    await t2
    expect(s.value).toBe('/a') // B finishing does not touch A's marker
    firstA.resolve()
    await t1
    expect(s.value).toBe('/a') // the first A finishing does not clear the second A's marker
    secondA.resolve()
    await t3
    expect(s.value).toBeNull()
  })

  it('clears the marker when the refresh fails, without rethrowing (the refresh reports its own error)', async () => {
    const s = slot()
    const work = deferred()
    const tracked = trackRepoSwitch('/a', work.promise, s)
    work.reject(new Error('fatal: not a git repository'))
    await expect(tracked).resolves.toBeUndefined()
    expect(s.value).toBeNull()
  })
})
