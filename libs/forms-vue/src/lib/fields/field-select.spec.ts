import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from '../core/app-form'
import { FieldSelect, type FieldSelectOption } from './field-select'

const schema = z.object({
  category: z.string().meta({ ui: { title: 'Категория' } }),
})

function TestForm(
  onSubmit: (value: Record<string, unknown>) => void,
  fieldProps: Record<string, unknown>,
  initialValue: Record<string, unknown> = { category: '' },
) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema, initialValue, onSubmit },
          { default: () => [h(FieldSelect, { name: 'category', ...fieldProps })] },
        )
    },
  })
}

const options: FieldSelectOption[] = [
  { value: 'a', label: 'Первая', description: 'Описание первой' },
  { value: 'b', label: 'Вторая' },
  { value: 'c', label: 'Третья', disabled: true },
]

// `computePosition` (`@floating-ui/dom`) резолвится микротаской — один лишний тик, чтобы
// `.then()` успел отработать до проверки DOM (тот же приём, что и в `use-listbox-popup.spec.ts`)
async function flushPosition() {
  await Promise.resolve()
  await nextTick()
}

async function openPopup(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('[role="combobox"]').trigger('click')
  await flushPosition()
}

beforeAll(() => {
  // jsdom не реализует `getBoundingClientRect`/layout — floating-ui считает координаты нулями,
  // но не должен падать; сам композабл это уже проверяет в своём unit-тесте
})

describe('FieldSelect (forms-vue, headless) — базовый listbox поверх useListboxPopup', () => {
  it('без выбора показывает placeholder, комбобокс закрыт', () => {
    const wrapper = mount(TestForm(vi.fn(), { options, placeholder: 'Выберите' }))
    const trigger = wrapper.get('[role="combobox"]')

    expect(trigger.text()).toBe('Выберите')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-haspopup')).toBe('listbox')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('с выбранным значением триггер показывает label соответствующей опции', () => {
    const wrapper = mount(TestForm(vi.fn(), { options }, { category: 'b' }))
    expect(wrapper.get('[role="combobox"]').text()).toBe('Вторая')
  })

  it('клик по триггеру открывает список опций с description у первой', async () => {
    const wrapper = mount(TestForm(vi.fn(), { options }))
    await openPopup(wrapper)

    const listbox = wrapper.get('[role="listbox"]')
    const items = listbox.findAll('[role="option"]')
    expect(items).toHaveLength(3)
    expect(items[0]?.text()).toContain('Первая')
    expect(items[0]?.text()).toContain('Описание первой')
    expect(items[1]?.text()).toBe('Вторая')
    expect(items[2]?.attributes('aria-disabled')).toBe('true')
  })

  it('клик по опции выбирает значение и закрывает попап', async () => {
    const wrapper = mount(TestForm(vi.fn(), { options }))
    await openPopup(wrapper)

    const items = wrapper.get('[role="listbox"]').findAll('[role="option"]')
    await items[1]?.trigger('click')
    await nextTick()

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(wrapper.get('[role="combobox"]').text()).toBe('Вторая')
  })

  it('клик по disabled-опции не выбирает её и не закрывает попап', async () => {
    const wrapper = mount(TestForm(vi.fn(), { options }))
    await openPopup(wrapper)

    const items = wrapper.get('[role="listbox"]').findAll('[role="option"]')
    await items[2]?.trigger('click')
    await nextTick()

    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
    expect(wrapper.get('[role="combobox"]').text()).not.toBe('Третья')
  })

  it('клавиатура: ArrowDown открывает попап и подсвечивает первую опцию, Enter выбирает', async () => {
    const wrapper = mount(TestForm(vi.fn(), { options }))
    const trigger = wrapper.get('[role="combobox"]')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await flushPosition()
    expect(wrapper.get('[role="listbox"]').exists()).toBe(true)
    expect(wrapper.get('[role="listbox"]').findAll('[role="option"]')[0]?.attributes('data-active')).toBe('true')

    await trigger.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(trigger.text()).toBe('Первая')
  })

  it('Escape закрывает попап без изменения значения', async () => {
    const wrapper = mount(TestForm(vi.fn(), { options }, { category: 'b' }))
    const trigger = wrapper.get('[role="combobox"]')

    await openPopup(wrapper)
    await trigger.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(trigger.text()).toBe('Вторая')
  })

  it('опция со значением "" выбирается и остаётся отображённой — headless не нуждается в EMPTY_OPTION_TOKEN', async () => {
    const emptyOptions: FieldSelectOption[] = [
      { value: '', label: 'Все категории' },
      { value: 'a', label: 'Первая' },
    ]
    const wrapper = mount(TestForm(vi.fn(), { options: emptyOptions }, { category: 'a' }))
    await openPopup(wrapper)

    const items = wrapper.get('[role="listbox"]').findAll('[role="option"]')
    await items[0]?.trigger('click')
    await nextTick()

    expect(wrapper.get('[role="combobox"]').text()).toBe('Все категории')

    // Попап уже закрыт (тот `<li>` размонтирован в том же тике, что и выбор) — переоткрываем,
    // чтобы проверить `aria-selected` на свежем рендере
    await openPopup(wrapper)
    const reopened = wrapper.get('[role="listbox"]').findAll('[role="option"]')
    expect(reopened[0]?.attributes('aria-selected')).toBe('true')
  })
})

