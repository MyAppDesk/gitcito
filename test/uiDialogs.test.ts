import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore, type ModalSpec } from '../src/renderer/src/stores/ui'

// A confirm opened from inside a modal used to replace it: deleting an AI
// account closed Settings, and "Cancel" lost the modal as well.
describe('a question asked over a modal', () => {
  const settings = { kind: 'settings', page: 'ai' } as ModalSpec
  const confirm: ModalSpec = { kind: 'confirm', title: 'Delete?', message: 'Sure?', onConfirm: () => undefined }
  const input: ModalSpec = { kind: 'input', title: 'Name', label: 'Name', onSubmit: () => undefined }
  const ui = (): ReturnType<typeof useUIStore.getState> => useUIStore.getState()

  beforeEach(() => ui().closeModal())

  it('stacks a confirm over the open modal instead of replacing it', () => {
    ui().openModal(settings)
    ui().openModal(confirm)
    expect(ui().modal).toBe(settings)
    expect(ui().dialog).toBe(confirm)
  })

  it('stacks a one-line input the same way', () => {
    ui().openModal(settings)
    ui().openModal(input)
    expect(ui().modal).toBe(settings)
    expect(ui().dialog).toBe(input)
  })

  it('leaves the modal open when the question is answered or cancelled', () => {
    ui().openModal(settings)
    ui().openModal(confirm)
    ui().closeDialog()
    expect(ui().modal).toBe(settings)
    expect(ui().dialog).toBeNull()
  })

  it('still closes both when the caller closes the modal after the answer', () => {
    ui().openModal(settings)
    ui().openModal(confirm)
    ui().closeModal()
    expect(ui().modal).toBeNull()
    expect(ui().dialog).toBeNull()
  })

  it('opens a confirm in the modal slot when nothing is open', () => {
    ui().openModal(confirm)
    expect(ui().modal).toBe(confirm)
    expect(ui().dialog).toBeNull()
  })

  it('still replaces the modal with another full modal, dropping any dialog', () => {
    const clone = { kind: 'clone' } as ModalSpec
    ui().openModal(settings)
    ui().openModal(confirm)
    ui().openModal(clone)
    expect(ui().modal).toBe(clone)
    expect(ui().dialog).toBeNull()
  })
})
