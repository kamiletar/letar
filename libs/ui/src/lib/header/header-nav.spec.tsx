import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HeaderMobileProvider, useHeaderMobile } from './header-context'
import { HeaderNav, type NavItem } from './header-nav'

function renderWithProviders(ui: ReactNode) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <HeaderMobileProvider>{ui}</HeaderMobileProvider>
    </ChakraProvider>,
  )
}

const items: NavItem[] = [
  { href: '/', label: 'Главная', exact: true },
  { href: '/catalog', label: 'Каталог' },
  { href: '/about', label: 'О нас' },
]

describe('HeaderNav', () => {
  it('рендерит все пункты меню (desktop)', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(<HeaderNav items={items} />)

    expect(screen.getByText('Главная')).toBeInTheDocument()
    expect(screen.getByText('Каталог')).toBeInTheDocument()
    expect(screen.getByText('О нас')).toBeInTheDocument()
  })

  // ⚠️ Цвет приходит через Chakra-токен (color={`${colorPalette}.600`}), который компилируется
  // в emotion-класс со ссылкой на CSS custom property. jsdom не резолвит var(...) в
  // getComputedStyle, поэтому сравниваем className активного/неактивного пункта — они обязаны
  // отличаться, если проп color действительно применяется по-разному.
  it('помечает активным пункт с exact-совпадением пути (className отличается от неактивного)', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(<HeaderNav items={items} colorPalette="blue" />)

    const homeLink = screen.getByText('Главная').closest('a')
    const catalogLink = screen.getByText('Каталог').closest('a')
    expect(homeLink?.className).not.toBe(catalogLink?.className)
  })

  it('не активирует exact-пункт на другом пути (className совпадает с обычным неактивным)', () => {
    vi.mocked(usePathname).mockReturnValue('/catalog')
    renderWithProviders(<HeaderNav items={items} colorPalette="blue" />)

    const homeLink = screen.getByText('Главная').closest('a')
    const aboutLink = screen.getByText('О нас').closest('a')
    expect(homeLink?.className).toBe(aboutLink?.className)
  })

  it('активирует не-exact пункт при startsWith совпадении (className отличается от неактивного)', () => {
    vi.mocked(usePathname).mockReturnValue('/catalog/phones')
    renderWithProviders(<HeaderNav items={items} colorPalette="blue" />)

    const catalogLink = screen.getByText('Каталог').closest('a')
    const aboutLink = screen.getByText('О нас').closest('a')
    expect(catalogLink?.className).not.toBe(aboutLink?.className)
  })

  it('рендерит badge, если он передан', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(
      <HeaderNav
        items={[{ href: '/cart', label: 'Корзина', badge: 3 }]}
      />,
    )

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('в mobile-режиме клик по пункту закрывает меню (closeOnClick по умолчанию true)', async () => {
    const user = userEvent.setup()
    vi.mocked(usePathname).mockReturnValue('/')

    function Wrapper() {
      const { isOpen, open } = useHeaderMobile()
      return (
        <>
          <button type="button" onClick={open}>open</button>
          <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
          <HeaderNav items={items} mode="mobile" />
        </>
      )
    }

    renderWithProviders(<Wrapper />)

    await user.click(screen.getByText('open'))
    expect(screen.getByTestId('state')).toHaveTextContent('open')

    await user.click(screen.getByText('Каталог'))
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('в desktop-режиме клик по пункту НЕ закрывает меню (closeOnClick по умолчанию false)', async () => {
    const user = userEvent.setup()
    vi.mocked(usePathname).mockReturnValue('/')

    function Wrapper() {
      const { isOpen, open } = useHeaderMobile()
      return (
        <>
          <button type="button" onClick={open}>open</button>
          <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
          <HeaderNav items={items} mode="desktop" />
        </>
      )
    }

    renderWithProviders(<Wrapper />)

    await user.click(screen.getByText('open'))
    await user.click(screen.getByText('Каталог'))

    expect(screen.getByTestId('state')).toHaveTextContent('open')
  })
})
