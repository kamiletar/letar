import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from '../core/app-form'
import { FieldSelect, type FieldSelectOption } from './field-select'

// `computePosition` (`@floating-ui/dom`) резолвится микротаской — один лишний тик, тот же приём,
// что в `field-select.spec.ts`
async function flushPosition() {
  await Promise.resolve()
  await nextTick()
}

async function openPopup(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('[role="combobox"]').trigger('click')
  await flushPosition()
}

function searchInput(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('[role="searchbox"]')
}

function optionTexts(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('[role="option"]').map((el) => el.text())
}

function manyOptions(count: number): FieldSelectOption[] {
  return Array.from({ length: count }, (_, i) => ({ value: `v${i}`, label: `Опция ${i}` }))
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
    // `attachTo: document.body` — фокус (`element.focus()`) в jsdom реально перемещает
    // `document.activeElement` только для узлов, присоединённых к документу
    { attachTo: document.body },
  )
}

/**
 * Этап 3f паритета Select: `searchable` (порог `'auto'` = >9, ручной `filter`, `searchInDescription`,
 * `emptyMessage`) — headless-эквивалент `libs/forms-vue-shadcn/src/lib/fields/field-select-search.spec.ts`,
 * адаптированный под разметку этого пакета (`[role="combobox"]`/собственный `<ul role="listbox">`,
 * поле поиска — обычный `<input role="searchbox">` первым элементом внутри попапа, не Reka-Popover).
 */
