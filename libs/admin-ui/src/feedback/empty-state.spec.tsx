import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { LuPackage } from 'react-icons/lu'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './empty-state'

/** Обёртка с Chakra-провайдером — компонент использует токены темы */
function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('EmptyState', () => {
  it('рендерит заголовок и описание', () => {
    renderWithProvider(<EmptyState icon={LuPackage} title="Нет товаров" description="Создайте первый товар" />)

    expect(screen.getByText('Нет товаров')).toBeInTheDocument()
    expect(screen.getByText('Создайте первый товар')).toBeInTheDocument()
  })

  it('не рендерит кнопку действия, если action не передан', () => {
    renderWithProvider(<EmptyState icon={LuPackage} title="Нет товаров" description="Создайте первый товар" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('рендерит кнопку действия со ссылкой, если action передан', () => {
    renderWithProvider(
      <EmptyState
        icon={LuPackage}
        title="Нет товаров"
        description="Создайте первый товар"
        action={{ label: 'Создать товар', href: '/admin/products/new' }}
      />,
    )

    const link = screen.getByRole('link', { name: /Создать товар/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/admin/products/new')
  })

  it('принимает кастомную colorPalette без выбрасывания ошибок', () => {
    renderWithProvider(
      <EmptyState
        icon={LuPackage}
        title="Нет товаров"
        description="Создайте первый товар"
        action={{ label: 'Создать товар', href: '/admin/products/new' }}
        colorPalette="green"
      />,
    )

    expect(screen.getByRole('link', { name: /Создать товар/ })).toBeInTheDocument()
  })
})
