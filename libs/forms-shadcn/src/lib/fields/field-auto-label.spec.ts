import { describe, expect, it } from 'vitest'
import { camelCaseToLabel } from './field-auto'

describe('camelCaseToLabel (делегат на @letar/forms-core)', () => {
  it('значение enum в SCREAMING_CASE не рассыпается по буквам', () => {
    expect(camelCaseToLabel('DRAFT')).toBe('Draft')
    expect(camelCaseToLabel('IN_PROGRESS')).toBe('In Progress')
  })

  it('camelCase → слова по границе регистра, аббревиатура цела', () => {
    expect(camelCaseToLabel('firstName')).toBe('First Name')
    expect(camelCaseToLabel('userID')).toBe('User ID')
  })

  it('пустая строка → пустая подпись', () => {
    expect(camelCaseToLabel('')).toBe('')
  })
})
