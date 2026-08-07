import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AdminBreadcrumbs } from './admin-breadcrumbs'

/** Обёртка с Chakra-провайдером — Breadcrumb требует системы токенов */
function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

function mockPathname(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname)
}

describe('AdminBreadcrumbs', () => {
  it('не рендерит ничего на главной админки (1 сегмент)', () => {
    mockPathname('/admin')

    const { container } = renderWithProvider(<AdminBreadcrumbs />)

    expect(container).toBeEmptyDOMElement()
  })

  it('не рендерит ничего на корне (0 сегментов)', () => {
    mockPathname('/')

    const { container } = renderWithProvider(<AdminBreadcrumbs />)

    expect(container).toBeEmptyDOMElement()
  })

  it('строит цепочку крошек для вложенного пути с дефолтными названиями', () => {
    mockPathname('/admin/edit')

    renderWithProvider(<AdminBreadcrumbs />)

    // домашняя иконка ссылается на baseUrl
    const homeLink = screen.getByRole('link', { name: '' })
    expect(homeLink).toHaveAttribute('href', '/admin')

    // последняя крошка — текст без ссылки
    expect(screen.getByText('Редактирование')).toBeInTheDocument()
  })

  it('использует пользовательские pathNames поверх дефолтных', () => {
    mockPathname('/admin/products')

    renderWithProvider(<AdminBreadcrumbs pathNames={{ products: 'Товары' }} />)

    expect(screen.getByText('Товары')).toBeInTheDocument()
  })

  it('заменяет UUID-сегмент на «Детали»', () => {
    mockPathname('/admin/products/550e8400-e29b-41d4-a716-446655440000')

    renderWithProvider(<AdminBreadcrumbs pathNames={{ products: 'Товары' }} />)

    expect(screen.getByText('Детали')).toBeInTheDocument()
  })

  it('заменяет CUID-сегмент на «Детали»', () => {
    // регекс модели: c + ровно 24 символа [a-z0-9]
    mockPathname('/admin/products/c0123456789abcdefghijklmn')

    renderWithProvider(<AdminBreadcrumbs pathNames={{ products: 'Товары' }} />)

    expect(screen.getByText('Детали')).toBeInTheDocument()
  })

  it('показывает неизвестный сегмент как есть, если названия нет ни в дефолтных, ни в пользовательских', () => {
    mockPathname('/admin/unknown-segment')

    renderWithProvider(<AdminBreadcrumbs />)

    expect(screen.getByText('unknown-segment')).toBeInTheDocument()
  })

  it('строит промежуточную крошку как ссылку, а не текст', () => {
    mockPathname('/admin/products/edit')

    renderWithProvider(<AdminBreadcrumbs pathNames={{ products: 'Товары' }} />)

    const productsLink = screen.getByRole('link', { name: 'Товары' })
    expect(productsLink).toHaveAttribute('href', '/admin/products')

    // последний сегмент (edit) — просто текст, не ссылка
    expect(screen.queryByRole('link', { name: 'Редактирование' })).not.toBeInTheDocument()
    expect(screen.getByText('Редактирование')).toBeInTheDocument()
  })

  it('использует кастомный baseUrl для домашней ссылки', () => {
    mockPathname('/panel/settings')

    renderWithProvider(<AdminBreadcrumbs baseUrl="/panel" />)

    const homeLink = screen.getByRole('link', { name: '' })
    expect(homeLink).toHaveAttribute('href', '/panel')
  })
})
