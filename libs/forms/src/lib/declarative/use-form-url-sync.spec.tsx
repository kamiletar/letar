import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
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

// Регрессия «первый клиентский рендер расходится с SSR» (studio-dev, 2026-09-17):
// хук читал window.location.search синхронно в рендере, поэтому гидратационный рендер
// давал значения из URL, а SSR-разметка — defaults → recoverable hydration error.
describe('useFormUrlSync — согласованность с SSR', () => {
  const filterFields: ('search' | 'category')[] = ['search', 'category']

  function Probe() {
    const { initialValue } = useFormUrlSync({ fields: filterFields, defaults: defaultFilters })
    return <span data-testid="probe">{initialValue.search || '—'}</span>
  }

  it('первый рендер всегда отдаёт defaults, значения из URL применяются после маунта', () => {
    window.history.replaceState(null, '', '/?search=привет')
    const seen: string[] = []

    const { result } = renderHook(() => {
      const value = useFormUrlSync({ fields: filterFields, defaults: defaultFilters })
      seen.push(value.initialValue.search)
      return value
    })

    expect(seen[0]).toBe('')
    expect(result.current.initialValue).toEqual({ search: 'привет', category: 'all' })
  })

  it('гидратация страницы с ?search=… не даёт mismatch, значение появляется после эффекта', async () => {
    window.history.replaceState(null, '', '/?search=привет')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    // «Серверная» разметка: URL уже содержит фильтр, но SSR-рендер обязан отдать defaults
    const container = document.createElement('div')
    container.append(document.createRange().createContextualFragment(renderToString(<Probe />)))
    document.body.appendChild(container)
    expect(container.textContent).toBe('—')

    let root!: Root
    await act(async () => {
      root = hydrateRoot(container, <Probe />)
    })

    expect(container.textContent).toBe('привет')
    const hydrationErrors = errorSpy.mock.calls.filter((args) => String(args[0]).includes('ydrat'))
    expect(hydrationErrors).toEqual([])

    act(() => root.unmount())
    container.remove()
    errorSpy.mockRestore()
  })

  it('внутри <Form> поле получает значение из URL, а UrlSync не стирает параметр', async () => {
    window.history.replaceState(null, '', '/?search=привет')

    function Page() {
      const { initialValue } = useFormUrlSync({ fields: filterFields, defaults: defaultFilters })
      return (
        <TestWrapper>
          <Form initialValue={initialValue} onSubmit={vi.fn()}>
            <Form.Field.String name="search" label="Поиск" />
            <Form.UrlSync fields={filterFields} defaults={defaultFilters} debounce={10} />
          </Form>
        </TestWrapper>
      )
    }

    render(<Page />)

    await waitFor(() => expect(screen.getByLabelText('Поиск')).toHaveValue('привет'))
    // Ждём срабатывания debounce UrlSync — URL должен сохранить фильтр
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(window.location.search).toBe('?search=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82')
  })

  it('изменение defaults между рендерами подхватывается (не залипает на первых)', () => {
    let defaults = { search: '', category: 'all' }
    const { result, rerender } = renderHook(() => useFormUrlSync({ fields: filterFields, defaults }))

    defaults = { search: '', category: 'sale' }
    rerender()

    expect(result.current.initialValue.category).toBe('sale')
  })
})

describe('useFormUrlSync', () => {
  it('читает initialValue из URL с учётом defaults', () => {
    window.history.replaceState(null, '', '/?search=привет')

    const { result } = renderHook(() => useFormUrlSync({ fields: ['search', 'category'], defaults: defaultFilters }))

    expect(result.current.initialValue).toEqual({ search: 'привет', category: 'all' })
  })

  it('возвращает defaults при отсутствии соответствующих query params', () => {
    const { result } = renderHook(() => useFormUrlSync({ fields: ['search', 'category'], defaults: defaultFilters }))

    expect(result.current.initialValue).toEqual(defaultFilters)
  })
})
