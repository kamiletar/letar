import type { DataFieldAttribute } from '@zenstackhq/language/ast'
import { describe, expect, it } from 'vitest'
import { extractEnumLabel, findUnknownMetaFormPaths, parseMetaAttributes, toTitleCase } from './parser.js'

// ─── Фикстуры AST для @meta (Фаза 3, v3.0.0) ───────────────────────────────

const strLit = (value: string) => ({ $type: 'StringLiteral', value })
const numLit = (value: number) => ({ $type: 'NumberLiteral', value: String(value) })
const boolLit = (value: boolean) => ({ $type: 'BooleanLiteral', value })
const arrLit = (items: unknown[]) => ({ $type: 'ArrayExpr', items })

/** `@meta("form.<key>", value)` field attribute, как хранит Langium в `decl.$refText`/`args`. */
function metaAttr(key: string, value?: unknown): DataFieldAttribute {
  const args = value === undefined ? [{ value: strLit(key) }] : [{ value: strLit(key) }, { value }]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { $type: 'DataFieldAttribute', decl: { $refText: '@meta' }, args } as any
}

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

describe('parseMetaAttributes (Фаза 3, v3.0.0)', () => {
  it('возвращает пустой объект без @meta-атрибутов', () => {
    expect(parseMetaAttributes([])).toEqual({})
  })

  it('игнорирует атрибуты с другим именем (не @meta)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = [{ $type: 'DataFieldAttribute', decl: { $refText: '@gte' }, args: [] } as any]
    expect(parseMetaAttributes(attrs)).toEqual({})
  })

  it('игнорирует @meta с namespace, отличным от "form."', () => {
    // upstream использует @meta("description", "...") — не наш namespace
    const attrs = [metaAttr('description', strLit('ORM-level description'))]
    expect(parseMetaAttributes(attrs)).toEqual({})
  })

  it('парсит form.title/placeholder/description/fieldType', () => {
    const attrs = [
      metaAttr('form.title', strLit('Название')),
      metaAttr('form.placeholder', strLit('Введите...')),
      metaAttr('form.description', strLit('Подсказка')),
      metaAttr('form.fieldType', strLit('textarea')),
    ]
    expect(parseMetaAttributes(attrs)).toEqual({
      title: 'Название',
      placeholder: 'Введите...',
      description: 'Подсказка',
      fieldType: 'textarea',
    })
  })

  it('парсит form.exclude со значением true', () => {
    expect(parseMetaAttributes([metaAttr('form.exclude', boolLit(true))])).toEqual({ exclude: true })
  })

  it('form.exclude без второго аргумента тоже считается true', () => {
    expect(parseMetaAttributes([metaAttr('form.exclude')])).toEqual({ exclude: true })
  })

  it('form.props.<key> разбирается на constraints/uiProps по тем же правилам, что @form.props', () => {
    const attrs = [
      metaAttr('form.props.min', numLit(1)), // ZOD_CONSTRAINT_NAMES → constraints
      metaAttr('form.props.max', numLit(100)), // constraints
      metaAttr('form.props.showValue', boolLit(true)), // UI-проп
    ]
    const meta = parseMetaAttributes(attrs)
    expect(meta.constraints).toEqual({ min: 1, max: 100 })
    expect(meta.props).toEqual({ showValue: true })
  })

  it('form.props с вложенным точечным путём собирается в объект', () => {
    const meta = parseMetaAttributes([metaAttr('form.props.grid.cols', numLit(2))])
    expect(meta.props).toEqual({ grid: { cols: 2 } })
  })

  it('form.props.<key> с массивом-значением', () => {
    const meta = parseMetaAttributes([metaAttr('form.props.options', arrLit([strLit('p1'), strLit('p2')]))])
    expect(meta.props).toEqual({ options: ['p1', 'p2'] })
  })

  it('form.relation.<key> собирается в meta.relation', () => {
    const attrs = [
      metaAttr('form.relation.model', strLit('Category')),
      metaAttr('form.relation.labelField', strLit('name')),
    ]
    expect(parseMetaAttributes(attrs).relation).toEqual({ model: 'Category', labelField: 'name' })
  })

  it('первый аргумент не StringLiteral — атрибут игнорируется (не @meta("form.*", ...))', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = [{ $type: 'DataFieldAttribute', decl: { $refText: '@meta' }, args: [{ value: numLit(1) }] } as any]
    expect(parseMetaAttributes(attrs)).toEqual({})
  })
})

describe('findUnknownMetaFormPaths (детектор опечаток в @meta("form.*", …), та же дыра что у comment-синтаксиса)', () => {
  it('без атрибутов — пустой результат', () => {
    expect(findUnknownMetaFormPaths([])).toEqual([])
  })

  it('только известные пути — пустой результат', () => {
    const attrs = [
      metaAttr('form.title', strLit('X')),
      metaAttr('form.props.min', numLit(1)),
      metaAttr('form.relation.model', strLit('Category')),
    ]
    expect(findUnknownMetaFormPaths(attrs)).toEqual([])
  })

  it('@meta("form.options", …) — неизвестный top-level ключ, попадает в результат', () => {
    const attrs = [metaAttr('form.options', arrLit([strLit('a')]))]
    expect(findUnknownMetaFormPaths(attrs)).toEqual(['options'])
  })

  it('не @meta-атрибуты и не form.*-namespace — игнорируются, как в parseMetaAttributes', () => {
    const attrs = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $type: 'DataFieldAttribute', decl: { $refText: '@gte' }, args: [] } as any,
      metaAttr('description', strLit('ORM-level, не form.*')),
    ]
    expect(findUnknownMetaFormPaths(attrs)).toEqual([])
  })

  it('несколько неизвестных путей — каждый один раз, без дублей', () => {
    const attrs = [
      metaAttr('form.widget', strLit('x')),
      metaAttr('form.options', arrLit([])),
      metaAttr('form.options', arrLit([])), // повтор — не дублируется
    ]
    expect(findUnknownMetaFormPaths(attrs)).toEqual(['widget', 'options'])
  })
})
