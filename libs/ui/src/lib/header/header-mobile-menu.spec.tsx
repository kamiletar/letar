import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HeaderMobileProvider } from './header-context'
import { HeaderMobileActions, HeaderMobileMenu } from './header-mobile-menu'
import type { NavItem } from './header-nav'

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
]

describe('HeaderMobileMenu', () => {
  it('изначально drawer закрыт, пункты меню не видны', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(<HeaderMobileMenu items={items} />)

    expect(screen.queryByText('Каталог')).not.toBeInTheDocument()
  })

  it('клик по кнопке-гамбургеру открывает drawer с пунктами навигации', async () => {
    const user = userEvent.setup()
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(<HeaderMobileMenu items={items} />)

    await user.click(screen.getByLabelText('Открыть меню'))

    expect(await screen.findByText('Каталог')).toBeInTheDocument()
    expect(screen.getByText('Главная')).toBeInTheDocument()
  })

  it('рендерит headerSlot и footerSlot при открытом меню', async () => {
    const user = userEvent.setup()
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(
      <HeaderMobileMenu
        items={items}
        headerSlot={<span>Слот шапки</span>}
        footerSlot={<span>Слот подвала</span>}
      />,
    )

    await user.click(screen.getByLabelText('Открыть меню'))

    expect(await screen.findByText('Слот шапки')).toBeInTheDocument()
    expect(screen.getByText('Слот подвала')).toBeInTheDocument()
  })

  it('рендерит дополнительный children-контент после навигации', async () => {
    const user = userEvent.setup()
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(
      <HeaderMobileMenu items={items}>
        <span>Доп. контент</span>
      </HeaderMobileMenu>,
    )

    await user.click(screen.getByLabelText('Открыть меню'))

    expect(await screen.findByText('Доп. контент')).toBeInTheDocument()
  })

  it('не рендерит навигацию, если items пуст', async () => {
    const user = userEvent.setup()
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(<HeaderMobileMenu />)

    await user.click(screen.getByLabelText('Открыть меню'))

    // Drawer открылся (кнопка закрытия появилась), но пунктов навигации нет
    expect(await screen.findAllByRole('button')).not.toHaveLength(0)
    expect(screen.queryByText('Главная')).not.toBeInTheDocument()
  })
})

describe('HeaderMobileActions', () => {
  it('рендерит переданные children', () => {
    renderWithProviders(
      <HeaderMobileActions>
        <span>Мобильное действие</span>
      </HeaderMobileActions>,
    )

    expect(screen.getByText('Мобильное действие')).toBeInTheDocument()
  })
})
