import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useSelectionSearch } from './use-selection-search'

interface Option {
  value: string
  label: string
}

function makeOptions(count: number): Option[] {
  return Array.from({ length: count }, (_, index) => ({ value: String(index), label: `Опция ${index}` }))
}

function mountHost(build: () => Parameters<typeof useSelectionSearch<Option>>[0]) {
  const Host = defineComponent({
    setup() {
      const state = useSelectionSearch(build())
      return { state }
    },
    render() {
      return h('div')
    },
  })
  return mount(Host)
}

describe('useSelectionSearch', () => {
  it('below the threshold with `auto`, the search field is hidden and the full list passes through', () => {
    const wrapper = mountHost(() => ({
      searchable: () => undefined,
      options: () => makeOptions(3),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    }))
    expect(wrapper.vm.state.enabled.value).toBe(false)
    expect(wrapper.vm.state.search.value).toBeUndefined()
    expect(wrapper.vm.state.filtered.value).toHaveLength(3)
  })

  it('above the threshold, the search field appears and filters by text', () => {
    const wrapper = mountHost(() => ({
      searchable: () => undefined,
      options: () => makeOptions(20),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    }))
    expect(wrapper.vm.state.enabled.value).toBe(true)
    wrapper.vm.state.setQuery('Опция 1')
    // "Опция 1" совпадает с "Опция 1", "Опция 10".."Опция 19"
    expect(wrapper.vm.state.filtered.value.map((o) => o.value)).toContain('1')
    expect(wrapper.vm.state.filtered.value.every((o) => o.label.includes('1'))).toBe(true)
  })

  it('hysteresis: once the query is non-empty, the field stays visible even if options drop below the threshold', async () => {
    const optionsRef = ref(makeOptions(20))
    const wrapper = mountHost(() => ({
      searchable: () => undefined,
      options: () => optionsRef.value,
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    }))
    wrapper.vm.state.setQuery('что-то')
    optionsRef.value = makeOptions(3)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.state.enabled.value).toBe(true)
  })

  it('searchable: true forces the field on regardless of the option count', () => {
    const wrapper = mountHost(() => ({
      searchable: () => true,
      options: () => makeOptions(1),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    }))
    expect(wrapper.vm.state.enabled.value).toBe(true)
  })

  it('a custom `searchable.filter` overrides the built-in matcher', () => {
    const wrapper = mountHost(() => ({
      searchable: () => ({ filter: (option: Option) => option.value === '2' }),
      options: () => makeOptions(3),
      getText: (o: Option) => o.label,
      placeholder: 'Поиск',
      ariaLabel: 'Поиск',
    }))
    wrapper.vm.state.setQuery('anything')
    expect(wrapper.vm.state.filtered.value).toEqual([{ value: '2', label: 'Опция 2' }])
  })
})
