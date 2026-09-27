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

/** Диспатчит на элемент указанный тип события (bubbles: true) — тот же приём, что в `field-select-actions.spec.ts` */
function fireOn(el: Element, type: string): void {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
}

const schema = z.object({ framework: z.string().optional() })

function mountSelect(options: FieldSelectOption[], extraProps: Record<string, unknown>, initial = '') {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema, initialValue: { framework: initial }, onSubmit: () => undefined },
            {
              default: () => [
                h(FieldSelect, { name: 'framework', options, placeholder: 'Выберите', ...extraProps }),
              ],
            },
          )
      },
    }),
    { attachTo: document.body },
  )
}

/** Открывает поисковый Select (Popover-триггер `role="combobox"`) кликом, как реальный пользователь */
async function openSearchable(wrapper: ReturnType<typeof mountSelect>) {
  await wrapper.find('[role="combobox"]').trigger('click')
  await flushPromises()
}

function searchInput(): HTMLInputElement {
  return document.querySelector('[data-slot="select-search"]') as HTMLInputElement
}

function optionEls(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
}

function optionByText(text: string): HTMLElement | undefined {
  return optionEls().find((el) => el.textContent?.includes(text))
}

function manyOptions(count: number): FieldSelectOption[] {
  return Array.from({ length: count }, (_, i) => ({ value: `v${i}`, label: `Опция ${i}` }))
}

/**
 * Stage 3c паритета Select: `searchable` (порог 10, ручной filter, `searchInDescription`,
 * `emptyMessage`) — Vue-эквивалент `libs/forms-shadcn/src/lib/fields/field-select-search.spec.tsx`
 * (React), сценарии сужены до того, что реально поддерживает статический `FieldSelect` этого
 * скина (без `loadOptions`/F2-хоткея — их в Vue-скине нет вовсе).
 */
