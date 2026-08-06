// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import * as validationUtils from './index'

describe('index (публичный API @letar/validation-utils)', () => {
  it('реэкспортирует все схемы паролей', () => {
    expect(validationUtils.passwordSchema).toBeDefined()
    expect(validationUtils.strongPasswordSchema).toBeDefined()
    expect(typeof validationUtils.withPasswordConfirmation).toBe('function')
  })

  it('реэкспортирует общие схемы', () => {
    expect(validationUtils.emailSchema).toBeDefined()
    expect(validationUtils.nameSchema).toBeDefined()
    expect(validationUtils.tokenSchema).toBeDefined()
    expect(typeof validationUtils.requiredCheckbox).toBe('function')
  })

  it('реэкспортирует схемы телефонов', () => {
    expect(validationUtils.phoneSchema).toBeDefined()
    expect(validationUtils.requiredPhoneSchema).toBeDefined()
  })

  it('реэкспортирует схемы денежных сумм', () => {
    expect(validationUtils.priceSchema).toBeDefined()
    expect(validationUtils.optionalPriceSchema).toBeDefined()
    expect(typeof validationUtils.createPriceSchema).toBe('function')
  })
})
