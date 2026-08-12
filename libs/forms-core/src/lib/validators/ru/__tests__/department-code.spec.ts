import { describe, expect, it } from 'vitest'
import { validateDepartmentCode } from '../department-code'
import { zRu } from '../index'

describe('Код подразделения', () => {
  it('принимает эталонный код', () => {
    expect(validateDepartmentCode('770001')).toBe(true)
  })

  it('принимает код с разделителем', () => {
    const result = zRu.departmentCode().safeParse('770-001')
    expect(result.success).toBe(true)
    if (result.success) { expect(result.data).toBe('770001') }
  })

  it('НЕ отклоняет третью цифру вне списка 0-3 (реальные данные содержат 4, 5, 9)', () => {
    expect(validateDepartmentCode('774001')).toBe(true)
    expect(validateDepartmentCode('775001')).toBe(true)
    expect(validateDepartmentCode('779001')).toBe(true)
  })

  it('принимает нулевые последние три цифры', () => {
    expect(validateDepartmentCode('770000')).toBe(true)
  })

  it('отклоняет неправильную длину', () => {
    expect(validateDepartmentCode('77000')).toBe(false) // 5 цифр
    expect(validateDepartmentCode('7700011')).toBe(false) // 7 цифр
  })
})
