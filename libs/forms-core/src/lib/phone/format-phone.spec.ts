import { describe, expect, it } from 'vitest'
import { countPhoneMaskDigits, formatPhoneNumber, stripPhoneNumber } from './format-phone'

const RU_MASK = '+7 (999) 999-99-99'

describe('stripPhoneNumber', () => {
  it('оставляет только цифры', () => {
    expect(stripPhoneNumber('+7 (900) 123-45-67')).toBe('79001234567')
  })
})

describe('countPhoneMaskDigits', () => {
  it('считает плейсхолдеры маски', () => {
    expect(countPhoneMaskDigits(RU_MASK)).toBe(10)
  })
})

describe('formatPhoneNumber', () => {
  it('форматирует полный номер с кодом страны', () => {
    expect(formatPhoneNumber('79001234567', RU_MASK)).toBe('+7 (900) 123-45-67')
  })

  it('форматирует номер без кода страны (только национальная часть)', () => {
    expect(formatPhoneNumber('9001234567', RU_MASK)).toBe('+7 (900) 123-45-67')
  })

  it('не дорисовывает хвост маски при неполном вводе', () => {
    expect(formatPhoneNumber('9', RU_MASK)).toBe('+7 (9')
    expect(formatPhoneNumber('900', RU_MASK)).toBe('+7 (900')
  })

  it('пустая строка на пустой ввод', () => {
    expect(formatPhoneNumber('', RU_MASK)).toBe('')
  })

  it(
    'идемпотентно на повторном форматировании уже отформатированной строки '
      + '(эмулирует конфликт controlled value + мутация DOM, найденный в WebKit)',
    () => {
      // Симулируем посимвольный ввод: на каждом keystroke re-parse'им уже
      // ОТФОРМАТИРОВАННОЕ значение предыдущего рендера (е2е `pressSequentially`
      // добавляет новый символ к текущему value инпута, включая литералы маски)
      let value = ''
      const typed = '9185568172'
      for (const digit of typed) {
        const nextRaw = stripPhoneNumber(value + digit)
        value = formatPhoneNumber(nextRaw, RU_MASK)
      }
      expect(value).toBe('+7 (918) 556-81-72')
    },
  )

  it('не путает цифру "7" внутри национального номера с литералом кода страны', () => {
    // Мобильный номер, где после кода страны идёт цифра 7 — не должна вырезаться повторно
    expect(formatPhoneNumber('79771234567', RU_MASK)).toBe('+7 (977) 123-45-67')
  })

  describe('междугородний префикс "8" (РФ)', () => {
    it('распознаёт ведущую 8 как эквивалент кода страны', () => {
      // Самый привычный для России способ набора. Раньше 8 занимала первую позицию
      // кода региона, а последняя цифра молча терялась: +7 (891) 855-68-17
      expect(formatPhoneNumber('89185568172', RU_MASK)).toBe('+7 (918) 556-81-72')
    })

    it('снимает 8 при вставке номера из буфера', () => {
      expect(formatPhoneNumber(stripPhoneNumber('8 (918) 556-81-72'), RU_MASK)).toBe('+7 (918) 556-81-72')
    })

    it('снимает 8 при посимвольном вводе', () => {
      let value = ''
      for (const digit of '89185568172') {
        value = formatPhoneNumber(stripPhoneNumber(value + digit), RU_MASK)
      }
      expect(value).toBe('+7 (918) 556-81-72')
    })

    // ⚠️ Регресс-защита: в РФ есть коды регионов, которые сами начинаются с 8
    // (812 Санкт-Петербург, 843 Казань, 861 Краснодар, 8482 Тольятти).
    // Слепое отбрасывание ведущей 8 съело бы первую цифру кода региона.
    it('НЕ трогает 8, если это первая цифра кода региона (812 — Санкт-Петербург)', () => {
      expect(formatPhoneNumber('8123456789', RU_MASK)).toBe('+7 (812) 345-67-89')
    })

    it('различает префикс и код региона в одном номере (8 + 812…)', () => {
      expect(formatPhoneNumber('88123456789', RU_MASK)).toBe('+7 (812) 345-67-89')
    })

    it('посимвольный ввод питерского номера не теряет восьмёрку', () => {
      let value = ''
      for (const digit of '8123456789') {
        value = formatPhoneNumber(stripPhoneNumber(value + digit), RU_MASK)
      }
      expect(value).toBe('+7 (812) 345-67-89')
    })

    it('не трогает ведущую 8 в стране, где это не междугородний префикс', () => {
      // Маска США: 8 — обычная цифра кода зоны, отбрасывать её нельзя
      expect(formatPhoneNumber('8005551234', '+1 (999) 999-9999')).toBe('+1 (800) 555-1234')
    })
  })
})
