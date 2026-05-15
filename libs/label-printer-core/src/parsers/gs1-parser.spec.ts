import { describe, expect, it } from 'vitest'
import { InvalidCodeFormatError, InvalidGTINError } from '../utils/errors'
import { GS1Parser } from './gs1-parser'

describe('GS1Parser', () => {
  // Валидный GTIN-14 с правильной контрольной суммой
  // 04610000000007 — вычислена правильная контрольная сумма
  const VALID_GTIN = '04610000000007'

  describe('parse', () => {
    describe('валидные коды', () => {
      it('парсит минимальный валидный код', () => {
        const code = `01${VALID_GTIN}21SN12345691CRYPT`
        const result = GS1Parser.parse(code)

        expect(result.fullCode).toBe(code)
        expect(result.gtin).toBe(VALID_GTIN)
        expect(result.serialNumber).toBe('SN123456')
        expect(result.cryptoCode).toBe('CRYPT')
        expect(result.additionalData).toBeUndefined()
      })

      it('парсит код с дополнительными данными (AI 92)', () => {
        const code = `01${VALID_GTIN}21SERIAL12391CRYPTO192TNVED`
        const result = GS1Parser.parse(code)

        expect(result.gtin).toBe(VALID_GTIN)
        expect(result.serialNumber).toBe('SERIAL123')
        expect(result.cryptoCode).toBe('CRYPTO1')
        expect(result.additionalData).toBe('TNVED')
      })

      it('парсит код с длинным серийным номером (до 20 символов)', () => {
        // Серийный номер 20 символов (без '91' внутри), затем AI 91
        const code = `01${VALID_GTIN}21ABCDEFGHIJKLMNOPQRST91CRYPTO`
        const result = GS1Parser.parse(code)

        expect(result.serialNumber).toBe('ABCDEFGHIJKLMNOPQRST')
        expect(result.serialNumber).toHaveLength(20)
        expect(result.cryptoCode).toBe('CRYPTO')
      })

      it('парсит реальный код маркировки', () => {
        const realCode = `01${VALID_GTIN}21XYZ78991ABCD1234`
        const result = GS1Parser.parse(realCode)

        expect(result.gtin).toBe(VALID_GTIN)
        expect(result.serialNumber).toBe('XYZ789')
        expect(result.cryptoCode).toBe('ABCD1234')
      })
    })

    describe('ошибки формата', () => {
      it('выбрасывает ошибку для слишком короткого кода', () => {
        const shortCode = '0104610000000007'

        expect(() => GS1Parser.parse(shortCode)).toThrow(InvalidCodeFormatError)
        expect(() => GS1Parser.parse(shortCode)).toThrow(/too short/)
      })

      it('выбрасывает ошибку если код не начинается с 01', () => {
        const badPrefix = `02${VALID_GTIN}21SERIAL91CRYPTO`

        expect(() => GS1Parser.parse(badPrefix)).toThrow(InvalidCodeFormatError)
        expect(() => GS1Parser.parse(badPrefix)).toThrow(/must start with AI "01"/)
      })

      it('выбрасывает ошибку при отсутствии AI 21 (серийный номер)', () => {
        // Код без AI 21 — используем другой разделитель
        const noSerial = `01${VALID_GTIN}22SERIAL91CRYPTO123`

        expect(() => GS1Parser.parse(noSerial)).toThrow(InvalidCodeFormatError)
        expect(() => GS1Parser.parse(noSerial)).toThrow(/Missing AI "21"/)
      })

      it('выбрасывает ошибку при отсутствии AI 91 (crypto)', () => {
        // Код без AI 91
        const noCrypto = `01${VALID_GTIN}21SERIAL1234567890`

        expect(() => GS1Parser.parse(noCrypto)).toThrow(InvalidCodeFormatError)
        expect(() => GS1Parser.parse(noCrypto)).toThrow(/Missing AI "91"/)
      })

      it('выбрасывает ошибку если серийный номер пустой', () => {
        // AI 21 сразу за AI 91
        const emptySerial = `01${VALID_GTIN}2191CRYPTO1234`

        expect(() => GS1Parser.parse(emptySerial)).toThrow(InvalidCodeFormatError)
        expect(() => GS1Parser.parse(emptySerial)).toThrow(/Invalid serial number length/)
      })

      it('выбрасывает ошибку если серийный номер слишком длинный', () => {
        // Серийный номер > 20 символов
        const longSerial = `01${VALID_GTIN}21ABCDEFGHIJ12345678901291CRYPTO`

        expect(() => GS1Parser.parse(longSerial)).toThrow(InvalidCodeFormatError)
        expect(() => GS1Parser.parse(longSerial)).toThrow(/Invalid serial number length/)
      })

      it('выбрасывает ошибку если crypto tail слишком короткий', () => {
        // Crypto < 4 символов
        const shortCrypto = `01${VALID_GTIN}21SERIAL12345691XYZ`

        expect(() => GS1Parser.parse(shortCrypto)).toThrow(InvalidCodeFormatError)
        expect(() => GS1Parser.parse(shortCrypto)).toThrow(/Crypto tail too short/)
      })
    })

    describe('ошибки GTIN', () => {
      it('выбрасывает ошибку для GTIN с буквами', () => {
        // GTIN содержит букву 'A' вместо цифры
        const letterGtin = '0104610000A0000721SERIAL91CRYPTO'

        expect(() => GS1Parser.parse(letterGtin)).toThrow(InvalidGTINError)
        expect(() => GS1Parser.parse(letterGtin)).toThrow(/must be 14 digits/)
      })

      it('выбрасывает ошибку для GTIN со спецсимволами', () => {
        const specialGtin = '010461000-000721SERIAL91CRYPTO1'

        expect(() => GS1Parser.parse(specialGtin)).toThrow(InvalidGTINError)
        expect(() => GS1Parser.parse(specialGtin)).toThrow(/must be 14 digits/)
      })

      it('выбрасывает ошибку для неверной контрольной суммы GTIN', () => {
        // GTIN с неправильной контрольной суммой (04610000000004 вместо 07)
        const badChecksum = '01046100000000042120SERIAL91CRYPTO1'

        expect(() => GS1Parser.parse(badChecksum)).toThrow(InvalidGTINError)
        expect(() => GS1Parser.parse(badChecksum)).toThrow(/Invalid GTIN checksum/)
      })
    })

    describe('граничные случаи', () => {
      it('обрабатывает код с пробелами в начале и конце', () => {
        const code = `  01${VALID_GTIN}21SERIAL91CRYPTO  `
        const result = GS1Parser.parse(code)

        expect(result.gtin).toBe(VALID_GTIN)
      })

      it('парсит код с минимальным crypto (4 символа)', () => {
        const code = `01${VALID_GTIN}21SERIAL1234591ABCD`
        const result = GS1Parser.parse(code)

        expect(result.cryptoCode).toBe('ABCD')
      })
    })
  })

  describe('validateGTINChecksum', () => {
    it('возвращает true для валидного GTIN', () => {
      // 04610000000007 - правильная контрольная сумма
      expect(GS1Parser.validateGTINChecksum('04610000000007')).toBe(true)
    })

    it('возвращает false для невалидного GTIN', () => {
      // 04610000000005 - неправильная контрольная сумма
      expect(GS1Parser.validateGTINChecksum('04610000000005')).toBe(false)
    })

    it('возвращает false для GTIN неправильной длины', () => {
      expect(GS1Parser.validateGTINChecksum('0461000000000')).toBe(false)
      expect(GS1Parser.validateGTINChecksum('046100000000007')).toBe(false)
    })

    it('возвращает false для GTIN с буквами', () => {
      expect(GS1Parser.validateGTINChecksum('0461000000000A')).toBe(false)
    })

    it('валидирует известные GTIN', () => {
      // Примеры реальных GTIN с правильными контрольными суммами
      expect(GS1Parser.validateGTINChecksum('00012345678905')).toBe(true) // GTIN-14
      expect(GS1Parser.validateGTINChecksum('04600000000008')).toBe(true) // Российский префикс
    })
  })

  describe('extractGTIN13', () => {
    it('извлекает GTIN-13 из GTIN-14 с ведущим нулём', () => {
      const gtin14 = '04610000000007'
      const gtin13 = GS1Parser.extractGTIN13(gtin14)

      expect(gtin13).toBe('4610000000007')
      expect(gtin13).toHaveLength(13)
    })

    it('извлекает последние 13 цифр если первая не ноль', () => {
      const gtin14 = '14610000000002'
      const gtin13 = GS1Parser.extractGTIN13(gtin14)

      expect(gtin13).toBe('4610000000002')
      expect(gtin13).toHaveLength(13)
    })

    it('выбрасывает ошибку для GTIN не из 14 цифр', () => {
      expect(() => GS1Parser.extractGTIN13('461000000000')).toThrow('GTIN must be 14 digits')
      expect(() => GS1Parser.extractGTIN13('046100000000007')).toThrow('GTIN must be 14 digits')
    })
  })
})
