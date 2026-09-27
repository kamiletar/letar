import { createDependentsRegistry } from '@letar/forms-core/uikit'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { useDependentField, useFieldDeps } from './use-dependent-field'

function mountFieldDepsHost(build: () => Parameters<typeof useFieldDeps>[0]) {
  const Host = defineComponent({
    setup() {
      const state = useFieldDeps(build())
      return { state }
    },
    render() {
      return h('div')
    },
  })
  return mount(Host)
}

function mountDependentHost(build: () => Parameters<typeof useDependentField>[0]) {
  const Host = defineComponent({
    setup() {
      const state = useDependentField(build())
      return { state }
    },
    render() {
      return h('div')
    },
  })
  return mount(Host)
}

describe('useFieldDeps', () => {
  it('without dependsOn, the field is inactive and always ready', () => {
    const wrapper = mountFieldDepsHost(() => ({ dependsOn: () => undefined, values: () => ({}) }))
    expect(wrapper.vm.state.active.value).toBe(false)
    expect(wrapper.vm.state.ready.value).toBe(true)
    expect(wrapper.vm.state.deps.value).toEqual({})
  })

  it('resolves a relative dependsOn against the group path and tracks the parent value reactively', async () => {
    const values = reactive<{ address?: { countryId?: string } }>({ address: { countryId: undefined } })
    const wrapper = mountFieldDepsHost(() => ({
      dependsOn: () => 'countryId',
      groupPath: () => 'address',
      values: () => values,
    }))
    expect(wrapper.vm.state.ready.value).toBe(false)
    expect(wrapper.vm.state.missingParentLabels.value).toEqual(['countryId'])

    values.address!.countryId = 'ru'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.state.ready.value).toBe(true)
    expect(wrapper.vm.state.deps.value).toEqual({ countryId: 'ru' })
  })

  it('a leading "/" resolves from the form root, ignoring the group path', () => {
    const values = { countryId: 'ru' }
    const wrapper = mountFieldDepsHost(() => ({
      dependsOn: () => '/countryId',
      groupPath: () => 'address',
      values: () => values,
    }))
    expect(wrapper.vm.state.parentPaths.value).toEqual(['countryId'])
    expect(wrapper.vm.state.ready.value).toBe(true)
  })
})

describe('useDependentField', () => {
  it('is blocked while the parent is empty and unblocked once it is set', async () => {
    const values = reactive<{ countryId?: string; cityId?: string }>({})
    const wrapper = mountDependentHost(() => ({
      fullPath: 'cityId',
      dependsOn: () => 'countryId',
      values: () => values,
      setValue: (v) => {
        values.cityId = v as string | undefined
      },
    }))
    expect(wrapper.vm.state.blocked.value).toBe(true)

    values.countryId = 'ru'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.state.blocked.value).toBe(false)
  })

  it('clears the field and reports `cleared` when the parent value is edited through the registry', () => {
    const dependents = createDependentsRegistry()
    const values = reactive<{ countryId?: string; cityId?: string }>({ countryId: 'ru', cityId: 'msk' })
    const setValue = vi.fn((v: unknown) => {
      values.cityId = v as string | undefined
    })
    mountDependentHost(() => ({
      fullPath: 'cityId',
      dependsOn: () => 'countryId',
      values: () => values,
      dependents,
      setValue,
    }))

    // Гидратация/observe — не правка: сама по себе регистрация не должна ничего очищать
    expect(setValue).not.toHaveBeenCalled()

    // Реальная правка родителя формой — `dependents.handleFieldChange`, как это делал бы form-level listener
    dependents.handleFieldChange('countryId', 'us')
    expect(setValue).toHaveBeenCalledWith('')
  })

  it('a value equal to emptyValue is not cleared twice', () => {
    const dependents = createDependentsRegistry()
    const values = reactive<{ countryId?: string; cityId?: string }>({ countryId: 'ru', cityId: '' })
    const setValue = vi.fn()
    mountDependentHost(() => ({
      fullPath: 'cityId',
      dependsOn: () => 'countryId',
      values: () => values,
      dependents,
      setValue,
    }))
    dependents.handleFieldChange('countryId', 'us')
    expect(setValue).not.toHaveBeenCalled()
  })

  it('clearOnParentChange: false never registers a clearer (no auto-clear on parent edits)', () => {
    const dependents = createDependentsRegistry()
    const values = reactive<{ countryId?: string; cityId?: string }>({ countryId: 'ru', cityId: 'msk' })
    const setValue = vi.fn()
    mountDependentHost(() => ({
      fullPath: 'cityId',
      dependsOn: () => 'countryId',
      values: () => values,
      dependents,
      setValue,
      clearOnParentChange: false,
    }))
    dependents.handleFieldChange('countryId', 'us')
    expect(setValue).not.toHaveBeenCalled()
  })
})
