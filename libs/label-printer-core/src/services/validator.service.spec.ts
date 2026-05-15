import { describe, expect, it } from 'vitest'
import { InvalidCodeFormatError, InvalidGTINError } from '../utils/errors'
import { ValidatorService } from './validator.service'

describe('ValidatorService', () => {
  // Валидный GTIN-14 с правильной контрольной суммой
  const VALID_GTIN = '04610000000007'

  describe('validate', () => {
    it('возвращает MarkingCode для валидного кода', () => {
      const code = `01${VALID_GTIN}21SN12345691CRYPTO`
      const result = ValidatorService.validate(code)

      expect(result).toBeDefined()
      expect(result.gtin).toBe(VALID_GTIN)
      expect(result.serialNumber).toBe('SN123456')
      expect(result.cryptoCode).toBe('CRYPTO')
    })

    it('выбрасывает InvalidCodeFormatError для невалидного формата', () => {
      const shortCode = '01ABC'

      expect(() => ValidatorService.validate(shortCode)).toThrow(InvalidCodeFormatError)
    })

    it('выбрасывает InvalidGTINError для невалидного GTIN', () => {
      // Код с неверной контрольной суммой GTIN
      const badGtinCode = '01046100000000012112345691CRYPTO'

      expect(() => ValidatorService.validate(badGtinCode)).toThrow(InvalidGTINError)
    })

    it('делегирует валидацию в GS1Parser', () => {
      // Проверяем, что все поля MarkingCode заполнены
      const code = `01${VALID_GTIN}21SERIAL12391CODE192EXTRA`
      const result = ValidatorService.validate(code)

      expect(result.fullCode).toBe(code)
      expect(result.gtin).toBe(VALID_GTIN)
      expect(result.serialNumber).toBe('SERIAL123')
      expect(result.cryptoCode).toBe('CODE1')
      expect(result.additionalData).toBe('EXTRA')
    })
  })
})
