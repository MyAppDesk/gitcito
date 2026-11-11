import { describe, it, expect } from 'vitest'
import { useUIStore } from '../src/renderer/src/stores/ui'

// Settings is itself a modal. A confirm asked from inside it used to replace it,
// so deleting a profile or disconnecting an account closed the screen the user
// was working in. Such questions go to the stacked `dialog` slot instead.
describe('stacked dialog over a modal', () => {
  const confirm = { kind: 'confirm' as const, title: 'Delete?', message: 'm', onConfirm: () => undefined }

  it('opens over the modal and leaves it in place', () => {
    useUIStore.getState().openModal({ kind: 'settings' })
    useUIStore.getState().openDialog(confirm)
    expect(useUIStore.getState().modal?.kind).toBe('settings')
    expect(useUIStore.getState().dialog).toBe(confirm)
    useUIStore.getState().closeDialog()
    expect(useUIStore.getState().modal?.kind).toBe('settings')
    expect(useUIStore.getState().dialog).toBeNull()
  })

  it('goes with the modal it was asked over', () => {
    useUIStore.getState().openModal({ kind: 'settings' })
    useUIStore.getState().openDialog(confirm)
    useUIStore.getState().closeModal()
    expect(useUIStore.getState().dialog).toBeNull()
    useUIStore.getState().openModal({ kind: 'settings' })
    useUIStore.getState().openDialog(confirm)
    useUIStore.getState().openModal({ kind: 'settings', page: 'profile' })
    expect(useUIStore.getState().dialog).toBeNull()
  })
})
