import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useListboxPopup } from './use-listbox-popup'

interface Option {
  value: string
  disabled?: boolean
}

const OPTIONS: Option[] = [{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }]

function mountHost(onSelect: (option: Option) => void, opts: { typeAhead?: boolean } = {}) {
  const Host = defineComponent({
    setup() {
      const popup = useListboxPopup<Option>({
        options: () => OPTIONS,
        onSelect,
        idBase: 'test-field',
        typeAhead: opts.typeAhead,
      })
      return { popup }
    },
    render() {
      return h('div', [
        h('button', {
          ref: this.popup.triggerRef,
          onKeydown: this.popup.onKeydown,
          onClick: this.popup.togglePopup,
        }, 'trigger'),
        this.popup.isOpen.value ? h('ul', { ref: this.popup.floatingRef, role: 'listbox' }) : null,
      ])
    },
  })
  return mount(Host)
}

describe('useListboxPopup', () => {
  it('starts closed with no active option', () => {
    const wrapper = mountHost(vi.fn())
    expect(wrapper.vm.popup.isOpen.value).toBe(false)
    expect(wrapper.vm.popup.activeIndex.value).toBe(-1)
  })

  it('ArrowDown opens the popup and activates the first enabled option', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.vm.popup.isOpen.value).toBe(true)
    expect(wrapper.vm.popup.activeIndex.value).toBe(0)
  })

  it('ArrowDown again skips the disabled option', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.vm.popup.activeIndex.value).toBe(2)
  })

  it('ArrowUp from the first option wraps to the last enabled one', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.find('button').trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.vm.popup.activeIndex.value).toBe(2)
  })

  it('Enter selects the active option and closes the popup', async () => {
    const onSelect = vi.fn()
    const wrapper = mountHost(onSelect)
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.find('button').trigger('keydown', { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith({ value: 'a' })
    expect(wrapper.vm.popup.isOpen.value).toBe(false)
  })

  it('Escape closes the popup without selecting', async () => {
    const onSelect = vi.fn()
    const wrapper = mountHost(onSelect)
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.find('button').trigger('keydown', { key: 'Escape' })
    expect(wrapper.vm.popup.isOpen.value).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('Home/End jump to the first/last option', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.find('button').trigger('keydown', { key: 'End' })
    expect(wrapper.vm.popup.activeIndex.value).toBe(2)
    await wrapper.find('button').trigger('keydown', { key: 'Home' })
    expect(wrapper.vm.popup.activeIndex.value).toBe(0)
  })

  it('type-ahead opens the popup and activates a matching option, when enabled', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'c' })
    expect(wrapper.vm.popup.isOpen.value).toBe(true)
    expect(wrapper.vm.popup.activeIndex.value).toBe(2)
  })

  it('type-ahead is a no-op when disabled (Combobox/Autocomplete own their input)', async () => {
    const wrapper = mountHost(vi.fn(), { typeAhead: false })
    await wrapper.find('button').trigger('keydown', { key: 'c' })
    expect(wrapper.vm.popup.isOpen.value).toBe(false)
  })

  it('a mousedown outside the trigger and the floating element closes the popup', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.vm.popup.isOpen.value).toBe(true)

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(wrapper.vm.popup.isOpen.value).toBe(false)
  })

  it('a mousedown on the trigger does not close the popup', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    wrapper.find('button').element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(wrapper.vm.popup.isOpen.value).toBe(true)
  })

  it('a mousedown inside the floating listbox does not close the popup', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    wrapper.find('ul').element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(wrapper.vm.popup.isOpen.value).toBe(true)
  })

  it('computes floating position (floating-ui) once the listbox is attached', async () => {
    const wrapper = mountHost(vi.fn())
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    // computePosition резолвится микротаской — один лишний тик, чтобы .then() успел отработать
    await Promise.resolve()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.popup.floatingStyles.position).toBe('absolute')
    expect(typeof wrapper.vm.popup.floatingStyles.top).toBe('string')
    expect(typeof wrapper.vm.popup.floatingStyles.left).toBe('string')
  })
})
