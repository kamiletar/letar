import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useDebounce } from './use-debounce'

function mountHost(source: () => string, delay?: () => number) {
  const Host = defineComponent({
    setup() {
      const debounced = useDebounce(source, delay)
      return { debounced }
    },
    render() {
      return h('div')
    },
  })
  return mount(Host)
}

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('отдаёт первое значение источника сразу, без задержки', () => {
    const wrapper = mountHost(() => 'initial')
    expect(wrapper.vm.debounced).toBe('initial')
  })

  it('обновляет значение только после задержки по умолчанию (300мс)', async () => {
    const query = ref('a')
    const wrapper = mountHost(() => query.value)
    query.value = 'ab'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.debounced).toBe('a')

    vi.advanceTimersByTime(299)
    expect(wrapper.vm.debounced).toBe('a')

    vi.advanceTimersByTime(1)
    expect(wrapper.vm.debounced).toBe('ab')
  })

  it('серия быстрых изменений — таймер каждый раз перезапускается, доходит только последнее значение', async () => {
    const query = ref('a')
    const wrapper = mountHost(() => query.value)

    query.value = 'ab'
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(150)

    query.value = 'abc'
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(150)
    // Прошло 300мс с первого изменения, но таймер перезапущен вторым — новое значение ещё не пришло
    expect(wrapper.vm.debounced).toBe('a')

    vi.advanceTimersByTime(150)
    expect(wrapper.vm.debounced).toBe('abc')
  })

  it('свой delay — геттер, значение задержки читается на каждый перезапуск таймера', async () => {
    const query = ref('a')
    const wrapper = mountHost(() => query.value, () => 1000)

    query.value = 'ab'
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(300)
    expect(wrapper.vm.debounced).toBe('a')

    vi.advanceTimersByTime(700)
    expect(wrapper.vm.debounced).toBe('ab')
  })
})
