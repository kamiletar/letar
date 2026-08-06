import { describe, expect, it } from 'vitest'

import { buildDirectiveRegistry, getDirectives } from './directive-registry.js'
import type { DocSection } from './loader.js'

describe('buildDirectiveRegistry', () => {
  it('содержит все известные директивы без дополнительных секций', () => {
    const registry = buildDirectiveRegistry([])
    expect(registry.size).toBe(7)
    expect(registry.has('@form.title')).toBe(true)
    expect(registry.has('@form.exclude')).toBe(true)
  })

  it('дополняет описание известной директивы первой строкой секции документации', () => {
    const section: DocSection = {
      heading: '@form.title',
      level: 3,
      content: 'Заголовок поля, отображаемый над инпутом.\nВторая строка не используется.',
    }
    const registry = buildDirectiveRegistry([section])
    expect(registry.get('@form.title')?.description).toBe('Заголовок поля, отображаемый над инпутом.')
    // Остальные поля директивы не затронуты
    expect(registry.get('@form.title')?.example).toBe('/// @form.title("Recipe Name")')
  })

  it('секция для неизвестной директивы не создаёт новую запись', () => {
    const section: DocSection = {
      heading: '@form.unknownDirective',
      level: 3,
      content: 'Описание неизвестной директивы',
    }
    const registry = buildDirectiveRegistry([section])
    expect(registry.has('@form.unknowndirective')).toBe(false)
    expect(registry.size).toBe(7)
  })

  it('секция без "@form." в заголовке не переопределяет описание', () => {
    // Секция для @form.placeholder без совпадения по "@form." в заголовке —
    // описание директивы @form.placeholder внутри ЭТОГО же вызова остаётся исходным
    const section: DocSection = { heading: 'Общее описание', level: 2, content: 'Текст' }
    const registry = buildDirectiveRegistry([section])
    expect(registry.get('@form.placeholder')?.description).toBe('Placeholder for an input field')
  })
})

describe('getDirectives', () => {
  it('без имени возвращает все директивы', () => {
    const registry = buildDirectiveRegistry([])
    expect(getDirectives(registry)).toHaveLength(7)
  })

  it('находит директиву по полному имени с префиксом @form.', () => {
    const registry = buildDirectiveRegistry([])
    const result = getDirectives(registry, '@form.placeholder')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('@form.placeholder')
  })

  it('находит директиву по короткому имени без префикса', () => {
    const registry = buildDirectiveRegistry([])
    const result = getDirectives(registry, 'placeholder')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('@form.placeholder')
  })

  it('несуществующая директива даёт пустой массив', () => {
    const registry = buildDirectiveRegistry([])
    expect(getDirectives(registry, 'doesNotExist')).toEqual([])
  })
})