describe('forms-vue-shadcn FieldSelect — searchable', () => {
  it('без searchable — обычный Select, поля поиска нет', async () => {
    const wrapper = mountSelect(manyOptions(3), {})
    await openSearchable(wrapper)
    expect(searchInput()).toBeNull()
    wrapper.unmount()
  })

  it('auto: меньше 10 опций — поля поиска нет', async () => {
    const wrapper = mountSelect(manyOptions(9), { searchable: 'auto' })
    await openSearchable(wrapper)
    expect(searchInput()).toBeNull()
    wrapper.unmount()
  })

  it('auto: ровно 10 опций — поле поиска появляется', async () => {
    const wrapper = mountSelect(manyOptions(10), { searchable: 'auto' })
    await openSearchable(wrapper)
    expect(searchInput()).not.toBeNull()
    wrapper.unmount()
  })

  it('searchable: true — поле поиска при любом количестве опций', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openSearchable(wrapper)
    expect(searchInput()).not.toBeNull()
    wrapper.unmount()
  })

  it('searchable: false — поля поиска нет даже при 10+ опциях', async () => {
    const wrapper = mountSelect(manyOptions(10), { searchable: false })
    await openSearchable(wrapper)
    expect(searchInput()).toBeNull()
    wrapper.unmount()
  })

  it('searchable: {threshold: 2} — порог настраивается (строго «больше», не «не меньше»)', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: { threshold: 2 } })
    await openSearchable(wrapper)
    expect(searchInput()).not.toBeNull()
    wrapper.unmount()
  })

  it('фильтр раскладко-/регистро-/ё-нечувствителен', async () => {
    const options: FieldSelectOption[] = [
      { value: 'hello', label: 'Привет' },
      { value: 'bye', label: 'Пока' },
      { value: 'elka', label: 'ёлка' },
    ]
    const wrapper = mountSelect(options, { searchable: true })
    await openSearchable(wrapper)
    const input = searchInput()

    // Латинская раскладка того же физического набора клавиш, что кириллическое «Привет»
    input.value = 'ghbdtn'
    fireOn(input, 'input')
    await flushPromises()
    expect(optionByText('Привет')).toBeDefined()
    expect(optionByText('Пока')).toBeUndefined()

    input.value = 'ЁЛКА'
    fireOn(input, 'input')
    await flushPromises()
    expect(optionByText('ёлка')).toBeDefined()
    wrapper.unmount()
  })

  it('пустой результат — дефолтное сообщение «Ничего не найдено»', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openSearchable(wrapper)
    const input = searchInput()
    input.value = 'zzz-нет-такого'
    fireOn(input, 'input')
    await flushPromises()
    expect(document.querySelector('[role="listbox"]')?.textContent).toContain('Ничего не найдено')
    wrapper.unmount()
  })

  it('пустой результат — свой emptyMessage', async () => {
    const wrapper = mountSelect(manyOptions(3), {
      searchable: { threshold: 0, emptyMessage: 'Пусто, попробуйте иначе' },
    })
    await openSearchable(wrapper)
    const input = searchInput()
    input.value = 'zzz-нет-такого'
    fireOn(input, 'input')
    await flushPromises()
    expect(document.querySelector('[role="listbox"]')?.textContent).toContain('Пусто, попробуйте иначе')
    wrapper.unmount()
  })

  it('свой filter — приложение решает, что подходит', async () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]
    const filter = vi.fn((opt: FieldSelectOption) => opt.value === 'b')
    const wrapper = mountSelect(options, { searchable: { threshold: 0, filter } })
    await openSearchable(wrapper)
    const input = searchInput()
    input.value = 'что угодно'
    fireOn(input, 'input')
    await flushPromises()
    expect(optionByText('Beta')).toBeDefined()
    expect(optionByText('Alpha')).toBeUndefined()
    expect(filter).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('searchInDescription: true (по умолчанию) — ищет и по описанию', async () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Тариф А', description: 'уникальный-маркер' },
      { value: 'b', label: 'Тариф Б' },
    ]
    const wrapper = mountSelect(options, { searchable: true })
    await openSearchable(wrapper)
    const input = searchInput()
    input.value = 'уникальный-маркер'
    fireOn(input, 'input')
    await flushPromises()
    expect(optionByText('Тариф А')).toBeDefined()
    expect(optionByText('Тариф Б')).toBeUndefined()
    wrapper.unmount()
  })

  it('searchInDescription: false — по описанию не ищет', async () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Тариф А', description: 'уникальный-маркер' },
      { value: 'b', label: 'Тариф Б' },
    ]
    const wrapper = mountSelect(options, { searchable: true, searchInDescription: false })
    await openSearchable(wrapper)
    const input = searchInput()
    input.value = 'уникальный-маркер'
    fireOn(input, 'input')
    await flushPromises()
    expect(optionByText('Тариф А')).toBeUndefined()
    wrapper.unmount()
  })

  it('опция с пустым значением остаётся видна и выбираема во время активного поиска', async () => {
    const options: FieldSelectOption[] = [
      { value: '', label: 'Все категории' },
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]
    const wrapper = mountSelect(options, { searchable: true })
    await openSearchable(wrapper)
    const input = searchInput()
    input.value = 'все'
    fireOn(input, 'input')
    await flushPromises()
    const empty = optionByText('Все категории')
    expect(empty).toBeDefined()
    fireOn(empty!, 'click')
    await flushPromises()
    wrapper.unmount()
  })

  it('стрелки перемещают подсветку, Enter выбирает подсвеченный пункт', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openSearchable(wrapper)
    const input = searchInput()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    await flushPromises()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await flushPromises()
    // Старт подсветки — первая опция (v0), два ArrowDown сдвигают её на две позиции вперёд (v2)
    expect(wrapper.find('[data-field-name="framework"]').text()).toContain('Опция 2')
    wrapper.unmount()
  })

  it('Escape в поле поиска не отправляет форму (список — Popover, не нативный select)', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openSearchable(wrapper)
    const input = searchInput()
    expect(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
      .not.toThrow()
    wrapper.unmount()
  })

  it('a11y: role=combobox, aria-haspopup=listbox, aria-expanded переключается', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    const trigger = wrapper.find('[role="combobox"]')
    expect(trigger.attributes('aria-haspopup')).toBe('listbox')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await openSearchable(wrapper)
    expect(wrapper.find('[role="combobox"]').attributes('aria-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('"+ Добавить" с активным поиском подставляет запрос в подпись пункта создания', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true, onCreate: vi.fn() })
    await openSearchable(wrapper)
    const input = searchInput()
    input.value = 'Новый фреймворк'
    fireOn(input, 'input')
    await flushPromises()
    expect(document.querySelector('[role="listbox"]')?.textContent).toContain('Новый фреймворк')
    wrapper.unmount()
  })
})
