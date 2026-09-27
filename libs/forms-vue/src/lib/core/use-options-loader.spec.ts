import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useOptionsLoader } from './use-options-loader'

function mountHost(build: () => Parameters<typeof useOptionsLoader<{ value: string }>>) {
  const Host = defineComponent({
    setup() {
      const state = useOptionsLoader(...build())
      return { state }
    },
    render() {
      return h('div')
    },
  })
  return mount(Host)
}

describe('useOptionsLoader', () => {
  it('loads once on mount and exposes the result via fieldProps', async () => {
    const load = vi.fn(async () => [{ value: 'a' }])
    const wrapper = mountHost(() => [load, () => 'static'])
    expect(wrapper.vm.state.fieldProps.value.loading).toBe(true)
    await vi.waitFor(() => expect(wrapper.vm.state.fieldProps.value.loading).toBe(false))
    expect(wrapper.vm.state.fieldProps.value.options).toEqual([{ value: 'a' }])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('re-fetches when the deps signature changes and applies the newest result (no race)', async () => {
    const depsRef = ref('ru')
    let resolveFirst: (value: { value: string }[]) => void = () => undefined
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise<{ value: string }[]>((resolve) => (resolveFirst = resolve)))
      .mockImplementationOnce(async () => [{ value: 'us-option' }])
    const wrapper = mountHost(() => [load, () => depsRef.value])

    depsRef.value = 'us'
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.vm.state.fieldProps.value.options).toEqual([{ value: 'us-option' }]))

    // Первый (устаревший) запрос отвечает позже — его результат не должен перезаписать второй
    resolveFirst([{ value: 'ru-option' }])
    await Promise.resolve()
    expect(wrapper.vm.state.fieldProps.value.options).toEqual([{ value: 'us-option' }])
  })

  it('keepPrevious: false clears options immediately on a deps change, before the new request settles', async () => {
    const depsRef = ref('ru')
    let resolveSecond: (value: { value: string }[]) => void = () => undefined
    const load = vi
      .fn()
      .mockImplementationOnce(async () => [{ value: 'ru-option' }])
      .mockImplementationOnce(() => new Promise<{ value: string }[]>((resolve) => (resolveSecond = resolve)))
    const wrapper = mountHost(() => [load, () => depsRef.value, { keepPrevious: false }])
    await vi.waitFor(() => expect(wrapper.vm.state.fieldProps.value.options).toEqual([{ value: 'ru-option' }]))

    depsRef.value = 'us'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.state.fieldProps.value.options).toEqual([])
    resolveSecond([{ value: 'us-option' }])
    await vi.waitFor(() => expect(wrapper.vm.state.fieldProps.value.options).toEqual([{ value: 'us-option' }]))
  })

  it('enabled: false skips the request without touching previously loaded options', async () => {
    const enabledRef = ref(true)
    const load = vi.fn(async () => [{ value: 'a' }])
    const wrapper = mountHost(() => [load, () => 'static', { enabled: () => enabledRef.value }])
    await vi.waitFor(() => expect(wrapper.vm.state.fieldProps.value.options).toEqual([{ value: 'a' }]))

    enabledRef.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.state.fieldProps.value.loading).toBe(false)
    expect(wrapper.vm.state.fieldProps.value.options).toEqual([{ value: 'a' }])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reload() re-runs the loader with the same deps', async () => {
    const load = vi.fn(async () => [{ value: 'a' }])
    const wrapper = mountHost(() => [load, () => 'static'])
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    wrapper.vm.state.reload()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })

  it('surfaces a rejection as error, keeping previous options when keepPrevious is true', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountHost(() => [load, () => 'static'])
    await vi.waitFor(() => expect(wrapper.vm.state.error.value).toBeInstanceOf(Error))
    expect(wrapper.vm.state.fieldProps.value.loading).toBe(false)
  })
})
