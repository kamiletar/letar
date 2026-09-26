import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

interface User {
  id: string
  name: string
  email: string
}

const users: User[] = [
  { id: 'u1', name: 'Анна', email: 'anna@x.ru' },
  { id: 'u2', name: 'Борис', email: 'boris@x.ru' },
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

const query = () => ({ data: users, isLoading: false, error: null })

describe('Field.Combobox — renderOption / getTextValue / data', () => {
  it('useQuery: renderOption получает data = загруженный элемент', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ userId: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox
            name="userId"
            useQuery={query}
            getLabel={(u: User) => u.name}
            getValue={(u: User) => u.id}
            renderOption={(o) => <span data-testid="opt">{o.data?.name}|{o.data?.email}</span>}
            minChars={0}
          />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('combobox'))
    const items = await screen.findAllByTestId('opt')
    expect(items.map((i) => i.textContent)).toEqual(['Анна|anna@x.ru', 'Борис|boris@x.ru'])
  })

  it('getTextValue: текст в инпуте после выбора идёт по строке, а не по узлу', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ userId: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox
            name="userId"
            useQuery={query}
            getLabel={(u: User) => <em>{u.name}</em>}
            getTextValue={(u: User) => u.name}
            getValue={(u: User) => u.id}
            minChars={0}
          />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Борис' }))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Борис'))
  })

  it('статические options: фильтр по textValue при узле в label', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ c: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox
            name="c"
            options={[
              { value: 'a', label: <b>Альфа</b>, textValue: 'Альфа' },
              { value: 'b', label: <b>Бета</b>, textValue: 'Бета' },
            ]}
          />
        </Form>
      </TestWrapper>,
    )
    await userEvent.type(screen.getByRole('combobox'), 'Бет')
    expect(await screen.findByRole('option', { name: 'Бета' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Альфа' })).not.toBeInTheDocument()
  })

  it('начальная подпись берётся из textValue выбранной опции', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ c: 'b' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox
            name="c"
            options={[{ value: 'b', label: <b>Бета</b>, textValue: 'Бета-текст' }]}
          />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Бета-текст'))
  })

  it('служебный пункт создания не проходит через renderOption', async () => {
    const renderOption = vi.fn(() => <span>x</span>)
    render(
      <TestWrapper>
        <Form initialValue={{ c: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox
            name="c"
            options={[{ value: 'a', label: 'Альфа' }]}
            renderOption={renderOption}
            onCreate={vi.fn()}
          />
        </Form>
      </TestWrapper>,
    )
    await userEvent.type(screen.getByRole('combobox'), 'Нов')
    expect(await screen.findByRole('option', { name: '+ Add "Нов"' })).toBeInTheDocument()
    // Настоящая опция рисуется через renderOption, служебный пункт — нет
    const labels = renderOption.mock.calls.map(([o]) => String((o as { label: unknown }).label))
    expect(labels.some((l) => l.startsWith('+ '))).toBe(false)
  })
})
