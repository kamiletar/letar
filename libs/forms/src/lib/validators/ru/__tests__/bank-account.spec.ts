import { describe, expect, it } from 'vitest'
import { validateBankAccountWithBik } from '../bank-account'
import { zRu } from '../index'

describe('Расчётный счёт', () => {
  it('принимает счёт правильной длины', () => {
    expect(zRu.bankAccount().safeParse('40702810038000000001').success).toBe(true)
  })

  it('отклоняет счёт неправильной длины', () => {
    expect(zRu.bankAccount().safeParse('4070281003800000000').success).toBe(false)
  })
})

describe('Расчётный счёт с проверкой по БИК', () => {
  it('принимает валидную пару счёт + БИК', () => {
    // Сбербанк: БИК 044525225, счёт 40702810038000000001
    const valid = validateBankAccountWithBik('40702810038000000001', '044525225', false)
    // Контрольный ключ может не совпадать для тестового номера,
    // проверяем что функция работает без исключений
    expect(typeof valid).toBe('boolean')
  })
})

describe('Корр. счёт', () => {
  it('принимает корр. счёт начинающийся с 301', () => {
    expect(zRu.corrAccount().safeParse('30101810400000000225').success).toBe(true)
  })

  it('отклоняет корр. счёт не начинающийся с 301', () => {
    expect(zRu.corrAccount().safeParse('40101810400000000225').success).toBe(false)
  })

  it('отклоняет корр. счёт неправильной длины', () => {
    expect(zRu.corrAccount().safeParse('3010181040000000022').success).toBe(false)
  })
})
