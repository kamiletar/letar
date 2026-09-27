import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useSelectionActionsState } from './use-selection-actions-state'

interface AppOption {
  value: string | number
  label?: unknown
  textValue?: string
}

function mountHost(build: () => Parameters<typeof useSelectionActionsState>[0]) {
  const Host = defineComponent({
    setup() {
      const state = useSelectionActionsState(build())
      return { state }
    },
    render() {
      return h('div')
    },
  })
  return mount(Host)
}

describe('useSelectionActionsState', () => {
  it('starts idle with no created options and no overlay', () => {
    const wrapper = mountHost(() => ({ appOptions: () => [] }))
    expect(wrapper.vm.state.pending.value).toBe(false)
    expect(wrapper.vm.state.createdOptions.value).toEqual([])
    expect(wrapper.vm.state.overlay.value).toEqual([])
    expect(wrapper.vm.state.pendingSelection.value).toBeNull()
  })

  it('run() with a plain (non-optimistic) create adds the option via apply()', async () => {
    const apply = vi.fn()
    const wrapper = mountHost(() => ({ appOptions: () => [] }))
    wrapper.vm.state.run({
      scope: 'option',
      call: async () => ({ label: 'Создано', value: 'new-1' }),
      apply,
    })
    expect(wrapper.vm.state.pending.value).toBe(true)
    await vi.waitFor(() => expect(wrapper.vm.state.pending.value).toBe(false))
    expect(apply).toHaveBeenCalledWith({ label: 'Создано', value: 'new-1' }, {
      optimistic: false,
      selectionHeld: false,
    })
  })

  it('run() ignores a second call while the first is still pending', () => {
    let resolveFirst: (value: { label: string; value: string } | null) => void = () => undefined
    const wrapper = mountHost(() => ({ appOptions: () => [] }))
    const call = vi.fn(() =>
      new Promise<{ label: string; value: string } | null>((resolve) => (resolveFirst = resolve))
    )
    wrapper.vm.state.run({ scope: 'option', call, apply: vi.fn() })
    wrapper.vm.state.run({ scope: 'option', call, apply: vi.fn() })
    expect(call).toHaveBeenCalledTimes(1)
    resolveFirst(null)
  })

  it('optimistic create shows a pending option immediately and confirms it via the registry', async () => {
    const registry = {
      add: vi.fn((promise: Promise<boolean>) => {
        void promise
        return () => undefined
      }),
      subscribe: vi.fn(() => () => undefined),
      getSnapshot: vi.fn(() => ({ count: 0, submitQueued: false })),
      settleAll: vi.fn(async () => true),
      submitWhenSettled: vi.fn(async () => undefined),
    }
    let resolveCall: (value: { label: string; value: string } | null) => void = () => undefined
    const wrapper = mountHost(() => ({ appOptions: () => [], registry }))

    wrapper.vm.state.run({
      scope: 'option',
      call: (ctx) => {
        ctx.optimistic({ label: 'Черновик' })
        return new Promise((resolve) => (resolveCall = resolve))
      },
      apply: vi.fn(),
    })

    // Оптимистичный показ снимает `pending` сразу — интерактивная фаза закончилась
    expect(wrapper.vm.state.pending.value).toBe(false)
    expect(wrapper.vm.state.createdOptions.value).toHaveLength(1)
    expect(wrapper.vm.state.createdOptions.value[0]).toMatchObject({ label: 'Черновик', pending: true })
    expect(wrapper.vm.state.pendingSelection.value).toBe(wrapper.vm.state.createdOptions.value[0]?.value)

    resolveCall({ label: 'Черновик', value: 'srv-1' })
    await vi.waitFor(() => expect(wrapper.vm.state.createdOptions.value).toHaveLength(0))
    expect(wrapper.vm.state.pendingSelection.value).toBeNull()
  })

  it('a declined optimistic create reverts the preview and sets settleFailure', async () => {
    let resolveCall: (value: { label: string; value: string } | null) => void = () => undefined
    const onRevert = vi.fn()
    const wrapper = mountHost(() => ({ appOptions: () => [] }))

    wrapper.vm.state.run({
      scope: 'option',
      call: (ctx) => {
        ctx.optimistic({ label: 'Черновик' })
        return new Promise((resolve) => (resolveCall = resolve))
      },
      apply: vi.fn(),
      onRevert,
    })

    resolveCall(null)
    await vi.waitFor(() => expect(wrapper.vm.state.createdOptions.value).toHaveLength(0))
    expect(onRevert).toHaveBeenCalled()
    expect(wrapper.vm.state.settleFailure.value).toEqual({ label: 'Черновик' })
  })

  it('recordEdit() overlays an app option and pruneOptionOverlay drops it once appOptions catch up', async () => {
    // `appOptions` — реактивный `ref`: композабл читает его через геттер, `watch` внутри него должен
    // реагировать на мутацию точно так же, как в реальном поле (Vue `computed`/`form.useStore`)
    const appOptions = ref<AppOption[]>([{ value: 'a', label: 'A' }])
    const wrapper = mountHost(() => ({ appOptions: () => appOptions.value }))
    wrapper.vm.state.recordEdit('a', { label: 'A2', value: 'a' })
    expect(wrapper.vm.state.overlay.value).toHaveLength(1)
    expect(wrapper.vm.state.overlay.value[0]).toMatchObject({ label: 'A2', fromValue: 'a' })

    // Приложение перезапросило справочник и подпись пришла свежая — наложение устарело
    appOptions.value = [{ value: 'a', label: 'A2' }]
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.state.overlay.value).toHaveLength(0)
  })

  it('resets createdOptions/overlay when depsKey changes (dependsOn parent switched)', async () => {
    const depsKey = ref('ru')
    const wrapper = mountHost(() => ({ appOptions: () => [], depsKey: () => depsKey.value }))
    wrapper.vm.state.addCreatedOption({ label: 'Москва', value: 'msk' })
    expect(wrapper.vm.state.createdOptions.value).toHaveLength(1)

    depsKey.value = 'us'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.state.createdOptions.value).toHaveLength(0)
  })
})
