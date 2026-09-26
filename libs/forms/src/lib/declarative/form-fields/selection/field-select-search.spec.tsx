import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const makeOptions = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    value: `v${i}`,
    label: i === 0 ? 'Кровля' : i === 1 ? 'Привет' : `Работа ${i}`,
  }))

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderSelect(props: Record<string, unknown> = {}, count = 10, initial = 'v2', onSubmit = vi.fn()) {
  const view = (n: number, p: Record<string, unknown>) => (
    <TestWrapper>
      <Form initialValue={{ cat: initial }} onSubmit={onSubmit}>
        <Form.Field.Select name="cat" options={makeOptions(n)} {...p} />
        <Form.Button.Submit>ok</Form.Button.Submit>
      </Form>
    </TestWrapper>
  )
  const utils = render(view(count, props))
  return {
    ...utils,
    onSubmit,
    rerenderWith: (n: number, p: Record<string, unknown> = props) => utils.rerender(view(n, p)),
  }
}

const trigger = () => screen.getAllByRole('combobox').find((el) => el.tagName === 'BUTTON')!
const openList = () => userEvent.click(trigger())
const searchInput = () => document.querySelector<HTMLInputElement>('input[role="combobox"]')
/** Задаёт запрос одним событием: `userEvent.type` в jsdom под нагрузкой теряет символы */
const setQuery = (input: HTMLInputElement, text: string) => fireEvent.change(input, { target: { value: text } })
/** Ждёт, пока поле поиска укажет на подсвеченную опцию с этим текстом (подсветка ставится после рендера) */
const waitHighlighted = (input: HTMLInputElement, text: string) =>
  waitFor(() => {
    const id = input.getAttribute('aria-activedescendant')
    expect(id ? document.getElementById(id)?.textContent : null).toContain(text)
  })
const optionTexts = () => Array.from(document.querySelectorAll('[role="option"]')).map((el) => el.textContent?.trim())

