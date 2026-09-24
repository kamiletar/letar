import { AppForm } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from '../app-form.test-utils'
import { FieldSelect } from './field-select'

beforeEach(() => {
  setupRekaPolyfills()
})

const schema = z.object({ category: z.string().optional().meta({ ui: { title: 'Категория' } }) })

function mountSelect(options: { value: string; label: string }[], initial = '') {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema, initialValue: { category: initial }, onSubmit: () => undefined },
            { default: () => [h(FieldSelect, { name: 'category', placeholder: 'Выберите', options })] },
          )
      },
    }),
    { attachTo: document.body },
  )
}

/**
 * Regression, тот же класс бага, что чинили в Chakra-скине (forms 2.16.12): `''` превращался в
 * «ничего не выбрано» (`|| undefined`), и опция «Все категории» со значением `''` никогда не
 * показывалась выбранной.
 */
describe('forms-vue-shadcn FieldSelect — опция с пустым значением', () => {
  it('контроль: обычное значение показывает подпись своей опции', async () => {
    const wrapper = mountSelect([{ value: '', label: 'Все категории' }, { value: 'a', label: 'A' }], 'a')
    await flushPromises()
    expect(wrapper.find('[data-field-name="category"]').text()).toContain('A')
    wrapper.unmount()
  })

  it('показывает подпись опции с пустым значением, когда значение поля пустое', async () => {
    const wrapper = mountSelect([{ value: '', label: 'Все категории' }, { value: 'a', label: 'A' }])
    await flushPromises()
    expect(wrapper.find('[data-field-name="category"]').text()).toContain('Все категории')
    wrapper.unmount()
  })

  it('без такой опции пустое значение по-прежнему показывает placeholder', async () => {
    const wrapper = mountSelect([{ value: 'a', label: 'A' }])
    await flushPromises()
    expect(wrapper.find('[data-field-name="category"]').text()).toContain('Выберите')
    wrapper.unmount()
  })
})
