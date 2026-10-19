import { describe, expect, it } from 'vitest'
import { camelCaseToLabel } from './camel-case-to-label'

describe('camelCaseToLabel', () => {
  it('camelCase → слова с заглавной', () => {
    expect(camelCaseToLabel('firstName')).toBe('First Name')
    expect(camelCaseToLabel('createdAt')).toBe('Created At')
    expect(camelCaseToLabel('email')).toBe('Email')
  })

  it('значение enum SCREAMING_SNAKE не рассыпается по буквам', () => {
    expect(camelCaseToLabel('DRAFT')).toBe('Draft')
    expect(camelCaseToLabel('ARCHIVED')).toBe('Archived')
    expect(camelCaseToLabel('IN_PROGRESS')).toBe('In Progress')
  })

  it('snake_case и kebab-case', () => {
    expect(camelCaseToLabel('in_progress')).toBe('In Progress')
    expect(camelCaseToLabel('on-hold')).toBe('On Hold')
  })

  it('аббревиатура внутри camelCase остаётся целой', () => {
    expect(camelCaseToLabel('userID')).toBe('User ID')
    expect(camelCaseToLabel('HTMLParser')).toBe('HTML Parser')
  })

  it('пустая строка и пробелы', () => {
    expect(camelCaseToLabel('')).toBe('')
    expect(camelCaseToLabel('  ')).toBe('')
  })
})
