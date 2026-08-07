import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchFilter } from './search-filter'

/** Обёртка с Chakra-провайдером — компонент использует токены темы */
function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

function mockRouting({ pathname = '/admin/products', search = '' }: { pathname?: string; search?: string } = {}) {
  const push = vi.fn()
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname,
    query: {},
    asPath: pathname,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  vi.mocked(usePathname).mockReturnValue(pathname)
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(search) as unknown as ReturnType<typeof useSearchParams>,
  )
  return { push }
}

describe('SearchFilter', () => {
  beforeEach(() => {
    mockRouting()
  })

  it('рендерит input с дефолтным placeholder и пустым значением', () => {
    renderWithProvider(<SearchFilter />)
    expect(screen.getByPlaceholderText('Поиск...')).toHaveValue('')
  })

  it('подставляет начальное значение из searchParams', () => {
    mockRouting({ search: 'q=мандала' })
    renderWithProvider(<SearchFilter />)
    expect(screen.getByPlaceholderText('Поиск...')).toHaveValue('мандала')
  })

  it('использует кастомный placeholder', () => {
    renderWithProvider(<SearchFilter placeholder="Поиск товаров..." />)
    expect(screen.getByPlaceholderText('Поиск товаров...')).toBeInTheDocument()
  })

  it('обновляет URL с параметром поиска после debounce', async () => {
    const { push } = mockRouting()
    const user = userEvent.setup()
    renderWithProvider(<SearchFilter />)

    await user.type(screen.getByPlaceholderText('Поиск...'), 'мандала')

    await waitFor(
      () => {
        expect(push).toHaveBeenCalledWith('/admin/products?q=%D0%BC%D0%B0%D0%BD%D0%B4%D0%B0%D0%BB%D0%B0')
      },
      { timeout: 1000 },
    )
  }, 10000)

  it('нажатие Enter немедленно отправляет запрос без ожидания debounce', async () => {
    const { push } = mockRouting()
    const user = userEvent.setup()
    renderWithProvider(<SearchFilter />)

    await user.type(screen.getByPlaceholderText('Поиск...'), 'товар{Enter}')

    expect(push).toHaveBeenCalledWith('/admin/products?q=%D1%82%D0%BE%D0%B2%D0%B0%D1%80')
  }, 10000)

  it('кнопка очистки появляется только при непустом значении и очищает поиск', async () => {
    mockRouting({ search: 'q=товар' })
    const { push } = mockRouting({ search: 'q=товар' })
    const user = userEvent.setup()
    renderWithProvider(<SearchFilter />)

    const clearButton = screen.getByRole('button', { name: 'Очистить поиск' })
    await user.click(clearButton)

    expect(screen.getByPlaceholderText('Поиск...')).toHaveValue('')
    expect(push).toHaveBeenCalledWith('/admin/products?')
  })

  it('кнопка "Поиск" отключена, если поле пустое', () => {
    renderWithProvider(<SearchFilter />)
    expect(screen.getByRole('button', { name: 'Поиск' })).toBeDisabled()
  })

  it('нажатие Escape очищает поле ввода', async () => {
    const user = userEvent.setup()
    renderWithProvider(<SearchFilter />)

    const input = screen.getByPlaceholderText('Поиск...')
    await user.type(input, 'товар')
    await user.keyboard('{Escape}')

    expect(input).toHaveValue('')
  })
})
