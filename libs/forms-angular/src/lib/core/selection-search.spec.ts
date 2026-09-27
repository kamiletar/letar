import { provideZonelessChangeDetection, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { createSelectionSearch } from './selection-search'

interface Option {
  value: string
  label: string
}

function makeOptions(count: number): Option[] {
  return Array.from({ length: count }, (_, index) => ({ value: String(index), label: `Опция ${index}` }))
}

function createState(options: Parameters<typeof createSelectionSearch<Option>>[0]) {
  return TestBed.runInInjectionContext(() => createSelectionSearch(options))
}

describe('createSelectionSearch', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('below the threshold with `auto`, the search is hidden and the full list passes through', () => {
    const state = createState({
      searchable: () => undefined,
      options: () => makeOptions(3),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    })
    expect(state.enabled()).toBe(false)
    expect(state.search()).toBeUndefined()
    expect(state.filtered()).toHaveLength(3)
  })

  it('above the threshold, the search appears and filters by text', () => {
    const state = createState({
      searchable: () => undefined,
      options: () => makeOptions(20),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    })
    expect(state.enabled()).toBe(true)
    state.setQuery('Опция 1')
    expect(state.filtered().map((o) => o.value)).toContain('1')
    expect(state.filtered().every((o) => o.label.includes('1'))).toBe(true)
  })

  it('hysteresis: once the query is non-empty, search stays visible even if options drop below the threshold', () => {
    const optionsSignal = signal(makeOptions(20))
    const state = createState({
      searchable: () => undefined,
      options: () => optionsSignal(),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    })
    state.setQuery('что-то')
    optionsSignal.set(makeOptions(3))
    expect(state.enabled()).toBe(true)
  })

  it('searchable: true forces the field on regardless of the option count', () => {
    const state = createState({
      searchable: () => true,
      options: () => makeOptions(1),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    })
    expect(state.enabled()).toBe(true)
  })

  it('a custom `searchable.filter` overrides the built-in matcher', () => {
    const state = createState({
      searchable: () => ({ filter: (option: Option) => option.value === '2' }),
      options: () => makeOptions(3),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    })
    state.setQuery('anything')
    expect(state.filtered()).toEqual([{ value: '2', label: 'Опция 2' }])
  })
})
