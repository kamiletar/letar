import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { usePromiseSearch } from './use-promise-search'

function mountHost(build: () => Parameters<typeof usePromiseSearch<{ value: string }>>[0]) {
  const Host = defineComponent({
    setup() {
      const state = usePromiseSearch(build())
      return { state }
    },
    render() {
      return h('div')
    },
  })
  return mount(Host)
}

describe('usePromiseSearch', () => {
  it('enabled: false — запрос не уходит', () => {
    const load = vi.fn(async () => [{ value: 'a' }])
    mountHost(() => ({ loadOptions: load, search: () => '', enabled: () => false }))
    expect(load).not.toHaveBeenCalled()
  })

  it('без loadOptions — простаивает даже при enabled: true', () => {
    const wrapper = mountHost(() => ({ search: () => 'x', enabled: () => true }))
    expect(wrapper.vm.state.isLoading.value).toBe(false)
    expect(wrapper.vm.state.data.value).toBeUndefined()
  })

  it('загружает и отдаёт результат по текущей строке поиска', async () => {
    const load = vi.fn(async (search: string) => [{ value: search }])
    const wrapper = mountHost(() => ({ loadOptions: load, search: () => 'msk', enabled: () => true }))
    expect(wrapper.vm.state.isLoading.value).toBe(true)
    await vi.waitFor(() => expect(wrapper.vm.state.data.value).toEqual([{ value: 'msk' }]))
    expect(load).toHaveBeenCalledWith('msk', expect.objectContaining({ deps: {} }))
  })

  it('новая строка поиска отменяет прошлый запрос — применяется только последний ответ', async () => {
    const searchRef = ref('a')
    let resolveFirst: (value: { value: string }[]) => void = () => undefined
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise<{ value: string }[]>((resolve) => (resolveFirst = resolve)))
      .mockImplementationOnce(async () => [{ value: 'b-result' }])
    const wrapper = mountHost(() => ({ loadOptions: load, search: () => searchRef.value, enabled: () => true }))

    searchRef.value = 'b'
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.vm.state.data.value).toEqual([{ value: 'b-result' }]))

    // Устаревший первый запрос отвечает позже — не должен перезаписать второй
    resolveFirst([{ value: 'a-result' }])
    await Promise.resolve()
    expect(wrapper.vm.state.data.value).toEqual([{ value: 'b-result' }])
  })

  it('смена depsKey скрывает прежние данные немедленно, до ответа нового запроса', async () => {
    const depsKeyRef = ref('ru')
    let resolveSecond: (value: { value: string }[]) => void = () => undefined
    const load = vi
      .fn()
      .mockImplementationOnce(async () => [{ value: 'ru-option' }])
      .mockImplementationOnce(() => new Promise<{ value: string }[]>((resolve) => (resolveSecond = resolve)))
    const wrapper = mountHost(() => ({
      loadOptions: load,
      search: () => 'x',
      enabled: () => true,
      depsKey: () => depsKeyRef.value,
    }))
    await vi.waitFor(() => expect(wrapper.vm.state.data.value).toEqual([{ value: 'ru-option' }]))

    depsKeyRef.value = 'us'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.state.data.value).toBeUndefined()

    resolveSecond([{ value: 'us-option' }])
    await vi.waitFor(() => expect(wrapper.vm.state.data.value).toEqual([{ value: 'us-option' }]))
  })

  it('ошибка загрузки — в error, вызывает onLoadError, данные скрыты', async () => {
    const boom = new Error('boom')
    const load = vi.fn().mockRejectedValueOnce(boom)
    const onLoadError = vi.fn()
    const wrapper = mountHost(() => ({ loadOptions: load, search: () => 'x', enabled: () => true, onLoadError }))
    await vi.waitFor(() => expect(wrapper.vm.state.error.value).toBe(boom))
    expect(wrapper.vm.state.data.value).toBeUndefined()
    expect(onLoadError).toHaveBeenCalledWith(boom)
  })

  it('reload() повторяет запрос с той же строкой поиска', async () => {
    const load = vi.fn(async () => [{ value: 'a' }])
    const wrapper = mountHost(() => ({ loadOptions: load, search: () => 'x', enabled: () => true }))
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    wrapper.vm.state.reload()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    expect(load).toHaveBeenNthCalledWith(2, 'x', expect.anything())
  })

  it('отменённый запрос (AbortError) не попадает в error и не вызывает onLoadError', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const load = vi.fn(
      (_search: string, ctx: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          ctx.signal.addEventListener('abort', () => reject(abortError))
        }),
    )
    const onLoadError = vi.fn()
    const searchRef = ref('a')
    const wrapper = mountHost(() => ({
      loadOptions: load,
      search: () => searchRef.value,
      enabled: () => true,
      onLoadError,
    }))
    searchRef.value = 'b'
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    expect(onLoadError).not.toHaveBeenCalled()
    expect(wrapper.vm.state.error.value).toBeNull()
  })
})
