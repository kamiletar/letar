import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Form } from './'
import { useFormUrlSync } from './use-form-url-sync'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const defaultFilters = { search: '', category: 'all' }

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

// Регрессионный тест на баг из коммита 207e25b7: Form.UrlSync читал TanStack
// useFormContext(), доступный только внутри form.AppForm — падение на первом
// же рендере внутри декларативного <Form>.
describe('Form.UrlSync (внутри декларативного <Form>)', () => {
  it('рендерится без throw внутри <Form> и не рендерит видимый элемент', () => {
    const { container } = render(
      <TestWrapper>
        <Form initialValue={defaultFilters} onSubmit={vi.fn()}>
          <Form.Field.String name="search" label="Поиск" />
          <Form.UrlSync fields={['search', 'category']} defaults={defaultFilters} />
        </Form>
      </TestWrapper>,
    )

    expect(screen.getByLabelText('Поиск')).toBeInTheDocument()
    // Form.UrlSync — renderless (возвращает null)
    expect(container.querySelectorAll('input').length).toBe(1)
  })

  it('пишет изменённое значение поля в URL query params', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={defaultFilters} onSubmit={vi.fn()}>
          <Form.Field.String name="search" label="Поиск" />
          <Form.UrlSync fields={['search', 'category']} defaults={defaultFilters} debounce={10} />
        </Form>
      </TestWrapper>,
    )

    await user.type(screen.getByLabelText('Поиск'), 'обои')

    await waitFor(
      () => {
        expect(window.location.search).toContain('search=%D0%BE%D0%B1%D0%BE%D0%B8')
      },
      { timeout: 1000 },
    )
  })

  it('не пишет в URL поля со значением по умолчанию', () => {
    render(
      <TestWrapper>
        <Form initialValue={defaultFilters} onSubmit={vi.fn()}>
          <Form.Field.String name="search" label="Поиск" />
          <Form.UrlSync fields={['search', 'category']} defaults={defaultFilters} />
        </Form>
      </TestWrapper>,
    )

    expect(window.location.search).toBe('')
  })
})

describe('useFormUrlSync', () => {
  it('читает initialValue из URL с учётом defaults', () => {
    window.history.replaceState(null, '', '/?search=привет')

    let result: { initialValue: typeof defaultFilters } | undefined

    function Probe() {
      result = useFormUrlSync({ fields: ['search', 'category'], defaults: defaultFilters })
      return null
    }

    render(<Probe />)

    expect(result?.initialValue).toEqual({ search: 'привет', category: 'all' })
  })

  it('возвращает defaults при отсутствии соответствующих query params', () => {
    let result: { initialValue: typeof defaultFilters } | undefined

    function Probe() {
      result = useFormUrlSync({ fields: ['search', 'category'], defaults: defaultFilters })
      return null
    }

    render(<Probe />)

    expect(result?.initialValue).toEqual(defaultFilters)
  })
})
