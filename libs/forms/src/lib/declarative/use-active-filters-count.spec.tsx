import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from './'
import { useActiveFiltersCount } from './use-active-filters-count'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const defaultFilters = { search: '', category: 'all' }

function FiltersCount({ defaults }: { defaults: typeof defaultFilters }) {
  const count = useActiveFiltersCount(defaults)
  return <div data-testid="count">{count}</div>
}

// Регрессионный тест на баг из коммита d241064e: useActiveFiltersCount читал
// TanStack useFormContext(), доступный только внутри form.AppForm — падение
// на первом же рендере внутри декларативного <Form>.
describe('useActiveFiltersCount (внутри декларативного <Form>)', () => {
  it('рендерится без throw и возвращает 0 при совпадении со значениями по умолчанию', () => {
    render(
      <TestWrapper>
        <Form initialValue={defaultFilters} onSubmit={vi.fn()}>
          <Form.Field.String name="search" label="Поиск" />
          <FiltersCount defaults={defaultFilters} />
        </Form>
      </TestWrapper>,
    )

    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('увеличивает счётчик при изменении поля относительно defaults', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={defaultFilters} onSubmit={vi.fn()}>
          <Form.Field.String name="search" label="Поиск" />
          <FiltersCount defaults={defaultFilters} />
        </Form>
      </TestWrapper>,
    )

    await user.type(screen.getByLabelText('Поиск'), 'обои')

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1')
    })
  })

  it('считает несколько изменённых полей', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={defaultFilters} onSubmit={vi.fn()}>
          <Form.Field.String name="search" label="Поиск" />
          <Form.Field.String name="category" label="Категория" />
          <FiltersCount defaults={defaultFilters} />
        </Form>
      </TestWrapper>,
    )

    await user.type(screen.getByLabelText('Поиск'), 'обои')
    await user.clear(screen.getByLabelText('Категория'))
    await user.type(screen.getByLabelText('Категория'), 'постеры')

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('2')
    })
  })
})
