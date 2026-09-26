import { describe, expect, it } from 'vitest'

import { buildPatternRegistry, getPatterns } from './pattern-registry.js'

describe('buildPatternRegistry', () => {
  it('создаёт реестр со всеми известными паттернами', () => {
    const registry = buildPatternRegistry()
    expect(registry.size).toBe(14)
    expect(registry.has('crud-create')).toBe(true)
    expect(registry.has('undo-redo')).toBe(true)
    expect(registry.has('reference-select')).toBe(true)
    expect(registry.has('reference-zenstack')).toBe(true)
  })

  it('каждая запись хранит title, description и example', () => {
    const registry = buildPatternRegistry()
    const pattern = registry.get('multi-step')
    expect(pattern).toMatchObject({
      name: 'multi-step',
      title: 'Multi-step Form',
    })
    expect(pattern?.description.length).toBeGreaterThan(0)
    expect(pattern?.example.length).toBeGreaterThan(0)
  })
})

describe('getPatterns', () => {
  it('без имени возвращает все паттерны', () => {
    const registry = buildPatternRegistry()
    expect(getPatterns(registry)).toHaveLength(14)
  })

  it('M1: паттерны справочников — ключ из схемы и ZenStack/Query с оптимизмом', () => {
    const registry = buildPatternRegistry()
    const byKey = registry.get('reference-select' as never)
    expect(byKey?.example).toContain('form.fieldType')
    expect(byKey?.example).toContain('FormRegistryCheck')
    // Этап Ж: без ключа руками, по имени модели
    expect(byKey?.description).toContain('registryName')
    expect(byKey?.example).toContain('FormRegistryUnregistered')
    const zenstack = registry.get('reference-zenstack' as never)
    expect(zenstack?.example).toContain('useZenStackOptions')
    expect(zenstack?.example).toContain('optimistic')
  })

  it('MD1: паттерн dependent-select — промис Country → City и ZenStack Company → Employee', () => {
    const registry = buildPatternRegistry()
    const pattern = registry.get('dependent-select' as never)
    expect(pattern?.title).toContain('Dependent')
    // Промис: страна → город, deps в загрузчике и в onCreate
    expect(pattern?.example).toContain('dependsOn="countryId"')
    expect(pattern?.example).toContain('loadOptions={(search, { signal, deps })')
    // ZenStack: useQuery(search, deps) и onCreate(search, { deps })
    expect(pattern?.example).toContain('useQuery(search, deps)')
    expect(pattern?.example).toContain('onCreate={async (search, { deps })')
    expect(pattern?.example).toContain('fromSearchQuery')
    expect(pattern?.example).toContain('useInvalidateAfter')
    // Строка массива: путь от корня
    expect(pattern?.example).toContain('dependsOn="/countryId"')
    // Сервер проверяет пару, ошибка — в errorMap.onServer поля ребёнка
    expect(pattern?.description).toContain('errorMap.onServer')
    expect(pattern?.description).toContain('server')
    expect(getPatterns(registry, 'dependent-select')).toHaveLength(1)
  })

  it('с именем возвращает единственный паттерн в массиве', () => {
    const registry = buildPatternRegistry()
    const result = getPatterns(registry, 'crud-edit')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('crud-edit')
  })

  it('несуществующее имя паттерна даёт пустой массив', () => {
    const registry = buildPatternRegistry()
    expect(getPatterns(registry, 'does-not-exist')).toEqual([])
  })
})
