import { describe, expect, it, vi } from 'vitest'
import {
  areDepsReady,
  buildDeps,
  createDependentsRegistry,
  isEmptyDepValue,
  resolveDependsOn,
  serializeDeps,
} from './dependent-fields'

describe('isEmptyDepValue (DS1)', () => {
  it('undefined, null, пустая строка и пустой массив — пусто', () => {
    expect(isEmptyDepValue(undefined)).toBe(true)
    expect(isEmptyDepValue(null)).toBe(true)
    expect(isEmptyDepValue('')).toBe(true)
    expect(isEmptyDepValue([])).toBe(true)
  })

  it('0, false, непустые значения — не пусто', () => {
    expect(isEmptyDepValue(0)).toBe(false)
    expect(isEmptyDepValue(false)).toBe(false)
    expect(isEmptyDepValue('RU')).toBe(false)
    expect(isEmptyDepValue(['a'])).toBe(false)
    expect(isEmptyDepValue({})).toBe(false)
  })
})

describe('resolveDependsOn (DS1)', () => {
  it('строка → один родитель; путь относителен группы', () => {
    expect(resolveDependsOn('countryId', 'items.3')).toEqual([{ key: 'countryId', path: 'items.3.countryId' }])
  })

  it('без группы путь равен ключу', () => {
    expect(resolveDependsOn('countryId', undefined)).toEqual([{ key: 'countryId', path: 'countryId' }])
  })

  it('ведущий «/» — от корня формы, ключ без слэша', () => {
    expect(resolveDependsOn('/countryId', 'items.3')).toEqual([{ key: 'countryId', path: 'countryId' }])
  })

  it('массив сохраняет порядок; пустой и undefined → пусто', () => {
    expect(resolveDependsOn(['a', '/b'], 'g').map((e) => e.path)).toEqual(['g.a', 'b'])
    expect(resolveDependsOn([], 'g')).toEqual([])
    expect(resolveDependsOn(undefined, 'g')).toEqual([])
  })

  it('`/a` и `a` в одном списке — одинаковый ключ, ошибка', () => {
    expect(() => resolveDependsOn(['a', '/a'], 'g')).toThrow(/countryId|a/)
  })
})

describe('serializeDeps / buildDeps (DS1)', () => {
  it('порядок ключей задаёт dependsOn; числа и строки различаются', () => {
    const keys = ['a', 'b']
    expect(serializeDeps(keys, { a: 1, b: 2 })).not.toBe(serializeDeps(keys, { a: '1', b: 2 }))
    expect(serializeDeps(['b', 'a'], { a: 1, b: 2 })).not.toBe(serializeDeps(['a', 'b'], { a: 1, b: 2 }))
  })

  it('undefined и null — одно и то же (оба «пусто»)', () => {
    expect(serializeDeps(['a'], {})).toBe(serializeDeps(['a'], { a: null }))
  })

  it('одинаковые значения — одинаковый ключ', () => {
    expect(serializeDeps(['a'], { a: 'RU' })).toBe(serializeDeps(['a'], { a: 'RU' }))
  })

  it('buildDeps читает значения по путям под ключами без «/»', () => {
    const values = { countryId: 'RU', items: [{ regionId: 'r1' }] }
    const entries = [
      ...resolveDependsOn('regionId', 'items.0'),
      ...resolveDependsOn('/countryId', 'items.0'),
    ]
    expect(buildDeps(entries, values)).toEqual({ regionId: 'r1', countryId: 'RU' })
  })
})

describe('areDepsReady', () => {
  it('по умолчанию все значения непустые; без зависимостей — готово', () => {
    expect(areDepsReady(['a'], { a: 'x' })).toBe(true)
    expect(areDepsReady(['a', 'b'], { a: 'x', b: '' })).toBe(false)
    expect(areDepsReady([], {})).toBe(true)
  })

  it('свой depsReady заменяет проверку', () => {
    expect(areDepsReady(['a'], { a: '' }, () => true)).toBe(true)
    expect(areDepsReady(['a'], { a: 'x' }, () => false)).toBe(false)
  })
})

