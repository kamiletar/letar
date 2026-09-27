import { AppForm } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from '../app-form.test-utils'
import { FieldSelect, type FieldSelectOption } from './field-select'

beforeEach(() => {
  setupRekaPolyfills()
})

const schema = z.object({ city: z.string().optional() })

const options: FieldSelectOption[] = [
  { value: 'msk', label: 'Москва', description: 'ул. Тверская, 1' },
  { value: 'kzn', label: 'Казань', description: 'ул. Баумана, 5' },
  { value: 'spb', label: 'Санкт-Петербург' },
]

function mountSelect(extraProps: Record<string, unknown>, initial = '') {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema, initialValue: { city: initial }, onSubmit: () => undefined },
            { default: () => [h(FieldSelect, { name: 'city', options, placeholder: 'Выберите', ...extraProps })] },
          )
      },
    }),
    { attachTo: document.body },
  )
}

/** Открывает список тем же способом, что и клавиатура: Reka `SelectTrigger` слушает `Enter` из `OPEN_KEYS` */
async function openList(wrapper: ReturnType<typeof mountSelect>): Promise<void> {
  await wrapper.find('[data-field-name="city"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
}

function descriptionTexts(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="select-item-description"]')).map((el) =>
    el.textContent ?? ''
  )
}

/**
 * Stage 3a паритета Select: `renderOption`/`renderValue`/`description` в `forms-vue-shadcn`,
 * зеркалит `libs/forms-shadcn/src/lib/fields/field-select-render.spec.tsx` и
 * `field-select-description.spec.tsx` (React), без create/update/search/dependsOn — не часть этой стадии.
 */
describe('forms-vue-shadcn FieldSelect — description (вторая строка опции)', () => {
  it('описание — второй строкой в списке; у опции без описания строки нет', async () => {
    const wrapper = mountSelect({})
    await openList(wrapper)
    expect(descriptionTexts()).toEqual(['ул. Тверская, 1', 'ул. Баумана, 5'])
    wrapper.unmount()
  })

  it('в триггере выбранного значения только подпись, без описания', async () => {
    const wrapper = mountSelect({}, 'msk')
    await flushPromises()
    const trigger = wrapper.find('[data-field-name="city"]')
    expect(trigger.text()).toContain('Москва')
    expect(trigger.text()).not.toContain('Тверская')
    wrapper.unmount()
  })

  it('со своим renderOption вторую строку рисует приложение, поле её не добавляет', async () => {
    const wrapper = mountSelect({ renderOption: (o: FieldSelectOption) => h('span', o.label) })
    await openList(wrapper)
    expect(descriptionTexts()).toEqual([])
    wrapper.unmount()
  })
})

describe('forms-vue-shadcn FieldSelect — renderOption', () => {
  it('получает опцию и состояние selected', async () => {
    const wrapper = mountSelect(
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

  /** Regression: подмена `''` → служебный токен (см. `field-select.ts`) не должна течь в колбэк приложения */
  it('опция со значением "" доходит до renderOption с настоящим value, не служебным токеном', async () => {
    const renderOption = vi.fn((o: FieldSelectOption) => h('span', o.label))
    const wrapper = mountSelect({
      options: [{ value: '', label: 'Все категории' }, { value: 'a', label: 'A' }],
      renderOption,
    })
    await openList(wrapper)
    expect(renderOption).toHaveBeenCalled()
    // Ре-рендеры Vue зовут `renderOption` не один раз — важно, что значение всегда настоящее (`''`/`'a'`),
    // а не служебный токен ни разу
    expect(new Set(renderOption.mock.calls.map(([o]) => o.value))).toEqual(new Set(['', 'a']))
    wrapper.unmount()
  })
})

describe('forms-vue-shadcn FieldSelect — renderValue', () => {
  it('рисует свою подпись выбранного значения', async () => {
    const wrapper = mountSelect({ renderValue: (o: FieldSelectOption) => h('b', `${o.label}!`) }, 'msk')
    await flushPromises()
    expect(wrapper.find('[data-field-name="city"]').text()).toContain('Москва!')
    wrapper.unmount()
  })

  it('пустой результат renderValue — откат к тексту опции', async () => {
    const wrapper = mountSelect({ renderValue: () => null }, 'msk')
    await flushPromises()
    expect(wrapper.find('[data-field-name="city"]').text()).toContain('Москва')
    wrapper.unmount()
  })

  it('пока ничего не выбрано — виден placeholder, renderValue не вызывается', async () => {
    const renderValue = vi.fn(() => h('b', 'x'))
    const wrapper = mountSelect({ renderValue })
    await flushPromises()
    expect(wrapper.find('[data-field-name="city"]').text()).toContain('Выберите')
    expect(renderValue).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
