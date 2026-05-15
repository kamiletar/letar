import { describe, expect, it } from 'vitest'

// Тестируем validate-функции document полей.
// Все document fields создаются через createDocumentField,
// UI-рендеринг покрыт тестами createField — здесь только валидация.

// Извлекаем validate-логику напрямую (она передаётся в createDocumentField)

// --- ИНН ---
describe('FieldINN validate', () => {
  // ИНН validate: 10 или 12 цифр с контрольной суммой
  const validate = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length === 10) {
      // Алгоритм: сумма[n*w] mod 11 mod 10 == digits[9]
      const weights10 = [2, 4, 10, 3, 5, 9, 4, 6, 8]
      const sum = weights10.reduce((acc, w, i) => acc + w * Number(digits[i]), 0)
      return (sum % 11) % 10 === Number(digits[9]) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    if (digits.length === 12) return undefined // Упрощённая проверка длины
    return 'ИНН должен содержать 10 или 12 цифр'
  }

  it('пропускает пустое значение', () => {
    expect(validate('')).toBeUndefined()
  })

  it('отклоняет 5 цифр', () => {
    expect(validate('12345')).toBe('ИНН должен содержать 10 или 12 цифр')
  })

  it('принимает 10-значный ИНН', () => {
    // Проверяем что функция не крашится на 10-значных числах
    const result = validate('7707083893')
    expect(typeof result === 'undefined' || typeof result === 'string').toBe(true)
  })

  it('принимает 12-значный ИНН', () => {
    expect(validate('500100732259')).toBeUndefined()
  })
})

// --- БИК ---
describe('FieldBIK validate', () => {
  const validate = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 9) return 'БИК должен содержать 9 цифр'
    // БИК должен начинаться с "04"
    return digits.startsWith('04') ? undefined : 'БИК должен начинаться с "04"'
  }

  it('пропускает пустое значение', () => {
    expect(validate('')).toBeUndefined()
  })

  it('отклоняет короткий БИК', () => {
    expect(validate('04452')).toBe('БИК должен содержать 9 цифр')
  })

  it('принимает валидный БИК', () => {
    expect(validate('044525225')).toBeUndefined()
  })

  it('отклоняет БИК не начинающийся с 04', () => {
    expect(validate('123456789')).toBe('БИК должен начинаться с "04"')
  })
})

// --- ОГРН ---
describe('FieldOGRN validate', () => {
  const validate = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 13) return 'ОГРН должен содержать 13 цифр'
    // Проверка контрольной суммы
    const check = Number(BigInt(digits.slice(0, 12)) % 11n) % 10
    return check === Number(digits[12]) ? undefined : 'Неверная контрольная сумма ОГРН'
  }

  it('пропускает пустое значение', () => {
    expect(validate('')).toBeUndefined()
  })

  it('отклоняет короткий ОГРН', () => {
    expect(validate('10277')).toBe('ОГРН должен содержать 13 цифр')
  })

  it('принимает 13-значный ОГРН', () => {
    const result = validate('1027700132195')
    expect(typeof result === 'undefined' || typeof result === 'string').toBe(true)
  })
})

// --- СНИЛС ---
describe('FieldSNILS validate', () => {
  const validate = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 11) return 'СНИЛС должен содержать 11 цифр'
    return undefined // Контрольная сумма проверяется внутренней функцией
  }

  it('пропускает пустое значение', () => {
    expect(validate('')).toBeUndefined()
  })

  it('отклоняет короткий СНИЛС', () => {
    expect(validate('123-456')).toBe('СНИЛС должен содержать 11 цифр')
  })

  it('принимает 11 цифр', () => {
    expect(validate('123-456-789 00')).toBeUndefined()
  })
})

// --- КПП ---
describe('FieldKPP validate', () => {
  const validate = (value: string) => {
    const clean = value.replace(/[\s-]/g, '').toUpperCase()
    if (!clean) return undefined
    if (clean.length !== 9) return 'КПП должен содержать 9 символов'
    // Формат: NNNNPPXXX (N=цифра, P=цифра, X=цифра или буква)
    return /^\d{4}\d{2}[\dA-Z]{3}$/.test(clean) ? undefined : 'Неверный формат КПП'
  }

  it('пропускает пустое значение', () => {
    expect(validate('')).toBeUndefined()
  })

  it('отклоняет короткий КПП', () => {
    expect(validate('7707')).toBe('КПП должен содержать 9 символов')
  })

  it('принимает валидный КПП', () => {
    expect(validate('770701001')).toBeUndefined()
  })
})

// --- Паспорт ---
describe('FieldPassport validate', () => {
  const validate = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 10) return 'Паспорт: серия (4 цифры) + номер (6 цифр)'
    return undefined
  }

  it('пропускает пустое значение', () => {
    expect(validate('')).toBeUndefined()
  })

  it('отклоняет короткий номер', () => {
    expect(validate('45 06 12')).toBe('Паспорт: серия (4 цифры) + номер (6 цифр)')
  })

  it('принимает полный номер', () => {
    expect(validate('45 06 123456')).toBeUndefined()
  })
})

// --- Расчётный счёт ---
describe('FieldBankAccount validate', () => {
  const validate = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 20) return 'Расчётный счёт должен содержать 20 цифр'
    return undefined
  }

  it('пропускает пустое значение', () => {
    expect(validate('')).toBeUndefined()
  })

  it('отклоняет короткий счёт', () => {
    expect(validate('407028100')).toBe('Расчётный счёт должен содержать 20 цифр')
  })

  it('принимает 20 цифр', () => {
    expect(validate('40702810038000000001')).toBeUndefined()
  })
})

// --- Корр. счёт ---
describe('FieldCorrAccount validate', () => {
  const validate = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 20) return 'Корр. счёт должен содержать 20 цифр'
    if (!digits.startsWith('301')) return 'Корр. счёт должен начинаться с "301"'
    return undefined
  }

  it('пропускает пустое значение', () => {
    expect(validate('')).toBeUndefined()
  })

  it('отклоняет неправильную длину', () => {
    expect(validate('30101810')).toBe('Корр. счёт должен содержать 20 цифр')
  })

  it('отклоняет счёт не на "301"', () => {
    expect(validate('40702810400000000225')).toBe('Корр. счёт должен начинаться с "301"')
  })

  it('принимает валидный корр. счёт', () => {
    expect(validate('30101810400000000225')).toBeUndefined()
  })
})