describe('createDependentsRegistry (DS2, DS10)', () => {
  it('смена родителя зовёт clear зависимых, повтор того же значения — нет', () => {
    const registry = createDependentsRegistry()
    const clear = vi.fn()
    registry.register({ childPath: 'cityId', parentPaths: ['countryId'], clear })
    registry.observe('countryId', 'RU')
    registry.handleFieldChange('countryId', 'RU')
    expect(clear).not.toHaveBeenCalled()
    registry.handleFieldChange('countryId', 'DE')
    expect(clear).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledWith({ parentPath: 'countryId' })
    registry.handleFieldChange('countryId', 'DE')
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('чужой путь ничего не трогает', () => {
    const registry = createDependentsRegistry()
    const clear = vi.fn()
    registry.register({ childPath: 'cityId', parentPaths: ['countryId'], clear })
    registry.handleFieldChange('title', 'x')
    expect(clear).not.toHaveBeenCalled()
  })

  it('suppress не очищает, но значение родителя запоминается — следующая правка сравнивается с ним', () => {
    const registry = createDependentsRegistry()
    const clear = vi.fn()
    registry.register({ childPath: 'cityId', parentPaths: ['countryId'], clear })
    registry.observe('countryId', 'RU')
    registry.suppress(() => registry.handleFieldChange('countryId', 'DE'))
    expect(clear).not.toHaveBeenCalled()
    registry.handleFieldChange('countryId', 'DE')
    expect(clear).not.toHaveBeenCalled()
    registry.handleFieldChange('countryId', 'FR')
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('suppress вложенный; флаг снимается после исключения внутри fn', () => {
    const registry = createDependentsRegistry()
    expect(registry.isSuppressed()).toBe(false)
    registry.suppress(() => {
      registry.suppress(() => {
        expect(registry.isSuppressed()).toBe(true)
      })
      expect(registry.isSuppressed()).toBe(true)
    })
    expect(registry.isSuppressed()).toBe(false)
    expect(() =>
      registry.suppress(() => {
        throw new Error('boom')
      })
    ).toThrow('boom')
    expect(registry.isSuppressed()).toBe(false)
  })

  it('suppress возвращает результат fn', () => {
    const registry = createDependentsRegistry()
    expect(registry.suppress(() => 42)).toBe(42)
  })

  it('снятие регистрации: clear больше не зовётся', () => {
    const registry = createDependentsRegistry()
    const clear = vi.fn()
    const off = registry.register({ childPath: 'cityId', parentPaths: ['countryId'], clear })
    off()
    registry.observe('countryId', 'RU')
    registry.handleFieldChange('countryId', 'DE')
    expect(clear).not.toHaveBeenCalled()
  })

  it('цепочка: очистка ребёнка сама зовёт handleFieldChange и очищает внука', () => {
    const registry = createDependentsRegistry()
    const cleared: string[] = []
    registry.register({
      childPath: 'regionId',
      parentPaths: ['countryId'],
      clear: () => {
        cleared.push('regionId')
        registry.handleFieldChange('regionId', '')
      },
    })
    registry.register({ childPath: 'cityId', parentPaths: ['regionId'], clear: () => cleared.push('cityId') })
    registry.observe('countryId', 'RU')
    registry.observe('regionId', 'r1')
    registry.handleFieldChange('countryId', 'DE')
    expect(cleared).toEqual(['regionId', 'cityId'])
  })

  it('цикл регистраций — ошибка', () => {
    const registry = createDependentsRegistry()
    registry.register({ childPath: 'b', parentPaths: ['a'], clear: () => undefined })
    expect(() => registry.register({ childPath: 'a', parentPaths: ['b'], clear: () => undefined })).toThrow(
      /цикл|cycl/i,
    )
    // зависимость от самого себя — тоже цикл
    expect(() => registry.register({ childPath: 'x', parentPaths: ['x'], clear: () => undefined })).toThrow(
      /цикл|cycl/i,
    )
  })
})
