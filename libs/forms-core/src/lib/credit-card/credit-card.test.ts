import { describe, expect, it } from 'vitest'
import { detectBrand } from './detect-brand'
import { formatExpiry, isExpiryValid } from './format-expiry'
import { formatCardNumber, maxFormattedLength, stripCardNumber } from './format-number'
import { luhn } from './luhn'

describe('luhn', () => {
  it('должен пройти для валидного номера Visa', () => {
    expect(luhn('4111111111111111')).toBe(true)
  })

  it('должен пройти для валидного номера Mastercard', () => {
    expect(luhn('5500000000000004')).toBe(true)
  })

  it('должен пройти для валидного номера Amex', () => {
    expect(luhn('340000000000009')).toBe(true)
  })

  it('должен пройти для номера с пробелами', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true)
  })

  it('должен отклонить невалидный номер', () => {
    expect(luhn('4111111111111112')).toBe(false)
  })

  it('должен отклонить слишком короткий номер', () => {
    expect(luhn('4111')).toBe(false)
  })

  it('должен отклонить пустую строку', () => {
    expect(luhn('')).toBe(false)
  })
})

describe('detectBrand', () => {
  it('должен определить Visa', () => {
    expect(detectBrand('4111111111111111').brand).toBe('visa')
  })

  it('должен определить Visa по первой цифре', () => {
    expect(detectBrand('4').brand).toBe('visa')
  })

  it('должен определить Mastercard (51-55)', () => {
    expect(detectBrand('5100000000000000').brand).toBe('mastercard')
  })

  it('должен определить Mastercard (2221-2720)', () => {
    expect(detectBrand('2221000000000000').brand).toBe('mastercard')
  })

  it('должен определить Amex (34)', () => {
    expect(detectBrand('340000000000000').brand).toBe('amex')
    expect(detectBrand('340000000000000').cvcLength).toBe(4)
  })

  it('должен определить Amex (37)', () => {
    expect(detectBrand('370000000000000').brand).toBe('amex')
  })

  it('должен определить МИР (2200-2204)', () => {
    expect(detectBrand('2200000000000000').brand).toBe('mir')
    expect(detectBrand('2204000000000000').brand).toBe('mir')
  })

  it('должен определить JCB', () => {
    expect(detectBrand('3528000000000000').brand).toBe('jcb')
  })

  it('должен вернуть unknown для неизвестного', () => {
    expect(detectBrand('9999000000000000').brand).toBe('unknown')
  })

  it('должен вернуть unknown для пустой строки', () => {
    expect(detectBrand('').brand).toBe('unknown')
  })

  it('Amex должен иметь gaps [4,6,5]', () => {
    expect(detectBrand('34').gaps).toEqual([4, 6, 5])
  })

  it('Visa должен иметь gaps [4,4,4,4]', () => {
    expect(detectBrand('4').gaps).toEqual([4, 4, 4, 4])
  })
})

describe('formatCardNumber', () => {
  it('должен форматировать Visa: 4444 4444 4444 4444', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111')
  })

  it('должен форматировать Amex: 4444 444444 44444', () => {
    expect(formatCardNumber('340000000000009')).toBe('3400 000000 00009')
  })

  it('должен работать с частичным номером', () => {
    expect(formatCardNumber('411111')).toBe('4111 11')
  })

  it('должен возвращать пустую строку для пустого ввода', () => {
    expect(formatCardNumber('')).toBe('')
  })

  it('должен убирать нецифровые символы', () => {
    expect(formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111')
  })
})

describe('stripCardNumber', () => {
  it('должен убрать пробелы', () => {
    expect(stripCardNumber('4111 1111 1111 1111')).toBe('4111111111111111')
  })
})

describe('maxFormattedLength', () => {
  it('Visa: max 19 цифр + 3 пробела = 22', () => {
    // Visa lengths: [16, 18, 19], max=19 + 3 пробела
    expect(maxFormattedLength('4')).toBe(22)
  })

  it('Amex: 15 цифр + 2 пробела = 17', () => {
    expect(maxFormattedLength('34')).toBe(17)
  })
})

describe('formatExpiry', () => {
  it('должен вставить слэш после 2 цифр', () => {
    expect(formatExpiry('1225')).toBe('12/25')
  })

  it('должен не добавлять слэш для ≤2 цифр', () => {
    expect(formatExpiry('12')).toBe('12')
  })

  it('должен обрезать до 4 цифр', () => {
    expect(formatExpiry('122567')).toBe('12/25')
  })

  it('должен вернуть пустую строку для пустого ввода', () => {
    expect(formatExpiry('')).toBe('')
  })

  it('должен убрать нецифровые символы', () => {
    expect(formatExpiry('12/25')).toBe('12/25')
  })
})

describe('isExpiryValid', () => {
  it('должен принять будущий срок', () => {
    // Устанавливаем далёкий срок, который точно в будущем
    expect(isExpiryValid('12/99')).toBe(true)
  })

  it('должен отклонить неверный формат', () => {
    expect(isExpiryValid('1225')).toBe(false)
    expect(isExpiryValid('13/25')).toBe(false) // месяц > 12
    expect(isExpiryValid('00/25')).toBe(false) // месяц = 0
  })

  it('должен отклонить прошедший срок', () => {
    expect(isExpiryValid('01/20')).toBe(false) // январь 2020 — точно прошёл
  })
})
