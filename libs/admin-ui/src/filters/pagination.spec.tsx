import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Pagination } from './pagination'

/** Обёртка с Chakra-провайдером — useBreakpointValue требует системы токенов */
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

describe('Pagination', () => {
  beforeEach(() => {
    mockRouting()
  })

  it('не рендерит ничего, если всего одна страница', () => {
    const { container } = renderWithProvider(<Pagination total={5} pageSize={10} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('рендерит номера страниц и информацию о текущей странице', () => {
    renderWithProvider(<Pagination total={50} pageSize={10} />)

    expect(screen.getByText('1 из 5')).toBeInTheDocument()
    for (let page = 1; page <= 5; page++) {
      expect(screen.getByRole('button', { name: String(page) })).toBeInTheDocument()
    }
  })

  it('кнопки "Первая страница" и "Предыдущая страница" отключены на первой странице', () => {
    renderWithProvider(<Pagination total={50} pageSize={10} />)

    expect(screen.getByRole('button', { name: 'Первая страница' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Предыдущая страница' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Последняя страница' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Следующая страница' })).not.toBeDisabled()
  })

  it('переход на страницу через клик обновляет URL с параметром page', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting()
    renderWithProvider(<Pagination total={50} pageSize={10} />)

    await user.click(screen.getByRole('button', { name: '3' }))

    expect(push).toHaveBeenCalledWith('/admin/products?page=3')
  })

  it('переход на страницу 1 удаляет параметр page из URL', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting({ search: 'page=2' })
    renderWithProvider(<Pagination total={50} pageSize={10} />)

    await user.click(screen.getByRole('button', { name: 'Первая страница' }))

    expect(push).toHaveBeenCalledWith('/admin/products?')
  })

  it('на последней странице кнопки "Следующая" и "Последняя" отключены', () => {
    mockRouting({ search: 'page=5' })
    renderWithProvider(<Pagination total={50} pageSize={10} />)

    expect(screen.getByRole('button', { name: 'Следующая страница' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Последняя страница' })).toBeDisabled()
  })

  it('показывает многоточие при большом количестве страниц', () => {
    mockRouting({ search: 'page=5' })
    renderWithProvider(<Pagination total={200} pageSize={10} />)

    expect(screen.getAllByText('...').length).toBeGreaterThan(0)
  })

  it('использует кастомное имя параметра страницы', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting()
    renderWithProvider(<Pagination total={50} pageSize={10} paramName="p" />)

    await user.click(screen.getByRole('button', { name: '2' }))

    expect(push).toHaveBeenCalledWith('/admin/products?p=2')
  })
})