describe('FieldSelect (forms-vue, headless) — renderOption / renderValue', () => {
  it('renderOption получает опцию и состояние {selected, active}, заменяет разметку по умолчанию', async () => {
    const renderOption = vi.fn((option: FieldSelectOption, state: { selected: boolean; active: boolean }) =>
      h('span', { 'data-testid': 'custom-option' }, `${option.label}:${String(state.selected)}:${String(state.active)}`)
    )
    const wrapper = mount(TestForm(vi.fn(), { options, renderOption }, { category: 'b' }))
    await openPopup(wrapper)

    const items = wrapper.get('[role="listbox"]').findAll('[data-testid="custom-option"]')
    expect(items).toHaveLength(3)
    // При открытии попапа активной становится уже выбранная опция ("Вторая") — совпадают
    // и `selected`, и `active`, пока пользователь не подвинул её стрелками
    expect(items[1]?.text()).toBe('Вторая:true:true')
    expect(renderOption).toHaveBeenCalled()
  })

  it('без renderOption опция рисуется label + description двумя строками', async () => {
    const wrapper = mount(TestForm(vi.fn(), { options }))
    await openPopup(wrapper)

    const first = wrapper.get('[role="listbox"]').findAll('[role="option"]')[0]
    expect(first?.find('.letar-field__select-option-label').text()).toBe('Первая')
    expect(first?.find('.letar-field__select-option-description').text()).toBe('Описание первой')
  })

  it('опция без description не рисует вторую строку', async () => {
    const wrapper = mount(TestForm(vi.fn(), { options }))
    await openPopup(wrapper)

    const second = wrapper.get('[role="listbox"]').findAll('[role="option"]')[1]
    expect(second?.find('.letar-field__select-option-description').exists()).toBe(false)
  })

  it('renderValue рисует свою подпись триггера вместо label', () => {
    const wrapper = mount(
      TestForm(vi.fn(), { options, renderValue: (o: FieldSelectOption) => h('b', {}, `»${o.label}«`) }, {
        category: 'a',
      }),
    )
    expect(wrapper.get('[role="combobox"]').text()).toBe('»Первая«')
  })

  it('renderValue не вызывается, пока ничего не выбрано — виден placeholder', () => {
    const renderValue = vi.fn(() => h('b', {}, 'x'))
    const wrapper = mount(TestForm(vi.fn(), { options, placeholder: 'Город', renderValue }))

    expect(wrapper.get('[role="combobox"]').text()).toBe('Город')
    expect(renderValue).not.toHaveBeenCalled()
  })

  it('пустой результат renderValue («») откатывается к label опции', () => {
    const wrapper = mount(
      TestForm(vi.fn(), { options, renderValue: () => '' }, { category: 'a' }),
    )
    expect(wrapper.get('[role="combobox"]').text()).toBe('Первая')
  })
})