describe('Field.Select — поиск', () => {
  it('9 опций — поля поиска нет, 10 — есть', async () => {
    const nine = renderSelect({}, 9)
    await openList()
    await waitFor(() => expect(optionTexts()).toHaveLength(9))
    expect(searchInput()).toBeNull()
    nine.unmount()

    renderSelect({}, 10)
    await openList()
    await waitFor(() => expect(searchInput()).not.toBeNull())
  })

  it('searchable={false} выключает поиск при 30 опциях, searchable — включает при 3', async () => {
    const off = renderSelect({ searchable: false }, 30)
    await openList()
    await waitFor(() => expect(optionTexts()).toHaveLength(30))
    expect(searchInput()).toBeNull()
    off.unmount()

    renderSelect({ searchable: true }, 3)
    await openList()
    await waitFor(() => expect(searchInput()).not.toBeNull())
  })

  it('смена 9↔10 в рантайме: строка поиска появляется, значение остаётся', async () => {
    const view = renderSelect({}, 9)
    expect(trigger()).toHaveTextContent('Работа 2')
    view.rerenderWith(10)
    await openList()
    await waitFor(() => expect(searchInput()).not.toBeNull())
    expect(trigger()).toHaveTextContent('Работа 2')
  })

  it('фильтр без регистра; выбранное остаётся в триггере, хотя отфильтровано', async () => {
    renderSelect({}, 10)
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'КРОВ')
    await waitFor(() => expect(optionTexts()).toEqual(['Кровля']))
    expect(trigger()).toHaveTextContent('Работа 2')
  })

  it('раскладка: «ghbdtn» находит «Привет»', async () => {
    renderSelect({}, 10)
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'ghbdtn')
    await waitFor(() => expect(optionTexts()).toEqual(['Привет']))
  })

  it('пробел вводится в поле и не выбирает пункт', async () => {
    const onSubmit = vi.fn()
    renderSelect({}, 10, 'v2', onSubmit)
    await openList()
    const input = await waitFor(() => searchInput()!)
    await userEvent.type(input, 'работа 3')
    expect(input.value).toBe('работа 3')
    await waitFor(() => expect(optionTexts()).toEqual(['Работа 3']))
    await userEvent.click(screen.getByRole('button', { name: 'ok' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ cat: 'v2' })
  })

  it('Enter выбирает первую подходящую, список закрывается, поиск сбрасывается', async () => {
    const onSubmit = vi.fn()
    renderSelect({}, 10, 'v2', onSubmit)
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'Привет')
    await waitHighlighted(input, 'Привет')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(trigger()).toHaveTextContent('Привет'))
    await openList()
    const again = await waitFor(() => searchInput()!)
    expect(again.value).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'ok' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ cat: 'v1' })
  })

  it('ARIA поля поиска', async () => {
    renderSelect({}, 10)
    await openList()
    const input = await waitFor(() => searchInput()!)
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute('aria-label', 'Search options')
    const listId = input.getAttribute('aria-controls')!
    expect(document.getElementById(listId)).toHaveAttribute('role', 'listbox')
  })

  it('пустой результат: сообщение; свой renderEmpty получает текст поиска', async () => {
    renderSelect({}, 10)
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'zzzz')
    await waitFor(() => expect(screen.getByText('Nothing found')).toBeInTheDocument())
    expect(optionTexts()).toEqual([])
    cleanup()

    renderSelect({ renderEmpty: ({ search }: { search: string }) => <span>Нет «{search}»</span> }, 10)
    await openList()
    const second = await waitFor(() => searchInput()!)
    setQuery(second, 'qqq')
    await waitFor(() => expect(screen.getByText('Нет «qqq»')).toBeInTheDocument())
  })

  it('onCreate получает текст поиска; пункт «+ Add "текст"» идёт после фильтра', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'new' })
    renderSelect({ onCreate }, 10)
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, ' новая  ')
    const createItem = await waitFor(() => screen.getByRole('option', { name: /Add "новая"/ }))
    await act(async () => {
      await userEvent.click(createItem)
    })
    expect(onCreate).toHaveBeenCalledWith('новая')
  })

  it('точное совпадение подписи — пункта создания нет', async () => {
    renderSelect({ onCreate: vi.fn() }, 10)
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'Кровля')
    await waitFor(() => expect(optionTexts()).toEqual(['Кровля']))
  })

  it('searchable-объект: свой placeholder и свой порог', async () => {
    renderSelect({ searchable: { threshold: 2, placeholder: 'Найти работу' } }, 3)
    await openList()
    const input = await waitFor(() => searchInput()!)
    expect(input).toHaveAttribute('placeholder', 'Найти работу')
  })

  it('опция «Все» с value "" не сбрасывает выбор при поиске', async () => {
    const options = [{ value: '', label: 'Все категории' }, ...makeOptions(10)]
    render(
      <TestWrapper>
        <Form initialValue={{ cat: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="cat" options={options} />
        </Form>
      </TestWrapper>,
    )
    expect(trigger()).toHaveTextContent('Все категории')
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'Кров')
    await waitFor(() => expect(optionTexts()).toEqual(['Кровля']))
    expect(trigger()).toHaveTextContent('Все категории')
  })
  it('группы: пустые группы исчезают, заголовок группы в поиске не участвует', async () => {
    const grouped = makeOptions(12).map((o, i) => ({ ...o, group: i < 6 ? 'Стройка' : 'Инженерка' }))
    render(
      <TestWrapper>
        <Form initialValue={{ cat: 'v2' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="cat" options={grouped} getGroup={(o) => (o as { group?: string }).group} />
        </Form>
      </TestWrapper>,
    )
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'Работа 9')
    await waitFor(() => expect(optionTexts()).toEqual(['Работа 9']))
    const labels = Array.from(document.querySelectorAll('[data-part="item-group-label"]')).map((el) =>
      el.textContent?.trim()
    )
    expect(labels).toContain('Инженерка')
    expect(labels).not.toContain('Стройка')
    await userEvent.clear(input)
    setQuery(input, 'Инженерка')
    await waitFor(() => expect(optionTexts()).toEqual([]))
  })

  it('valueType number: выбор из отфильтрованного списка отдаёт число', async () => {
    const onSubmit = vi.fn()
    const numeric = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Пункт ${i + 1}` }))
    render(
      <TestWrapper>
        <Form initialValue={{ cat: 1 }} onSubmit={onSubmit}>
          <Form.Field.Select name="cat" options={numeric} valueType="number" />
          <Form.Button.Submit>ok</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'Пункт 11')
    await waitHighlighted(input, 'Пункт 11')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(trigger()).toHaveTextContent('Пункт 11'))
    await userEvent.click(screen.getByRole('button', { name: 'ok' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ cat: 11 })
  })

  it('смена 9→10: тот же DOM-узел триггера, поле не перемонтируется', async () => {
    const view = renderSelect({}, 9)
    const before = trigger()
    view.rerenderWith(10)
    expect(trigger()).toBe(before)
  })

  it('слоты: renderOption, renderValue и карандаш у значения работают вместе с поиском', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    renderSelect(
      {
        onUpdate,
        renderOption: (o: { label: ReactNode }) => <b data-testid="opt">{o.label}</b>,
        renderValue: (o: { label: ReactNode }) => <i data-testid="val">{o.label}</i>,
      },
      10,
    )
    expect(screen.getByTestId('val')).toHaveTextContent('Работа 2')
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'Кров')
    await waitFor(() => expect(screen.getAllByTestId('opt')).toHaveLength(1))
    expect(screen.getByTestId('val')).toHaveTextContent('Работа 2')
    const valuePencil = Array.from(document.querySelectorAll<HTMLElement>('[data-part="edit-button"]')).find(
      (el) => !el.closest('[role="option"]'),
    )
    expect(valuePencil).toBeDefined()
  })

  it('F2 из поля поиска правит подсвеченную опцию', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    renderSelect({ onUpdate }, 10)
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'Привет')
    await waitFor(() => expect(optionTexts()).toEqual(['Привет']))
    await userEvent.keyboard('{F2}')
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'v1' })))
  })

  it('aria-activedescendant указывает на подсвеченную опцию', async () => {
    renderSelect({}, 10)
    await openList()
    const input = await waitFor(() => searchInput()!)
    setQuery(input, 'Привет')
    await waitFor(() => {
      const id = input.getAttribute('aria-activedescendant')
      expect(id).toBeTruthy()
      expect(document.getElementById(id!)).toHaveTextContent('Привет')
    })
  })
})
