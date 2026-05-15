// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { formatPhone, getDigitsOnly, normalizePhone, validatePhone } from './phone'

describe('formatPhone', () => {
  describe('Russian numbers (+7)', () => {
    it('should format +79991234567 to +7 (999) 123-45-67', () => {
      expect(formatPhone('+79991234567')).toBe('+7 (999) 123-45-67')
    })

    it('should format 79991234567 to +7 (999) 123-45-67', () => {
      expect(formatPhone('79991234567')).toBe('+7 (999) 123-45-67')
    })

    it('should format +7 999 123 45 67 to +7 (999) 123-45-67', () => {
      expect(formatPhone('+7 999 123 45 67')).toBe('+7 (999) 123-45-67')
    })

    it('should format +7(999)123-45-67 to +7 (999) 123-45-67', () => {
      expect(formatPhone('+7(999)123-45-67')).toBe('+7 (999) 123-45-67')
    })

    it('should format 7-999-123-45-67 to +7 (999) 123-45-67', () => {
      expect(formatPhone('7-999-123-45-67')).toBe('+7 (999) 123-45-67')
    })

    it('should convert 8 to +7 for Russian numbers', () => {
      expect(formatPhone('89991234567')).toBe('+7 (999) 123-45-67')
    })
  })

  describe('Auto-prepend +7 for other digits', () => {
    it('should prepend +7 when first digit is 9', () => {
      expect(formatPhone('9')).toBe('+7 (9')
    })

    it('should prepend +7 when first digit is 1', () => {
      expect(formatPhone('1')).toBe('+7 (1')
    })

    it('should format 9991234567 with auto +7', () => {
      expect(formatPhone('9991234567')).toBe('+7 (999) 123-45-67')
    })

    it('should format partial number starting with 9', () => {
      expect(formatPhone('999')).toBe('+7 (999) ')
    })

    it('should format partial number starting with 9 with more digits', () => {
      expect(formatPhone('999123')).toBe('+7 (999) 123')
    })
  })

  describe('Edge cases', () => {
    it('should handle numbers with spaces', () => {
      expect(formatPhone('+7 999 123 45 67')).toBe('+7 (999) 123-45-67')
    })

    it('should handle numbers with dashes', () => {
      expect(formatPhone('+7-999-123-45-67')).toBe('+7 (999) 123-45-67')
    })

    it('should handle numbers with parentheses', () => {
      expect(formatPhone('+7 (999) 123-45-67')).toBe('+7 (999) 123-45-67')
    })

    it('should handle empty string', () => {
      expect(formatPhone('')).toBe('')
    })
  })
})

describe('validatePhone', () => {
  it('should return true for valid +7 number', () => {
    expect(validatePhone('+79991234567')).toBe(true)
  })

  it('should return true for valid 8 number', () => {
    expect(validatePhone('89991234567')).toBe(true)
  })

  it('should return false for short number', () => {
    expect(validatePhone('123')).toBe(false)
  })

  it('should return false for number not starting with 7 or 8', () => {
    expect(validatePhone('19991234567')).toBe(false)
  })
})

describe('normalizePhone', () => {
  it('should normalize formatted number', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('+79991234567')
  })

  it('should convert 8 to +7', () => {
    expect(normalizePhone('8 999 123 45 67')).toBe('+79991234567')
  })

  it('should handle number without country code', () => {
    expect(normalizePhone('9991234567')).toBe('+79991234567')
  })
})

describe('getDigitsOnly', () => {
  it('should extract digits from formatted number', () => {
    expect(getDigitsOnly('+7 (999) 123-45-67')).toBe('+79991234567')
  })

  it('should return empty string for empty input', () => {
    expect(getDigitsOnly('')).toBe('')
  })

  it('should prepend +7 for number starting with 9', () => {
    expect(getDigitsOnly('9991234567')).toBe('+79991234567')
  })

  it('should convert 8 to +7', () => {
    expect(getDigitsOnly('89991234567')).toBe('+79991234567')
  })
})
