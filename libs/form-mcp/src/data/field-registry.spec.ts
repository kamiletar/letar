import { describe, expect, it } from 'vitest'

import { buildFieldRegistry, getFields } from './field-registry.js'
import type { DocSection } from './loader.js'

/** Секция-таблица с двумя полями категории "Текстовые поля" */
const textSection: DocSection = {
  heading: 'Текстовые поля',
  level: 2,
  content: [
    '| Компонент | Описание |',
    '| --- | --- |',
    '| `Form.Field.String` | Однострочный текст |',
    '| `Form.Field.Textarea` | Многострочный текст |',
  ].join('\n'),
}

/** Секция-таблица категории "Числовые поля" */
const numberSection: DocSection = {
  heading: 'Числовые поля',
  level: 2,
  content: ['| Компонент | Описание |', '| --- | --- |', '| `Form.Field.Number` | Числовой ввод |'].join('\n'),
}

/** Детальная H2-секция с документацией по конкретному полю */
const detailSection: DocSection = {
  heading: 'Form.Field.String — строковое поле',
  level: 2,
  content: 'Подробное описание строкового поля с примерами использования.',
}

/** Секция без соответствия в CATEGORY_MAP — должна игнорироваться */
const unknownSection: DocSection = {
  heading: 'Неизвестный раздел',
  level: 2,
  content: '| `Form.Field.Ghost` | Не должно попасть в реестр |',
}

describe('buildFieldRegistry', () => {
  it('парсит поля из табличных секций и присваивает категорию', () => {
    const registry = buildFieldRegistry([textSection, numberSection])

    expect(registry.size).toBe(3)
    expect(registry.get('string')).toMatchObject({
      name: 'String',
      fullName: 'Form.Field.String',
      description: 'Однострочный текст',
      category: 'text',
    })
    expect(registry.get('number')).toMatchObject({
      name: 'Number',
      fullName: 'Form.Field.Number',
      category: 'number',
    })
  })

  it('ключи реестра — короткое имя в нижнем регистре', () => {
    const registry = buildFieldRegistry([textSection])
    expect(Array.from(registry.keys())).toEqual(['string', 'textarea'])
  })

  it('присоединяет details из H2-секции с "Form.Field." в заголовке', () => {
    const registry = buildFieldRegistry([textSection, detailSection])
    expect(registry.get('string')?.details).toBe(
      'Подробное описание строкового поля с примерами использования.',
    )
    // У поля без детальной секции details не установлен
    expect(registry.get('textarea')?.details).toBeUndefined()
  })

  it('игнорирует секции, отсутствующие в CATEGORY_MAP', () => {
    const registry = buildFieldRegistry([unknownSection])
    expect(registry.size).toBe(0)
  })

  it('игнорирует строки, не соответствующие формату таблицы', () => {
    const section: DocSection = {
      heading: 'Текстовые поля',
      level: 2,
      content: ['Просто текст без таблицы', '| `Form.Field.String` | Однострочный текст |', ''].join('\n'),
    }
    const registry = buildFieldRegistry([section])
    expect(registry.size).toBe(1)
    expect(registry.has('string')).toBe(true)
  })

  it('пустой массив секций даёт пустой реестр', () => {
    expect(buildFieldRegistry([]).size).toBe(0)
  })
})

describe('getFields', () => {
  it('без category возвращает все поля', () => {
    const registry = buildFieldRegistry([textSection, numberSection])
    expect(getFields(registry)).toHaveLength(3)
  })

  it('с category фильтрует по категории', () => {
    const registry = buildFieldRegistry([textSection, numberSection])
    const fields = getFields(registry, 'number')
    expect(fields).toHaveLength(1)
    expect(fields[0].name).toBe('Number')
  })

  it('несуществующая категория даёт пустой массив', () => {
    const registry = buildFieldRegistry([textSection])
    expect(getFields(registry, 'payment')).toEqual([])
  })
})
