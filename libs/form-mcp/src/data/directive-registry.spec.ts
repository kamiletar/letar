import { describe, expect, it } from 'vitest'

import { buildDirectiveRegistry, getDirectives } from './directive-registry.js'
import type { DocSection } from './loader.js'

describe('buildDirectiveRegistry', () => {
  it('содержит все известные директивы без дополнительных секций', () => {
    const registry = buildDirectiveRegistry([])
    expect(registry.size).toBe(9)
    expect(registry.has('@form.title')).toBe(true)
    expect(registry.has('@form.tooltip')).toBe(true)
    expect(registry.has('@form.exclude')).toBe(true)
  })

  it('form.tooltip описан с плоским dot-path и примером с обязательным description', () => {
    const [tooltip] = getDirectives(buildDirectiveRegistry([]), 'tooltip')
    expect(tooltip.metaKey).toBe('form.tooltip.<title|description|impact|example>')
    expect(tooltip.example).toContain('@meta("form.tooltip.description"')
    expect(tooltip.output).toContain('ui: { tooltip:')
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
    expect(registry.get('@form.title')?.example).toBe('@meta("form.title", "Recipe Name")')
  })

  it('секция для неизвестной директивы не создаёт новую запись', () => {
    const section: DocSection = {
      heading: '@form.unknownDirective',
      level: 3,
      content: 'Описание неизвестной директивы',
    }
    const registry = buildDirectiveRegistry([section])
    expect(registry.has('@form.unknowndirective')).toBe(false)
    expect(registry.size).toBe(9)
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
    expect(getDirectives(registry)).toHaveLength(9)
  })

  it('M1: form.fieldType описывает ключ реестра, form.relation — без fieldType', () => {
    const registry = buildDirectiveRegistry([])
    const fieldType = getDirectives(registry, 'fieldType')[0]
    expect(fieldType.description).toContain('Select.WorkCategory')
    expect(fieldType.description).toContain('FormRegistryCheck')
    // Этап Ж: имя модели/enum подбирается само, отказ — явный fieldType
    expect(fieldType.description).toContain('registryName')
    expect(fieldType.description).toContain('>= 2.26.0')
    const relation = getDirectives(registry, 'relation')[0]
    expect(relation.output).not.toContain('fieldType')
    expect(relation.output).toContain('fieldProps')
    // Вопрос 44: вторая строка опции описана и в описании, и в примере
    expect(relation.description).toContain('descriptionField')
    expect(relation.example).toContain('form.relation.descriptionField')
  })

  it('MD1: form.dependsOn — строка и массив, проверки плагина, без автовывода по FK', () => {
    const registry = buildDirectiveRegistry([])
    const [dependsOn] = getDirectives(registry, 'dependsOn')
    expect(dependsOn.name).toBe('@form.dependsOn')
    expect(dependsOn.metaKey).toBe('form.dependsOn')
    // Строка и массив в примерах
    expect(dependsOn.example).toContain('@meta("form.dependsOn", "countryId")')
    expect(dependsOn.example).toContain('@meta("form.dependsOn", ["countryId", "typeId"])')
    expect(dependsOn.example).toContain('"/countryId"')
    // Проверки generate
    for (const check of ['no such field', 'itself', 'cycle', 'form.exclude', 'relation']) {
      expect(dependsOn.description).toContain(check)
    }
    // Явная директива, автовывода нет; связь с ключом реестра
    expect(dependsOn.description).toContain('no auto-derivation')
    expect(dependsOn.description).toContain('Select.<Name>')
    expect(dependsOn.description).toContain('not filtered')
    expect(dependsOn.output).toContain('fieldProps: { dependsOn: "countryId" }')
    // Находится и с полным именем
    expect(getDirectives(registry, '@form.dependsOn')).toHaveLength(1)
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
