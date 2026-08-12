import { describe, expect, it } from 'vitest'
import { format, formatToParts, unformat } from './parts'
import type { MaskOptions } from './types'

// Приёмочные кейсы модели токенов (PLAN.md Фаза 8, Этап 1) — каждый доказывает
// отдельное требование движка, не только «маска работает».

describe('format — приёмочные кейсы модели токенов', () => {
  it('СНИЛС: базовый шаблон с литералами', () => {
    expect(format('11223344595', '999-999-999 99')).toBe('112-233-445 95')
  })

  it('код подразделения: простейший случай — эталон «маска работает»', () => {
    expect(format('770123', '999-999')).toBe('770-123')
  })

  it('хвост маски без введённых символов не дорисовывается', () => {
    expect(format('770', '999-999')).toBe('770')
    expect(format('', '999-999')).toBe('')
  })

  it('номер карты: группировка, пользовательские пробелы не требуются — движок сам расставляет литералы', () => {
    expect(format('4111111111111111', '9999 9999 9999 9999')).toBe('4111 1111 1111 1111')
  })

  describe('госномер РФ — свой алфавит + transform + переменная длина хвоста', () => {
    const VALID_LETTERS = 'АВЕКМНОРСТУХ'
    const LATIN_TO_CYRILLIC: Record<string, string> = {
      A: 'А',
      B: 'В',
      E: 'Е',
      K: 'К',
      M: 'М',
      H: 'Н',
      O: 'О',
      P: 'Р',
      C: 'С',
      T: 'Т',
      Y: 'У',
      X: 'Х',
    }
    const plateOptions: MaskOptions = {
      customTokens: {
        л: {
          pattern: (char) => {
            const upper = char.toUpperCase()
            return VALID_LETTERS.includes(upper) || upper in LATIN_TO_CYRILLIC
          },
          transform: (char) => {
            const upper = char.toUpperCase()
            return LATIN_TO_CYRILLIC[upper] ?? upper
          },
        },
      },
    }
    // буква, 3 цифры, 2 буквы, 2 или 3 цифры региона
    const PLATE_MASK = 'л999лл99[9]'

    it('раскладывает буква/цифры/буквы/регион по декларативной маске', () => {
      expect(format('А123ВС77', PLATE_MASK, plateOptions)).toBe('А123ВС77')
    })

    it('латиница на вводе транслитерируется в кириллицу', () => {
      expect(format('A123BC77', PLATE_MASK, plateOptions)).toBe('А123ВС77')
    })

    it('переменная длина хвоста: регион из 3 цифр не обрезается', () => {
      expect(format('А123ВС777', PLATE_MASK, plateOptions)).toBe('А123ВС777')
    })

    it('регион из 2 цифр не дожидается третьей — маска не дорисовывает хвост', () => {
      expect(format('А123ВС77', PLATE_MASK, plateOptions)).toBe('А123ВС77')
    })

    it('буква не из допустимого алфавита не проходит pattern токена (например Ж, Ъ, Ё — не входят в ГОСТ Р 50577)', () => {
      // Один слот, один невалидный символ и больше ничего в raw — подставить нечего, слот не заполняется
      expect(format('Ж', 'л', plateOptions)).toBe('')
    })
  })

  it('гомоглифы: transform приводит визуально похожие символы к канону (демонстрация примитива для свидетельства о рождении, §7.1 — само поле маску не использует, но нормализация строится на этом же transform)', () => {
    const romanNumeralOptions: MaskOptions = {
      customTokens: {
        р: {
          pattern: (char) => '|l1IіІ'.includes(char),
          transform: () => 'I',
        },
      },
    }
    expect(format('|||', 'ррр', romanNumeralOptions)).toBe('III')
    expect(format('l1I', 'ррр', romanNumeralOptions)).toBe('III')
  })
})

describe('unformat', () => {
  it('отбрасывает литералы и посторонние символы, оставляя только совпавшие с токенами', () => {
    expect(unformat('+7 (900) 123-45-67', '+7 (999) 999-99-99')).toBe('79001234567')
  })

  it('идемпотентно на паре format→unformat', () => {
    const raw = '9001234567'
    const mask = '+7 (999) 999-99-99'
    expect(unformat(format(raw, mask), mask)).toBe(format(raw, mask).replace(/\D/g, ''))
  })
})

describe('formatToParts', () => {
  it('размечает подтверждённую часть input/literal и хвост — placeholder с filled: false', () => {
    const parts = formatToParts('900', '999-999')
    expect(parts).toEqual([
      { type: 'input', char: '9', filled: true },
      { type: 'input', char: '0', filled: true },
      { type: 'input', char: '0', filled: true },
      { type: 'literal', char: '-', filled: false },
      { type: 'placeholder', char: '9', filled: false },
      { type: 'placeholder', char: '9', filled: false },
      { type: 'placeholder', char: '9', filled: false },
    ])
  })

  it('join отфильтрованных input/literal частей равен format()', () => {
    const raw = '900'
    const mask = '999-999'
    const filled = formatToParts(raw, mask).filter((part) => part.filled).map((part) => part.char).join('')
    expect(filled).toBe(format(raw, mask))
  })
})
