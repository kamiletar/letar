import { provideZonelessChangeDetection, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { createDependentsRegistry } from '@letar/forms-core/uikit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDependentField, createFieldDeps } from './dependent-field'

function makeFieldDeps(options: Parameters<typeof createFieldDeps>[0]) {
  return TestBed.runInInjectionContext(() => createFieldDeps(options))
}

function makeDependentField(options: Parameters<typeof createDependentField>[0]) {
  return TestBed.runInInjectionContext(() => createDependentField(options))
}

describe('createFieldDeps', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('without dependsOn, the field is inactive and always ready', () => {
    const state = makeFieldDeps({ dependsOn: () => undefined, values: () => ({}) })
    expect(state.active()).toBe(false)
    expect(state.ready()).toBe(true)
    expect(state.deps()).toEqual({})
  })

  it('resolves a relative dependsOn against the group path and tracks the parent value reactively', () => {
    const values = signal<{ address?: { countryId?: string } }>({ address: {} })
    const state = makeFieldDeps({
      dependsOn: () => 'countryId',
      groupPath: () => 'address',
      values: () => values(),
    })
    expect(state.ready()).toBe(false)
    expect(state.missingParentLabels()).toEqual(['countryId'])

    values.set({ address: { countryId: 'ru' } })
    expect(state.ready()).toBe(true)
    expect(state.deps()).toEqual({ countryId: 'ru' })
  })

  it('a leading "/" resolves from the form root, ignoring the group path', () => {
    const state = makeFieldDeps({
      dependsOn: () => '/countryId',
      groupPath: () => 'address',
      values: () => ({ countryId: 'ru' }),
    })
    expect(state.parentPaths()).toEqual(['countryId'])
    expect(state.ready()).toBe(true)
  })
})

describe('createDependentField', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('is blocked while the parent is empty and unblocked once it is set', () => {
    const values = signal<{ countryId?: string; cityId?: string }>({})
    const state = makeDependentField({
      fullPath: 'cityId',
      dependsOn: () => 'countryId',
      values: () => values(),
      setValue: (v) => values.update((prev) => ({ ...prev, cityId: v as string | undefined })),
    })
    expect(state.blocked()).toBe(true)

    values.update((prev) => ({ ...prev, countryId: 'ru' }))
    expect(state.blocked()).toBe(false)
  })

  it('clears the field and reports `cleared` when the parent value is edited through the registry', () => {
    const dependents = createDependentsRegistry()
    const values = signal<{ countryId?: string; cityId?: string }>({ countryId: 'ru', cityId: 'msk' })
    const setValue = vi.fn((v: unknown) => values.update((prev) => ({ ...prev, cityId: v as string | undefined })))
    makeDependentField({
      fullPath: 'cityId',
      dependsOn: () => 'countryId',
      values: () => values(),
      dependents,
      setValue,
    })
    TestBed.tick()

    // Гидратация/observe — не правка: сама по себе регистрация не должна ничего очищать
    expect(setValue).not.toHaveBeenCalled()

    dependents.handleFieldChange('countryId', 'us')
    expect(setValue).toHaveBeenCalledWith('')
  })

  it('a value equal to emptyValue is not cleared twice', () => {
    const dependents = createDependentsRegistry()
    const values = signal<{ countryId?: string; cityId?: string }>({ countryId: 'ru', cityId: '' })
    const setValue = vi.fn()
    makeDependentField({
      fullPath: 'cityId',
      dependsOn: () => 'countryId',
      values: () => values(),
      dependents,
      setValue,
    })
    TestBed.tick()
    dependents.handleFieldChange('countryId', 'us')
    expect(setValue).not.toHaveBeenCalled()
  })

  it('clearOnParentChange: false never registers a clearer (no auto-clear on parent edits)', () => {
    const dependents = createDependentsRegistry()
    const values = signal<{ countryId?: string; cityId?: string }>({ countryId: 'ru', cityId: 'msk' })
    const setValue = vi.fn()
    makeDependentField({
      fullPath: 'cityId',
      dependsOn: () => 'countryId',
      values: () => values(),
      dependents,
      setValue,
      clearOnParentChange: false,
    })
    TestBed.tick()
    dependents.handleFieldChange('countryId', 'us')
    expect(setValue).not.toHaveBeenCalled()
  })
})
