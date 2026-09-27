import { TestForm } from '@letar/forms-react/testing'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { FieldCombobox } from './field-combobox'
import { FieldSelect } from './field-select'

const options = Array.from({ length: 12 }, (_, i) => ({
  label: i === 1 ? 'Привет' : i === 2 ? 'Ёлка' : `Работа ${i}`,
  value: `v${i}`,
}))

beforeAll(() => {
  // Radix опирается на API указателя и прокрутки, которых нет в jsdom
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

const schema = z.object({ cat: z.string().nullable() })
const strictSchema = z.object({ cat: z.string() })

function setup(props: Record<string, unknown> = {}, initial: string | null = 'v3', strict = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  render(
    <TestForm defaultValues={{ cat: initial }} schema={strict ? strictSchema : schema} onFormReady={(f) => (form = f)}>
      <FieldSelect name="cat" options={options} placeholder="Категория" {...props} />
    </TestForm>,
  )
  return { value: () => form.state.values.cat as string | null }
}

const trigger = () => screen.getByRole('combobox')
const openList = async () => {
  await userEvent.click(trigger())
  return screen.findByRole('searchbox')
}
const optionNames = () => screen.queryAllByRole('option').map((el) => el.textContent)

describe('FieldSelect (shadcn) — поле поиска и порог', () => {
  it("'auto': на 9 опциях поля поиска нет, с 10-й — есть", async () => {
    setup({ options: options.slice(0, 9) })
    await userEvent.click(trigger())
    await screen.findByRole('option', { name: 'Привет' })
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it("'auto' по умолчанию: 12 опций — поле поиска в списке есть", async () => {
    setup()
    expect(await openList()).toBeInTheDocument()
    expect(optionNames()).toHaveLength(12)
  })

  it('searchable={false} на 12 опциях поля нет; true на 3 — есть; threshold из объекта', async () => {
    setup({ searchable: false })
    await userEvent.click(trigger())
    await screen.findByRole('option', { name: 'Привет' })
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('searchable={true} показывает поле и при трёх опциях', async () => {
    setup({ options: options.slice(0, 3), searchable: true })
    expect(await openList()).toBeInTheDocument()
  })

  it('searchable={{ threshold: 2 }}: три опции — поле есть', async () => {
    setup({ options: options.slice(0, 3), searchable: { threshold: 2 } })
    expect(await openList()).toBeInTheDocument()
  })
})

describe('FieldSelect (shadcn) — фильтр', () => {
  it('«ghbdtn» (не та раскладка) находит «Привет»', async () => {
    setup()
    await userEvent.type(await openList(), 'ghbdtn')
    expect(optionNames()).toEqual(['Привет'])
  })

  it('регистр не важен, «е» находит «Ёлка»', async () => {
    setup()
    await userEvent.type(await openList(), 'ЕЛК')
    expect(optionNames()).toEqual(['Ёлка'])
  })

  it('ничего не найдено — сообщение по умолчанию и своё из searchable.emptyMessage', async () => {
    setup()
    await userEvent.type(await openList(), 'яяя')
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
  })

  it('своё сообщение пустого результата', async () => {
    setup({ searchable: { threshold: 0, emptyMessage: 'Пусто, совсем' } })
    await userEvent.type(await openList(), 'яяя')
    expect(screen.getByText('Пусто, совсем')).toBeInTheDocument()
  })

  it('свой предикат searchable.filter', async () => {
    setup({ searchable: { threshold: 0, filter: (opt: { value: string | number }, q: string) => opt.value === q } })
    await userEvent.type(await openList(), 'v7')
    expect(optionNames()).toEqual(['Работа 7'])
  })

  it('поиск идёт и по описанию; searchInDescription={false} — только по тексту', async () => {
    const cities = [
      ...options.slice(0, 10),
      { label: 'Москва', value: 'msk', description: 'ул. Тверская, 1' },
    ]
    setup({ options: cities })
    await userEvent.type(await openList(), 'тверск')
    expect(optionNames()).toEqual(['Москваул. Тверская, 1'])
  })

  it('searchInDescription={false}: описание не ищется', async () => {
    const cities = [
      ...options.slice(0, 10),
      { label: 'Москва', value: 'msk', description: 'ул. Тверская, 1' },
    ]
    setup({ options: cities, searchInDescription: false })
    await userEvent.type(await openList(), 'тверск')
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
  })

  it('пустой вариант со значением «» виден и выбираем; тригер после выбора показывает его подпись', async () => {
    const withEmpty = [{ label: 'Все категории', value: '' }, ...options]
    const { value } = setup({ options: withEmpty }, 'v3', true)
    await userEvent.click(trigger())
    await userEvent.click(await screen.findByRole('option', { name: 'Все категории' }))
    await waitFor(() => expect(value()).toBe(''))
    expect(trigger()).toHaveTextContent('Все категории')
  })
})

describe('FieldSelect (shadcn) — выбор и клавиатура', () => {
  it('клик по пункту пишет значение в форму и закрывает список', async () => {
    const { value } = setup()
    await openList()
    await userEvent.click(screen.getByRole('option', { name: 'Привет' }))
    expect(value()).toBe('v1')
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(trigger()).toHaveTextContent('Привет')
  })

  it('фокус после открытия — в поле поиска; при открытии подсвечен выбранный пункт', async () => {
    setup()
    const input = await openList()
    await waitFor(() => expect(input).toHaveFocus())
    await waitFor(() => expect(input.getAttribute('aria-activedescendant')).toBeTruthy())
    const active = document.getElementById(input.getAttribute('aria-activedescendant')!)
    expect(active).toHaveTextContent('Работа 3')
  })

  it('ввод и Enter выбирают первый подходящий пункт', async () => {
    const { value } = setup()
    const input = await openList()
    await userEvent.type(input, 'работа 1')
    await userEvent.keyboard('{Enter}')
    // Подходят «Работа 10» и «Работа 11» (v1 — «Привет»): Enter берёт первый
    expect(value()).toBe('v10')
  })

  it('стрелки двигают подсветку, Enter выбирает', async () => {
    const { value } = setup()
    const input = await openList()
    await userEvent.type(input, 'работа')
    // после ввода подсвечен первый подходящий («Работа 0»)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(value()).toBe('v4')
  })

  it('ArrowUp с первого пункта уходит по кругу на последний', async () => {
    const { value } = setup()
    const input = await openList()
    await userEvent.type(input, 'работа')
    await userEvent.keyboard('{ArrowUp}{Enter}')
    expect(value()).toBe('v11')
  })

  it('Escape закрывает список, значение прежнее, при новом открытии запрос пуст', async () => {
    const { value } = setup()
    const input = await openList()
    await userEvent.type(input, 'привет')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('searchbox')).toBeNull())
    expect(value()).toBe('v3')

    const reopened = await openList()
    expect(reopened).toHaveValue('')
    expect(optionNames()).toHaveLength(12)
  })

  it('Enter в поле поиска без подходящих пунктов ничего не выбирает и не отправляет форму', async () => {
    const { value } = setup()
    const input = await openList()
    await userEvent.type(input, 'яяя{Enter}')
    expect(value()).toBe('v3')
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('Tab в поле поиска закрывает список и возвращает фокус на триггер', async () => {
    setup()
    await openList()
    await userEvent.keyboard('{Tab}')
    await waitFor(() => expect(screen.queryByRole('searchbox')).toBeNull())
    expect(trigger()).toHaveFocus()
  })

  it('стрелка вниз на триггере открывает список', async () => {
    setup()
    trigger().focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(await screen.findByRole('searchbox')).toBeInTheDocument()
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
  })

  it('F2 на подсвеченном пункте зовёт onUpdate этой записи; на закрытом триггере — выбранной', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Работа 3 ✎', value: 'v3' })
    setup({ onUpdate })
    trigger().focus()
    await userEvent.keyboard('{F2}')
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate.mock.calls[0]![0]).toMatchObject({ value: 'v3' })

    onUpdate.mockClear()
    const input = await openList()
    await userEvent.type(input, 'привет')
    await userEvent.keyboard('{F2}')
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate.mock.calls[0]![0]).toMatchObject({ value: 'v1' })
  })

  it('«Очистить» у nullable пишет null и не открывает список', async () => {
    const { value } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(value()).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
    await waitFor(() => expect(trigger()).toHaveTextContent('Категория'))
  })

  it('readOnly не открывает список', async () => {
    setup({ readOnly: true })
    await userEvent.click(trigger())
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('a11y: триггер — combobox с aria-haspopup=listbox, у списка есть подпись', async () => {
    setup()
    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox')
    await openList()
    const list = screen.getByRole('listbox')
    expect(list).toHaveAccessibleName('Поиск по списку')
    expect(trigger()).toHaveAttribute('aria-controls', list.id)
    expect(within(list).getAllByRole('option')).toHaveLength(12)
    expect(within(list).getByRole('option', { name: 'Работа 3' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('FieldSelect (shadcn) — «+ Добавить» с поиском', () => {
  it('пункт создания подписан запросом, onCreate получает текст без пробелов по краям', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'new' })
    const { value } = setup({ onCreate })
    const input = await openList()
    // Пока запроса нет — обычный пункт
    expect(screen.getByRole('option', { name: /\+ Добавить…/ })).toBeInTheDocument()
    await userEvent.type(input, '  Новая ')
    const create = await screen.findByRole('option', { name: '+ Добавить "Новая"' })
    await userEvent.click(create)
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    expect(onCreate.mock.calls[0]![0]).toBe('Новая')
    await waitFor(() => expect(value()).toBe('new'))
  })

  it('точное совпадение с существующей записью пункта создания не предлагает', async () => {
    const onCreate = vi.fn()
    setup({ onCreate })
    await userEvent.type(await openList(), 'Привет')
    expect(screen.queryByRole('option', { name: /Добавить/ })).toBeNull()
  })
})

describe('FieldCombobox (shadcn) — раскладка', () => {
  it('«ghbdtn» находит «Привет»', async () => {
    render(
      <TestForm defaultValues={{ cat: '' }}>
        <FieldCombobox name="cat" options={options} />
      </TestForm>,
    )
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'ghbdtn')
    await screen.findByRole('option', { name: 'Привет' })
    expect(screen.queryByRole('option', { name: 'Работа 3' })).toBeNull()
  })
})
