import { describe, expect, it } from 'vitest'
import { extractEnumLabel, parseFormMeta, toTitleCase } from './parser.js'

describe('extractEnumLabel', () => {
  it('возвращает undefined для пустого массива комментариев', () => {
    expect(extractEnumLabel([])).toBeUndefined()
  })

  it('возвращает undefined для undefined/null-подобного входа', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(extractEnumLabel(undefined as any)).toBeUndefined()
  })

  it('извлекает label из doc-комментария (///)', () => {
    expect(extractEnumLabel(['/// Sweet'])).toBe('Sweet')
  })

  it('извлекает label из обычного комментария (//)', () => {
    expect(extractEnumLabel(['// Sweet'])).toBe('Sweet')
  })

  it('обрезает пробелы вокруг label', () => {
    expect(extractEnumLabel(['///   Sweet   '])).toBe('Sweet')
  })

  it('берёт только первый комментарий из массива', () => {
    expect(extractEnumLabel(['/// First', '/// Second'])).toBe('First')
  })

  it('возвращает undefined, если после очистки префикса строка пуста', () => {
    expect(extractEnumLabel(['///'])).toBeUndefined()
    expect(extractEnumLabel(['   '])).toBeUndefined()
  })

  it('поддерживает кириллицу', () => {
    expect(extractEnumLabel(['/// Сладкий'])).toBe('Сладкий')
  })
})

describe('toTitleCase', () => {
  it('конвертирует одиночное SCREAMING_CASE слово', () => {
    expect(toTitleCase('SWEET')).toBe('Sweet')
  })

  it('конвертирует составное SCREAMING_CASE с подчёркиваниями', () => {
    expect(toTitleCase('BANK_TRANSFER')).toBe('Bank Transfer')
  })

  it('обрабатывает уже смешанный регистр', () => {
    expect(toTitleCase('bAnK_TransFER')).toBe('Bank Transfer')
  })

  it('обрабатывает пустую строку', () => {
    expect(toTitleCase('')).toBe('')
  })

  it('обрабатывает одну букву', () => {
    expect(toTitleCase('A')).toBe('A')
  })

  it('схлопывает двойное подчёркивание в пробел с пустым словом', () => {
    // 'A__B'.split('_') => ['A', '', 'B'] — пустое слово даёт пустую строку в результате
    expect(toTitleCase('A__B')).toBe('A  B')
  })
})

describe('parseFormMeta', () => {
  it('возвращает пустой объект для пустого/отсутствующего массива комментариев', () => {
    expect(parseFormMeta([])).toEqual({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseFormMeta(undefined as any)).toEqual({})
  })

  it('возвращает пустой объект, если директив @form.* нет', () => {
    expect(parseFormMeta(['обычный комментарий без директив'])).toEqual({})
  })

  it('парсит @form.title', () => {
    const meta = parseFormMeta(['@form.title("Название продукта")'])
    expect(meta.title).toBe('Название продукта')
  })

  it('парсит @form.placeholder', () => {
    const meta = parseFormMeta(['@form.placeholder("Введите название")'])
    expect(meta.placeholder).toBe('Введите название')
  })

  it('парсит @form.description', () => {
    const meta = parseFormMeta(['@form.description("Полное описание поля")'])
    expect(meta.description).toBe('Полное описание поля')
  })

  it('парсит @form.fieldType', () => {
    const meta = parseFormMeta(['@form.fieldType("currency")'])
    expect(meta.fieldType).toBe('currency')
  })

  it('парсит несколько директив одновременно из разных строк комментария', () => {
    const meta = parseFormMeta([
      '@form.title("Цена")',
      '@form.placeholder("0.00")',
      '@form.description("Цена в рублях")',
      '@form.fieldType("currency")',
    ])
    expect(meta).toEqual({
      title: 'Цена',
      placeholder: '0.00',
      description: 'Цена в рублях',
      fieldType: 'currency',
    })
  })

  it('парсит @form.props и разделяет Zod-constraints и UI-пропсы', () => {
    const meta = parseFormMeta(['@form.props({ min: 0, max: 1000, currency: "USD" })'])
    expect(meta.constraints).toEqual({ min: 0, max: 1000 })
    expect(meta.props).toEqual({ currency: 'USD' })
  })

  it('@form.props только с constraints — props остаётся undefined', () => {
    const meta = parseFormMeta(['@form.props({ minLength: 2, maxLength: 100 })'])
    expect(meta.constraints).toEqual({ minLength: 2, maxLength: 100 })
    expect(meta.props).toBeUndefined()
  })

  it('@form.props только с UI-пропсами — constraints остаётся undefined', () => {
    const meta = parseFormMeta(['@form.props({ currency: "USD", rows: 5 })'])
    expect(meta.props).toEqual({ currency: 'USD', rows: 5 })
    expect(meta.constraints).toBeUndefined()
  })

  it('@form.props поддерживает булевы constraint-флаги (email, url, uuid, positive, negative)', () => {
    const meta = parseFormMeta(['@form.props({ email: true, positive: true })'])
    expect(meta.constraints).toEqual({ email: true, positive: true })
  })

  it('@form.props с одинарными кавычками и завершающей запятой', () => {
    const meta = parseFormMeta([`@form.props({ currency: 'USD', rows: 3, })`])
    expect(meta.props).toEqual({ currency: 'USD', rows: 3 })
  })

  it('@form.props игнорирует некорректный JS-литерал (не бросает исключение)', () => {
    const meta = parseFormMeta(['@form.props({ min: , })'])
    expect(meta.constraints).toBeUndefined()
    expect(meta.props).toBeUndefined()
  })

  it('парсит @form.relation с моделью и labelField', () => {
    const meta = parseFormMeta(['@form.relation({ model: "Category", labelField: "name" })'])
    expect(meta.relation).toEqual({ model: 'Category', labelField: 'name' })
  })

  it('@form.relation игнорирует некорректный JS-литерал (не бросает исключение)', () => {
    const meta = parseFormMeta(['@form.relation({ labelField , })'])
    expect(meta.relation).toBeUndefined()
  })

  it('парсит @form.exclude', () => {
    const meta = parseFormMeta(['@form.exclude'])
    expect(meta.exclude).toBe(true)
  })

  it('без @form.exclude поле exclude остаётся undefined', () => {
    const meta = parseFormMeta(['@form.title("X")'])
    expect(meta.exclude).toBeUndefined()
  })

  it('директивы работают, когда объединены в одну строку с переносами (join)', () => {
    // parseFormMeta склеивает все комментарии через \n перед матчингом —
    // директива может быть "размазана" по нескольким элементам массива.
    const meta = parseFormMeta(['@form.title("A")\n', '@form.placeholder("B")'])
    expect(meta.title).toBe('A')
    expect(meta.placeholder).toBe('B')
  })
})
