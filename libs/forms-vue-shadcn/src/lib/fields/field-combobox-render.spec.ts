import { AppForm } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from '../app-form.test-utils'
import { FieldCombobox } from './field-combobox'
import type { FieldSelectOption } from './field-select'

beforeEach(() => {
  setupRekaPolyfills()
})

const schema = z.object({ city: z.string().optional() })

const options: FieldSelectOption[] = [
  { value: 'msk', label: 'Москва', description: 'ул. Тверская, 1' },
  { value: 'kzn', label: 'Казань', description: 'ул. Баумана, 5' },
  { value: 'spb', label: 'Санкт-Петербург' },
]

function mountCombobox(extraProps: Record<string, unknown>, initial = '') {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema, initialValue: { city: initial }, onSubmit: () => undefined },
            {
              default: () => [
                h(FieldCombobox, { name: 'city', options, placeholder: 'Поиск...', ...extraProps }),
              ],
            },
          )
      },
    }),
    { attachTo: document.body },
  )
}

/**
 * Открывает список стрелкой вниз — Reka `ComboboxInput` слушает `keydown.down`/`keydown.up`
 * (`openOnFocus`/`openOnClick` у `ComboboxRoot` по умолчанию выключены, см. `ComboboxRoot.vue`)
 */
async function openList(wrapper: ReturnType<typeof mountCombobox>): Promise<void> {
  await wrapper.find('[data-field-name="city"]').trigger('keydown', { key: 'ArrowDown' })
  await flushPromises()
}

function descriptionTexts(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="combobox-item-description"]')).map((el) =>
    el.textContent ?? ''
  )
}

/**
 * Stage 4a паритета Combobox: `renderOption`/`renderValue`/`description` в `forms-vue-shadcn`,
 * зеркалит `libs/forms-vue-shadcn/src/lib/fields/field-select-render.spec.ts` (Select, Stage 3a),
 * без `loadOptions`/`loadSelected` (4b), `onCreate`/`onUpdate` (4c), `dependsOn` (4d) — не эта стадия.
 */
describe('forms-vue-shadcn FieldCombobox — description (вторая строка опции)', () => {
  it('описание — второй строкой в списке; у опции без описания строки нет', async () => {
    const wrapper = mountCombobox({})
    await openList(wrapper)
    expect(descriptionTexts()).toEqual(['ул. Тверская, 1', 'ул. Баумана, 5'])
    wrapper.unmount()
  })

  it('со своим renderOption вторую строку рисует приложение, поле её не добавляет', async () => {
    const wrapper = mountCombobox({ renderOption: (o: FieldSelectOption) => h('span', o.label) })
    await openList(wrapper)
    expect(descriptionTexts()).toEqual([])
    wrapper.unmount()
  })
})

describe('forms-vue-shadcn FieldCombobox — renderOption', () => {
  it('получает опцию и состояние selected', async () => {
    const wrapper = mountCombobox(
      {
        renderOption: (o: FieldSelectOption, s: { selected: boolean }) =>
          h('span', { 'data-testid': 'opt' }, `${o.label}:${s.selected}`),
      },
      'kzn',
    )
    await openList(wrapper)
    const items = Array.from(document.querySelectorAll('[data-testid="opt"]')).map((el) => el.textContent)
    expect(items).toEqual(['Москва:false', 'Казань:true', 'Санкт-Петербург:false'])
    wrapper.unmount()
  })

  it('служебный текст поля ввода не мешает renderOption видеть все опции', async () => {
    const renderOption = vi.fn((o: FieldSelectOption) => h('span', o.label))
    const wrapper = mountCombobox({ renderOption })
    await openList(wrapper)
    expect(renderOption).toHaveBeenCalled()
    expect(new Set(renderOption.mock.calls.map(([o]) => o.value))).toEqual(new Set(['msk', 'kzn', 'spb']))
    wrapper.unmount()
  })
})

describe('forms-vue-shadcn FieldCombobox — renderValue', () => {
  it('выбранное значение при монтировании подставляет подпись опции в поле ввода', async () => {
    const wrapper = mountCombobox({}, 'msk')
    await flushPromises()
    const input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Москва')
    wrapper.unmount()
  })

  it('рисует свою подпись выбранного значения в поле ввода', async () => {
    const wrapper = mountCombobox({ renderValue: (o: FieldSelectOption) => `${o.label}!` }, 'msk')
    await flushPromises()
    const input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Москва!')
    wrapper.unmount()
  })

  it('пустой результат renderValue — откат к тексту опции', async () => {
    const wrapper = mountCombobox({ renderValue: () => '' }, 'msk')
    await flushPromises()
    const input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Москва')
    wrapper.unmount()
  })

  it('пока ничего не выбрано — поле ввода пустое, renderValue не вызывается', async () => {
    const renderValue = vi.fn(() => 'x')
    const wrapper = mountCombobox({ renderValue })
    await flushPromises()
    const input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('')
    expect(renderValue).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
