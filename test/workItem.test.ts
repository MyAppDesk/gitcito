import { describe, it, expect } from 'vitest'
import { azureOrgOf, slugify, workItemBranchName, workItemUrl } from '../src/renderer/src/lib/workItem'
import { remoteWebUrl } from '../src/renderer/src/lib/autolink'

describe('work item branch names', () => {
  it('slugifies titles, accents and symbols included', () => {
    expect(slugify('Corrigir validação do CPF (urgente!)')).toBe('corrigir-validacao-do-cpf-urgente')
    expect(slugify('  ---  ')).toBe('')
  })

  it('cuts a long title at a word boundary', () => {
    const s = slugify('a very long work item title that goes on and on well past the limit of fifty characters')
    expect(s.length).toBeLessThanOrEqual(50)
    expect(s.endsWith('-')).toBe(false)
  })

  it('prefixes bugs as bugfix and everything else as feature', () => {
    expect(workItemBranchName({ id: 123, title: 'Login fails on Safari', type: 'Bug' })).toBe('bugfix/123-login-fails-on-safari')
    expect(workItemBranchName({ id: 7, title: 'Add export', type: 'User Story' })).toBe('feature/7-add-export')
    expect(workItemBranchName({ id: 9, title: '!!!', type: 'Task' })).toBe('feature/9')
  })
})

describe('work item links', () => {
  it('reads the organization from Azure web URLs, current and legacy', () => {
    expect(azureOrgOf(remoteWebUrl('https://dev.azure.com/example-org/My%20Proj/_git/app'))).toBe('example-org')
    expect(azureOrgOf('https://example-org.visualstudio.com/proj/_git/app')).toBe('example-org')
    expect(azureOrgOf('https://github.com/o/r')).toBeNull()
  })

  it('builds the org-level work item URL', () => {
    expect(workItemUrl('example-org', 123)).toBe('https://dev.azure.com/example-org/_workitems/edit/123')
  })
})
