import { camelCaseToLabel } from './index'

describe('camelCaseToLabel', () => {
  it('должен преобразовать camelCase в читаемый label', () => {
    expect(camelCaseToLabel('firstName')).toBe('First Name')
    expect(camelCaseToLabel('lastName')).toBe('Last Name')
    expect(camelCaseToLabel('email')).toBe('Email')
    expect(camelCaseToLabel('phoneNumber')).toBe('Phone Number')
    expect(camelCaseToLabel('isActive')).toBe('Is Active')
    expect(camelCaseToLabel('createdAt')).toBe('Created At')
  })

  it('должен обработать простые слова', () => {
    expect(camelCaseToLabel('name')).toBe('Name')
    expect(camelCaseToLabel('age')).toBe('Age')
    expect(camelCaseToLabel('id')).toBe('Id')
  })

  it('должен обработать пустую строку', () => {
    expect(camelCaseToLabel('')).toBe('')
  })
})
