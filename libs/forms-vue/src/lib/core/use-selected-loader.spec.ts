import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useSelectedLoader } from './use-selected-loader'

function mountHost(build: () => Parameters<typeof useSelectedLoader<{ id: string }>>[0]) {
  const Host = defineComponent({
    setup() {
      const state = useSelectedLoader(build())
      return { state }
    },
    render() {
      return h('div')
    },
  })
  return mount(Host)
}

describe('useSelectedLoader', () => {
  it('enabled: false — не грузит', () => {
    const load = vi.fn(async () => ({ id: '1' }))
    mountHost(() => ({ loadSelected: load, value: () => '1', enabled: () => false }))
    expect(load).not.toHaveBeenCalled()
  })

  it('пустое значение — не грузит, даже если enabled: true', () => {
    const load = vi.fn(async () => ({ id: '1' }))
    mountHost(() => ({ loadSelected: load, value: () => '', enabled: () => true }))
    expect(load).not.toHaveBeenCalled()
  })

  it('грузит запись по значению', async () => {
    const load = vi.fn(async (value: string) => ({ id: value }))
    const wrapper = mountHost(() => ({ loadSelected: load, value: () => '42', enabled: () => true }))
    expect(wrapper.vm.state.isLoading.value).toBe(true)
    await vi.waitFor(() => expect(wrapper.vm.state.data.value).toEqual({ id: '42' }))
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('запись кэшируется по значению — повторный запрос с тем же value не уходит снова', async () => {
    const load = vi.fn(async (value: string) => ({ id: value }))
    const enabledRef = ref(true)
    const wrapper = mountHost(() => ({ loadSelected: load, value: () => '42', enabled: () => enabledRef.value }))
    await vi.waitFor(() => expect(wrapper.vm.state.data.value).toEqual({ id: '42' }))

    enabledRef.value = false
    await wrapper.vm.$nextTick()
    enabledRef.value = true
    await wrapper.vm.$nextTick()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('смена deps НЕ сбрасывает кэш записи — та же запись видна для любого родителя', async () => {
    const load = vi.fn(async (value: string) => ({ id: value }))
    const depsRef = ref('parent-a')
    const wrapper = mountHost(() => ({
      loadSelected: load,
      value: () => '42',
      enabled: () => true,
      deps: () => ({ parent: depsRef.value }),
    }))
    await vi.waitFor(() => expect(wrapper.vm.state.data.value).toEqual({ id: '42' }))

    depsRef.value = 'parent-b'
    await wrapper.vm.$nextTick()
    expect(load).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.state.data.value).toEqual({ id: '42' })
  })

  it('invalidate() помечает запись устаревшей — следующий проход enabled перезагружает', async () => {
    const load = vi.fn(async (value: string) => ({ id: value }))
    const enabledRef = ref(true)
    const wrapper = mountHost(() => ({ loadSelected: load, value: () => '42', enabled: () => enabledRef.value }))
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))

    wrapper.vm.state.invalidate('42')
    // Прежнее значение остаётся на экране, пока не пришло новое
    expect(wrapper.vm.state.data.value).toEqual({ id: '42' })
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })

  it('null от загрузчика — «записи нет», отличимо от undefined («ещё не загружена»)', async () => {
    const load = vi.fn(async () => null)
    const wrapper = mountHost(() => ({ loadSelected: load, value: () => '42', enabled: () => true }))
    expect(wrapper.vm.state.data.value).toBeUndefined()
    await vi.waitFor(() => expect(wrapper.vm.state.data.value).toBeNull())
  })

  it('ошибка вызывает onLoadError, отменённый запрос (AbortError) — нет', async () => {
    const boom = new Error('boom')
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const onLoadError = vi.fn()
    const valueRef = ref('1')
    const load = vi.fn(
      (value: string, ctx: { signal: AbortSignal }) =>
        value === '1'
          ? new Promise((_resolve, reject) => ctx.signal.addEventListener('abort', () => reject(abortError)))
          : Promise.reject(boom),
    )
    const wrapper = mountHost(() => ({
      loadSelected: load,
      value: () => valueRef.value,
      enabled: () => true,
      onLoadError,
    }))
    valueRef.value = '2'
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(onLoadError).toHaveBeenCalledWith(boom))
    expect(onLoadError).toHaveBeenCalledTimes(1)
  })
})