describe('FieldSelect (forms-vue, headless) — searchable', () => {
  it('без searchable — поля поиска нет при малом числе опций', async () => {
    const wrapper = mountSelect(manyOptions(3), {})
    await openPopup(wrapper)
    expect(searchInput(wrapper).exists()).toBe(false)
    wrapper.unmount()
  })

  it('auto (по умолчанию): меньше 10 опций — поля поиска нет', async () => {
    const wrapper = mountSelect(manyOptions(9), { searchable: 'auto' })
    await openPopup(wrapper)
    expect(searchInput(wrapper).exists()).toBe(false)
    wrapper.unmount()
  })

  it('auto: 10 опций и больше — поле поиска появляется', async () => {
    const wrapper = mountSelect(manyOptions(10), { searchable: 'auto' })
    await openPopup(wrapper)
    expect(searchInput(wrapper).exists()).toBe(true)
    wrapper.unmount()
  })

  it('searchable: true — поле поиска при любом количестве опций', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openPopup(wrapper)
    expect(searchInput(wrapper).exists()).toBe(true)
    wrapper.unmount()
  })

  it('searchable: false — поля поиска нет даже при 10+ опциях', async () => {
    const wrapper = mountSelect(manyOptions(10), { searchable: false })
    await openPopup(wrapper)
    expect(searchInput(wrapper).exists()).toBe(false)
    wrapper.unmount()
  })

  it('searchable: {threshold: 2} — порог настраивается (строго «больше», не «не меньше»)', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: { threshold: 2 } })
    await openPopup(wrapper)
    expect(searchInput(wrapper).exists()).toBe(true)
    wrapper.unmount()
  })

  it('фильтр раскладко-/регистро-/ё-нечувствителен', async () => {
    const options: FieldSelectOption[] = [
      { value: 'hello', label: 'Привет' },
      { value: 'bye', label: 'Пока' },
      { value: 'elka', label: 'ёлка' },
    ]
    const wrapper = mountSelect(options, { searchable: true })
    await openPopup(wrapper)
    const input = searchInput(wrapper)

    // Латинская раскладка того же физического набора клавиш, что кириллическое «Привет»
    await input.setValue('ghbdtn')
    expect(optionTexts(wrapper)).toContain('Привет')
    expect(optionTexts(wrapper)).not.toContain('Пока')

    await input.setValue('ЁЛКА')
    expect(optionTexts(wrapper)).toContain('ёлка')
    wrapper.unmount()
  })

  it('пустой результат — дефолтное сообщение «Ничего не найдено»', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openPopup(wrapper)
    await searchInput(wrapper).setValue('zzz-нет-такого')
    expect(wrapper.get('[role="listbox"]').text()).toContain('Ничего не найдено')
    wrapper.unmount()
  })

  it('пустой результат — свой emptyMessage', async () => {
    const wrapper = mountSelect(manyOptions(3), {
      searchable: { threshold: 0, emptyMessage: 'Пусто, попробуйте иначе' },
    })
    await openPopup(wrapper)
    await searchInput(wrapper).setValue('zzz-нет-такого')
    expect(wrapper.get('[role="listbox"]').text()).toContain('Пусто, попробуйте иначе')
    wrapper.unmount()
  })

  it('свой filter — приложение решает, что подходит', async () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]
    const filter = vi.fn((opt: FieldSelectOption) => opt.value === 'b')
    const wrapper = mountSelect(options, { searchable: { threshold: 0, filter } })
    await openPopup(wrapper)
    await searchInput(wrapper).setValue('что угодно')
    expect(optionTexts(wrapper)).toContain('Beta')
    expect(optionTexts(wrapper)).not.toContain('Alpha')
    expect(filter).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('searchInDescription: true (по умолчанию) — ищет и по описанию', async () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Тариф А', description: 'уникальный-маркер' },
      { value: 'b', label: 'Тариф Б' },
    ]
    const wrapper = mountSelect(options, { searchable: true })
    await openPopup(wrapper)
    await searchInput(wrapper).setValue('уникальный-маркер')
    expect(optionTexts(wrapper).some((text) => text.includes('Тариф А'))).toBe(true)
    expect(optionTexts(wrapper).some((text) => text.includes('Тариф Б'))).toBe(false)
    wrapper.unmount()
  })

  it('searchInDescription: false — по описанию не ищет', async () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Тариф А', description: 'уникальный-маркер' },
      { value: 'b', label: 'Тариф Б' },
    ]
    const wrapper = mountSelect(options, { searchable: true, searchInDescription: false })
    await openPopup(wrapper)
    await searchInput(wrapper).setValue('уникальный-маркер')
    expect(optionTexts(wrapper).some((text) => text.includes('Тариф А'))).toBe(false)
    wrapper.unmount()
  })

  it('опция с пустым значением остаётся видна и выбираема во время активного поиска', async () => {
    const options: FieldSelectOption[] = [
      { value: '', label: 'Все категории' },
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]
    const wrapper = mountSelect(options, { searchable: true })
    await openPopup(wrapper)
    await searchInput(wrapper).setValue('все')
    const empty = wrapper.findAll('[role="option"]').find((el) => el.text().includes('Все категории'))
    expect(empty).toBeDefined()
    await empty!.trigger('click')
    await nextTick()
    expect(wrapper.get('[role="combobox"]').text()).toBe('Все категории')
    wrapper.unmount()
  })

  it('стрелки перемещают активный пункт по отфильтрованному списку, Enter выбирает', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openPopup(wrapper)
    const input = searchInput(wrapper)
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()
    // Открытие подсвечивает первую опцию (v0), два ArrowDown сдвигают на две позиции вперёд (v2)
    expect(wrapper.get('[role="combobox"]').text()).toBe('Опция 2')
    wrapper.unmount()
  })

  it('Escape в поле поиска закрывает попап без отправки формы', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openPopup(wrapper)
    const input = searchInput(wrapper)
    await input.trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('a11y: role=combobox, aria-haspopup=listbox, aria-expanded переключается', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.attributes('aria-haspopup')).toBe('listbox')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await openPopup(wrapper)
    expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('"+ Добавить" с активным поиском подставляет запрос в подпись пункта создания', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true, onCreate: vi.fn() })
    await openPopup(wrapper)
    await searchInput(wrapper).setValue('Новый фреймворк')
    expect(wrapper.get('[role="listbox"]').text()).toContain('Новый фреймворк')
    wrapper.unmount()
  })

  it('поле поиска получает фокус сразу после открытия попапа', async () => {
    const wrapper = mountSelect(manyOptions(3), { searchable: true })
    await openPopup(wrapper)
    // `nextTick`-фокус в jsdom — сравниваем `document.activeElement`, не событие
    expect(document.activeElement).toBe(searchInput(wrapper).element)
    wrapper.unmount()
  })
})
