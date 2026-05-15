import { describe, expect, it } from 'vitest'
import { formatPhoneNumber } from './format'

describe('formatPhoneNumber', () => {
  // Функция поддерживает только российские номера (+7)
  // Все номера форматируются как российские
  describe('Russian numbers (+7)', () => {
    it('should format +79991234567 to +7 (999) 123-45-67', () => {
      expect(formatPhoneNumber('+79991234567')).toBe('+7 (999) 123-45-67')
    })

    it('should format 79991234567 to +7 (999) 123-45-67', () => {
      expect(formatPhoneNumber('79991234567')).toBe('+7 (999) 123-45-67')
    })

    it('should format +7 999 123 45 67 to +7 (999) 123-45-67', () => {
      expect(formatPhoneNumber('+7 999 123 45 67')).toBe('+7 (999) 123-45-67')
    })

    it('should format +7(999)123-45-67 to +7 (999) 123-45-67', () => {
      expect(formatPhoneNumber('+7(999)123-45-67')).toBe('+7 (999) 123-45-67')
    })

    it('should format 7-999-123-45-67 to +7 (999) 123-45-67', () => {
      expect(formatPhoneNumber('7-999-123-45-67')).toBe('+7 (999) 123-45-67')
    })

    it('should convert 8 to +7 for Russian numbers', () => {
      expect(formatPhoneNumber('89991234567')).toBe('+7 (999) 123-45-67')
    })
  })

  describe('Kazakhstan numbers (+7, 12 digits)', () => {
    it('should format +77771234567 to +7 (777) 123-45-67', () => {
      expect(formatPhoneNumber('+77771234567')).toBe('+7 (777) 123-45-67')
    })
  })

  describe('Edge cases', () => {
    it('should handle numbers with spaces', () => {
      expect(formatPhoneNumber('+7 999 123 45 67')).toBe('+7 (999) 123-45-67')
    })

    it('should handle numbers with dashes', () => {
      expect(formatPhoneNumber('+7-999-123-45-67')).toBe('+7 (999) 123-45-67')
    })

    it('should handle numbers with parentheses', () => {
      expect(formatPhoneNumber('+7 (999) 123-45-67')).toBe('+7 (999) 123-45-67')
    })

    it('should handle short numbers (partial formatting)', () => {
      // Функция всегда форматирует как российский номер, даже короткие
      expect(formatPhoneNumber('123')).toBe('+7 (123) ')
    })

    it('should handle number too short (partial formatting)', () => {
      // Функция всегда форматирует как российский номер
      expect(formatPhoneNumber('+71234')).toBe('+7 (123) 4')
    })

    it('should handle Russian number without leading +', () => {
      expect(formatPhoneNumber('79991234567')).toBe('+7 (999) 123-45-67')
    })

    it('should handle empty string', () => {
      expect(formatPhoneNumber('')).toBe('')
    })

    it('should handle special characters', () => {
      expect(formatPhoneNumber('+7 (999) 123-45-67')).toBe('+7 (999) 123-45-67')
    })
  })

  describe('Partial formatting', () => {
    it('should format partial Russian number', () => {
      // Функция форматирует любую длину
      expect(formatPhoneNumber('+7999123456')).toBe('+7 (999) 123-45-6')
    })

    it('should format 10 digit number', () => {
      // 10 цифр без +7 = 10 цифр добавляется +7 = +7 (999) 123-45-67
      expect(formatPhoneNumber('9991234567')).toBe('+7 (999) 123-45-67')
    })
  })
})
