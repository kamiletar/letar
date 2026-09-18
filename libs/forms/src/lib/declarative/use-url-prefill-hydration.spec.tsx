import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Form } from './'
import { useUrlPrefill } from './use-url-prefill'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const FIELDS = ['name', 'email']

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

// Регресс: useUrlPrefill читал window.location.search внутри useMemo — первый клиентский
// (гидратационный) рендер расходился с SSR, как раньше useFormUrlSync.
describe('useUrlPrefill — согласованность с SSR', () => {
  function Probe({ cleanUrl }: { cleanUrl?: boolean }) {
    const prefilled = useUrlPrefill({ fields: FIELDS, cleanUrl })
    return <span data-testid="probe">{String(prefilled.name ?? '—')}</span>
  }

  it('первый рендер отдаёт {}, значения из URL применяются после маунта', () => {
    window.history.replaceState(null, '', '/?name=Иван')
    const seen: unknown[] = []

    const { result } = renderHook(() => {
      const value = useUrlPrefill({ fields: FIELDS })
      seen.push(value.name)
      return value
    })

    expect(seen[0]).toBeUndefined()
    expect(result.current).toEqual({ name: 'Иван' })
  })

  it.each([false, true])('гидратация с ?name=… (cleanUrl: %s) не даёт mismatch', async (cleanUrl) => {
    window.history.replaceState(null, '', '/?name=Иван&keep=1')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    // «Серверная» разметка: URL уже содержит параметр, но SSR обязан отдать пустое значение
    const container = document.createElement('div')
    container.append(document.createRange().createContextualFragment(renderToString(<Probe cleanUrl={cleanUrl} />)))
    document.body.appendChild(container)
    expect(container.textContent).toBe('—')

    let root!: Root
    await act(async () => {
      root = hydrateRoot(container, <Probe cleanUrl={cleanUrl} />)
    })

    expect(container.textContent).toBe('Иван')
    const hydrationErrors = errorSpy.mock.calls.filter((args) => String(args[0]).includes('ydrat'))
    expect(hydrationErrors).toEqual([])

    act(() => root.unmount())
    container.remove()
    errorSpy.mockRestore()
  })

  it('cleanUrl: убирает только извлечённые параметры и только после чтения', async () => {
    window.history.replaceState(null, '', '/?name=Иван&keep=1')

    const { result } = renderHook(() => useUrlPrefill({ fields: FIELDS, cleanUrl: true }))

    await waitFor(() => expect(window.location.search).toBe('?keep=1'))
    // Значение не потеряно вместе с параметром, даже при inline-массиве fields
    expect(result.current).toEqual({ name: 'Иван' })
  })

  it('options.searchParams детерминирован — считается синхронно, без пустого первого рендера', () => {
    const seen: unknown[] = []
    renderHook(() => {
      const value = useUrlPrefill({ fields: FIELDS, searchParams: new URLSearchParams('?name=Иван') })
      seen.push(value.name)
      return value
    })

    expect(seen[0]).toBe('Иван')
  })

  it('внутри <Form> поле получает значение из URL', async () => {
    window.history.replaceState(null, '', '/?name=Иван')

    function Page() {
      const prefilled = useUrlPrefill({ fields: FIELDS, cleanUrl: true })
      return (
        <TestWrapper>
          <Form initialValue={{ name: '', email: '', ...prefilled }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" label="Имя" />
          </Form>
        </TestWrapper>
      )
    }

    render(<Page />)

    await waitFor(() => expect(screen.getByLabelText('Имя')).toHaveValue('Иван'))
    expect(window.location.search).toBe('')
  })
})
