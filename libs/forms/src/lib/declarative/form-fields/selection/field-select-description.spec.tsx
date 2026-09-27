import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { value: 'msk', label: 'Москва', description: 'ул. Тверская, 1' },
  { value: 'kzn', label: 'Казань', description: 'ул. Баумана, 5' },
  { value: 'spb', label: 'Санкт-Петербург' },
  { value: 'nsk', label: 'Новосибирск', description: <em data-testid="node-desc">узел</em> },
]

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

const descriptions = () =>
  Array.from(document.querySelectorAll('[data-part="item-description"]')).map((el) => el.textContent)
const setQuery = (input: HTMLInputElement, text: string) => fireEvent.change(input, { target: { value: text } })
const trigger = () => screen.getAllByRole('combobox').find((el) => el.tagName === 'BUTTON')!
const searchInput = () => document.querySelector<HTMLInputElement>('input[role="combobox"]')

describe('Field.Select — description (вторая строка опции)', () => {
  it('описание — второй строкой в списке, узел тоже; у опции без описания строки нет', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={options} />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(trigger())
    await waitFor(() => expect(descriptions()).toHaveLength(3))
    expect(descriptions()).toEqual(['ул. Тверская, 1', 'ул. Баумана, 5', 'узел'])
    expect(screen.getByTestId('node-desc')).toBeInTheDocument()
  })

  it('в триггере выбранного значения только подпись, без описания', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: 'msk' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={options} />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect(trigger().textContent).toContain('Москва'))
    expect(trigger().textContent).not.toContain('Тверская')
  })

  it('поиск находит по строковому описанию', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={options} searchable />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(trigger())
    await waitFor(() => expect(searchInput()).not.toBeNull())
    setQuery(searchInput()!, 'баумана')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option').textContent).toContain('Казань')
  })

  it('searchInDescription={false}: описание не ищется', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={options} searchable searchInDescription={false} />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(trigger())
    await waitFor(() => expect(searchInput()).not.toBeNull())
    setQuery(searchInput()!, 'баумана')
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0))
  })

  it('со своим renderOption вторую строку рисует приложение, поле её не добавляет', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={options} renderOption={(o) => <span>{o.label}</span>} />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(trigger())
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(4))
    expect(descriptions()).toEqual([])
  })
})

describe('Field.Combobox — description (вторая строка опции)', () => {
  it('статичные опции: описание в списке, в инпуте после выбора только подпись', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="city" options={options} minChars={0} />
        </Form>
      </TestWrapper>,
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    await userEvent.click(input)
    await waitFor(() => expect(descriptions()).toEqual(['ул. Тверская, 1', 'ул. Баумана, 5', 'узел']))
    await userEvent.click(screen.getByRole('option', { name: /Казань/ }))
    await waitFor(() => expect(input.value).toBe('Казань'))
  })

  it('локальный поиск идёт и по описанию', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="city" options={options} />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('combobox'))
    setQuery(screen.getByRole('combobox') as HTMLInputElement, 'тверск')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option').textContent).toContain('Москва')
  })

  it('searchInDescription={false}: описание не ищется', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="city" options={options} searchInDescription={false} />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('combobox'))
    setQuery(screen.getByRole('combobox') as HTMLInputElement, 'тверск')
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0))
  })

  it('useQuery + getDescription: вторая строка у загруженных записей', async () => {
    type User = { id: string; name: string; email: string }
    const users: User[] = [
      { id: 'u1', name: 'Анна', email: 'anna@x.ru' },
      { id: 'u2', name: 'Борис', email: 'boris@x.ru' },
    ]
    render(
      <TestWrapper>
        <Form initialValue={{ userId: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox
            name="userId"
            useQuery={() => ({ data: users, isLoading: false, error: null })}
            getLabel={(u: User) => u.name}
            getValue={(u: User) => u.id}
            getDescription={(u: User) => u.email}
            minChars={0}
          />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('combobox'))
    await waitFor(() => expect(descriptions()).toEqual(['anna@x.ru', 'boris@x.ru']))
  })
})
